"use client";
// Payment modal. Amount Paid is a plain typed number input (not a
// calculator/numpad UI) — per Josh's note, this should be a flexible
// system where the cashier just types the amount on a keyboard.
import { useState } from "react";

export default function ProcessPaymentModal({
  amountDue,
  onClose,
  onConfirm,
}: {
  amountDue: number;
  onClose: () => void;
  onConfirm: (amountPaid: number, method: string) => void;
}) {
  const [amountPaid, setAmountPaid] = useState("");
  const [method, setMethod] = useState("Cash");

  const paidNumber = parseFloat(amountPaid) || 0;
  const change = paidNumber - amountDue;
  const canConfirm = paidNumber >= amountDue;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="bg-brand-pink px-6 py-4 flex items-center justify-between">
          <h3 className="text-white font-bold">Process Payment</h3>
          <button onClick={onClose} className="text-white hover:opacity-80" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-6">
          <div className="bg-brand-tint rounded-xl px-4 py-4 text-center">
            <p className="text-sm text-zinc-500">Amount Due</p>
            <p className="text-3xl font-bold text-brand-pink">₱{amountDue.toFixed(2)}</p>
          </div>

          <div className="mt-5">
            <p className="text-sm font-semibold text-brand-pink">Payment Method</p>
            <div className="mt-2 flex gap-2">
              {["Cash"].map((m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`px-5 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                    method === m ? "bg-brand-pink text-white" : "border border-brand-pink text-brand-pink"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <label className="text-sm font-semibold text-brand-pink">Amount Paid (₱)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              autoFocus
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              placeholder="0.00"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-lg focus:outline-none focus:ring-2 focus:ring-brand-pink"
            />
          </div>

          {amountPaid !== "" && (
            <div className={`mt-4 flex items-center justify-between rounded-lg px-4 py-3 font-semibold ${
              change >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
            }`}>
              <span>{change >= 0 ? "Change" : "Short by"}</span>
              <span>₱{Math.abs(change).toFixed(2)}</span>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 border-2 border-zinc-300 text-zinc-500 font-semibold text-sm py-2.5 rounded-full hover:border-zinc-400 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => canConfirm && onConfirm(paidNumber, method)}
              disabled={!canConfirm}
              className="flex-1 border-2 border-brand-pink text-brand-pink font-semibold text-sm py-2.5 rounded-full disabled:opacity-40 disabled:cursor-not-allowed hover:bg-brand-pink hover:text-white transition-colors"
            >
              Confirm Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
