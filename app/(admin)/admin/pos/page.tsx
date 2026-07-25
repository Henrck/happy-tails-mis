"use client";
// Point of Sale: item grid + category filter + search on the left, cart
// panel on the right. Process Payment and Return/Exchange open as modals.
// "Void" intentionally omitted per Josh's call — not needed for this shop.
import { useState, useMemo } from "react";
import { products, type ProductCategory } from "@/lib/data/products";
import PosCategoryTabs from "@/components/admin/pos/PosCategoryTabs";
import ProductPosCard from "@/components/admin/pos/ProductPosCard";
import CartPanel, { type CartLine } from "@/components/admin/pos/CartPanel";
import ProcessPaymentModal from "@/components/admin/pos/ProcessPaymentModal";
import ReturnExchangeModal from "@/components/admin/pos/ReturnExchangeModal";

export default function PointOfSalePage() {
  const [category, setCategory] = useState<ProductCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesCategory = category === "all" || p.category === category;
      const matchesSearch = !q || p.name.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [category, search]);

  const cartLines: CartLine[] = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => ({ product: products.find((p) => p.id === id)!, qty }))
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

  function handleConfirmPayment(amountPaid: number, method: string) {
    // Mock "receipt" for now — generating a real one happens once the
    // transactions table exists in Supabase.
    const receiptId = `TXN-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    setLastReceipt(receiptId);
    setPaymentOpen(false);
    clearCart();
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 h-full">
      <div className="flex-1 min-w-0">
        <h1 className="text-3xl font-bold text-brand-pink">Point of Sales</h1>

        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4-4" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Search items"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-full border border-pink-200 bg-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
            />
          </div>
          {/* Placeholder only, per Josh — no functionality yet */}
          <button
            disabled
            className="border-2 border-brand-pink text-brand-pink font-semibold text-sm px-6 py-2 rounded-full opacity-60 cursor-not-allowed"
          >
            Walk In
          </button>
        </div>

        <div className="mt-3">
          <PosCategoryTabs active={category} onChange={setCategory} />
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto pr-1">
          {filteredProducts.length === 0 ? (
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
        <ProcessPaymentModal
          amountDue={amountDue}
          onClose={() => setPaymentOpen(false)}
          onConfirm={handleConfirmPayment}
        />
      )}

      {returnOpen && <ReturnExchangeModal onClose={() => setReturnOpen(false)} />}
    </div>
  );
}
