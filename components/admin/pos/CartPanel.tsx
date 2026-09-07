"use client";
import type { Product } from "@/lib/types/products";

export type CartLine = { product: Product; qty: number };

export default function CartPanel({
  cart,
  onIncrement,
  onDecrement,
  onRemove,
  onClear,
  onProcessPayment,
  onReturnExchange,
}: {
  cart: CartLine[];
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onProcessPayment: () => void;
  onReturnExchange: () => void;
}) {
  const subtotal = cart.reduce((sum, line) => sum + line.product.price * line.qty, 0);
  const discount = 0;
  const total = subtotal - discount;
  const itemCount = cart.reduce((sum, line) => sum + line.qty, 0);

  return (
    <div className="w-full md:w-80 shrink-0 bg-brand-pink rounded-2xl flex flex-col text-white overflow-hidden md:h-[calc(100vh-8rem)] md:sticky md:top-24">
      <div className="px-4 py-3 border-b border-white/20 shrink-0">
        <h3 className="font-bold">Current Orders</h3>
        <p className="text-xs opacity-80">{itemCount} item{itemCount !== 1 ? "s" : ""}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {cart.length === 0 ? (
          <p className="text-sm text-white/70 text-center py-8">Cart is empty.</p>
        ) : (
          cart.map((line) => (
            <div key={line.product.id} className="bg-white/10 rounded-xl p-3 relative">
              <button onClick={() => onRemove(line.product.id)} aria-label={`Remove ${line.product.name}`} className="absolute top-2 right-2 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>
              </button>
              <p className="text-sm font-semibold pr-6">{line.product.name}</p>
              <p className="text-xs opacity-80">₱{line.product.price.toFixed(2)}</p>
              <div className="mt-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button onClick={() => onDecrement(line.product.id)} className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">−</button>
                  <span className="text-sm font-semibold w-4 text-center">{line.qty}</span>
                  <button onClick={() => onIncrement(line.product.id)} className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">+</button>
                </div>
                <span className="text-sm font-bold">₱{(line.product.price * line.qty).toFixed(2)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="px-4 py-3 border-t border-white/20 text-sm space-y-1 shrink-0">
        <div className="flex justify-between"><span className="opacity-80">Subtotal :</span><span>₱{subtotal.toFixed(2)}</span></div>
        <div className="flex justify-between"><span className="opacity-80">Discount :</span><span>₱{discount.toFixed(2)}</span></div>
        <div className="flex justify-between text-base font-bold pt-1"><span>Total Price</span><span>₱{total.toFixed(2)}</span></div>
      </div>

      <div className="px-4 pb-4 pt-2 space-y-2 shrink-0">
        <button onClick={onProcessPayment} disabled={cart.length === 0} className="w-full bg-white text-brand-pink font-bold py-2.5 rounded-full disabled:opacity-40 disabled:cursor-not-allowed hover:bg-pink-50 transition-colors">
          Process Payment
        </button>
        <div className="flex gap-2">
          <button onClick={onClear} disabled={cart.length === 0} className="flex-1 bg-white/15 hover:bg-white/25 disabled:opacity-40 font-semibold text-sm py-2 rounded-full transition-colors">Clear</button>
          <button onClick={onReturnExchange} className="flex-1 bg-white/15 hover:bg-white/25 font-semibold text-sm py-2 rounded-full transition-colors">Return / Exchange</button>
        </div>
      </div>
    </div>
  );
}
