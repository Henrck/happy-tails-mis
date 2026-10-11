"use client";
// Cash-only POS. Payment is submitted once; keep the modal open if the
// database rejects the sale, so staff can safely correct/retry the payment.
import { useState } from "react";

export type LowStockWarning = {
  productId: string;
  name: string;
  currentStock: number;
  remainingStock: number;
  minStock: number;
};

export default function ProcessPaymentModal({
  amountDue, onClose, onConfirm, processing, error, lowStockWarnings,
}: {
  amountDue: number;
  onClose: () => void;
  onConfirm: (amountPaid: number, method: "Cash") => Promise<void>;
  processing: boolean;
  error: string | null;
  lowStockWarnings: LowStockWarning[];
}) {
  const [amountPaid, setAmountPaid] = useState("");
  const [acknowledgedLowStock, setAcknowledgedLowStock] = useState(false);
  const method = "Cash" as const;

  const paidNumber = amountPaid.trim() === "" ? NaN : Number(amountPaid);
  const validPaid = Number.isFinite(paidNumber) && paidNumber >= 0 &&
    paidNumber <= 100000000 && Math.round(paidNumber * 100) / 100 === paidNumber;
  const change = validPaid ? paidNumber - amountDue : 0;
  // The cashier decides whether to proceed when stock reaches the
  // reorder threshold. Available stock is still enforced by the DB.
  const canConfirm = validPaid && paidNumber >= amountDue && amountDue > 0 &&
    !processing && (lowStockWarnings.length === 0 || acknowledgedLowStock);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={() => { if (!processing) onClose(); }}>
      <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="bg-brand-pink px-6 py-4 flex items-center justify-between">
          <h3 className="text-white font-bold">Process Payment</h3>
          <button onClick={onClose} disabled={processing} className="text-white hover:opacity-80 disabled:opacity-40" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-6">
          <div className="bg-brand-tint rounded-xl px-4 py-4 text-center">
            <p className="text-sm text-zinc-500">Amount Due (estimate; verified at checkout)</p>
            <p className="text-3xl font-bold text-brand-pink">₱{amountDue.toFixed(2)}</p>
          </div>

          <div className="mt-5">
            <p className="text-sm font-semibold text-brand-pink">Payment Method</p>
            <p className="mt-2 inline-block px-5 py-1.5 rounded-full text-sm font-semibold bg-brand-pink text-white">Cash</p>
          </div>

          <div className="mt-4">
            <label htmlFor="pos-cash-paid" className="text-sm font-semibold text-brand-pink">Amount Paid (₱)</label>
            <input id="pos-cash-paid" type="number" min={0} step="0.01" autoFocus
              disabled={processing} value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)}
              placeholder="0.00"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-lg focus:outline-none focus:ring-2 focus:ring-brand-pink" />
          </div>

          {amountPaid !== "" && validPaid && (
            <div className={`mt-4 flex items-center justify-between rounded-lg px-4 py-3 font-semibold ${change >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
              <span>{change >= 0 ? "Estimated change" : "Short by"}</span>
              <span>₱{Math.abs(change).toFixed(2)}</span>
            </div>
          )}
          {amountPaid !== "" && !validPaid && (
            <p className="mt-3 text-sm text-red-600">Enter a valid amount with at most two decimal places.</p>
          )}
          {lowStockWarnings.length > 0 && (
            <section aria-label="Low stock warning" className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">
              <p className="text-sm font-bold">Low stock warning — staff decision</p>
              <p className="mt-1 text-xs">The sale is allowed, but it will leave these products at or below their reorder levels:</p>
              <ul className="mt-2 space-y-1 text-xs">
                {lowStockWarnings.map((item) => (
                  <li key={item.productId}>
                    <strong>{item.name}</strong>: {item.currentStock} available → {item.remainingStock} after sale (reorder level: {item.minStock})
                  </li>
                ))}
              </ul>
              <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs font-semibold">
                <input type="checkbox" checked={acknowledgedLowStock} disabled={processing}
                  onChange={(e) => setAcknowledgedLowStock(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-amber-700" />
                <span>I acknowledge the low stock and approve this sale.</span>
              </label>
              <p className="mt-2 text-[11px]">You can sell the last available unit. A quantity greater than actual available stock is still rejected.</p>
            </section>
          )}
          {error && (
            <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
              <span className="mt-1 block text-xs">If the connection failed after payment, check Sales Reports before starting a new cart.</span>
            </p>
          )}

          <div className="mt-6 flex gap-3">
            <button onClick={onClose} disabled={processing}
              className="flex-1 border-2 border-zinc-300 text-zinc-500 font-semibold text-sm py-2.5 rounded-full hover:border-zinc-400 disabled:opacity-40 transition-colors">Cancel</button>
            <button onClick={() => { if (canConfirm) void onConfirm(paidNumber, method); }}
              disabled={!canConfirm}
              className="flex-1 border-2 border-brand-pink text-brand-pink font-semibold text-sm py-2.5 rounded-full disabled:opacity-40 disabled:cursor-not-allowed hover:bg-brand-pink hover:text-white transition-colors">
              {processing ? "Processing…" : "Confirm Payment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
