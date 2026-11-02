"use client";
import type { BoardingHistoryItem } from "@/lib/supabase/boarding-operations";
export default function BoardingHistoryModal({ history, onClose, error }: {
  history: BoardingHistoryItem[];
  onClose: () => void;
  error?: string | null;
}) {
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-label="Boarding History" className="flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-xl">
      <div className="flex shrink-0 items-center justify-between bg-brand-pink px-5 py-4"><h3 className="font-bold text-white">Recent Boarding Checkouts</h3><button type="button" onClick={onClose} aria-label="Close boarding history" className="text-2xl text-white">×</button></div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-5">
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {!error && !history.length && <p className="py-8 text-center text-sm text-zinc-500">No completed boarding pets were found.</p>}
        {history.map((item) => <article key={item.appointmentPetId} className="rounded-xl border border-pink-100 bg-pink-50 p-3">
          <div className="flex flex-wrap justify-between gap-2"><b className="text-sm text-zinc-800">{item.petName} · {item.ownerName}</b><span className="text-sm font-bold text-brand-pink">₱{item.amount.toLocaleString()}</span></div>
          <p className="mt-1 text-xs text-zinc-600">{item.kennelLabel}</p><p className="mt-1 text-xs text-zinc-600">{item.dropOffAt ? new Date(item.dropOffAt).toLocaleString("en-PH", { timeZone: "Asia/Manila" }) : "—"} to {item.pickUpAt ? new Date(item.pickUpAt).toLocaleString("en-PH", { timeZone: "Asia/Manila" }) : "—"}</p>
        </article>)}
      </div>
      <button type="button" onClick={onClose} className="m-4 rounded-full bg-brand-pink py-3 text-sm font-semibold text-white">Close</button>
    </div>
  </div>;
}
