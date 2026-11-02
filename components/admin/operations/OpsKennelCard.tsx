import type { Kennel } from "@/lib/types/pet-services";
import type { BoardingSessionRow } from "@/lib/supabase/service-sessions";

/** One physical kennel may now contain two compatible pets from a single booking. */
export default function OpsKennelCard({ kennel, sessions, onView, onRemove, onComplete, onPlanPickup, completing }: {
  kennel: Kennel;
  sessions: BoardingSessionRow[];
  onView: (appointmentId: string, appointmentPetId: string) => void;
  onRemove: () => void;
  onComplete: (appointmentPetId: string, petName: string) => void;
  onPlanPickup: (session: BoardingSessionRow) => void;
  completing?: string | null;
}) {
  const occupied = sessions.length > 0;
  return <article className="relative rounded-2xl border border-pink-100 bg-white p-4 shadow-sm">
    <span className={`absolute right-4 top-4 h-3 w-3 rounded-full ${occupied ? "bg-red-500" : "bg-emerald-500"}`}/>
    <p className="font-semibold text-zinc-800">{kennel.size === "big" ? "Big" : "Small"} Kennel {kennel.number}</p>
    <p className="mt-1 text-xs text-zinc-500">{occupied ? `${sessions.length} checked-in pet${sessions.length === 1 ? "" : "s"}` : "Not physically occupied (future reservations may exist)"}</p>
    <div className="mt-3 space-y-2">{sessions.map((session) => <div key={session.appointmentPetId} className="rounded-xl border border-purple-100 bg-purple-50 p-3">
      <p className="text-sm font-bold text-zinc-800">{session.petName}</p>
      <p className="mt-1 text-xs text-zinc-600">{session.breed} · {session.ownerName}</p>
      {session.pickUpAt && <p className="mt-1 text-xs text-zinc-600">Planned pickup: {new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" }).format(new Date(session.pickUpAt))}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => onView(session.appointmentId, session.appointmentPetId)} className="rounded-full border border-brand-pink px-3 py-1.5 text-xs font-semibold text-brand-pink">View</button>
        <button type="button" onClick={() => onPlanPickup(session)} className="rounded-full border border-amber-400 px-3 py-1.5 text-xs font-semibold text-amber-800">Plan Pickup</button>
        <button type="button" disabled={!!completing} onClick={() => onComplete(session.appointmentPetId, session.petName)} className="rounded-full bg-brand-pink px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{completing === session.appointmentPetId ? "Checking out…" : "Check Out"}</button>
      </div>
    </div>)}</div>
    {!occupied && <button type="button" onClick={onRemove} className="mt-3 w-full rounded-full border border-amber-400 px-3 py-2 text-xs font-semibold text-amber-700">Disable Kennel</button>}
  </article>;
}
