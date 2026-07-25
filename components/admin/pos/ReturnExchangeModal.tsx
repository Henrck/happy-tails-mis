"use client";
// Return/Exchange modal. Two stages:
//   1. Type a receipt # and click Find
//   2. If found, adjust return quantities per line item (capped at
//      maxReturnable), pick a reason, and Confirm Refund.
import { useState } from "react";
import { transactions, type Transaction } from "@/lib/data/pos-transactions-mock";

const reasons = ["Defective", "Wrong Item", "Changed Mind", "Other"];

export default function ReturnExchangeModal({ onClose }: { onClose: () => void }) {
  const [receiptInput, setReceiptInput] = useState("");
  const [found, setFound] = useState<Transaction | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
  const [reason, setReason] = useState(reasons[0]);
  const [confirmed, setConfirmed] = useState(false);

  function handleFind() {
    const match = transactions.find(
      (t) => t.id.toLowerCase() === receiptInput.trim().toLowerCase()
    );
    if (match) {
      setFound(match);
      setNotFound(false);
      setReturnQtys(Object.fromEntries(match.lineItems.map((li) => [li.productId, 0])));
    } else {
      setFound(null);
      setNotFound(true);
    }
  }

  const refundSubtotal = found
    ? found.lineItems.reduce((sum, li) => sum + li.unitPrice * (returnQtys[li.productId] ?? 0), 0)
    : 0;
  const refundTotal = refundSubtotal;
  const hasAnyReturn = Object.values(returnQtys).some((q) => q > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="bg-brand-pink px-6 py-4 flex items-center justify-between sticky top-0">
          <h3 className="text-white font-bold">Return / Exchange</h3>
          <button onClick={onClose} className="text-white hover:opacity-80" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5">
          {confirmed ? (
            <div className="text-center py-8">
              <p className="text-4xl">✅</p>
              <p className="mt-3 font-bold text-green-600">Refund confirmed!</p>
              <p className="mt-1 text-sm text-zinc-500">₱{refundTotal.toFixed(2)} refunded for {reason.toLowerCase()}.</p>
              <button
                onClick={onClose}
                className="mt-6 bg-brand-pink hover:bg-brand-pink-dark text-white font-semibold text-sm px-8 py-2.5 rounded-full transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              {!found && (
                <p className="text-sm text-zinc-500 mb-3">Today's transactions — enter a receipt number below.</p>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Receipt #"
                  value={receiptInput}
                  onChange={(e) => setReceiptInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleFind()}
                  className="flex-1 rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
                />
                <button
                  onClick={handleFind}
                  className="bg-zinc-100 hover:bg-zinc-200 font-semibold text-sm px-5 rounded-lg transition-colors"
                >
                  Find
                </button>
              </div>

              {notFound && (
                <p className="mt-3 text-sm text-red-500">No transaction found with that receipt number.</p>
              )}

              {found && (
                <>
                  <div className="mt-4 bg-brand-tint rounded-xl px-4 py-3">
                    <p className="text-sm font-semibold text-brand-pink">
                      Receipt: {found.id} · {found.timestamp} · ₱{found.total.toFixed(2)}
                    </p>
                  </div>

                  <div className="mt-4 space-y-3">
                    {found.lineItems.map((li) => (
                      <div key={li.productId} className="bg-zinc-50 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-zinc-800">{li.name}</p>
                          <p className="text-xs text-zinc-400">Max:{li.maxReturnable}</p>
                        </div>
                        <input
                          type="number"
                          min={0}
                          max={li.maxReturnable}
                          value={returnQtys[li.productId] ?? 0}
                          onChange={(e) => {
                            const val = Math.max(0, Math.min(li.maxReturnable, parseInt(e.target.value) || 0));
                            setReturnQtys((prev) => ({ ...prev, [li.productId]: val }));
                          }}
                          className="w-16 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-pink"
                        />
                        <span className="text-sm font-bold text-zinc-800 w-16 text-right">
                          ₱{(li.unitPrice * (returnQtys[li.productId] ?? 0)).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 bg-brand-tint rounded-xl px-4 py-3 text-sm space-y-1">
                    <div className="flex justify-between text-base font-bold">
                      <span className="text-brand-pink">Refund total :</span>
                      <span className="text-brand-pink">₱{refundTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="text-sm font-semibold text-zinc-700">Reason</label>
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
                    >
                      {reasons.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => setConfirmed(true)}
                    disabled={!hasAnyReturn}
                    className="mt-5 w-full bg-brand-pink hover:bg-brand-pink-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-full transition-colors"
                  >
                    Confirm Refund
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
