"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchGroomers, addGroomer, setGroomerStatus } from "@/lib/supabase/pet-services";
import { fetchGroomingSessions, subscribeToServiceSessions, type GroomingSessionRow } from "@/lib/supabase/service-sessions";
import { completeAppointmentPet, updateAppointmentStatus } from "@/lib/supabase/appointment-management";
import { createClient } from "@/lib/supabase/client";
import type { Groomer } from "@/lib/types/pet-services";
import SessionFilters, { type SessionFilterState } from "@/components/admin/pet-services/SessionFilters";
import HistoryModal from "@/components/admin/pet-services/HistoryModal";
import AddGroomerModal from "@/components/admin/pet-services/AddGroomerModal";
import SessionDetailsModal from "@/components/admin/pet-services/SessionDetailsModal";
import SessionCompletedModal from "@/components/admin/pet-services/SessionCompletedModal";
import GroomerAvailabilitySettings from "@/components/admin/pet-services/GroomerAvailabilitySettings";

export default function GroomingManagementPage() {
  const router = useRouter();
  const [groomers, setGroomers] = useState<Groomer[]>([]);
  const [sessions, setSessions] = useState<GroomingSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SessionFilterState>({ search: "", status: "all", groomer: "all" });
  const [history, setHistory] = useState(false);
  const [add, setAdd] = useState(false);
  const [viewing, setViewing] = useState<GroomingSessionRow | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [completedName, setCompletedName] = useState<string | null>(null);
  const load = useCallback(async () => {
    const [g, s] = await Promise.all([fetchGroomers(), fetchGroomingSessions()]);
    if (g.error || s.error) { setError(g.error ?? s.error ?? "Unable to load grooming data."); return; }
    // A completed pet must not reappear as an active session if the parent
    // appointment email/status API temporarily fails afterward.
    const ids = s.sessions.map(item => item.appointmentPetId);
    if (ids.length) {
      const { data: petRows, error: pe } = await createClient().from("appointment_pets")
        .select("id,status").in("id", ids);
      if (pe) { setError(pe.message); return; }
      const ongoing = new Set((petRows ?? []).filter(p => p.status !== "completed").map(p => p.id));
      setSessions(s.sessions.filter(item => ongoing.has(item.appointmentPetId)));
    } else setSessions([]);
    setError(null); setGroomers(g.groomers);
  }, []);
  useEffect(() => { setLoading(true); void load().finally(() => setLoading(false)); }, [load]);
  useEffect(() => subscribeToServiceSessions(load), [load]);
  const active = groomers.filter(g => g.status === "active");
  const visible = sessions.filter(s => (filters.groomer === "all" || s.groomerName === filters.groomer) &&
    (!filters.search || `${s.petName} ${s.ownerName}`.toLowerCase().includes(filters.search.toLowerCase())));
  async function addG(name: string) {
    const result = await addGroomer(name);
    if (result.error) return result.error.message;
    await load(); return null;
  }
  async function toggle(id: string, status: "active" | "archived") {
    setError(null);
    const result = await setGroomerStatus(id, status === "active" ? "archived" : "active");
    if (result.error) { setError(result.error.message); return; }
    await load();
  }
  async function completePet(appointmentPetId: string, petName: string, appointmentId: string) {
    if (completingId) return;
    setCompletingId(appointmentPetId); setError(null);
    try {
      const result = await completeAppointmentPet(appointmentPetId, "groomer");
      if (result.error) { setError(result.error); return; }
      const { data: pets, error: petError } = await createClient().from("appointment_pets")
        .select("id,status").eq("appointment_id", appointmentId);
      if (petError) { setError(`Pet status could not be verified: ${petError.message}`); return; }
      if (!(pets ?? []).some(p => p.id === appointmentPetId && p.status === "completed")) {
        setError("Pet completion was not saved. Refresh this appointment before retrying."); return;
      }
      let completionError: string | null = null;
      if ((pets ?? []).length && (pets ?? []).every(p => p.status === "completed")) {
        // Use the authenticated status API to preserve customer email delivery.
        const updated = await updateAppointmentStatus(appointmentId, "completed");
        if (updated.error) completionError = `Pet completed, but the parent appointment needs staff attention: ${updated.error.message}`;
      }
      setCompletedName(petName);
      await load();
      if (completionError) setError(completionError);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to complete this grooming session."); }
    finally { setCompletingId(null); }
  }
  return <div>
    <h1 className="text-3xl font-bold text-brand-pink">Grooming Management</h1>
    <p className="mt-2 text-sm text-zinc-500">Manage sessions, individual groomer reservations, package durations, and staff availability.</p>
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
      <div className="rounded-2xl border border-pink-100 bg-white p-4"><p className="text-sm font-semibold">Active Sessions</p><p className="mt-1 text-2xl font-bold">{sessions.length}</p></div>
      <div className="rounded-2xl border border-pink-100 bg-white p-4"><p className="text-sm font-semibold">Available Right Now</p><p className="mt-1 text-2xl font-bold">{active.filter(g => !sessions.some(s => s.groomerId === g.id)).length}</p></div>
      <div className="rounded-2xl border border-pink-100 bg-white p-4"><p className="text-sm font-semibold">Active Groomers</p><p className="mt-1 text-2xl font-bold">{active.length}</p></div>
    </div>
    <div className="mt-6 flex flex-wrap gap-3">
      <SessionFilters filters={filters} onChange={setFilters} groomerNames={active.map(g => g.name)}
        onBack={() => router.push("/admin/pet-services")} onOpenHistory={() => setHistory(true)} historyCount={0} />
      <button type="button" onClick={() => setAdd(true)} className="rounded-full border-2 border-brand-pink px-5 py-2 text-sm font-semibold text-brand-pink">Add Groomer</button>
    </div>
    {loading ? <p className="mt-10 text-center text-zinc-400">Loading…</p> : <div className="mt-6 space-y-6">
      {active.map(g => {
        const gs = visible.filter(s => s.groomerId === g.id);
        return <section key={g.id}>
          <div className="flex justify-between gap-3"><div><h3 className="font-bold">{g.name} <span className="font-normal text-zinc-500">({gs.length}/1)</span></h3>
            <p className="text-xs text-zinc-400">{gs.length ? "In Progress" : "Available"}</p></div>
            <button type="button" onClick={() => void toggle(g.id, g.status)} className="rounded-full border border-red-400 px-3 py-1 text-xs text-red-500">Archive</button></div>
          {gs.length ? <div className="mt-3 grid gap-4 sm:grid-cols-2 md:grid-cols-3">{gs.map(s => <div key={s.appointmentPetId} className="rounded-2xl border border-pink-100 bg-white p-4">
            <div className="flex justify-between"><strong>{s.petName}</strong><span className="rounded-full bg-violet-50 px-2 py-1 text-[10px] text-violet-700">In Progress</span></div>
            <p className="mt-1 text-xs text-zinc-500">{s.breed}</p><p className="mt-2 text-xs text-zinc-400">Owner: {s.ownerName}</p>
            <div className="mt-3 flex gap-2"><button type="button" onClick={() => setViewing(s)} className="flex-1 rounded-full border border-brand-pink px-3 py-2 text-xs font-semibold text-brand-pink">Details</button>
              <button type="button" onClick={() => void completePet(s.appointmentPetId, s.petName, s.appointmentId)} disabled={completingId === s.appointmentPetId}
                className="flex-1 rounded-full bg-brand-pink px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">{completingId === s.appointmentPetId ? "Saving…" : "Complete"}</button></div>
          </div>)}</div> : <div className="mt-3 rounded-2xl border border-dashed border-pink-200 p-5 text-sm text-zinc-400">No active pet session.</div>}
        </section>;
      })}
    </div>}
    <GroomerAvailabilitySettings />
    {history && <HistoryModal completedSessions={[]} onClose={() => setHistory(false)} />}
    {add && <AddGroomerModal groomers={groomers} onClose={() => setAdd(false)} onAdd={addG} onArchiveToggle={toggle} />}
    {viewing && <SessionDetailsModal appointmentId={viewing.appointmentId} appointmentPetId={viewing.appointmentPetId} onClose={() => setViewing(null)} />}
    {completedName && <SessionCompletedModal petName={completedName} onClose={() => setCompletedName(null)} />}
  </div>;
}
