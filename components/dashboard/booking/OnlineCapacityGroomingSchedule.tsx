"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import BookingDayCalendar from "@/components/shared/BookingDayCalendar";
import { useBookingClosures, manilaTime, manilaToday } from "@/lib/booking/use-booking-closures";
import { createClient } from "@/lib/supabase/client";
import {
  formatGroomingClock, groomingMinutes, groomingPlanClosingError,
  GROOMING_CLOSE_MINUTES, type GroomingPlannedSlot,
} from "@/lib/booking/grooming-closing";
import type { DraftPetSelection } from "@/lib/types/appointments";

type Planned = GroomingPlannedSlot & { index: number };
type LiveSlot = { slot_time: string; capacity: number; booked: number; remaining: number };
type MonthDay = { day: string; open_slots: number; capacity: number };
type Choice = { groomer_id: string; groomer_name: string; available: boolean };
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

const slots = Array.from({ length: 17 }, (_, index) => {
  const minutes = 9 * 60 + index * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

export default function OnlineCapacityGroomingSchedule({ petSelections, scheduledDate, scheduledTime,
  specialRequests, onDateChange, onTimeChange, onRequestsChange, onSelectionsChange,
  onBack, onConfirmed }: Props) {
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
  const [durationByRate, setDurationByRate] = useState<Record<string, number>>({});
  const rateKey = [...new Set(petSelections.map(s => s.packagePricingId).filter((id): id is string => Boolean(id)))].sort().join("|");
  const today = manilaToday();

  // These durations are a fast UI hint; the PostgreSQL planner and insert
  // trigger independently check authoritative, verified package durations.
  useEffect(() => {
    let active = true;
    if (!rateKey) { setDurationByRate({}); return; }
    void (async () => {
      const pricingIds = rateKey.split("|");
      const db = createClient();
      const { data: rates, error: rateError } = await db.from("package_pricing")
        .select("id,package_id").in("id", pricingIds);
      if (rateError) throw rateError;
      const packageIds = [...new Set((rates ?? []).map(r => r.package_id))];
      if (!packageIds.length) return {} as Record<string, number>;
      const { data: durations, error: durationError } = await db.from("grooming_package_durations")
        .select("package_id,duration_minutes,verified").in("package_id", packageIds);
      if (durationError) throw durationError;
      const verified = new Map((durations ?? []).filter(d => d.verified &&
        Number.isSafeInteger(d.duration_minutes) && d.duration_minutes >= 30)
        .map(d => [d.package_id, d.duration_minutes]));
      return Object.fromEntries((rates ?? []).flatMap(rate => {
        const minutes = verified.get(rate.package_id);
        return minutes ? [[rate.id, minutes] as const] : [];
      }));
    })().then(rows => { if (active) setDurationByRate(rows ?? {}); })
      .catch(() => { if (active) setDurationByRate({}); });
    return () => { active = false; };
  }, [rateKey]);

  function invalidate() { planRef.current = null; setPlan(null); setError(null); }

  const reloadMonth = useCallback(async (key: string) => {
    const { data, error: failure } = await createClient().rpc("happytails_groomer_month_availability", {
      p_first_day: `${key}-01`,
    });
    if (failure) { setMonthError(failure.message); setFullDates({}); return; }
    const unavailable: Record<string, string> = {};
    for (const item of (data ?? []) as MonthDay[]) {
      if (item.open_slots === 0) unavailable[item.day] = item.capacity === 0 ? "No groomers available" : "Fully booked";
    }
    // A previously cached monthly result may treat a Philippine holiday as
    // closed even after SuperAdmin has explicitly opened it. Cross-check live
    // groomer slots for reopened holidays before labeling them unavailable.
    // Do NOT invent capacity: if no groomers are free, the day stays blocked.
    const reopened = closures.dates.filter(d => d.is_open_override && d.date.startsWith(`${key}-`));
    if (reopened.length) {
      const checks = await Promise.all(reopened.map(async d => {
        const { data: slots, error: slotError } = await createClient().rpc("happytails_live_groomer_slots", { p_date: d.date });
        return { day: d.date, available: !slotError && Array.isArray(slots) && slots.some((s: LiveSlot) => Number(s.remaining) > 0) };
      }));
      for (const item of checks) {
        if (item.available) delete unavailable[item.day];
        // Otherwise preserve the reason from the authoritative planner.
      }
    }
    setMonthError(null);
    setFullDates(unavailable);
  // Re-evaluate monthly availability whenever Calendar Management changes.
  }, [closures.dates]);

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
    let valid = true;
    setLoading(true);
    void loadSlots(scheduledDate)
      .catch(cause => { if (valid) { setLive({}); setError(String(cause?.message ?? cause)); } })
      .finally(() => { if (valid) setLoading(false); });
    return () => { valid = false; };
  }, [scheduledDate, refresh, loadSlots]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") setRefresh(value => value + 1);
    }, 30000);
    const focus = () => setRefresh(value => value + 1);
    window.addEventListener("focus", focus);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", focus); };
  }, []);

  useEffect(() => {
    if (!scheduledDate || !scheduledTime || !petSelections.length) { setChoices({}); return; }
    let valid = true;
    void Promise.all(petSelections.map(async selection => {
      if (!selection.packagePricingId) return [selection.pet.id, []] as const;
      const { data, error: failure } = await createClient().rpc("happytails_groomer_choices_v2", {
        p_date: scheduledDate, p_time: scheduledTime, p_pricing_id: selection.packagePricingId,
      });
      if (failure) throw new Error(failure.message);
      return [selection.pet.id, (data ?? []) as Choice[]] as const;
    })).then(rows => { if (valid) setChoices(Object.fromEntries(rows)); })
      .catch(cause => { if (valid) { setChoices({}); setError(`Unable to verify groomers: ${String(cause?.message ?? cause)}`); } });
    return () => { valid = false; };
  }, [scheduledDate, scheduledTime, petSelections, refresh]);

  useEffect(() => {
    if (scheduledDate && (closures.nameFor(scheduledDate) || fullDates[scheduledDate])) {
      planRef.current = null;
      setPlan(null);
      onTimeChange("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduledDate, closures.dates, fullDates]);

  /** Fast necessary check for the calendar before the actual SQL planner.
   * Every pet requires at least 30 minutes. Selected same-groomer pets are
   * sequential; separate groomers can work simultaneously.
   */
  function startRestriction(time: string, slot: LiveSlot | undefined, slotRows: LiveSlot[] = Object.values(live)): string | null {
    const start = groomingMinutes(time);
    if (start === null || start + 30 > GROOMING_CLOSE_MINUTES) return "Finishes after 5:30 PM";
    if (!slot) return "Checking groomer availability";
    if (slot.remaining < 1) return "Fully booked";
    const minutesAvailable = GROOMING_CLOSE_MINUTES - start;
    const minutesByGroomer = new Map<string, number>();
    let totalMinutes = 0;
    for (const selection of petSelections) {
      const duration = durationByRate[selection.packagePricingId ?? ""] ?? 30;
      totalMinutes += duration;
      // Even with multiple groomers, a single pet cannot finish after closing.
      if (duration > minutesAvailable) return "The selected package finishes after 5:30 PM";
      const groomer = preference[selection.pet.id];
      if (groomer) minutesByGroomer.set(groomer, (minutesByGroomer.get(groomer) ?? 0) + duration);
    }
    if ([...minutesByGroomer.values()].some(minutes => minutes > minutesAvailable)) {
      return "Selected groomer cannot finish every pet by 5:30 PM";
    }
    // At 5 PM, each currently free groomer can do only one 30-minute pet.
    if (start === 17 * 60 && petSelections.length > slot.remaining) {
      return `${petSelections.length} pets need ${petSelections.length} groomers at 5 PM`;
    }
    // Bound capacity across the FULL remaining time window, including groomers
    // who are busy at the chosen start but become free in later half-hour slots.
    // Multiplying only the initial free count by the time remaining would reject
    // bookings that are in fact schedulable. The SQL planner resolves exact fit.
    const availableMinutes = slotRows.reduce((sum, row) => {
      const minute = groomingMinutes(row.slot_time);
      return minute !== null && minute >= start && minute < GROOMING_CLOSE_MINUTES
        ? sum + Math.max(0, row.remaining) * 30 : sum;
    }, 0);
    if (availableMinutes > 0 && totalMinutes > availableMinutes) {
      return "Not enough groomer time remains before 5:30 PM";
    }
    return null;
  }

  async function calculate(date: string, time: string): Promise<Planned[] | null> {
    if (closures.loading || closures.error || monthError) {
      setError("Unable to verify the calendar. Refresh before proceeding.");
      return null;
    }
    const closed = await closures.verifyOpen(date);
    if (closed) { setError(closed); return null; }
    if (date < manilaToday() || (date === manilaToday() && time <= manilaTime())) {
      setError("Choose a future start time."); return null;
    }
    if (!petSelections.length || petSelections.some(s => !s.packagePricingId)) {
      setError("Select a package and size for every pet first."); return null;
    }
    setBusy(true);
    setError(null);
    try {
      const rows = await loadSlots(date);
      const restriction = startRestriction(time, rows.find(row => row.slot_time === time), rows);
      if (restriction) throw new Error(`${restriction}. Choose an earlier slot or more available groomers.`);
      const { data, error: failure } = await createClient().rpc("happytails_grooming_plan_v2", {
        p_date: date,
        p_pricing_ids: petSelections.map(s => s.packagePricingId as string),
        p_preferred_start: time,
        p_groomer_ids: petSelections.map(s => preference[s.pet.id] || null),
      });
      if (failure) throw new Error(failure.message);
      const arranged = data as Planned[];
      if (!Array.isArray(arranged) || arranged.length !== petSelections.length ||
          arranged.some(item => !item.groomerId || !item.time || !item.endTime)) {
        throw new Error("The selected groomers cannot serve every pet within opening hours.");
      }
      const closingError = groomingPlanClosingError(arranged);
      if (closingError) throw new Error(closingError);
      planRef.current = arranged;
      setPlan(arranged);
      return arranged;
    } catch (cause) {
      planRef.current = null;
      setPlan(null);
      setError(cause instanceof Error ? cause.message : "Unable to plan grooming appointments.");
      return null;
    } finally { setBusy(false); }
  }

  function chooseDate(date: string) {
    invalidate(); setLive({}); setCapacity(null); setChoices({});
    onDateChange(date); onTimeChange("");
    onSelectionsChange(petSelections.map(s => ({ ...s, groomingScheduledTime: undefined } as DraftPetSelection)));
  }
  function chooseTime(time: string) {
    if (!scheduledDate) return;
    const restriction = startRestriction(time, live[time]);
    if (restriction) { setError(restriction); return; }
    invalidate(); onTimeChange(time);
    onSelectionsChange(petSelections.map(s => ({ ...s, groomingScheduledTime: undefined } as DraftPetSelection)));
  }
  function chooseGroomer(petId: string, id: string) {
    invalidate();
    setPreference(previous => ({ ...previous, [petId]: id || null }));
  }
  function applyGroomerToAll(id: string) {
    invalidate();
    setPreference(Object.fromEntries(petSelections.map(s => [s.pet.id, id || null])));
  }
  async function proceed() {
    if (!scheduledDate || !scheduledTime || busy) return;
    const previous = planRef.current;
    const rechecked = await calculate(scheduledDate, scheduledTime);
    if (!rechecked) return;
    if (previous && JSON.stringify(previous) !== JSON.stringify(rechecked)) {
      setError("Groomer availability changed. Review the new times before continuing.");
      return;
    }
    const updated = petSelections.map((selection, index) => ({ ...selection,
      groomerId: rechecked[index].groomerId,
      groomingScheduledTime: rechecked[index].time,
    } as DraftPetSelection));
    onSelectionsChange(updated);
    onConfirmed(updated);
  }

  const disabled = closures.loading || !!closures.error || !!monthError;
  const commonGroomers = petSelections.length && petSelections.every(s => choices[s.pet.id])
    ? (choices[petSelections[0].pet.id] ?? []).filter(g => g.available && petSelections.every(s =>
        (choices[s.pet.id] ?? []).some(option => option.groomer_id === g.groomer_id && option.available)))
    : [];
  const selectedForAll = petSelections.length && petSelections.every(s =>
    preference[s.pet.id] === preference[petSelections[0].pet.id])
    ? preference[petSelections[0].pet.id] ?? "" : "mixed";

  return <section className="mx-auto w-full max-w-4xl space-y-5">
    <header className="text-center">
      <h2 className="text-2xl font-bold text-brand-pink">Grooming Schedule</h2>
      <p className="mt-2 text-sm text-zinc-600">One pet at a time per groomer. Pets sharing a groomer are scheduled consecutively, with no overlap.</p>
    </header>
    <p className="rounded-xl border border-pink-100 bg-pink-50 px-4 py-3 text-center text-xs leading-5 text-zinc-700">
      Active groomers: <strong>{capacity ?? "Checking…"}</strong> · 30-minute start slots · All grooming must <strong>finish by 5:30 PM</strong> (Philippine time). Package duration and available groomers determine how many pets fit.
    </p>
    <BookingDayCalendar value={scheduledDate} onChange={chooseDate} closures={closures} unavailable={fullDates}
      onMonthChange={setMonth} title="Grooming" />
    {monthError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{monthError}</p>}
    {scheduledDate && closures.dates.some(d => d.date === scheduledDate && d.is_open_override) && fullDates[scheduledDate] &&
      <p role="alert" className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        Calendar Management has opened this holiday, but groomer availability currently reports {fullDates[scheduledDate].toLowerCase()}.
        The date cannot be booked until an available groomer is confirmed. Check Groomer Availability settings and the database availability rules.
      </p>}
    <div>
      <h3 className="mb-2 font-semibold">Choose preferred start time</h3>
      <p className="mb-3 text-xs text-zinc-500">For example, two 30-minute pets with the same groomer must start by 4:30 PM. Two groomers may each begin a pet at 5:00 PM.</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {slots.map(time => {
          const item = live[time];
          const past = !scheduledDate || scheduledDate < today || (scheduledDate === today && time <= manilaTime());
          const full = !!item && item.remaining === 0;
          const restriction = item ? startRestriction(time, item) : null;
          const inactive = disabled || loading || busy || past || !item || !!restriction || !!fullDates[scheduledDate ?? ""];
          const selected = scheduledTime === time;
          return <button key={time} type="button" disabled={inactive} title={restriction ?? undefined}
            aria-label={`${formatGroomingClock(time)}: ${restriction || (item ? `${item.remaining} groomers available` : "Checking")}`}
            onClick={() => chooseTime(time)} aria-pressed={selected}
            className={`min-h-14 rounded-xl border px-2 py-2 text-xs font-semibold ${full || restriction ? "border-red-200 bg-red-50 text-red-700" : selected ? "border-brand-pink bg-pink-50 text-brand-pink" : "border-pink-200"} disabled:opacity-50`}>
            <span className="block">{formatGroomingClock(time)}</span>
            <span className="text-[10px]">{past ? "Unavailable" : !item ? "Checking…" : restriction ? "Too late / Full" : `${item.remaining} available`}</span>
          </button>;
        })}
      </div>
    </div>
    {scheduledDate && scheduledTime && <section className="rounded-2xl border border-pink-200 bg-white p-4">
      <h3 className="font-semibold">Groomer preference for each pet</h3>
      <p className="mt-1 text-xs text-zinc-500">The system checks package durations, breaks, existing bookings and the 5:30 PM finish limit. Choosing the same groomer means pets are served one after another.</p>
      {petSelections.length > 1 && <div className="mt-4 rounded-xl border border-pink-200 bg-pink-50 p-3">
        <label htmlFor="groomer-quick-select" className="block text-sm font-bold text-zinc-800">Quick select — apply to all {petSelections.length} pets</label>
        <p className="mt-1 text-xs text-zinc-600">Choose a single groomer for the entire group, or assign groomers separately below.</p>
        <select id="groomer-quick-select" value={selectedForAll} onChange={(event: { target: { value: string } }) => applyGroomerToAll(event.target.value)}
          disabled={busy} className="mt-2 w-full rounded-xl border border-pink-200 bg-white px-3 py-3 text-sm">
          {selectedForAll === "mixed" && <option value="mixed" disabled>Different groomers selected</option>}
          <option value="">No preference — assign automatically</option>
          {commonGroomers.map(g => <option key={g.groomer_id} value={g.groomer_id}>{g.groomer_name}</option>)}
          {selectedForAll && selectedForAll !== "mixed" && !commonGroomers.some(g => g.groomer_id === selectedForAll) &&
            <option value={selectedForAll} disabled>Selected groomer no longer available</option>}
        </select>
        {!commonGroomers.length && <p className="mt-2 text-xs text-amber-700">No single groomer can start every pet at the chosen time. Try separate groomers or an earlier slot.</p>}
        {selectedForAll && selectedForAll !== "mixed" &&
          petSelections.reduce((total, selection) => total + (durationByRate[selection.packagePricingId ?? ""] ?? 30), 0) >
            GROOMING_CLOSE_MINUTES - (groomingMinutes(scheduledTime) ?? 0) &&
          <p role="status" className="mt-2 text-xs font-semibold text-rose-700">This groomer needs more time than is available before 5:30 PM. Choose an earlier start or different groomers.</p>}
      </div>}
      <div className="mt-3 space-y-3">{petSelections.map(selection => {
        const available = (choices[selection.pet.id] ?? []).filter(g => g.available);
        const selected = preference[selection.pet.id] ?? "";
        return <label key={selection.pet.id} className="block text-sm font-semibold text-zinc-700">{selection.pet.name}
          <select value={selected} onChange={(event: { target: { value: string } }) => chooseGroomer(selection.pet.id, event.target.value)}
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
    </section>}
    {plan && <section className="rounded-2xl border border-pink-200 bg-pink-50 p-4">
      <h3 className="font-semibold">Proposed non-overlapping appointments</h3>
      {petSelections.map((selection, index) => <div key={selection.pet.id} className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white p-3 text-sm">
        <strong>{selection.pet.name}</strong>
        <span>{choices[selection.pet.id]?.find(g => g.groomer_id === plan[index].groomerId)?.groomer_name ?? "Assigned groomer"} · {formatGroomingClock(plan[index].time)}–{formatGroomingClock(plan[index].endTime)} · {plan[index].durationMinutes} min</span>
      </div>)}
      <p className="mt-3 text-xs text-zinc-600">All sessions finish by 5:30 PM. Groomer reservations are checked again at checkout.</p>
    </section>}
    <label className="block text-sm font-semibold">Special requests
      <textarea rows={3} value={specialRequests} onChange={(event: { target: { value: string } }) => onRequestsChange(event.target.value)} className="mt-2 w-full rounded-xl border border-pink-200 p-3 text-sm" />
    </label>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="grid grid-cols-2 gap-3">
      <button type="button" onClick={onBack} className="rounded-full border border-pink-200 py-3 font-semibold text-brand-pink">Back</button>
      <button type="button" onClick={() => void proceed()} disabled={disabled || busy || loading || !plan || !!error}
        className="rounded-full bg-brand-pink py-3 font-semibold text-white disabled:opacity-40">Next</button>
    </div>
  </section>;
}
