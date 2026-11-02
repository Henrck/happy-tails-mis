"use client";
import type { Kennel } from "@/lib/types/pet-services";
import { kennelDisplayName } from "@/lib/types/pet-services";
import type { BoardingSessionRow } from "@/lib/supabase/service-sessions";

export default function KennelOccupantsModal({ kennel, sessions, onClose, onPetDetails }: {
  kennel: Kennel | null; sessions: BoardingSessionRow[]; onClose: () => void;
  onPetDetails: (pet: BoardingSessionRow) => void;
}) {
  const fmt = (value: string | null) => value ? new Date(value).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }) : "—";
  return <div className="fixed inset-0 z-[125] flex items-center justify-center bg-black/60 p-3" onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-label="Kennel occupants" className="flex max-h-[90dvh] w-full max-w-xl flex-col rounded-3xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between gap-3 border-b border-pink-100 p-5"><div><h2 className="text-lg font-bold text-brand-pink">{kennel ? kennelDisplayName(kennel) : "Kennel"}</h2><p className="text-sm text-zinc-500">{sessions.length} checked-in pet{sessions.length === 1 ? "" : "s"} · Individual stays</p></div><button type="button" onClick={onClose} className="rounded-full bg-zinc-100 px-3 py-2" aria-label="Close">✕</button></div>
      <div className="space-y-3 overflow-y-auto p-5">{sessions.map(s => <article key={s.appointmentPetId} className="rounded-xl border border-pink-100 p-4">
        <div className="flex items-start justify-between gap-2"><div><h3 className="font-bold">{s.petName}</h3><p className="text-xs text-zinc-500">{s.breed} · Owner: {s.ownerName}</p></div><span className="rounded-full bg-purple-50 px-2 py-1 text-xs text-purple-700">Checked in</span></div>
        <div className="mt-3 grid gap-2 text-xs text-zinc-600 sm:grid-cols-2"><p>Drop-off: {fmt(s.dropOffAt)}</p><p>Pick-up: {fmt(s.pickUpAt)}</p></div>
        <button type="button" onClick={() => onPetDetails(s)} className="mt-3 rounded-full border border-brand-pink px-4 py-2 text-xs font-semibold text-brand-pink">View Pet Details</button>
      </article>)}{sessions.length === 0 && <p className="text-sm text-zinc-500">No checked-in pets currently assigned to this kennel.</p>}</div>
      <div className="border-t p-4"><button type="button" onClick={onClose} className="w-full rounded-full bg-brand-pink py-3 font-semibold text-white">Close</button></div>
    </div>
  </div>;
}
