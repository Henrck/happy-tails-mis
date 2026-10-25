"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import BookingDayCalendar from "@/components/shared/BookingDayCalendar";
import { useBookingClosures, manilaToday, manilaTime } from "@/lib/booking/use-booking-closures";
import { fetchBoardingMonth, checkBoardingStay, type BoardingDayCapacity } from "@/lib/supabase/boarding-availability";
import { hasValidBoardingDuration, isExtendedBoardingRate, parseExtendedBoardingNights } from "@/lib/booking/boarding-duration";
import type { DraftPetSelection } from "@/lib/types/appointments";
import type { PackagePricing, AddonPrice } from "@/lib/types/services";
import type { Kennel, KennelSize } from "@/lib/types/pet-services";

const BELONGINGS = ["Pet Bed", "Toys", "Cat Litter", "Leash/Collar", "Others"];
const MS_DAY = 86_400_000;
type Schedule = { date: string; time: string };
type Snapshot = { key: string; days: BoardingDayCapacity[]; error: string | null };

export type BoardingScheduleProps = {
  petSelections: DraftPetSelection[];
  kennels: Kennel[];
  pricing: PackagePricing[];
  addonPrices: AddonPrice[];
  scheduledDate: string | null;
  dropOffAt: string | null;
  pickUpAt: string | null;
  petBelongings: string[];
  specialRequests: string;
  onDateChange: (date: string) => void;
  onDropOffChange: (value: string) => void;
  onPickUpChange: (value: string) => void;
  onBelongingsChange: (items: string[]) => void;
  onRequestsChange: (value: string) => void;
  onSelectionsChange: (items: DraftPetSelection[]) => void;
  onBack: () => void;
  onConfirmed: (selections: DraftPetSelection[]) => void;
};

function getNights(sel: DraftPetSelection, pricing: PackagePricing[]): number {
  const rate = pricing.find((r) => r.id === sel.packagePricingId);
  if (!rate) return 0;
  if (isExtendedBoardingRate(rate)) return parseExtendedBoardingNights(sel.boardingNights) ?? 0;
  if (rate.nights && Number.isSafeInteger(rate.nights)) return rate.nights;
  const match = `${rate.size_detail ?? ""} ${rate.size_label}`.match(/(\d+)\s*nights?/i);
  return match ? Number(match[1]) : 0;
}
function toDate(date: string, time: string) { return new Date(`${date}T${time}:00+08:00`); }
function fromIso(iso: string): Schedule {
  const pieces = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso));
  const get = (field: string) => pieces.find((p) => p.type === field)?.value ?? "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}
function addDays(day: string, nights: number) {
  return new Date(Date.parse(`${day}T00:00:00Z`) + nights * MS_DAY).toISOString().slice(0, 10);
}
function overlaps(a: string, an: number, b: string, bn: number) {
  return a < addDays(b, bn) && b < addDays(a, an);
}
function prettyDate(iso: string) {
  return new Date(iso).toLocaleString("en-PH", { timeZone: "Asia/Manila", weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
}

export default function BoardingAvailabilitySchedule({
  petSelections, pricing, petBelongings, specialRequests, onSelectionsChange,
  onBelongingsChange, onRequestsChange, onBack, onConfirmed,
}: BoardingScheduleProps) {
  const closures = useBookingClosures();
  const [schedules, setSchedules] = useState<Record<string, Schedule>>({});
  const [months, setMonths] = useState<Record<string, string>>({});
  const [capacity, setCapacity] = useState<Record<string, Snapshot>>({});
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmedSelections, setConfirmedSelections] = useState<DraftPetSelection[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const today = manilaToday();

  useEffect(() => {
    const t = setInterval(() => { setRefresh((n) => n + 1); setNow(Date.now()); }, 30_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    setSchedules((previous) => {
      const next = { ...previous };
      for (const s of petSelections) {
        if (!next[s.pet.id]) {
          const saved = s.boardingDropOffAt ? fromIso(s.boardingDropOffAt) : null;
          next[s.pet.id] = { date: s.boardingScheduledDate ?? saved?.date ?? "", time: saved?.time ?? "09:00" };
        }
      }
      return next;
    });
  }, [petSelections]);

  const specs = petSelections.map((sel) => ({
    id: sel.pet.id,
    size: sel.boardingKennelSize,
    nights: getNights(sel, pricing),
    month: months[sel.pet.id] ?? (schedules[sel.pet.id]?.date || today).slice(0, 7),
  }));
  const specKey = JSON.stringify(specs);
  useEffect(() => {
    let alive = true;
    const requested = JSON.parse(specKey) as typeof specs;
    setCapacity((previous) => {
      const next = { ...previous };
      for (const spec of requested) {
        const key = `${spec.size}:${spec.nights}:${spec.month}`;
        if (next[spec.id]?.key !== key) delete next[spec.id];
      }
      return next;
    });
    void Promise.all(requested.map(async (spec) => {
      const key = `${spec.size}:${spec.nights}:${spec.month}`;
      if ((spec.size !== "small" && spec.size !== "big") || spec.nights < 1 || spec.nights > 365) return;
      const result = await fetchBoardingMonth(spec.month, spec.size, spec.nights);
      if (!alive) return;
      setCapacity((previous) => ({ ...previous, [spec.id]: { key, days: result.days, error: result.error } }));
    }));
    return () => { alive = false; };
  }, [specKey, refresh]);

  const onMonth = useCallback((id: string, month: string) => {
    setMonths((previous) => previous[id] === month ? previous : { ...previous, [id]: month });
  }, []);
  const localOverlap = useCallback((id: string, date: string, size: KennelSize, nights: number) =>
    petSelections.filter((other) => other.pet.id !== id && other.boardingKennelSize === size &&
      !!schedules[other.pet.id]?.date && getNights(other, pricing) > 0 &&
      overlaps(date, nights, schedules[other.pet.id].date, getNights(other, pricing))).length,
    [petSelections, pricing, schedules]);
  const availableOn = (sel: DraftPetSelection, day: string): number | null => {
    const spec = specs.find((s) => s.id === sel.pet.id);
    if (!spec || !day || !spec.size || spec.nights < 1) return null;
    const snap = capacity[sel.pet.id];
    if (!snap || snap.key !== `${spec.size}:${spec.nights}:${spec.month}` || snap.error) return null;
    const record = snap.days.find((row) => row.day === day);
    if (!record) return null;
    return Math.max(0, record.remaining - localOverlap(sel.pet.id, day, spec.size, spec.nights));
  };
  const dateReason = (sel: DraftPetSelection, schedule: Schedule) => {
    if (!hasValidBoardingDuration(sel, pricing)) return "The boarding duration is invalid. Return to the previous step.";
    if (sel.boardingKennelSize !== "small" && sel.boardingKennelSize !== "big") return "Choose the kennel size again.";
    if (!schedule.date || !schedule.time) return "Choose a drop-off date and time.";
    if (schedule.date < today) return "Past dates cannot be booked.";
    const closure = closures.nameFor(schedule.date);
    if (closure) return `Check-in closed on ${schedule.date} — ${closure}`;
    const pickupDay = addDays(schedule.date, getNights(sel, pricing));
    const pickupClosure = closures.nameFor(pickupDay);
    if (pickupClosure) return `Pickup closed on ${pickupDay} — ${pickupClosure}. Choose a different check-in day or duration.`;
    if (schedule.time < "09:00" || schedule.time > "18:00") return "Drop-off must be between 9:00 AM and 6:00 PM.";
    if (toDate(schedule.date, schedule.time).getTime() <= now) return "Choose a future drop-off time.";
    const free = availableOn(sel, schedule.date);
    if (free === null) return "Checking kennel availability. Please select an available date.";
    if (free < 1) return "Fully booked for this kennel size and entire stay. Choose another date.";
    return null;
  };
  const valid = useMemo(() => petSelections.length > 0 && !checking && !closures.loading && !closures.error &&
    petSelections.every((sel) => !dateReason(sel, schedules[sel.pet.id] ?? { date: "", time: "" })),
    // Re-evaluated against updated availability snapshots, all pet dates and the clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [petSelections, pricing, schedules, capacity, checking, closures.dates, closures.loading, closures.error, now, months]);

  const saveSchedule = (sel: DraftPetSelection, next: Schedule) => {
    setSchedules((previous) => ({ ...previous, [sel.pet.id]: next }));
    setError(null);
    const okay = Boolean(next.date && next.time && hasValidBoardingDuration(sel, pricing) &&
      !closures.nameFor(next.date) && !closures.nameFor(addDays(next.date, getNights(sel, pricing))) && next.date >= manilaToday() && next.time >= "09:00" && next.time <= "18:00" &&
      toDate(next.date, next.time).getTime() > Date.now() && (availableOn(sel, next.date) ?? 0) > 0);
    onSelectionsChange(petSelections.map((p) => {
      if (p.pet.id !== sel.pet.id) return p;
      if (!okay) return { ...p, boardingScheduledDate: null, boardingDropOffAt: null, boardingPickUpAt: null, kennelId: null };
      const start = toDate(next.date, next.time);
      const end = new Date(start.getTime() + getNights(p, pricing) * MS_DAY);
      return { ...p, boardingScheduledDate: next.date, boardingDropOffAt: start.toISOString(), boardingPickUpAt: end.toISOString(), kennelId: null };
    }));
  };
  const chooseDate = async (sel: DraftPetSelection, day: string) => {
    if (checking || closures.loading || closures.error || !sel.boardingKennelSize) return;
    setChecking(true); setError(null);
    try {
      const closureError = await closures.verifyOpen(day);
      if (closureError) { setError(`${sel.pet.name}: Check-in: ${closureError}`); return; }
      const pickupDay = addDays(day, getNights(sel, pricing));
      const pickupError = await closures.verifyOpen(pickupDay);
      if (pickupError) { setError(`${sel.pet.name}: Pickup on ${pickupDay}: ${pickupError} Choose a different arrival date.`); return; }
      const count = await checkBoardingStay(day, sel.boardingKennelSize, getNights(sel, pricing));
      if (count.error) { setError(count.error); return; }
      if (count.remaining <= localOverlap(sel.pet.id, day, sel.boardingKennelSize, getNights(sel, pricing))) {
        setError(`${sel.pet.name}: All ${sel.boardingKennelSize === "big" ? "Big" : "Small"} Kennels are fully booked for the selected stay.`);
        setRefresh((n) => n + 1);
        return;
      }
      saveSchedule(sel, { date: day, time: schedules[sel.pet.id]?.time ?? "09:00" });
    } finally { setChecking(false); }
  };
  const confirm = async () => {
    if (checking || !valid) return;
    setChecking(true); setError(null);
    try {
      for (const sel of petSelections) {
        const s = schedules[sel.pet.id];
        const reason = dateReason(sel, s);
        if (reason) { setError(`${sel.pet.name}: ${reason}`); return; }
        const closed = await closures.verifyOpen(s.date);
        if (closed) { setError(`${sel.pet.name}: Check-in: ${closed}`); return; }
        const pickupDay = addDays(s.date, getNights(sel, pricing));
        const pickupClosed = await closures.verifyOpen(pickupDay);
        if (pickupClosed) { setError(`${sel.pet.name}: Pickup on ${pickupDay}: ${pickupClosed} Select another stay.`); return; }
        const size = sel.boardingKennelSize as KennelSize;
        const count = await checkBoardingStay(s.date, size, getNights(sel, pricing));
        if (count.error) { setError(count.error); return; }
        if (count.remaining <= localOverlap(sel.pet.id, s.date, size, getNights(sel, pricing))) {
          setError(`${sel.pet.name}: No ${size === "big" ? "Big" : "Small"} Kennels remain for the full stay. Please choose another date.`);
          setRefresh((n) => n + 1);
          return;
        }
      }
      // Always write the FINAL verified schedule, not a stale interim form
      // value. The parent uses these fields to create one booking per pet.
      const finalSelections = petSelections.map((sel) => {
        const selected = schedules[sel.pet.id];
        const drop = toDate(selected.date, selected.time);
        const pickup = new Date(drop.getTime() + getNights(sel, pricing) * MS_DAY);
        return { ...sel, boardingScheduledDate: selected.date,
          boardingDropOffAt: drop.toISOString(), boardingPickUpAt: pickup.toISOString(), kennelId: null };
      });
      setConfirmedSelections(finalSelections);
      onSelectionsChange(finalSelections);
      // The database makes the final atomic room assignment at checkout;
      // this calendar is a live estimate, not a temporary reservation.
      setConfirmed(true);
    } finally { setChecking(false); }
  };

  if (confirmed) return <div role="dialog" aria-modal="true" aria-label="Boarding schedule review" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
    <div className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-2xl">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-pink-50 text-2xl">🐾</div>
      <h3 className="text-xl font-bold text-zinc-800">Boarding Schedule Verified</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-600">The selected kennel size and dates currently have space. <strong>Your kennel is reserved only after you finish booking.</strong> Availability may change in the meantime.</p>
      <div className="mt-5 flex gap-2"><button type="button" onClick={() => setConfirmed(false)} className="flex-1 rounded-full border border-pink-200 py-3 text-sm font-semibold text-brand-pink">Review</button><button type="button" onClick={() => onConfirmed(confirmedSelections)} className="flex-1 rounded-full bg-brand-pink py-3 text-sm font-semibold text-white">Continue</button></div>
    </div>
  </div>;

  return <section className="mx-auto max-w-4xl space-y-5">
    <div className="text-center"><h2 className="text-2xl font-bold text-brand-pink">Boarding Availability & Schedule</h2><p className="mt-2 text-sm text-zinc-600">Choose an available kennel for each pet's <strong>entire stay</strong>, not just the arrival date.</p></div>
    <div className="rounded-xl border border-pink-100 bg-pink-50 px-4 py-3 text-xs leading-5 text-zinc-700">Small and Big Kennels have separate availability. Each boarding pet reserves one kennel. <strong>Both check-in and pickup must fall on an open day.</strong> Red <strong>Full / Closed / Pickup Closed</strong> dates cannot be booked. Check-in and pickup: 9:00 AM–6:00 PM (Philippine time). Pickup is calculated automatically.</div>
    {closures.error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">Shop calendar unavailable: {closures.error}</p>}
    <div className="space-y-5">{petSelections.map((sel) => {
      const id = sel.pet.id;
      const schedule = schedules[id] ?? { date: "", time: "09:00" };
      const spec = specs.find((s) => s.id === id);
      const snap = capacity[id];
      const ready = !!spec && !!snap && snap.key === `${spec.size}:${spec.nights}:${spec.month}`;
      const days = ready && !snap.error ? snap.days : [];
      const remaining: Record<string, number> = {};
      const unavailable: Record<string, string> = {};
      for (const row of days) {
        const free = Math.max(0, row.remaining - (spec?.size ? localOverlap(id, row.day, spec.size, spec.nights) : 0));
        remaining[row.day] = free;
        const pickupDay = addDays(row.day, spec?.nights ?? 0);
        const pickupClosure = closures.nameFor(pickupDay);
        if (pickupClosure) unavailable[row.day] = `Pickup on ${pickupDay} is closed — ${pickupClosure}`;
        else if (!free) unavailable[row.day] = `Fully booked — no ${spec?.size === "big" ? "Big" : "Small"} Kennel available for the full ${spec?.nights}-night stay`;
      }
      const reason = dateReason(sel, schedule);
      const nights = spec?.nights ?? 0;
      const end = schedule.date && nights > 0 && schedule.time ? new Date(toDate(schedule.date, schedule.time).getTime() + nights * MS_DAY) : null;
      return <article key={id} className="rounded-2xl border border-pink-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-lg font-bold text-zinc-800">{sel.pet.name}</h3><p className="mt-1 text-xs text-zinc-500">{sel.pet.size_label} · {sel.boardingKennelSize === "big" ? "Big" : "Small"} Kennel · {nights || "—"} nights</p></div><span className="rounded-full bg-pink-50 px-3 py-1.5 text-xs font-semibold text-brand-pink">{ready && days.length ? `${days[0].total} ${sel.boardingKennelSize === "big" ? "Big" : "Small"} kennels configured` : "Checking kennels…"}</span></div>
        {!hasValidBoardingDuration(sel, pricing) && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">Invalid boarding duration. For 7 Days & Up, enter at least 7 nights (maximum 365) in the previous step.</p>}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_190px]">
          <BookingDayCalendar title="Kennel check-in" value={schedule.date} closures={closures}
            availability={remaining} unavailable={unavailable}
            capacityLoading={!ready || checking} capacityError={ready ? snap.error : null}
            onMonthChange={(month) => onMonth(id, month)} onChange={(day) => { void chooseDate(sel, day); }}/>
          <div className="space-y-3"><label className="block text-sm font-semibold text-zinc-700">Drop-off time *<input type="time" min="09:00" max="18:00" step={60} value={schedule.time} onChange={(e) => saveSchedule(sel, { ...schedule, time: e.target.value })} className="mt-2 block w-full rounded-xl border border-pink-200 bg-white px-3 py-2.5 text-sm"/></label><div className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600"><strong className="text-slate-800">Stay</strong><p>{nights} night{nights === 1 ? "" : "s"}</p><p>{schedule.date ? `${schedule.date} → ${addDays(schedule.date, nights || 0)}` : "Select a check-in day"}</p>
            <p className="mt-2">Pickup must be on an open shop day.</p></div></div>
        </div>
        {ready && snap.error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">Could not load kennel availability: {snap.error}. Check that the Supabase kennel-capacity migration was applied.</p>}
        {schedule.date && nights > 0 && closures.nameFor(addDays(schedule.date, nights)) && <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">Pickup on {addDays(schedule.date, nights)} is CLOSED — {closures.nameFor(addDays(schedule.date, nights))}. Please choose another check-in date or stay duration.</p>}
        {schedule.date && !reason && end && <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><strong>Pickup:</strong> {prettyDate(end.toISOString())} · <strong>{availableOn(sel, schedule.date)} kennel(s) available</strong> for the full stay</p>}
        {schedule.date && reason && <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{reason}</p>}
      </article>;
    })}</div>
    <div><p className="text-sm font-semibold text-zinc-800">Pet belongings (optional)</p><div className="mt-2 flex flex-wrap gap-2">{BELONGINGS.map((item) => <button type="button" key={item} onClick={() => onBelongingsChange(petBelongings.includes(item) ? petBelongings.filter((v) => v !== item) : [...petBelongings, item])} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${petBelongings.includes(item) ? "border-brand-pink bg-brand-pink text-white" : "border-pink-200 bg-white text-zinc-700"}`}>{item}</button>)}</div></div>
    <label className="block text-sm font-semibold text-zinc-800">Special Requests / Notes<textarea rows={3} value={specialRequests} onChange={(e) => onRequestsChange(e.target.value)} className="mt-2 block w-full rounded-xl border border-pink-200 p-3 text-sm"/></label>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="grid grid-cols-2 gap-3"><button type="button" onClick={onBack} className="rounded-full border border-pink-200 py-3 font-semibold text-brand-pink">Back</button><button type="button" onClick={() => { void confirm(); }} disabled={!valid} className="rounded-full bg-brand-pink py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{checking ? "Checking…" : "Next"}</button></div>
  </section>;
}
