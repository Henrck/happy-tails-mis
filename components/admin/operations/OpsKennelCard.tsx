import type { Kennel } from "@/lib/types/pet-services";
import type { BoardingSessionRow } from "@/lib/supabase/service-sessions";

export default function OpsKennelCard({ kennel, session, onView, onRemove, onComplete, completing }: {
  kennel: Kennel;
  session?: BoardingSessionRow | null;
  onView: () => void;
  onRemove: () => void;
  onComplete: () => void;
  completing?: boolean;
}) {
  const occupied = Boolean(session);
  const checkedIn = session?.stage === "checked_in";
  return <div className="relative rounded-2xl border border-pink-100 bg-white p-4 shadow-sm">
    <span className={`absolute right-4 top-4 h-3 w-3 rounded-full ${occupied ? "bg-red-500" : "bg-green-500"}`}/>
    <p className="font-semibold text-zinc-800">Kennel {kennel.number}</p>
    <p className="mt-1.5 text-xs text-zinc-500">{occupied ? "In use / reserved" : "Available (subject to future bookings)"}</p>
    {session && <div className="mt-3 rounded-xl border border-purple-100 bg-purple-50 p-3">
      <p className="text-sm font-semibold">{session.petName}</p><p className="text-xs text-zinc-500">{session.breed}</p>
      <span className="mt-2 inline-block rounded-full bg-purple-100 px-2 py-1 text-[10px] font-semibold text-purple-700">{session.stage.replaceAll("_", " ")}</span>
    </div>}
    <div className="mt-3 flex gap-2">
      {occupied && <button type="button" onClick={onView} className="flex-1 rounded-full border border-brand-pink px-3 py-1.5 text-xs font-semibold text-brand-pink">View Details</button>}
      {checkedIn && <button type="button" onClick={onComplete} disabled={completing} className="flex-1 rounded-full bg-brand-pink px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{completing ? "…" : "Complete"}</button>}
    </div>
    {!occupied && <button type="button" onClick={onRemove} className="mt-2 w-full rounded-full border border-amber-400 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50">Disable Kennel</button>}
  </div>;
}
