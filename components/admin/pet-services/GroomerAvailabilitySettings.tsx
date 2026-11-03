"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchPackagesFull, fetchAddonsByCategory } from "@/lib/supabase/services";
import { fetchGroomers } from "@/lib/supabase/pet-services";
import ActionConfirmModal from "@/components/admin/operations/ActionConfirmModal";
import FeedbackDialog from "@/components/admin/operations/FeedbackDialog";

type Duration = { package_id: string; duration_minutes: number; verified: boolean };
type AlaDuration = { addon_id: string; duration_minutes: number; verified: boolean };
type ServiceDuration = { id: string; name: string; service: string; duration: number; verified: boolean; kind: "package" | "ala_carte" };
type Groomer = { id: string; name: string };
type DayOff = { id: string; groomer_id: string; off_date: string; start_time: string; end_time: string; reason: string | null };

export default function GroomerAvailabilitySettings({ refreshKey = 0 }: { refreshKey?: number }) {
  const [services, setServices] = useState<ServiceDuration[]>([]);
  const [groomers, setGroomers] = useState<Groomer[]>([]);
  const [timeOff, setTimeOff] = useState<DayOff[]>([]);
  const [groomer, setGroomer] = useState("");
  const [date, setDate] = useState("");
  const [from, setFrom] = useState("09:00");
  const [to, setTo] = useState("18:00");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [removing, setRemoving] = useState<DayOff | null>(null);

  const reload = useCallback(async () => {
    const db = createClient();
    const [dogs, cats, ala, durations, alaDurations, g, off] = await Promise.all([
      fetchPackagesFull("dog_grooming"),
      fetchPackagesFull("cat_grooming"),
      fetchAddonsByCategory("Ala Carte"),
      db.from("grooming_package_durations").select("package_id,duration_minutes,verified"),
      db.from("ala_carte_service_durations").select("addon_id,duration_minutes,verified"),
      fetchGroomers({ activeOnly: true }),
      db.from("groomer_time_off").select("id,groomer_id,off_date,start_time,end_time,reason")
        .gte("off_date", new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" })).order("off_date"),
    ]);
    const problem = dogs.error ?? cats.error ?? ala.error ?? durations.error?.message ??
      alaDurations.error?.message ?? g.error ?? off.error?.message;
    if (problem) throw new Error(problem);
    const packageDurations = new Map(((durations.data ?? []) as Duration[]).map(d => [d.package_id, d]));
    const itemDurations = new Map(((alaDurations.data ?? []) as AlaDuration[]).map(d => [d.addon_id, d]));
    const grooming: ServiceDuration[] = [
      ...dogs.packages.filter(p => p.is_active).map(p => ({ ...p, service: "Dog" })),
      ...cats.packages.filter(p => p.is_active).map(p => ({ ...p, service: "Cat" })),
    ].map(p => ({ id: p.id, name: p.name, service: p.service, kind: "package" as const,
      duration: packageDurations.get(p.id)?.duration_minutes ?? 30,
      verified: packageDurations.get(p.id)?.verified ?? false }));
    const aLaCarte: ServiceDuration[] = ala.addons.filter(a => a.is_active).map(a => ({
      id: a.id, name: a.name, service: "À La Carte", kind: "ala_carte" as const,
      duration: itemDurations.get(a.id)?.duration_minutes ?? 30,
      verified: itemDurations.get(a.id)?.verified ?? false,
    }));
    setServices([...grooming, ...aLaCarte]);
    setGroomers(g.groomers);
    setTimeOff((off.data ?? []) as DayOff[]);
  }, []);

  useEffect(() => {
    void reload().catch(e => setError(e instanceof Error ? e.message : "Could not load groomer settings"));
  }, [reload, refreshKey]);

  async function saveDuration(row: ServiceDuration) {
    if (busy) return;
    if (!Number.isInteger(row.duration) || row.duration < 30 || row.duration > 480 || row.duration % 30 !== 0) {
      setError("Service duration must be between 30 and 480 minutes, in increments of 30."); return;
    }
    setBusy(true); setError(null); setNotice(null);
    try {
      const db = createClient();
      const { error: failure } = row.kind === "ala_carte"
        ? await db.from("ala_carte_service_durations").upsert({ addon_id: row.id, duration_minutes: row.duration,
            verified: true, updated_at: new Date().toISOString() }, { onConflict: "addon_id" })
        : await db.from("grooming_package_durations").upsert({ package_id: row.id, duration_minutes: row.duration,
            verified: true, updated_at: new Date().toISOString() }, { onConflict: "package_id" });
      if (failure) throw new Error(failure.message);
      await reload();
      setNotice(`${row.service} ${row.name}: ${row.duration}-minute duration verified.`);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to save service duration."); }
    finally { setBusy(false); }
  }

  async function addTimeOff() {
    if (busy) return;
    if (!groomer || !date || from >= to) {
      setError("Choose a groomer, date, and valid unavailability period before saving."); return;
    }
    setBusy(true); setError(null); setNotice(null);
    try {
      const { error: failure } = await createClient().from("groomer_time_off")
        .insert({ groomer_id: groomer, off_date: date, start_time: from, end_time: to, reason: reason.trim() || null });
      if (failure) throw new Error(failure.message);
      await reload(); setReason(""); setNotice("Groomer time off saved.");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to save time off."); }
    finally { setBusy(false); }
  }

  async function confirmRemoveTimeOff() {
    if (!removing || busy) return;
    const id = removing.id;
    setBusy(true); setError(null); setNotice(null);
    try {
      const { error: failure } = await createClient().from("groomer_time_off").delete().eq("id", id);
      if (failure) throw new Error(failure.message);
      setRemoving(null); await reload();
      setNotice("Groomer unavailability removed. Booking capacity has been updated.");
    } catch (e) { setRemoving(null); setError(e instanceof Error ? e.message : "Unable to remove time off."); }
    finally { setBusy(false); }
  }

  return <section className="mt-10 space-y-6 rounded-2xl border border-pink-100 bg-white p-5 shadow-sm">
    <div><h2 className="text-xl font-extrabold text-brand-pink">Groomer Availability & Service Durations</h2>
      <p className="mt-1 text-sm text-zinc-600">Verify Grooming package and À La Carte item durations. These durations are used to prevent overlapping groomer reservations.</p></div>
    {notice && <p role="status" className="text-sm font-medium text-emerald-700">{notice}</p>}
    <div><h3 className="font-bold text-zinc-800">Service duration (minutes)</h3>
      <p className="mt-1 text-xs text-zinc-500">Each À La Carte item has its own duration. Multiple items for the same pet use their combined duration.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">{services.map(row => <div key={`${row.kind}-${row.id}`} className="rounded-xl border border-pink-100 p-3">
        <div className="flex items-start justify-between gap-2"><strong className="min-w-0 text-sm">{row.service}: {row.name}</strong>
          <span className={`shrink-0 text-[11px] ${row.verified ? "text-emerald-700" : "text-amber-700"}`}>{row.verified ? "Verified" : "Review required"}</span></div>
        <div className="mt-3 flex flex-wrap items-center gap-2"><input type="number" min="30" max="480" step="30" value={row.duration}
          onChange={e => setServices(current => current.map(item => item.id === row.id && item.kind === row.kind ? { ...item, duration: Number(e.target.value), verified: false } : item))}
          aria-label={`Duration in minutes for ${row.service} ${row.name}`} className="w-28 rounded-lg border border-pink-200 px-3 py-2 text-sm" />
          <button type="button" disabled={busy} onClick={() => void saveDuration(row)} className="rounded-full bg-brand-pink px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">Verify & Save</button></div>
      </div>)}</div>
      {!services.length && <p className="mt-3 text-sm text-zinc-500">No active Grooming packages or À La Carte items were found.</p>}
    </div>
    <div className="border-t border-pink-100 pt-5"><h3 className="font-bold text-zinc-800">Groomer time off / breaks</h3>
      <p className="mt-1 text-xs text-zinc-600">Unavailability prevents overlapping bookings. Removing a restriction requires confirmation.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-semibold">Groomer<select value={groomer} onChange={e => setGroomer(e.target.value)} className="mt-1 w-full rounded-lg border border-pink-200 p-2 text-sm"><option value="">Select groomer</option>{groomers.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
        <label className="text-xs font-semibold">Date<input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 w-full rounded-lg border border-pink-200 p-2 text-sm" /></label>
        <label className="text-xs font-semibold">Start<input type="time" value={from} onChange={e => setFrom(e.target.value)} className="mt-1 w-full rounded-lg border border-pink-200 p-2 text-sm" /></label>
        <label className="text-xs font-semibold">End<input type="time" value={to} onChange={e => setTo(e.target.value)} className="mt-1 w-full rounded-lg border border-pink-200 p-2 text-sm" /></label>
      </div>
      <input value={reason} onChange={e => setReason(e.target.value)} maxLength={200} placeholder="Optional reason (leave, break, training…)" className="mt-3 w-full rounded-lg border border-pink-200 p-2 text-sm" />
      <button type="button" disabled={busy} onClick={() => void addTimeOff()} className="mt-3 rounded-full border border-brand-pink px-5 py-2 text-sm font-semibold text-brand-pink disabled:opacity-40">Save Unavailability</button>
      {!!timeOff.length && <div className="mt-4 space-y-2">{timeOff.map(row => <div key={row.id} className="flex items-center justify-between gap-3 rounded-lg bg-pink-50 px-3 py-2 text-xs">
        <span className="min-w-0 break-words">{groomers.find(g => g.id === row.groomer_id)?.name ?? "Groomer"} · {row.off_date} · {row.start_time.slice(0, 5)}–{row.end_time.slice(0, 5)} {row.reason ? `· ${row.reason}` : ""}</span>
        <button type="button" disabled={busy} onClick={() => setRemoving(row)} className="shrink-0 font-bold text-red-600 disabled:opacity-50">Remove</button>
      </div>)}</div>}
    </div>
    {removing && <ActionConfirmModal title="Remove groomer unavailability?"
      description={`Removing the ${removing.off_date}, ${removing.start_time.slice(0, 5)}–${removing.end_time.slice(0, 5)} restriction can expose new booking slots. Existing appointments will not be deleted.`}
      confirmLabel="Remove Restriction" destructive pending={busy} onCancel={() => setRemoving(null)} onConfirm={confirmRemoveTimeOff} />}
    {error && <FeedbackDialog title="Groomer Settings Need Attention" message={error} onClose={() => setError(null)} />}
  </section>;
}
