"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchKennels, addKennel, setKennelActive } from "@/lib/supabase/pet-services";
import { subscribeToServiceSessions, type BoardingSessionRow } from "@/lib/supabase/service-sessions";
import { checkoutBoardingPet, setBoardingPetPlannedPickup, fetchBoardingHistory, fetchBoardingOccupancy, type BoardingHistoryItem } from "@/lib/supabase/boarding-operations";
import type { Kennel, KennelSize } from "@/lib/types/pet-services";
import KennelStats from "@/components/admin/pet-services/KennelStats";
import BoardingFilters, { type BoardingFilterState } from "@/components/admin/pet-services/BoardingFilters";
import BoardingHistoryModal from "@/components/admin/pet-services/BoardingHistoryModal";
import OpsKennelCard from "@/components/admin/operations/OpsKennelCard";
import AddKennelModal from "@/components/admin/operations/AddKennelModal";
import SessionDetailsModal from "@/components/admin/pet-services/SessionDetailsModal";
import SessionCompletedModal from "@/components/admin/pet-services/SessionCompletedModal";
import FeedbackDialog from "@/components/admin/operations/FeedbackDialog";

type Pending = { kennel: Kennel;action: "disable" | "activate" };

export default function BoardingManagementPage() {
  const router = useRouter();
  const [kennels, setKennels] = useState<Kennel[]>([]);
  const [sessions, setSessions] = useState<BoardingSessionRow[]>([]);
  const [historyRows, setHistoryRows] = useState<BoardingHistoryItem[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<BoardingFilterState>({ search: "", status: "all" });
  const [history, setHistory] = useState(false);
  const [add, setAdd] = useState(false);
  const [viewing, setViewing] = useState<{ appointmentId: string;appointmentPetId: string } | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [completedName, setCompletedName] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [pickupTarget, setPickupTarget] = useState<BoardingSessionRow | null>(null);
  const [pickupValue, setPickupValue] = useState("");
  const [pickupBusy, setPickupBusy] = useState(false);
  const [pickupError, setPickupError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [k, s] = await Promise.all([fetchKennels({ includeInactive: true }), fetchBoardingOccupancy()]);
    if (k.error || s.error) { setError(k.error ?? s.error ?? "Unable to load boarding data."); return; }
    setKennels(k.kennels);setSessions(s.sessions);setError(null);
  }, []);
  useEffect(() => { setLoading(true);void load().finally(() => setLoading(false)); }, [load]);
  useEffect(() => subscribeToServiceSessions(() => { void load(); }), [load]);
  const active = kennels.filter((k) => k.is_active !== false);
  const inactive = kennels.filter((k) => k.is_active === false);
  const count = (size: KennelSize) => active.filter((k) => k.size === size).length;
  const sessionFor = (kennelId: string) => sessions.filter((s) => s.kennelId === kennelId);
  const filtered = active.filter((kennel) => {
    const items = sessionFor(kennel.id);
    const query = filters.search.trim().toLowerCase();
    const searchMatch = !query || String(kennel.number).includes(query) || items.some((s) => s.petName.toLowerCase().includes(query) || s.ownerName.toLowerCase().includes(query));
    // 'booked' belongs to the reservation calendar, not physical occupancy.
    const statusMatch = filters.status === "all" || (filters.status === "occupied" ? items.length > 0 : items.length === 0);
    return searchMatch && statusMatch;
  });
  const nextNumber = (size: KennelSize) => {
    const list = kennels.filter((k) => k.size === size).map((k) => k.number);
    return list.length ? Math.max(...list) + 1 : 101;
  };

  async function addK(size: KennelSize, number: number, name: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      // Forward the custom name when the installed addKennel helper supports it.
      // Older helpers accept only size/number and harmlessly ignore extra JS args.
      const saveWithName = addKennel as (kind: KennelSize, no: number, label: string) => ReturnType<typeof addKennel>;
      const { error: saveError } = await saveWithName(size, number, name);
      if (saveError) { setError(saveError.message); return; }
      setAdd(false);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to add the kennel.");
    } finally {
      setBusy(false);
    }
  }

  // The updated AddKennelModal can reactivate a disabled physical kennel.
  // Route that request through the existing confirmation and capacity check.
  function requestKennelReactivation(id: string) {
    if (busy) return;
    const kennel = inactive.find((item) => item.id === id);
    if (!kennel) { setError("The selected disabled kennel could not be found. Refresh and try again."); return; }
    setAdd(false);
    setPending({ kennel, action: "activate" });
  }
  async function toggleKennel() {
    if (!pending || busy) return;
    setBusy(true);setError(null);
    try {
      const { error: saveError } = await setKennelActive(pending.kennel.id, pending.action === "activate");
      if (saveError) { setError(saveError.message); return; }
      setPending(null);await load();
    } finally { setBusy(false); }
  }
  async function checkOut(id: string, name: string) {
    if (completingId) return;
    setCompletingId(id);setError(null);
    try {
      const result = await checkoutBoardingPet(id);
      if (result.error) setError(result.error);
      else { await load();setCompletedName(name); }
    } finally { setCompletingId(null); }
  }
  async function savePickup() {
    if (!pickupTarget || pickupBusy) return;
    const iso = new Date(`${pickupValue}:00+08:00`).toISOString();
    setPickupBusy(true);setPickupError(null);
    try {
      const r = await setBoardingPetPlannedPickup(pickupTarget.appointmentPetId, iso);
      if (r.error) { setPickupError(r.error); return; }
      setPickupTarget(null);await load();
    } catch (e) { setPickupError(e instanceof Error ? e.message : "Unable to update pickup."); }
    finally { setPickupBusy(false); }
  }
  function openPickup(session: BoardingSessionRow) {
    setPickupTarget(session);setPickupError(null);
    const dt = session.pickUpAt ? new Date(session.pickUpAt) : null;
    const bits = dt ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", hourCycle:"h23" }).formatToParts(dt) : [];
    const get = (name:string) => bits.find(b=>b.type===name)?.value??"00";
    setPickupValue(dt ? `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}` : "");
  }
  async function openHistory() {
    setHistory(true);setHistoryRows([]);setHistoryError(null);
    const result = await fetchBoardingHistory();
    setHistoryRows(result.history);setHistoryError(result.error);
  }

  return <div>
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div><h1 className="text-3xl font-bold text-brand-pink">Boarding Management</h1>
        <p className="mt-1 text-sm text-zinc-600">Active kennel capacity: <b>{count("small")} Small and {count("big")} Big</b>. Add kennels as the shop expands; booking availability follows the active roster. A shared Big kennel shows both checked-in pets.</p></div>
      <button type="button" onClick={() => setShowInactive((v) => !v)} className="rounded-full border border-pink-200 px-4 py-2 text-sm font-semibold text-brand-pink">{showInactive ? "Hide" : "View"} Disabled Kennels ({inactive.length})</button>
    </div>
    {error && <FeedbackDialog title="Boarding Needs Attention" message={error} onClose={() => setError(null)} actionLabel="Retry Loading" onAction={() => { setError(null); void load(); }} />}
    <div className="mt-6"><KennelStats small={count("small")} big={count("big")} occupied={new Set(sessions.map((s) => s.kennelId)).size}/></div>
    <div className="mt-6"><BoardingFilters filters={filters} onChange={setFilters} onBack={() => router.push("/admin/pet-services")} onOpenHistory={() => { void openHistory(); }} historyCount={historyRows.length}/></div>
    {loading ? <p className="mt-10 text-center text-zinc-400">Loading boarding occupancy…</p> : <>
      {(["small", "big"] as KennelSize[]).map((size) => {
        const items = filtered.filter((k) => k.size === size);
        return <section key={size} className="mt-6">
          <div className="flex items-center justify-between gap-2"><h2 className="font-bold uppercase text-zinc-800">{size === "big" ? "Big" : "Small"} Kennels ({count(size)} active)</h2>
            <button type="button" onClick={() => setAdd(true)} className="rounded-full border border-brand-pink px-4 py-2 text-xs font-semibold text-brand-pink disabled:opacity-40">Add Kennel</button></div>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {items.map((k) => <OpsKennelCard key={k.id} kennel={k} sessions={sessionFor(k.id)}
              onView={(appointmentId, appointmentPetId) => setViewing({ appointmentId, appointmentPetId })}
              onRemove={() => setPending({ kennel: k, action: "disable" })}
              onComplete={(id, name) => { void checkOut(id, name); }} onPlanPickup={openPickup} completing={completingId}/>)}
            {items.length === 0 && <p className="col-span-full py-8 text-center text-sm text-zinc-500">No {size} kennels match the selected filter.</p>}
          </div>
        </section>;
      })}
      {showInactive && <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-4"><h2 className="font-bold text-amber-900">Disabled Kennels</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">{inactive.map((k) => <div key={k.id} className="flex items-center justify-between gap-2 rounded-xl bg-white p-3">
          <b className="text-sm text-zinc-700">{k.size === "big" ? "Big" : "Small"} Kennel #{k.number}</b>
          <button type="button" disabled={busy} onClick={() => setPending({ kennel: k, action: "activate" })} className="rounded-full border border-emerald-400 px-3 py-2 text-xs font-semibold text-emerald-700 disabled:opacity-40">Reactivate</button>
        </div>)}{inactive.length === 0 && <p className="text-sm text-zinc-500">No disabled kennels.</p>}</div>
      </section>}
    </>}
    {pickupTarget && <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/60 p-4">
      <div role="dialog" aria-modal="true" aria-label="Plan individual pet pickup" className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-zinc-900">Plan Pickup — {pickupTarget.petName}</h3>
        <p className="mt-2 text-sm text-zinc-600">Set an earlier pickup for this pet only. The shared kennel reservation and its total charge remain unchanged, and any companion pet keeps its stay.</p>
        <label className="mt-4 block text-sm font-semibold text-zinc-700">New planned pickup (Philippine time)
          <input type="datetime-local" value={pickupValue} onChange={e=>setPickupValue(e.target.value)} className="mt-2 w-full rounded-xl border border-pink-200 p-3"/>
        </label>
        {pickupError && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{pickupError}</p>}
        <div className="mt-5 grid grid-cols-2 gap-3"><button type="button" disabled={pickupBusy} onClick={()=>setPickupTarget(null)} className="rounded-full border border-pink-200 p-3 font-semibold">Cancel</button><button type="button" disabled={pickupBusy||!pickupValue} onClick={()=>void savePickup()} className="rounded-full bg-brand-pink p-3 font-semibold text-white disabled:opacity-40">{pickupBusy?"Saving…":"Save Pickup"}</button></div>
      </div>
    </div>}
    {history && <BoardingHistoryModal history={historyRows} error={historyError} onClose={() => setHistory(false)}/>}
    {add && <AddKennelModal
      nextNumber={nextNumber}
      inactive={inactive}
      onClose={() => { if (!busy) setAdd(false); }}
      onAdd={(size, number, name) => { void addK(size, number, name); }}
      onReactivate={requestKennelReactivation}
      saving={busy}
    />}
    {viewing && <SessionDetailsModal appointmentId={viewing.appointmentId} appointmentPetId={viewing.appointmentPetId} onClose={() => setViewing(null)}/>}
    {completedName && <SessionCompletedModal petName={completedName} variant="boarding" onClose={() => setCompletedName(null)}/>}
    {pending && <div role="dialog" aria-modal="true" aria-label="Confirm kennel capacity change" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold">{pending.action === "disable" ? "Disable" : "Reactivate"} Kennel #{pending.kennel.number}?</h3>
        <p className="mt-2 text-sm text-zinc-600">{pending.action === "disable" ? "Existing reservations and kennel history are preserved. A kennel with upcoming bookings cannot be disabled." : "This kennel will become available for new reservations. The physical 6/2 capacity limit still applies."}</p>
        <div className="mt-6 grid grid-cols-2 gap-3"><button type="button" disabled={busy} onClick={() => setPending(null)} className="rounded-full border border-pink-200 py-3 text-sm font-semibold">Cancel</button>
          <button type="button" disabled={busy} onClick={() => { void toggleKennel(); }} className="rounded-full bg-brand-pink py-3 text-sm font-semibold text-white disabled:opacity-40">{busy ? "Saving…" : "Confirm"}</button></div>
      </div>
    </div>}
  </div>;
}
