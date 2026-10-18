"use client";

import { useEffect, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { DraftPetSelection } from "@/lib/types/appointments";

type Scheduled = DraftPetSelection & { groomingScheduledTime?: string };
type Planned = { index: number; time: string; durationMinutes: number; endTime: string };
type SlotAvailability = { time: string; remaining: number; capacity: number };
const slots = Array.from({ length: 17 }, (_, i) => {
  const m = 9 * 60 + i * 30;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
});
function phParts() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  return Object.fromEntries(parts.map(p => [p.type, p.value]));
}
function phToday() {
  const p = phParts(); return `${p.year}-${p.month}-${p.day}`;
}
function phNow() {
  const p = phParts(); return `${p.hour}:${p.minute}`;
}
function label(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}
export default function OnlineCapacityGroomingSchedule({ petSelections, scheduledDate, scheduledTime, specialRequests, onDateChange, onTimeChange, onRequestsChange, onSelectionsChange, onBack, onConfirmed }: {
  petSelections: DraftPetSelection[];
  scheduledDate: string | null;
  scheduledTime: string | null;
  specialRequests: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onRequestsChange: (value: string) => void;
  onSelectionsChange: (items: DraftPetSelection[]) => void;
  onBack: () => void;
  onConfirmed: (items: DraftPetSelection[]) => void;
}) {
  const [plan, setPlan] = useState<Planned[] | null>(null);
  const [availability, setAvailability] = useState<Record<string, SlotAvailability>>({});
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [month, setMonth] = useState(() => {
    const parsed = scheduledDate?.split("-").map(Number);
    return parsed && parsed.length === 3 && parsed.every(Number.isFinite)
      ? new Date(parsed[0], parsed[1] - 1, 1)
      : new Date(`${phToday()}T00:00:00`);
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30000); return () => window.clearInterval(timer); }, []);
  const today = phToday();
  const thisMonth = today.slice(0, 7);
  const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const calendarCells = Array.from({ length: Math.ceil((firstDay + daysInMonth) / 7) * 7 }, (_, i) => i - firstDay + 1);
  const timeNow = phNow();
  void now;

  useEffect(() => {
    let alive = true;
    if (!scheduledDate || !petSelections.length) {
      setAvailability({}); setAvailabilityLoading(false); setAvailabilityError(null); return;
    }
    setAvailability({}); setAvailabilityLoading(true); setAvailabilityError(null);
    const controller = new AbortController();
    // One database request calculates availability for all 30-minute starts.
    void createClient().rpc("happytails_grooming_slot_availability", {
      p_date: scheduledDate,
      p_pricing_ids: petSelections.map(p => p.packagePricingId as string),
      p_groomer_ids: petSelections.map(p => p.groomerId),
    }).abortSignal(controller.signal).then(({ data, error }) => {
      if (!alive) return;
      if (error) { setAvailabilityError("Unable to load live availability. Please try another date or refresh."); return; }
      const results = Array.isArray(data) ? data as SlotAvailability[] : [];
      setAvailability(Object.fromEntries(results.map(item => [item.time, item])));
    }).catch(() => {
      if (alive) setAvailabilityError("Unable to load live availability. Please refresh.");
    }).finally(() => { if (alive) setAvailabilityLoading(false); });
    return () => { alive = false; controller.abort(); };
  // Values are intentionally captured from the current pet selections for each new lookup.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduledDate, petSelections.length]);

  async function calculate(date: string, time: string): Promise<Planned[] | null> {
    if (!date || !time || !petSelections.length || petSelections.some(p => !p.packagePricingId)) {
      setError("Complete the grooming package and size for every pet first."); return null;
    }
    if (date < phToday() || (date === phToday() && time <= phNow())) {
      setError("That time has already passed. Choose a future starting time."); return null;
    }
    setBusy(true); setError(null);
    try {
      const { data, error: failure } = await createClient().rpc("happytails_grooming_plan", {
        p_date: date,
        p_pricing_ids: petSelections.map(p => p.packagePricingId as string),
        p_preferred_start: time,
        p_groomer_ids: petSelections.map(p => p.groomerId),
      });
      if (failure) throw new Error(failure.message);
      const result = data as Planned[];
      if (!Array.isArray(result) || result.length !== petSelections.length) throw new Error("Could not obtain a complete schedule for every pet.");
      setPlan(result); return result;
    } catch (e) {
      setPlan(null);
      setError(e instanceof Error ? e.message : "Unable to calculate grooming availability.");
      return null;
    } finally { setBusy(false); }
  }
  function changeDate(date: string) {
    setPlan(null); setError(null); onDateChange(date); onTimeChange("");
    onSelectionsChange(petSelections.map(p => ({ ...p, groomingScheduledTime: undefined })));
  }
  function changeTime(time: string) {
    setPlan(null); setError(null); onTimeChange(time);
    onSelectionsChange(petSelections.map(p => ({ ...p, groomingScheduledTime: undefined })));
    if (scheduledDate) void calculate(scheduledDate, time);
  }
  async function proceed() {
    if (!scheduledDate || !scheduledTime || busy) return;
    const checked = await calculate(scheduledDate, scheduledTime);
    if (!checked) return;
    if (plan && JSON.stringify(plan) !== JSON.stringify(checked)) {
      setError("Availability changed. Please review the updated pet times and click Next again."); return;
    }
    const finalized = petSelections.map((pet, i) => ({ ...pet, groomingScheduledTime: checked[i].time }));
    onSelectionsChange(finalized);
    onConfirmed(finalized);
  }
  return <section className="mx-auto w-full max-w-4xl space-y-4">
    <header className="text-center"><h2 className="text-2xl font-bold text-brand-pink">Grooming Schedule</h2>
      <p className="mt-2 text-sm text-zinc-600">Choose a preferred time. Each 30-minute start time accepts up to 3 grooming pets, regardless of package.</p></header>
    <p className="rounded-xl border border-pink-100 bg-pink-50 px-4 py-3 text-xs text-zinc-700">3 pets per 30-minute start time · First come, first served · Last accepted start: 5:00 PM.</p>
    <section className="mx-auto w-full max-w-[460px] rounded-2xl border border-pink-100 bg-white p-3 sm:p-4" aria-label="Preferred grooming date calendar">
      <div className="mb-2 flex items-center justify-between gap-2">
        <button type="button" aria-label="Previous month" disabled={monthKey <= thisMonth} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="rounded-full p-2 text-slate-600 hover:bg-pink-50 disabled:opacity-30"><ChevronLeft size={19}/></button>
        <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-800"><CalendarDays size={17} className="text-brand-pink"/>{month.toLocaleDateString("en-US", {month:"long",year:"numeric"})}</h3>
        <button type="button" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="rounded-full p-2 text-slate-600 hover:bg-pink-50"><ChevronRight size={19}/></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(day => <span key={day} className="py-1 text-[10px] font-semibold text-slate-400">{day}</span>)}
        {calendarCells.map((day, i) => {
          const inRange = day > 0 && day <= daysInMonth;
          const date = inRange ? `${monthKey}-${String(day).padStart(2, "0")}` : "";
          const disabled = !inRange || date < today;
          return <button key={i} type="button" disabled={disabled} aria-label={inRange ? date : "Outside month"} aria-pressed={date === scheduledDate} onClick={() => changeDate(date)} className={`aspect-square min-h-8 rounded-lg text-xs font-semibold transition ${date === scheduledDate ? "bg-brand-pink text-white" : disabled ? "text-slate-300" : "text-zinc-700 hover:bg-pink-50"} disabled:cursor-not-allowed`}>{inRange ? day : ""}</button>;
        })}
      </div>
      <p className="mt-2 text-center text-[11px] text-zinc-500">Select a day to see available 30-minute start times.</p>
    </section>
    <div><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-zinc-800">Preferred first start time</p>
      <span className="text-xs text-zinc-500" aria-live="polite">{availabilityLoading ? "Checking availability…" : scheduledDate ? "Live estimates for your selected pets" : "Select a date first"}</span></div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" aria-label="Grooming time slot availability">
        {slots.map(t => {
          const past = !scheduledDate || scheduledDate < today || (scheduledDate === today && t <= timeNow);
          const info = availability[t];
          const full = info?.remaining === 0;
          const disabled = past || busy || availabilityLoading || !info || full;
          const color = full ? "text-red-600" : info && info.remaining === 1 ? "text-amber-700" : "text-emerald-700";
          const status = past ? "Unavailable" : availabilityLoading || !info ? "Checking…" : full ? "Full" : `${info.remaining} available`;
          return <button key={t} type="button" disabled={disabled} onClick={() => changeTime(t)} aria-pressed={scheduledTime === t} title={info && !past ? `${info.remaining} of ${info.capacity} grooming slots remain at this time` : status}
            className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl border px-2 py-2 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-brand-pink ${scheduledTime === t ? "border-brand-pink bg-pink-50 text-brand-pink" : "border-pink-200 bg-white text-zinc-700 hover:border-brand-pink"} disabled:cursor-not-allowed disabled:opacity-50`}>
            <span>{label(t)}</span><span className={`text-[10px] font-bold ${past ? "text-zinc-400" : availabilityLoading || !info ? "text-zinc-400" : color}`}>
              {status}
            </span>
          </button>;
        })}
      </div>
      <p className="mt-2 text-xs leading-5 text-zinc-500">Each time starts with 3 pet slots. Full means all 3 are taken. For multi-pet bookings, remaining pets are offered later available times. Availability is checked again when you book.</p>
      {availabilityError && <p role="alert" className="mt-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">{availabilityError}</p>}
    </div>
    {busy && <p className="text-sm text-zinc-500">Checking timeslot availability and arranging pets…</p>}
    {plan && !busy && <section className="rounded-2xl border border-pink-200 bg-pink-50/50 p-4">
      <h3 className="font-bold text-zinc-800">Proposed schedule for {petSelections.length} {petSelections.length === 1 ? "pet" : "pets"}</h3>
      <div className="mt-3 space-y-2">{petSelections.map((p, i) => <div key={p.pet.id} className="flex flex-wrap justify-between gap-2 rounded-xl bg-white p-3 text-sm">
        <span className="font-semibold">{p.pet.name}</span>
        <span>Start: {label(plan[i].time)}</span>
      </div>)}</div><p className="mt-3 text-xs text-zinc-500">Individual pet start times may differ. The start time is not a guaranteed grooming completion time.</p>
    </section>}
    <label className="block text-sm font-semibold text-zinc-800">Special Requests
      <textarea rows={3} value={specialRequests} onChange={e => onRequestsChange(e.target.value)} className="mt-2 w-full rounded-xl border border-pink-200 p-3 text-sm" placeholder="Allergies, handling instructions, or other notes" />
    </label>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="grid grid-cols-2 gap-3"><button type="button" onClick={onBack} className="rounded-full border border-pink-200 py-3 font-semibold text-brand-pink">Back</button>
      <button type="button" disabled={!plan || busy} onClick={() => void proceed()} className="rounded-full bg-brand-pink py-3 font-semibold text-white disabled:opacity-40">{busy ? "Checking…" : "Next"}</button></div>
  </section>;
}
