"use client";
// History modal for boarding: a flat list of completed transactions
// (checked-out + paid), showing what "all transaction for the boarding"
// means per Josh's description — pet, owner, kennel, and the amount paid.
import type { BoardingSession } from "@/lib/data/boarding-kennels-mock";

export default function BoardingHistoryModal({
  history,
  onClose,
}: {
  history: BoardingSession[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-white rounded-3xl overflow-hidden max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-brand-pink px-6 py-4 flex items-center justify-between sticky top-0">
          <h3 className="text-white font-bold">Boarding History</h3>
          <button onClick={onClose} className="text-white hover:opacity-80" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="p-5">
          {history.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-8">No completed transactions yet today.</p>
          ) : (
            <ul className="space-y-2">
              {history.map((s) => {
                const addOnsTotal = s.addOns.reduce((sum, a) => sum + a.price, 0);
                const total = s.servicePrice + addOnsTotal;
                return (
                  <li key={s.id} className="bg-brand-tint rounded-xl px-4 py-3">
                    <div className="flex justify-between text-sm font-semibold text-zinc-800">
                      <span>{s.petName} ({s.ownerName})</span>
                      <span className="text-brand-pink">₱{total.toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">{s.services.join(", ")} · Paid via {s.paymentMethod}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
