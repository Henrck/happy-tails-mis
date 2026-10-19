"use client";
import { useState } from "react";
import type { Product } from "@/lib/types/products";
import "./pos-mobile-dock.css";

export type CartLine = { product: Product; qty: number };

export default function CartPanel({ cart, onIncrement, onDecrement, onRemove, onClear, onProcessPayment, onReturnExchange }: {
  cart: CartLine[];
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onProcessPayment: () => void;
  onReturnExchange: () => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const subtotal = cart.reduce((sum, line) => sum + line.product.price * line.qty, 0);
  const discount = 0;
  const total = subtotal - discount;
  const itemCount = cart.reduce((sum, line) => sum + line.qty, 0);

  const contents = (
    <>
      <div className="px-4 py-3 border-b border-white/20 shrink-0 flex items-center justify-between gap-2">
        <div><h3 className="font-bold">Current Orders</h3><p className="text-xs opacity-80">{itemCount} item{itemCount !== 1 ? "s" : ""}</p></div>
        <button type="button" className="ht-pos-close-cart" onClick={() => setMobileOpen(false)} aria-label="Close cart">✕</button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {cart.length === 0 ? <p className="text-sm text-white/70 text-center py-8">Cart is empty.</p> : cart.map((line) => (
          <div key={line.product.id} className="bg-white/10 rounded-xl p-3 relative">
            <button type="button" onClick={() => onRemove(line.product.id)} aria-label={`Remove ${line.product.name}`} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>
            </button>
            <p className="text-sm font-semibold pr-9">{line.product.name}</p>
            <p className="text-xs opacity-80">₱{line.product.price.toFixed(2)}</p>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => onDecrement(line.product.id)} aria-label={`Decrease ${line.product.name}`} className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">−</button>
                <span className="text-sm font-semibold w-5 text-center">{line.qty}</span>
                <button type="button" onClick={() => onIncrement(line.product.id)} aria-label={`Increase ${line.product.name}`} className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">+</button>
              </div>
              <span className="text-sm font-bold tabular-nums">₱{(line.product.price * line.qty).toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 py-3 border-t border-white/20 text-sm space-y-1 shrink-0">
        <div className="flex justify-between"><span className="opacity-80">Subtotal :</span><span>₱{subtotal.toFixed(2)}</span></div>
        <div className="flex justify-between"><span className="opacity-80">Discount :</span><span>₱{discount.toFixed(2)}</span></div>
        <div className="flex justify-between text-base font-bold pt-1"><span>Total Price</span><span>₱{total.toFixed(2)}</span></div>
      </div>
      <div className="px-4 pb-4 pt-2 space-y-2 shrink-0">
        <button type="button" onClick={() => { if (cart.length) { setMobileOpen(false); onProcessPayment(); } }} disabled={cart.length === 0} className="w-full bg-white text-brand-pink font-bold py-3 rounded-full disabled:opacity-40 disabled:cursor-not-allowed hover:bg-pink-50 transition-colors">Process Payment</button>
        <div className="flex gap-2">
          <button type="button" onClick={onClear} disabled={cart.length === 0} className="flex-1 bg-white/15 hover:bg-white/25 disabled:opacity-40 font-semibold text-sm py-2.5 rounded-full transition-colors">Clear</button>
          <button type="button" onClick={() => { setMobileOpen(false); onReturnExchange(); }} className="flex-1 bg-white/15 hover:bg-white/25 font-semibold text-sm py-2.5 rounded-full transition-colors">Return / Exchange</button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <div className="ht-pos-cart-slot" aria-hidden="true" />
      <button type="button" aria-haspopup="dialog" aria-expanded={mobileOpen} aria-controls="ht-pos-cart-drawer" onClick={() => setMobileOpen(true)} className="ht-pos-mobile-dock">
        <span className="font-bold">🛒 Cart ({itemCount})</span>
        <span className="font-bold tabular-nums">₱{total.toFixed(2)}</span>
        <span className="ht-pos-mobile-dock-action">View cart <span aria-hidden="true">↑</span></span>
      </button>
      {mobileOpen && <div className="ht-pos-cart-backdrop" onClick={() => setMobileOpen(false)} aria-hidden="true" />}
      <section id="ht-pos-cart-drawer" role={mobileOpen ? "dialog" : undefined} aria-modal={mobileOpen ? true : undefined} aria-label="Current orders" className={`ht-pos-cart bg-brand-pink rounded-2xl flex flex-col text-white overflow-hidden ${mobileOpen ? "ht-pos-cart-open" : ""}`}>
        {contents}
      </section>
    </>
  );
}
