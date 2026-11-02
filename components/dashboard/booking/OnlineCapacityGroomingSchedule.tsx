"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import BookingDayCalendar from "@/components/shared/BookingDayCalendar";
import { useBookingClosures, manilaTime, manilaToday } from "@/lib/booking/use-booking-closures";
import { createClient } from "@/lib/supabase/client";
import type { DraftPetSelection } from "@/lib/types/appointments";

type Planned = { index: number; time: string; durationMinutes: number; endTime: string; groomerId: string };
type LiveSlot = { slot_time: string; capacity: number; booked: number; remaining: number };
type MonthDay = { day: string; open_slots: number; capacity: number };
type Choice = { groomer_id: string; groomer_name: string; available: boolean };
const slots = Array.from({ length: 17 }, (_, i) => {
  const minute = 9 * 60 + i * 30;
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
});
const label = (time: string) => { const [h, m] = time.split(":").map(Number); return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`; };

type Props = {
  petSelections: DraftPetSelection[];
  scheduledDate: string | null;
  scheduledTime: string | null;
  specialRequests: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onRequestsChange: (text: string) => void;
  onSelectionsChange: (items: DraftPetSelection[]) => void;
  onBack: () => void;
  onConfirmed: (items: DraftPetSelection[]) => void;
};

export default function OnlineCapacityGroomingSchedule({ petSelections, scheduledDate, scheduledTime, specialRequests,
  onDateChange, onTimeChange, onRequestsChange, onSelectionsChange, onBack, onConfirmed }: Props) {
  const closures = useBookingClosures();
  const [month, setMonth] = useState(() => (scheduledDate ?? manilaToday()).slice(0, 7));
  const [fullDates, setFullDates] = useState<Record<string, string>>({});
  const [monthError, setMonthError] = useState<string | null>(null);
  const [live, setLive] = useState<Record<string, LiveSlot>>({});
  const [capacity, setCapacity] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<Planned[] | null>(null);
  const planRef = useRef<Planned[] | null>(null);
  const [choices, setChoices] = useState<Record<string, Choice[]>>({});
  const [preference, setPreference] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(petSelections.map(s => [s.pet.id, s.groomerId])));
  const [refresh, setRefresh] = useState(0);
  const today = manilaToday();

  function invalidate() { planRef.current = null; setPlan(null); setError(null); }

  const reloadMonth = useCallback(async (key: string) => {
    const { data, error: failure } = await createClient().rpc("happytails_groomer_month_availability", { p_first_day: `${key}-01` });
    if (failure) { setMonthError(failure.message); setFullDates({}); return; }
    const unavailable: Record<string, string> = {};
    for (const item of (data ?? []) as MonthDay[]) if (item.open_slots === 0) unavailable[item.day] = item.capacity === 0 ? "No groomers available" : "Fully booked";
    setMonthError(null); setFullDates(unavailable);
  }, []);

  useEffect(() => { void reloadMonth(month); }, [month, refresh, reloadMonth]);

  const loadSlots = useCallback(async (date: string) => {
    const { data, error: failure } = await createClient().rpc("happytails_live_groomer_slots", { p_date: date });
    if (failure) throw new Error(failure.message);
    const rows = (data ?? []) as LiveSlot[];
    setLive(Object.fromEntries(rows.map(item => [item.slot_time, item])));
    setCapacity(rows[0]?.capacity ?? 0);
    return rows;
  }, []);
  useEffect(() => {
    if (!scheduledDate) { setLive({}); setCapacity(null); return; }
    let valid = true; setLoading(true);
    void loadSlots(scheduledDate).catch(e => { if (valid) { setLive({}); setError(String(e?.message ?? e)); } })
      .finally(() => { if (valid) setLoading(false); });
    return () => { valid = false; };
  }, [scheduledDate, refresh, loadSlots]);

  useEffect(() => {
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") setRefresh(v => v + 1); }, 10000);
    const focus = () => setRefresh(v => v + 1);
    window.addEventListener("focus", focus);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", focus); };
  }, []);

  useEffect(() => {
    if (!scheduledDate || !scheduledTime || !petSelections.length) { setChoices({}); return; }
    let valid = true;
    void Promise.all(petSelections.map(async s => {
      if (!s.packagePricingId) return [s.pet.id, []] as const;
      const { data, error: failure } = await createClient().rpc("happytails_groomer_choices_v2", {
        p_date: scheduledDate, p_time: scheduledTime, p_pricing_id: s.packagePricingId,
      });
      if (failure) throw new Error(failure.message);
      return [s.pet.id, (data ?? []) as Choice[]] as const;
    })).then(rows => { if (valid) setChoices(Object.fromEntries(rows)); })
      .catch(e => { if (valid) { setChoices({}); setError(`Unable to verify groomers: ${String(e?.message ?? e)}`); } });
    return () => { valid = false; };
  }, [scheduledDate, scheduledTime, petSelections, refresh]);

  useEffect(() => {
    if (scheduledDate && (closures.nameFor(scheduledDate) || fullDates[scheduledDate])) {
      planRef.current = null; setPlan(null); onTimeChange("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduledDate, closures.dates, fullDates]);

  async function calculate(date: string, time: string): Promise<Planned[] | null> {
    if (closures.loading || closures.error || monthError) { setError("Unable to verify the calendar. Refresh before proceeding."); return null; }
    const closed = await closures.verifyOpen(date);
    if (closed) { setError(closed); return null; }
    if (date < manilaToday() || (date === manilaToday() && time <= manilaTime())) { setError("Choose a future start time."); return null; }
    if (!petSelections.length || petSelections.some(s => !s.packagePricingId)) { setError("Select a package and size for every pet first."); return null; }
    setBusy(true); setError(null);
    try {
      const rows = await loadSlots(date);
      if ((rows.find(r => r.slot_time === time)?.remaining ?? 0) < 1) throw new Error("This start time is fully booked. Choose another slot.");
      const { data, error: failure } = await createClient().rpc("happytails_grooming_plan_v2", {
        p_date: date,
        p_pricing_ids: petSelections.map(s => s.packagePricingId as string),
        p_preferred_start: time,
        p_groomer_ids: petSelections.map(s => preference[s.pet.id] || null),
      });
      if (failure) throw new Error(failure.message);
      const arranged = data as Planned[];
      if (!Array.isArray(arranged) || arranged.length !== petSelections.length ||
          arranged.some(p => !p.groomerId || !p.time || !p.endTime)) throw new Error("The selected groomers cannot serve every pet today.");
      planRef.current = arranged; setPlan(arranged);
      return arranged;
    } catch (e) { planRef.current = null; setPlan(null); setError(e instanceof Error ? e.message : "Unable to plan grooming appointments."); return null; }
    finally { setBusy(false); }
  }

  function chooseDate(date: string) {
    invalidate(); setLive({}); setCapacity(null); setChoices({});
    onDateChange(date); onTimeChange("");
    onSelectionsChange(petSelections.map(s => ({ ...s, groomingScheduledTime: undefined } as DraftPetSelection)));
  }
  function chooseTime(time: string) {
    if (!scheduledDate) return;
    invalidate(); onTimeChange(time);
    onSelectionsChange(petSelections.map(s => ({ ...s, groomingScheduledTime: undefined } as DraftPetSelection)));
  }
  function chooseGroomer(petId: string, id: string) {
    invalidate(); setPreference(prev => ({ ...prev, [petId]: id || null }));
  }
  function applyGroomerToAll(id: string) {
    // The planner will assign consecutive, non-overlapping times for this groomer.
    // Only offer groomers eligible for every pet at the requested initial time.
    invalidate();
    setPreference(Object.fromEntries(petSelections.map(s => [s.pet.id, id || null])));
  }
  async function proceed() {
    if (!scheduledDate || !scheduledTime || busy) return;
    const previous = planRef.current;
    const rechecked = await calculate(scheduledDate, scheduledTime);
    if (!rechecked) return;
    if (previous && JSON.stringify(previous) !== JSON.stringify(rechecked)) {
      setError("Availability changed. Review the new groomer and time assignments, then click Next again."); return;
    }
    const updated = petSelections.map((s, i) => ({ ...s, groomerId: rechecked[i].groomerId,
      groomingScheduledTime: rechecked[i].time } as DraftPetSelection));
    onSelectionsChange(updated); onConfirmed(updated);
  }

  const disabled = closures.loading || !!closures.error || !!monthError;
  // A quick-select groomer must be eligible for all pets; the planner calculates
  // each pet's actual start time after the user makes this preference selection.
  const commonGroomers = petSelections.length && petSelections.every(s => choices[s.pet.id])
    ? (choices[petSelections[0].pet.id] ?? []).filter(g => g.available && petSelections.every(s =>
        (choices[s.pet.id] ?? []).some(option => option.groomer_id === g.groomer_id && option.available)))
    : [];
  const selectedForAll = petSelections.length && petSelections.every(s =>
    preference[s.pet.id] === preference[petSelections[0].pet.id])
    ? preference[petSelections[0].pet.id] ?? "" : "mixed";
  return <section className="mx-auto w-full max-w-4xl space-y-5">
    <header className="text-center"><h2 className="text-2xl font-bold text-brand-pink">Grooming Schedule</h2>
      <p className="mt-2 text-sm text-zinc-600">Each groomer can serve one pet at a time. Multi-pet appointments are arranged without overlapping the groomer.</p></header>
    <p className="rounded-xl border border-pink-100 bg-pink-50 px-4 py-3 text-center text-xs text-zinc-700">Active groomers: <strong>{capacity ?? "Checking…"}</strong> · 30-minute start slots · 9:00 AM–5:00 PM · Philippine time. Actual treatment durations vary by package.</p>
    <BookingDayCalendar value={scheduledDate} onChange={chooseDate} closures={closures} unavailable={fullDates} onMonthChange={setMonth} title="Grooming" />
    {monthError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{monthError}</p>}
    <div><h3 className="mb-2 font-semibold">Choose preferred start time</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">{slots.map(time => {
        const item = live[time]; const past = !scheduledDate || scheduledDate < today || (scheduledDate === today && time <= manilaTime());
        const full = !!item && item.remaining === 0;
        const inactive = disabled || loading || busy || past || !item || full || !!fullDates[scheduledDate ?? ""];
        return <button key={time} type="button" disabled={inactive} onClick={() => chooseTime(time)}
          aria-pressed={scheduledTime === time} className={`min-h-14 rounded-xl border px-2 py-2 text-xs font-semibold ${full ? "border-red-200 bg-red-50 text-red-700" : scheduledTime === time ? "border-brand-pink bg-pink-50 text-brand-pink" : "border-pink-200"} disabled:opacity-50`}>
          <span className="block">{label(time)}</span><span className="text-[10px]">{past ? "Unavailable" : !item ? "Checking…" : full ? "Full" : `${item.remaining} available`}</span>
        </button>;
      })}</div>
    </div>
    {scheduledDate && scheduledTime && <div className="rounded-2xl border border-pink-200 bg-white p-4">
      <h3 className="font-semibold">Groomer preference for each pet</h3>
      <p className="mt-1 text-xs text-zinc-500">Only groomers available for the selected start time appear. The same groomer may be selected for multiple pets in this booking; later pets start after earlier sessions finish.</p>
      {petSelections.length > 1 && <div className="mt-4 rounded-xl border border-pink-200 bg-pink-50 p-3">
        <label htmlFor="groomer-quick-select" className="block text-sm font-bold text-zinc-800">Quick select — apply to all {petSelections.length} pets</label>
        <p className="mt-1 text-xs text-zinc-600">Choose one groomer for every pet. The schedule will arrange their sessions one after another based on each package's duration. You can still change individual pets below.</p>
        <select id="groomer-quick-select" value={selectedForAll} onChange={e => applyGroomerToAll(e.target.value)}
          disabled={busy}
          className="mt-2 w-full rounded-xl border border-pink-200 bg-white px-3 py-3 text-sm">
          {selectedForAll === "mixed" && <option value="mixed" disabled>Different groomers selected</option>}
          <option value="">No preference — assign automatically</option>
          {commonGroomers.map(g => <option key={g.groomer_id} value={g.groomer_id}>{g.groomer_name}</option>)}
          {selectedForAll && selectedForAll !== "mixed" && !commonGroomers.some(g => g.groomer_id === selectedForAll) &&
            <option value={selectedForAll} disabled>Selected groomer no longer available</option>}
        </select>
        {!commonGroomers.length && <p className="mt-2 text-xs text-amber-700">No single groomer is available for every pet at this start time. Select groomers separately or choose another time.</p>}
      </div>}
      <div className="mt-3 space-y-3">{petSelections.map(s => {
        const available = (choices[s.pet.id] ?? []).filter(g => g.available);
        const selected = preference[s.pet.id] ?? "";
        return <label key={s.pet.id} className="block text-sm font-semibold text-zinc-700">{s.pet.name}
          <select value={selected} onChange={e => chooseGroomer(s.pet.id, e.target.value)}
            className="mt-1 w-full rounded-xl border border-pink-200 bg-white px-3 py-3 text-sm">
            <option value="">No preference — assign automatically</option>
            {available.map(g => <option key={g.groomer_id} value={g.groomer_id}>{g.groomer_name}</option>)}
            {selected && !available.some(g => g.groomer_id === selected) &&
              <option value={selected} disabled>Previously selected groomer unavailable — change selection</option>}
          </select>
        </label>;
      })}</div>
      <button type="button" disabled={busy || loading || disabled} onClick={() => void calculate(scheduledDate, scheduledTime)}
        className="mt-4 w-full rounded-full border border-brand-pink px-4 py-3 text-sm font-bold text-brand-pink disabled:opacity-50">
        {busy ? "Checking availability…" : "Check & Arrange Grooming Times"}
      </button>
    </div>}
    {plan && <section className="rounded-2xl border border-pink-200 bg-pink-50 p-4">
      <h3 className="font-semibold">Proposed non-overlapping appointments</h3>
      {petSelections.map((s, i) => <div key={s.pet.id} className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white p-3 text-sm">
        <strong>{s.pet.name}</strong><span>{choices[s.pet.id]?.find(g => g.groomer_id === plan[i].groomerId)?.groomer_name ?? "Assigned groomer"} · {label(plan[i].time)}–{label(plan[i].endTime)} · {plan[i].durationMinutes} min</span>
      </div>)}
      <p className="mt-3 text-xs text-zinc-600">Start times may differ per pet. We recheck all groomer reservations at checkout.</p>
    </section>}
    <label className="block text-sm font-semibold">Special requests<textarea rows={3} value={specialRequests} onChange={e => onRequestsChange(e.target.value)} className="mt-2 w-full rounded-xl border border-pink-200 p-3 text-sm" /></label>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="grid grid-cols-2 gap-3"><button type="button" onClick={onBack} className="rounded-full border border-pink-200 py-3 font-semibold text-brand-pink">Back</button>
      <button type="button" onClick={() => void proceed()} disabled={disabled || busy || loading || !plan || !!error} className="rounded-full bg-brand-pink py-3 font-semibold text-white disabled:opacity-40">Next</button></div>
  </section>;
}
