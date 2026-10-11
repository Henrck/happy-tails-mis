"use client";
// POS Issue #2: commit the entire checkout through one atomic Supabase RPC.
// Database is authoritative for stock, price and sales receipt.
import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchProducts } from "@/lib/supabase/products";
import { checkoutPosSale } from "@/lib/supabase/pos-checkout";
import type { Product, ProductCategory } from "@/lib/types/products";
import PosCategoryTabs from "@/components/admin/pos/PosCategoryTabs";
import ProductPosCard from "@/components/admin/pos/ProductPosCard";
import CartPanel, { type CartLine } from "@/components/admin/pos/CartPanel";
import ProcessPaymentModal, { type LowStockWarning } from "@/components/admin/pos/ProcessPaymentModal";
import ReturnExchangeModal from "@/components/admin/pos/ReturnExchangeModal";
import SaleCompleteModal, { type CompletedSale } from "@/components/admin/pos/SaleCompleteModal";

export default function PointOfSalePage() {
  const router = useRouter();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<ProductCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const processingRef = useRef(false);
  // Keep this ID stable during retries, including ambiguous network failures.
  const checkoutRequestId = useRef<string | null>(null);
  const [returnOpen, setReturnOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [completedSale, setCompletedSale] = useState<CompletedSale | null>(null);
  const [isSuperadmin, setIsSuperadmin] = useState(false);

  async function loadProducts() {
    setLoading(true);
    const { products, error } = await fetchProducts({ activeOnly: true });
    if (!error) setAllProducts(products);
    else setCheckoutError(`Unable to refresh inventory: ${error}`);
    setLoading(false);
  }

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from("profiles")
          .select("role").eq("id", user.id).maybeSingle();
        setIsSuperadmin(profile?.role === "superadmin");
      }
      await loadProducts();
    }
    void load();
  }, []);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allProducts.filter((p) =>
      (category === "all" || p.category === category) &&
      (!q || p.name.toLowerCase().includes(q))
    );
  }, [allProducts, category, search]);

  const cartLines: CartLine[] = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => ({ product: allProducts.find((p) => p.id === id)!, qty }))
    .filter((line) => line.product);

  const amountDue = cartLines.reduce((sum, l) => sum + l.product.price * l.qty, 0);

  // A low-stock threshold is for staff decision-making, not a checkout ban.
  // Warn when the proposed sale would leave stock at/below min_stock,
  // even if the product currently has healthy stock.
  const lowStockWarnings: LowStockWarning[] = cartLines
    .filter(({ product, qty }) => {
      const available = Math.max(0, product.stock ?? 0);
      return available - qty <= product.min_stock;
    })
    .map(({ product, qty }) => ({
      productId: product.id,
      name: product.name,
      currentStock: Math.max(0, product.stock ?? 0),
      remainingStock: Math.max(0, (product.stock ?? 0) - qty),
      minStock: product.min_stock,
    }));

  function increment(id: string) {
    if (processingRef.current) return;
    const product = allProducts.find((p) => p.id === id);
    if (!product) return;
    setCart((prev) => ({ ...prev, [id]: Math.min(Math.max(0, product.stock ?? 0), (prev[id] ?? 0) + 1) }));
    checkoutRequestId.current = null;
  }
  function decrement(id: string) {
    if (processingRef.current) return;
    setCart((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) - 1) }));
    checkoutRequestId.current = null;
  }
  function remove(id: string) {
    if (processingRef.current) return;
    setCart((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    checkoutRequestId.current = null;
  }
  function clearCart() {
    if (processingRef.current) return;
    setCart({});
    checkoutRequestId.current = null;
  }

  async function handleConfirmPayment(amountPaid: number, method: "Cash") {
    if (processingRef.current || cartLines.length === 0) return;
    // Prevent double submissions before React can rerender the button.
    processingRef.current = true;
    setProcessing(true);
    setCheckoutError(null);
    if (!checkoutRequestId.current) checkoutRequestId.current = crypto.randomUUID();

    try {
      const { sale, error } = await checkoutPosSale({
        requestId: checkoutRequestId.current,
        items: cartLines.map((l) => ({ productId: l.product.id, quantity: l.qty })),
        amountPaid,
        method,
      });
      if (error || !sale) {
        setCheckoutError(error ?? "Checkout failed. Please review Sales Reports before retrying.");
        return;
      }

      setCompletedSale({
        invoiceNumber: sale.invoiceNumber,
        method,
        total: sale.totalAmount,
        amountPaid: sale.amountPaid,
        change: sale.changeAmount,
        itemCount: sale.items.reduce((sum, item) => sum + item.quantity, 0),
        items: sale.items.map((item) => ({
          name: item.name, qty: item.quantity, unitPrice: item.unitPrice,
        })),
      });
      setPaymentOpen(false);
      setCart({});
      checkoutRequestId.current = null;
      await loadProducts();
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Checkout connection failed. Check Sales Reports before retrying.");
    } finally {
      processingRef.current = false;
      setProcessing(false);
    }
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 h-full">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-bold text-brand-pink">Point of Sales</h1>
          {isSuperadmin && (
            <button
              onClick={() => router.push("/admin/pos/configuration")}
              className="flex items-center gap-1.5 border-2 border-brand-pink text-brand-pink font-semibold text-sm px-4 py-1.5 rounded-full hover:bg-brand-pink hover:text-white transition-colors whitespace-nowrap"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M4 21V3h16v18H4ZM8 7h8M8 12h8M8 17h6" />
              </svg>
              Configuration
            </button>
          )}
        </div>

        {checkoutError && !paymentOpen && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2.5">{checkoutError}</p>
        )}

        {lowStockWarnings.length > 0 && !paymentOpen && (
          <div role="status" className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong>Low stock warning:</strong> This cart would leave {lowStockWarnings.length} product{lowStockWarnings.length === 1 ? "" : "s"} at or below the reorder level. The sale can still proceed after cashier confirmation.
          </div>
        )}

        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
              <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" strokeLinecap="round" />
            </svg>
            <input type="text" placeholder="Search items" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-full border border-pink-200 bg-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
          </div>
          <button onClick={() => router.push("/admin/pos/walk-in")} className="border-2 border-brand-pink text-brand-pink font-semibold text-sm px-6 py-2 rounded-full hover:bg-brand-pink hover:text-white transition-colors">
            Walk In
          </button>
        </div>

        <div className="mt-3">
          <PosCategoryTabs active={category} onChange={setCategory} />
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto pr-1">
          {loading ? (
            <p className="col-span-full text-center text-zinc-400 py-10">Loading products...</p>
          ) : filteredProducts.length === 0 ? (
            <p className="col-span-full text-center text-zinc-400 py-10">No items match your search.</p>
          ) : (
            filteredProducts.map((product) => (
              <ProductPosCard
                key={product.id}
                product={product}
                qty={cart[product.id] ?? 0}
                onIncrement={() => increment(product.id)}
                onDecrement={() => decrement(product.id)}
              />
            ))
          )}
        </div>
      </div>

      <CartPanel
        cart={cartLines}
        onIncrement={increment}
        onDecrement={decrement}
        onRemove={remove}
        onClear={clearCart}
        onProcessPayment={() => { setCheckoutError(null); setPaymentOpen(true); }}
        onReturnExchange={() => setReturnOpen(true)}
      />

      {paymentOpen && (
        <ProcessPaymentModal amountDue={amountDue}
          processing={processing} error={checkoutError}
          lowStockWarnings={lowStockWarnings}
          onClose={() => { if (!processingRef.current) setPaymentOpen(false); }}
          onConfirm={handleConfirmPayment} />
      )}

      {returnOpen && <ReturnExchangeModal onClose={() => setReturnOpen(false)} />}

      {completedSale && (
        <SaleCompleteModal sale={completedSale} onClose={() => setCompletedSale(null)} />
      )}
    </div>
  );
}
