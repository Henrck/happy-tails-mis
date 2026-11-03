"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Clock3, UserRound } from "lucide-react";
import BookingDayCalendar from "@/components/shared/BookingDayCalendar";
import { createClient } from "@/lib/supabase/client";
import { manilaTime, manilaToday, useBookingClosures } from "@/lib/booking/use-booking-closures";
import type { DraftPetSelection } from "@/lib/types/appointments";
import type { Customer } from "@/lib/types/users";
import type { Groomer } from "@/lib/types/pet-services";
import type { BookingLeg } from "@/lib/types/booking-leg";
import { clockMinutes, isPendingGroomerBusy, pendingGroomerSelections, type PendingGroomerInterval } from "@/lib/booking/ala-carte-pending-groomers";

const SLOTS = Array.from({ length: 17 }, (_, i) => {
  const minutes = 9 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});
function timeLabel(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}

type Props = {
  customer: Customer | null;
  ownerContact: string;
  petSelections: DraftPetSelection[];
  groomers: Groomer[];
  completedLegs?: BookingLeg[];
  scheduledDate: string | null;
  scheduledTime: string | null;
  specialRequests: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onRequestsChange: (text: string) => void;
  onSelectionsChange: (items: DraftPetSelection[]) => void;
  onBack: () => void;
  onConfirmed: () => void;
};

type Availability = { groomer_id: string; available: boolean };

/** Shared by customer and walk-in POS. The server checks existing appointments
 * for ALL customers (including Grooming), not just appointments by this owner. */
export default function CustomerGroomingScheduleStep({
  customer: _customer, ownerContact: _ownerContact, petSelections, groomers, completedLegs = [], scheduledDate, scheduledTime,
  specialRequests, onDateChange, onTimeChange, onRequestsChange, onSelectionsChange, onBack, onConfirmed,
}: Props) {
  void _customer; void _ownerContact;
  const closures = useBookingClosures();
  const [checking, setChecking] = useState(false);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [availability, setAvailability] = useState<Record<string, string[]>>({});
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [pendingIntervals, setPendingIntervals] = useState<PendingGroomerInterval[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [, setClockTick] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setClockTick(n => n + 1), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const today = manilaToday();
  const nowTime = manilaTime();
  const closed = closures.nameFor(scheduledDate);
  const isPast = (date: string | null, time: string) =>
    !date || date < today || (date === today && time <= nowTime);
  const calendarReady = !closures.loading && !closures.error;
  const dateReady = !!scheduledDate && !closed && calendarReady;
  const activeGroomers = groomers.filter(g => g.status === "active");
  const groomersFreeAt = (time: string, rows: Record<string, string[]> = availability) => {
    const start = clockMinutes(time);
    if (start === null) return [] as string[];
    return (rows[time] ?? []).filter(id => !isPendingGroomerBusy(pendingIntervals, id, start));
  };
  const availableAt = scheduledTime ? groomersFreeAt(scheduledTime) : [];
  const validAssignment = petSelections.length > 0 &&
    petSelections.every(s => !!s.groomerId && availableAt.includes(s.groomerId)) &&
    new Set(petSelections.map(s => s.groomerId)).size === petSelections.length;
  const canProceed = dateReady && !!scheduledTime && !isPast(scheduledDate, scheduledTime) &&
    !checking && !loadingAvailability && !loadingPending && !availabilityError && !pendingError && validAssignment;

  const loadAvailability = useCallback(async (date: string) => {
    const { data, error: failure } = await createClient().rpc("happytails_ala_carte_groomer_availability_v1", { p_date: date });
    if (failure) throw new Error(failure.message);
    const grouped: Record<string, string[]> = {};
    for (const item of (data ?? []) as Array<Availability & { slot_time: string }>) {
      if (item.available) (grouped[item.slot_time] ??= []).push(item.groomer_id);
    }
    return grouped;
  }, []);

  useEffect(() => {
    if (!scheduledDate) { setAvailability({}); return; }
    let active = true;
    setLoadingAvailability(true); setAvailabilityError(null); setAvailability({});
    void loadAvailability(scheduledDate).then(rows => { if (active) setAvailability(rows); })
      .catch(cause => { if (active) setAvailabilityError(cause instanceof Error ? cause.message : "Unable to check groomer availability."); })
      .finally(() => { if (active) setLoadingAvailability(false); });
    return () => { active = false; };
  }, [scheduledDate, loadAvailability]);

  // Database availability does not know about Grooming or À La Carte legs
  // already selected in this checkout but not yet saved. Load their actual
  // verified Grooming durations, then mask all overlapping 30-minute slots.
  useEffect(() => {
    if (!scheduledDate) { setPendingIntervals([]); setPendingError(null); setLoadingPending(false); return; }
    let active = true;
    const pending = pendingGroomerSelections(completedLegs, scheduledDate);
    setPendingIntervals([]); setPendingError(null);
    if (!pending.length) { setLoadingPending(false); return; }
    setLoadingPending(true);
    void (async () => {
      const ids = [...new Set(pending.map(p => p.packagePricingId).filter((id): id is string => !!id))];
      const durationByRate = new Map<string, number>();
      if (ids.length) {
        const db = createClient();
        const { data: rates, error: rateError } = await db.from("package_pricing").select("id,package_id").in("id", ids);
        if (rateError) throw rateError;
        if ((rates ?? []).length !== ids.length) throw new Error("A selected Grooming rate could not be verified. Please review the Grooming schedule.");
        const packageIds = [...new Set((rates ?? []).map(rate => rate.package_id))];
        const { data: durations, error: durationError } = await db.from("grooming_package_durations")
          .select("package_id,duration_minutes,verified").in("package_id", packageIds);
        if (durationError) throw durationError;
        const byPackage = new Map((durations ?? []).filter(d => d.verified === true &&
          Number.isSafeInteger(d.duration_minutes) && d.duration_minutes >= 30)
          .map(d => [d.package_id, d.duration_minutes]));
        for (const rate of rates ?? []) durationByRate.set(rate.id, byPackage.get(rate.package_id) ?? 30);
      }
      return pending.map(p => ({
        groomerId: p.groomerId, startMinute: p.startMinute,
        endMinute: p.startMinute + (p.packagePricingId ? durationByRate.get(p.packagePricingId) ?? 30 : 30),
      }));
    })().then(intervals => { if (active) setPendingIntervals(intervals); })
      .catch(cause => { if (active) setPendingError(cause instanceof Error ? cause.message : "Could not verify other selected services."); })
      .finally(() => { if (active) setLoadingPending(false); });
    return () => { active = false; };
  }, [completedLegs, scheduledDate]);

  useEffect(() => {
    if (scheduledDate && closures.nameFor(scheduledDate) && scheduledTime) onTimeChange("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduledDate, scheduledTime, closures.dates]);

  function changeAssignments(next: DraftPetSelection[]) {
    onSelectionsChange(next);
    setError(null);
    setConfirmed(false);
  }
  function chooseDate(date: string) {
    onDateChange(date); onTimeChange("");
    changeAssignments(petSelections.map(s => ({ ...s, groomerId: null })));
  }
  function chooseTime(time: string) {
    if (!scheduledDate) return;
    onTimeChange(time);
    changeAssignments(petSelections.map(s => ({ ...s, groomerId: null })));
  }
  function chooseGroomer(petId: string, groomerId: string) {
    // A groomer can work on only one À La Carte pet in the same time slot.
    if (groomerId && petSelections.some(s => s.pet.id !== petId && s.groomerId === groomerId)) {
      setError("This groomer is already assigned to another pet at the same time. Choose another groomer.");
      return;
    }
    changeAssignments(petSelections.map(s => s.pet.id === petId ? { ...s, groomerId: groomerId || null } : s));
  }
  async function verify() {
    if (!scheduledDate || !scheduledTime || checking || !canProceed) return;
    setChecking(true); setError(null);
    try {
      const closedMessage = await closures.verifyOpen(scheduledDate);
      if (closedMessage) throw new Error(closedMessage);
      if (isPast(scheduledDate, scheduledTime)) throw new Error("This time has passed. Choose a future appointment time.");
      // Refresh immediately before continuing: stale slots and groomer conflicts must not pass.
      const fresh = await loadAvailability(scheduledDate);
      setAvailability(fresh);
      const free = groomersFreeAt(scheduledTime, fresh);
      if (petSelections.some(s => !s.groomerId || !free.includes(s.groomerId)) ||
          new Set(petSelections.map(s => s.groomerId)).size !== petSelections.length) {
        throw new Error("One or more chosen groomers are no longer available. Select different groomers or another time.");
      }
      setConfirmed(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to check groomer availability.");
    } finally { setChecking(false); }
  }

  if (confirmed && scheduledDate && scheduledTime) return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="À La Carte schedule selected">
      <div className="w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-2xl">
        <Check className="mx-auto text-emerald-600" size={38}/>
        <h2 className="mt-4 text-xl font-bold text-zinc-800">Schedule & Groomers Selected</h2>
        <p className="mt-2 text-sm text-zinc-500">{scheduledDate} at {timeLabel(scheduledTime)}</p>
        {petSelections.map(s => <p key={s.pet.id} className="mt-2 text-sm text-zinc-700">{s.pet.name}: <strong>{activeGroomers.find(g => g.id === s.groomerId)?.name ?? "Assigned groomer"}</strong></p>)}
        <button type="button" onClick={onConfirmed} className="mt-6 w-full rounded-full bg-brand-pink px-5 py-3 font-semibold text-white">Continue to More Services</button>
      </div>
    </div>
  );

  return <section className="ht-ala-carte-schedule mx-auto w-full max-w-4xl space-y-5">
    <header className="text-center"><h2 className="text-2xl font-bold text-brand-pink">À La Carte Schedule</h2>
      <p className="mt-2 text-sm text-zinc-600">Choose a date, time, and available groomer for each pet. You may request a specific groomer.</p></header>
    <p className="rounded-xl border border-pink-100 bg-pink-50 px-4 py-3 text-center text-xs text-zinc-700">
      30-minute service slots · 9:00 AM–5:00 PM start times · Philippine time · A groomer cannot serve two pets simultaneously.
    </p>
    <BookingDayCalendar value={scheduledDate} onChange={chooseDate} closures={closures} title="À La Carte" />
    <section><h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-zinc-800"><Clock3 size={17} className="text-brand-pink"/> Choose preferred start time</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" aria-label="À La Carte start times">
        {SLOTS.map(time => {
          const count = groomersFreeAt(time).length;
          const databaseCount = availability[time]?.length ?? 0;
          const busyInThisBooking = databaseCount > count;
          const baseUnavailable = !dateReady || isPast(scheduledDate, time) || loadingAvailability || loadingPending || !!availabilityError || !!pendingError;
          const capacityBlocked = !baseUnavailable && count < petSelections.length;
          const selected = !baseUnavailable && !capacityBlocked && scheduledTime === time;
          const reason = busyInThisBooking
            ? "One or more groomers already have another service selected in this booking during this time. Choose another slot or groomer."
            : "Not enough groomers are free at this time. Choose another available slot.";
          return <button key={time} type="button" disabled={baseUnavailable} aria-pressed={selected}
            title={capacityBlocked ? reason : undefined}
            onClick={() => capacityBlocked ? setError(reason) : chooseTime(time)}
            className={`flex min-h-14 flex-col items-center justify-center rounded-xl border px-2 py-2 text-xs font-semibold transition ${capacityBlocked ? "border-rose-200 bg-rose-50 text-rose-700" : selected ? "border-brand-pink bg-pink-50 text-brand-pink" : "border-pink-200 bg-white text-zinc-700 hover:border-brand-pink"} disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400 disabled:opacity-60`}>
            <span>{timeLabel(time)}</span>
            <span className={`mt-0.5 text-[10px] ${selected ? "text-brand-pink" : capacityBlocked ? "text-rose-700" : "text-zinc-500"}`}>{loadingAvailability || loadingPending ? "Checking…" : capacityBlocked ? busyInThisBooking ? "Reserved in booking" : "Fully booked" : baseUnavailable ? "Unavailable" : `${count} groomer${count === 1 ? "" : "s"} free`}</span>
          </button>;
        })}
      </div>
      {pendingError && <p role="alert" className="mt-2 text-sm text-red-700">Unable to verify other selected services: {pendingError}. Please review your Grooming schedule.</p>}
      {availabilityError && <p role="alert" className="mt-2 text-sm text-red-700">Unable to load live availability: {availabilityError}. Refresh or choose another date.</p>}
      <p className="mt-2 text-xs text-zinc-500">Availability checks saved bookings and Grooming / À La Carte services already selected in this booking. Conflicting groomers and time slots are blocked before checkout.</p>
    </section>
    {scheduledDate && scheduledTime && !loadingAvailability && !loadingPending && !pendingError && <section className="rounded-2xl border border-pink-200 bg-white p-4">
      <h3 className="flex items-center gap-2 font-bold text-zinc-800"><UserRound size={18} className="text-brand-pink"/> Assign a groomer for each pet</h3>
      <p className="mt-1 text-xs text-zinc-500">Pick your preferred groomer if they are free. Each pet requires one available groomer; occupied groomers are marked unavailable.</p>
      <div className="mt-4 space-y-3">{petSelections.map(s => <label key={s.pet.id} className="block text-sm font-semibold text-zinc-700">{s.pet.name}
        <select value={s.groomerId ?? ""} onChange={e => chooseGroomer(s.pet.id, e.target.value)}
          className="mt-1 block w-full rounded-xl border border-pink-200 bg-white px-3 py-3 text-sm">
          <option value="">Select a groomer</option>
          {activeGroomers.map(g => {
            const available = availableAt.includes(g.id) && !petSelections.some(other => other.pet.id !== s.pet.id && other.groomerId === g.id);
            return <option key={g.id} value={g.id} disabled={!available}>{g.name}{available ? " — Available" : " — Unavailable"}</option>;
          })}
        </select>
      </label>)}</div>
      {!validAssignment && <p className="mt-3 text-xs text-amber-700">Select a different available groomer for every pet before continuing.</p>}
    </section>}
    <label className="block text-sm font-semibold text-zinc-800">Special Requests
      <textarea rows={3} value={specialRequests} onChange={e => onRequestsChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-pink-200 p-3 text-sm" placeholder="Allergies, handling instructions, or other notes"/>
    </label>
    {error && <div role="alertdialog" aria-modal="true" aria-label="Booking availability notice" className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl"><h3 className="text-lg font-bold text-rose-700">Unable to continue</h3>
        <p className="mt-3 text-sm text-zinc-700">{error}</p><button type="button" onClick={() => setError(null)} className="mt-5 rounded-full bg-brand-pink px-6 py-2.5 font-semibold text-white">OK</button>
      </div></div>}
    <div className="grid grid-cols-2 gap-3">
      <button type="button" onClick={onBack} className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-pink-200 font-semibold text-brand-pink"><ArrowLeft size={16}/>Back</button>
      <button type="button" onClick={() => void verify()} disabled={!canProceed} className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-pink font-semibold text-white disabled:opacity-40">{checking ? "Checking…" : "Next"}<ArrowRight size={16}/></button>
    </div>
  </section>;
}
