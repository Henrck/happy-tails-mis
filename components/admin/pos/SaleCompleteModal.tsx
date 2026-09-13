"use client";
// Shown right after a POS sale is successfully recorded. Deliberately
// lightweight (just invoice/payment summary, no printable receipt
// layout) — per Josh's request this replaces the previous silent
// close-and-clear-cart behavior with an actual confirmation.
export type CompletedSale = {
  invoiceNumber: string;
  method: string;
  total: number;
  amountPaid: number;
  change: number;
  itemCount: number;
};

export default function SaleCompleteModal({
  sale,
  onClose,
}: {
  sale: CompletedSale;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-white rounded-3xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-7 pb-5 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-600">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="mt-3 text-lg font-bold text-zinc-800">Transaction Complete</h3>
          <p className="text-sm text-zinc-500">Invoice #{sale.invoiceNumber}</p>
        </div>

        <div className="mx-6 rounded-2xl bg-brand-tint px-4 py-4 text-sm">
          <div className="flex justify-between py-1">
            <span className="text-zinc-500">Items</span>
            <span className="font-semibold text-zinc-700">{sale.itemCount}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-zinc-500">Payment Method</span>
            <span className="font-semibold text-zinc-700">{sale.method}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-zinc-500">Total</span>
            <span className="font-semibold text-zinc-700">₱{sale.total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-zinc-500">Amount Paid</span>
            <span className="font-semibold text-zinc-700">₱{sale.amountPaid.toFixed(2)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-pink-100 pt-2">
            <span className="font-semibold text-brand-pink">Change</span>
            <span className="font-bold text-brand-pink">₱{sale.change.toFixed(2)}</span>
          </div>
        </div>

        <div className="px-6 pt-5 pb-6">
          <button
            onClick={onClose}
            className="w-full bg-brand-pink hover:bg-brand-pink-dark text-white font-semibold py-2.5 rounded-full transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
