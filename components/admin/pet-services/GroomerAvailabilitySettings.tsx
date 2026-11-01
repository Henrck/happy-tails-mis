"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchPackagesFull } from "@/lib/supabase/services";
import { fetchGroomers } from "@/lib/supabase/pet-services";

type Duration = { package_id: string; duration_minutes: number; verified: boolean };
type ServicePackage = { id: string; name: string; service: string; duration: number; verified: boolean };
type Groomer = { id: string; name: string };
type DayOff = { id: string; groomer_id: string; off_date: string; start_time: string; end_time: string; reason: string | null };

export default function GroomerAvailabilitySettings() {
  const [packages, setPackages] = useState<ServicePackage[]>([]);
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

  const reload = useCallback(async () => {
    const db = createClient();
    const [dogs, cats, durations, g, off] = await Promise.all([
      fetchPackagesFull("dog_grooming"), fetchPackagesFull("cat_grooming"),
      db.from("grooming_package_durations").select("package_id,duration_minutes,verified"),
      fetchGroomers({ activeOnly: true }),
      db.from("groomer_time_off").select("id,groomer_id,off_date,start_time,end_time,reason").gte("off_date", new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" })).order("off_date"),
    ]);
    const problem = dogs.error ?? cats.error ?? durations.error?.message ?? g.error ?? off.error?.message;
    if (problem) throw new Error(problem);
    const byId = new Map(((durations.data ?? []) as Duration[]).map(d => [d.package_id, d]));
    setPackages([...dogs.packages.filter(p => p.is_active).map(p => ({ ...p, service: "Dog" })),
      ...cats.packages.filter(p => p.is_active).map(p => ({ ...p, service: "Cat" }))]
      .map(p => ({ id: p.id, name: p.name, service: p.service,
        duration: byId.get(p.id)?.duration_minutes ?? 30, verified: byId.get(p.id)?.verified ?? false })));
    setGroomers(g.groomers);
    setTimeOff((off.data ?? []) as DayOff[]);
  }, []);

  useEffect(() => { void reload().catch(e => setError(e instanceof Error ? e.message : "Could not load grooming settings")); }, [reload]);

  async function saveDuration(row: ServicePackage) {
    if (busy) return;
    if (!Number.isInteger(row.duration) || row.duration < 30 || row.duration > 480 || row.duration % 30 !== 0) {
      setError("Duration must be 30–480 minutes, in increments of 30."); return;
    }
    setBusy(true); setError(null); setNotice(null);
    const { error: failure } = await createClient().from("grooming_package_durations")
      .upsert({ package_id: row.id, duration_minutes: row.duration, verified: true, updated_at: new Date().toISOString() });
    if (failure) setError(failure.message);
    else { setNotice(`${row.service} ${row.name}: ${row.duration}-minute duration verified.`); await reload().catch(e => setError(String(e))); }
    setBusy(false);
  }
  async function addTimeOff() {
    if (busy) return;
    if (!groomer || !date || from >= to) { setError("Choose groomer, date and a valid unavailable time range."); return; }
    setBusy(true); setError(null); setNotice(null);
    const { error: failure } = await createClient().from("groomer_time_off")
      .insert({ groomer_id: groomer, off_date: date, start_time: from, end_time: to, reason: reason.trim() || null });
    if (failure) setError(failure.message);
    else { setNotice("Groomer leave/break saved."); setReason(""); await reload().catch(e => setError(String(e))); }
    setBusy(false);
  }
  async function removeTimeOff(id: string) {
    if (busy) return;
    setBusy(true); setError(null);
    const { error: failure } = await createClient().from("groomer_time_off").delete().eq("id", id);
    if (failure) setError(failure.message);
    else await reload().catch(e => setError(String(e)));
    setBusy(false);
  }

  return <section className="mt-10 space-y-6 rounded-2xl border border-pink-100 bg-white p-5 shadow-sm">
    <div><h2 className="text-xl font-extrabold text-brand-pink">Groomer Availability & Package Durations</h2>
      <p className="mt-1 text-sm text-zinc-600">Verify the real working duration of each package. Bookings are blocked for a package until its duration is reviewed. One groomer cannot be reserved for overlapping sessions.</p></div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="rounded-xl bg-green-50 p-3 text-sm text-green-700">{notice}</p>}
    <div><h3 className="font-bold text-zinc-800">Service duration (minutes)</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">{packages.map(row => <div key={row.id} className="rounded-xl border border-pink-100 p-3">
        <div className="flex items-center justify-between gap-2"><strong className="text-sm">{row.service}: {row.name}</strong>
          <span className={`text-[11px] ${row.verified ? "text-emerald-700" : "text-amber-700"}`}>{row.verified ? "Verified" : "Review required"}</span></div>
        <div className="mt-3 flex items-center gap-2"><input type="number" min="30" max="480" step="30" value={row.duration}
          onChange={e => setPackages(current => current.map(p => p.id === row.id ? { ...p, duration: Number(e.target.value), verified: false } : p))}
          aria-label={`Duration in minutes for ${row.name}`} className="w-28 rounded-lg border border-pink-200 px-3 py-2 text-sm" />
          <button type="button" disabled={busy} onClick={() => void saveDuration(row)} className="rounded-full bg-brand-pink px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">Verify & Save</button></div>
      </div>)}</div>
    </div>
    <div className="border-t border-pink-100 pt-5"><h3 className="font-bold text-zinc-800">Groomer time off / breaks</h3>
      <p className="mt-1 text-xs text-zinc-600">Block a groomer for the full date or part of a day. Bookings overlapping these times will not be offered.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-semibold">Groomer<select value={groomer} onChange={e => setGroomer(e.target.value)} className="mt-1 w-full rounded-lg border border-pink-200 p-2 text-sm"><option value="">Select groomer</option>{groomers.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
        <label className="text-xs font-semibold">Date<input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 w-full rounded-lg border border-pink-200 p-2 text-sm" /></label>
        <label className="text-xs font-semibold">Start<input type="time" value={from} onChange={e => setFrom(e.target.value)} className="mt-1 w-full rounded-lg border border-pink-200 p-2 text-sm" /></label>
        <label className="text-xs font-semibold">End<input type="time" value={to} onChange={e => setTo(e.target.value)} className="mt-1 w-full rounded-lg border border-pink-200 p-2 text-sm" /></label>
      </div>
      <input value={reason} onChange={e => setReason(e.target.value)} maxLength={200} placeholder="Optional reason (leave, break, training…)" className="mt-3 w-full rounded-lg border border-pink-200 p-2 text-sm" />
      <button type="button" disabled={busy} onClick={() => void addTimeOff()} className="mt-3 rounded-full border border-brand-pink px-5 py-2 text-sm font-semibold text-brand-pink disabled:opacity-40">Save Unavailability</button>
      {!!timeOff.length && <div className="mt-4 space-y-2">{timeOff.map(row => <div key={row.id} className="flex items-center justify-between gap-3 rounded-lg bg-pink-50 px-3 py-2 text-xs">
        <span>{groomers.find(g => g.id === row.groomer_id)?.name ?? "Groomer"} · {row.off_date} · {row.start_time.slice(0,5)}–{row.end_time.slice(0,5)} {row.reason ? `· ${row.reason}` : ""}</span>
        <button type="button" disabled={busy} onClick={() => void removeTimeOff(row.id)} className="shrink-0 font-bold text-red-600">Remove</button>
      </div>)}</div>}
    </div>
  </section>;
}
