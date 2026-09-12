"use client";
// Point of Sale — REAL version. Fetches active products from Supabase
// instead of a hardcoded mock array (this is what fixes "discontinuing
// in Inventory still shows in POS" — they now read the exact same
// table). Process Payment now actually deducts real stock via the FEFO
// function, for every line item — this never happened before this
// rewrite; checkout and Inventory were completely disconnected.
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchProducts, sellProduct } from "@/lib/supabase/products";
import { recordSale } from "@/lib/supabase/sales";
import type { Product, ProductCategory } from "@/lib/types/products";
import PosCategoryTabs from "@/components/admin/pos/PosCategoryTabs";
import ProductPosCard from "@/components/admin/pos/ProductPosCard";
import CartPanel, { type CartLine } from "@/components/admin/pos/CartPanel";
import ProcessPaymentModal from "@/components/admin/pos/ProcessPaymentModal";
import ReturnExchangeModal from "@/components/admin/pos/ReturnExchangeModal";

export default function PointOfSalePage() {
  const router = useRouter();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<ProductCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  async function loadProducts() {
    setLoading(true);
    const { products, error } = await fetchProducts({ activeOnly: true });
    if (!error) setAllProducts(products);
    setLoading(false);
  }

  useEffect(() => {
    async function load() {
      await loadProducts();
    }
    load();
  }, []);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allProducts.filter((p) => {
      const matchesCategory = category === "all" || p.category === category;
      const matchesSearch = !q || p.name.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [allProducts, category, search]);

  const cartLines: CartLine[] = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => ({ product: allProducts.find((p) => p.id === id)!, qty }))
    .filter((line) => line.product);

  const subtotal = cartLines.reduce((sum, l) => sum + l.product.price * l.qty, 0);
  const amountDue = subtotal;

  function increment(id: string) {
    setCart((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
  }
  function decrement(id: string) {
    setCart((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) - 1) }));
  }
  function remove(id: string) {
    setCart((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }
  function clearCart() {
    setCart({});
  }

  async function handleConfirmPayment(amountPaid: number, method: string) {
    setCheckoutError(null);

    // Deduct real stock (FEFO) for every line item. If any line fails
    // (not enough stock — e.g. someone else already sold the last few
    // units), stop and show the error rather than silently completing
    // a sale that oversells what's actually on the shelf.
    for (const line of cartLines) {
      const { error } = await sellProduct(line.product.id, line.qty);
      if (error) {
        setCheckoutError(`Couldn't complete sale: ${error}`);
        return;
      }
    }

    // Stock is already deducted at this point — the sale itself went
    // through. If logging it fails, that's a real problem (it won't show
    // up in Sales Reports) but it should NOT look like the sale failed,
    // since it didn't; surface it as a distinct warning instead.
    const { error: recordError } = await recordSale(
      cartLines.map((l) => ({ productId: l.product.id, quantity: l.qty, unitPrice: l.product.price })),
      { method, amountPaid }
    );
    if (recordError) {
      setCheckoutError(`Sale completed and stock was deducted, but it couldn't be logged to Sales Reports: ${recordError}`);
    }

    setPaymentOpen(false);
    clearCart();
    loadProducts(); // refresh stock numbers/availability after the sale
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 h-full">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-bold text-brand-pink">Point of Sales</h1>
          <button
            onClick={() => router.push("/admin/pos/configuration")}
            className="flex items-center gap-1.5 border-2 border-brand-pink text-brand-pink font-semibold text-sm px-4 py-1.5 rounded-full hover:bg-brand-pink hover:text-white transition-colors whitespace-nowrap"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Configuration
          </button>
        </div>

        {checkoutError && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2.5">{checkoutError}</p>
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
        onProcessPayment={() => setPaymentOpen(true)}
        onReturnExchange={() => setReturnOpen(true)}
      />

      {paymentOpen && (
        <ProcessPaymentModal amountDue={amountDue} onClose={() => setPaymentOpen(false)} onConfirm={handleConfirmPayment} />
      )}

      {returnOpen && <ReturnExchangeModal onClose={() => setReturnOpen(false)} />}
    </div>
  );
}
