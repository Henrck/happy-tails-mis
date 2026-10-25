"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchKennels, addKennel, setKennelActive } from "@/lib/supabase/pet-services";
import { fetchBoardingSessions, subscribeToServiceSessions, type BoardingSessionRow } from "@/lib/supabase/service-sessions";
import { completeAppointmentPet } from "@/lib/supabase/appointment-management";
import type { Kennel, KennelSize } from "@/lib/types/pet-services";
import KennelStats from "@/components/admin/pet-services/KennelStats";
import BoardingFilters, { type BoardingFilterState } from "@/components/admin/pet-services/BoardingFilters";
import BoardingHistoryModal from "@/components/admin/pet-services/BoardingHistoryModal";
import OpsKennelCard from "@/components/admin/operations/OpsKennelCard";
import AddKennelModal from "@/components/admin/operations/AddKennelModal";
import SessionDetailsModal from "@/components/admin/pet-services/SessionDetailsModal";
import SessionCompletedModal from "@/components/admin/pet-services/SessionCompletedModal";

type Pending = { kennel: Kennel; action: "disable" | "activate" };

export default function BoardingManagementPage() {
  const router = useRouter();
  const [kennels, setKennels] = useState<Kennel[]>([]);
  const [sessions, setSessions] = useState<BoardingSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<BoardingFilterState>({ search: "", status: "all" });
  const [history, setHistory] = useState(false);
  const [add, setAdd] = useState(false);
  const [viewing, setViewing] = useState<BoardingSessionRow | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [completedName, setCompletedName] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const load = useCallback(async () => {
    const [k, s] = await Promise.all([fetchKennels({ includeInactive: true }), fetchBoardingSessions()]);
    if (k.error || s.error) { setError(k.error ?? s.error ?? "Unable to load boarding data."); return; }
    setKennels(k.kennels);
    setSessions(s.sessions);
    setError(null);
  }, []);
  useEffect(() => { setLoading(true); void load().finally(() => setLoading(false)); }, [load]);
  useEffect(() => subscribeToServiceSessions(load), [load]);

  const active = kennels.filter((k) => k.is_active !== false);
  const inactive = kennels.filter((k) => k.is_active === false);
  const filtered = active.filter((k) => {
    const session = sessions.find((s) => s.kennelId === k.id);
    const q = filters.search.trim().toLowerCase();
    const matchesSearch = !q || String(k.number).includes(q) || session?.petName.toLowerCase().includes(q);
    const matchesStatus = filters.status === "all" || (session ? session.stage === filters.status : false);
    return matchesSearch && matchesStatus;
  });
  const nextNumber = (size: KennelSize) => {
    const numbers = kennels.filter((k) => k.size === size).map((k) => k.number);
    return numbers.length ? Math.max(...numbers) + 1 : 101;
  };

  async function addK(size: KennelSize, number: number) {
    const { error: addError } = await addKennel(size, number);
    if (addError) { setError(addError.message); return; }
    setAdd(false);
    await load();
  }
  async function toggleKennel() {
    if (!pending || busy) return;
    setBusy(true); setError(null);
    try {
      const { error: updateError } = await setKennelActive(pending.kennel.id, pending.action === "activate");
      if (updateError) { setError(updateError.message); return; }
      setPending(null);
      await load();
    } finally { setBusy(false); }
  }
  async function complete(appointmentPetId: string, petName: string) {
    setCompletingId(appointmentPetId);
    const result = await completeAppointmentPet(appointmentPetId, "kennel");
    if (result.error) setError(result.error);
    else { setSessions((previous) => previous.filter((s) => s.appointmentPetId !== appointmentPetId)); setCompletedName(petName); }
    setCompletingId(null);
  }

  return <div>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h1 className="text-3xl font-bold text-brand-pink">Boarding Management</h1>
        <p className="mt-1 text-sm text-zinc-600">Live capacity: <strong>{active.filter((k) => k.size === "small").length} Small</strong> and <strong>{active.filter((k) => k.size === "big").length} Big</strong> kennels. Reservations block the entire stay.</p>
      </div>
      <button type="button" onClick={() => setShowInactive((v) => !v)} className="rounded-full border border-pink-200 px-4 py-2 text-sm font-semibold text-brand-pink">
        {showInactive ? "Hide" : "View"} Disabled Kennels ({inactive.length})
      </button>
    </div>
    {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="mt-6"><KennelStats kennels={active.map((k) => ({ session: sessions.some((s) => s.kennelId === k.id) ? { stage: "checked_in" as const } : null }))}/></div>
    <div className="mt-6"><BoardingFilters filters={filters} onChange={setFilters} onBack={() => router.push("/admin/pet-services")} onOpenHistory={() => setHistory(true)} historyCount={0}/></div>
    {loading ? <p className="mt-10 text-center text-zinc-400">Loading…</p> : <>
      {(["small", "big"] as KennelSize[]).map((size) => {
        const items = filtered.filter((k) => k.size === size);
        return <section key={size} className="mt-6">
          <div className="flex items-center justify-between gap-2"><h2 className="font-bold uppercase text-zinc-800">{size === "big" ? "Big" : "Small"} Kennels ({active.filter((k) => k.size === size).length})</h2>
            <button type="button" onClick={() => setAdd(true)} className="rounded-full border border-brand-pink px-4 py-2 text-xs font-semibold text-brand-pink">Add Kennel</button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {items.map((k) => { const s = sessions.find((s) => s.kennelId === k.id) ?? null;
              return <OpsKennelCard key={k.id} kennel={k} session={s}
                onView={() => { if (s) setViewing(s); }}
                onRemove={() => setPending({ kennel: k, action: "disable" })}
                onComplete={() => { if (s) void complete(s.appointmentPetId, s.petName); }}
                completing={!!s && completingId === s.appointmentPetId}/>;
            })}
            {items.length === 0 && <p className="col-span-full py-6 text-center text-sm text-zinc-400">No {size} kennels match these filters.</p>}
          </div>
        </section>;
      })}
      {showInactive && <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <h2 className="font-bold text-amber-900">Disabled Kennels</h2>
        <p className="mt-1 text-xs text-amber-900">Disabled kennels are not included in customer/POS availability. Appointment history is preserved.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {inactive.map((k) => <div key={k.id} className="flex items-center justify-between gap-2 rounded-xl bg-white p-3">
            <span className="text-sm font-semibold text-zinc-700">{k.size === "big" ? "Big" : "Small"} Kennel {k.number}</span>
            <button type="button" onClick={() => setPending({ kennel: k, action: "activate" })} className="rounded-full border border-emerald-400 px-3 py-1.5 text-xs font-semibold text-emerald-700">Reactivate</button>
          </div>)}
          {!inactive.length && <p className="text-sm text-zinc-500">No disabled kennels.</p>}
        </div>
      </section>}
    </>}
    {history && <BoardingHistoryModal history={[]} onClose={() => setHistory(false)}/>}
    {add && <AddKennelModal nextNumber={nextNumber} onClose={() => setAdd(false)} onAdd={(size, number) => { void addK(size, number); }}/>}
    {viewing && <SessionDetailsModal appointmentId={viewing.appointmentId} appointmentPetId={viewing.appointmentPetId} onClose={() => setViewing(null)}/>}
    {completedName && <SessionCompletedModal petName={completedName} onClose={() => setCompletedName(null)}/>}
    {pending && <div role="dialog" aria-modal="true" aria-label="Confirm kennel status" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-zinc-800">{pending.action === "disable" ? "Disable" : "Reactivate"} Kennel {pending.kennel.number}?</h3>
        <p className="mt-2 text-sm leading-6 text-zinc-600">{pending.action === "disable"
          ? "This removes the kennel from new booking capacity but retains all history. Kennels with upcoming reservations cannot be disabled."
          : "This adds the kennel back to the available booking capacity for its size."}</p>
        <div className="mt-6 grid grid-cols-2 gap-3"><button type="button" disabled={busy} onClick={() => setPending(null)} className="rounded-full border border-pink-200 py-3 text-sm font-semibold text-brand-pink disabled:opacity-50">Cancel</button>
          <button type="button" disabled={busy} onClick={() => { void toggleKennel(); }} className="rounded-full bg-brand-pink py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Confirm"}</button>
        </div>
      </div>
    </div>}
  </div>;
}
