"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Clock3, UserRound } from "lucide-react";
import BookingDayCalendar from "@/components/shared/BookingDayCalendar";
import { createClient } from "@/lib/supabase/client";
import { manilaTime, manilaToday, useBookingClosures } from "@/lib/booking/use-booking-closures";
import type { DraftPetSelection } from "@/lib/types/appointments";
import type { Customer } from "@/lib/types/users";
import type { Groomer } from "@/lib/types/pet-services";
import type { BookingLeg } from "@/lib/types/booking-leg";
import { clockMinutes, pendingGroomerSelections, type PendingGroomerInterval } from "@/lib/booking/ala-carte-pending-groomers";

type TimedSelection = DraftPetSelection & { alaCarteScheduledTime?: string | null };
type Availability = { slot_time: string; groomer_id: string; available: boolean };
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

const EMPTY_LEGS: BookingLeg[] = [];
const SLOT_TIMES = Array.from({ length: 17 }, (_, i) => {
  const minutes = 540 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});
function timeLabel(value: string): string {
  const [hours, minutes] = value.split(":").map(Number);
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"}`;
}
function overlaps(aStart: number, aDuration: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aStart + aDuration > bStart;
}

/**
 * À La Carte uses individual appointment times, just like multi-pet Grooming.
 * A free groomer may handle more than one pet SEQUENTIALLY, never simultaneously.
 * Stored appointments and other selected (not yet submitted) services are both checked.
 */
export default function CustomerGroomingScheduleStep({
  customer: _customer, ownerContact: _ownerContact, petSelections, groomers, completedLegs = EMPTY_LEGS,
  scheduledDate, scheduledTime: _scheduledTime, specialRequests,
  onDateChange, onTimeChange, onRequestsChange, onSelectionsChange, onBack, onConfirmed,
}: Props) {
  void _customer;
  void _ownerContact;
  const closures = useBookingClosures();
  const [availability, setAvailability] = useState<Record<string, string[]>>({});
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [durationByAddon, setDurationByAddon] = useState<Map<string, number>>(new Map());
  const [durationLoading, setDurationLoading] = useState(true);
  const [durationError, setDurationError] = useState<string | null>(null);
  const [pendingIntervals, setPendingIntervals] = useState<PendingGroomerInterval[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [, setTick] = useState(0);
  const activeGroomers = groomers.filter(g => g.status === "active");
  const selected = petSelections as TimedSelection[];
  const today = manilaToday();
  const now = manilaTime();
  const isPast = (time: string) => !scheduledDate || scheduledDate < today || (scheduledDate === today && time <= now);
  const calendarReady = !closures.loading && !closures.error;
  const dateReady = !!scheduledDate && calendarReady && !closures.nameFor(scheduledDate);

  const loadAvailability = useCallback(async (date: string) => {
    const { data, error: failure } = await createClient().rpc("happytails_ala_carte_groomer_availability_v1", { p_date: date });
    if (failure) throw new Error(failure.message);
    const rows: Record<string, string[]> = {};
    for (const result of (data ?? []) as Availability[]) {
      if (result.available) (rows[result.slot_time] ??= []).push(result.groomer_id);
    }
    return rows;
  }, []);

  useEffect(() => {
    if (!scheduledDate) { setAvailability({}); setAvailabilityError(null); setLoadingAvailability(false); return; }
    let active = true;
    setLoadingAvailability(true); setAvailabilityError(null); setAvailability({});
    void loadAvailability(scheduledDate)
      .then(rows => { if (active) setAvailability(rows); })
      .catch(cause => { if (active) setAvailabilityError(cause instanceof Error ? cause.message : "Unable to load groomer availability."); })
      .finally(() => { if (active) setLoadingAvailability(false); });
    return () => { active = false; };
  }, [scheduledDate, loadAvailability]);

  // Verify item durations from Groomer Management. Never assume a 30-minute
  // service is safe when an admin has configured it to take longer.
  useEffect(() => {
    let active = true;
    const addonIds = [...new Set([
      ...selected.flatMap(s => s.addonIds ?? []),
      ...completedLegs.filter(l => l.serviceChoice === "ala_carte")
        .flatMap(l => l.petSelections.flatMap(s => s.addonIds ?? [])),
    ])];
    setDurationLoading(true); setDurationError(null); setDurationByAddon(new Map());
    if (!addonIds.length) { setDurationLoading(false); return; }
    void (async () => {
      const { data, error: failure } = await createClient()
        .from("ala_carte_service_durations")
        .select("addon_id,duration_minutes,verified").in("addon_id", addonIds);
      if (failure) {
        // Older installations predate the duration-verification table and
        // still enforce the original 30-minute rule. Only that specific
        // missing-table case may safely use the legacy default.
        if (failure.code === "PGRST205" || failure.code === "42P01" ||
          /could not find the table.*ala_carte_service_durations/i.test(failure.message)) {
          return new Map<string, number>();
        }
        throw new Error(`${failure.message}. Check À La Carte durations in Supabase.`);
      }
      return new Map((data ?? []).filter(row => row.verified === true)
        .map(row => [row.addon_id, Number(row.duration_minutes)] as const));
    })().then(durations => { if (active) setDurationByAddon(durations); })
      .catch(cause => { if (active) setDurationError(cause instanceof Error ? cause.message : "Unable to check service durations."); })
      .finally(() => { if (active) setDurationLoading(false); });
    return () => { active = false; };
    // Add-on identities change when the user changes their selection; string key
    // avoids re-fetching durations on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected.flatMap(s => s.addonIds ?? []).join("|"), completedLegs]);

  const durationOf = useCallback((addonIds: string[]) =>
    addonIds.reduce((sum, id) => sum + (durationByAddon.get(id) ?? 30), 0) || 30,
  [durationByAddon]);
  const durations = useMemo(() => new Map<string, number>(selected.map(s =>
    [s.pet.id, durationOf(s.addonIds ?? [])] as const)), [selected, durationOf]);

  useEffect(() => {
    if (!scheduledDate) { setPendingIntervals([]); setPendingError(null); setPendingLoading(false); return; }
    let active = true;
    const pending = pendingGroomerSelections(completedLegs, scheduledDate);
    setPendingIntervals([]); setPendingError(null);
    if (!pending.length) { setPendingLoading(false); return; }
    setPendingLoading(true);
    void (async () => {
      const rates = [...new Set(pending.map(p => p.packagePricingId).filter((id): id is string => !!id))];
      const durationByRate = new Map<string, number>();
      if (rates.length) {
        const db = createClient();
        const { data: pricing, error: pricingError } = await db.from("package_pricing")
          .select("id,package_id").in("id", rates);
        if (pricingError) throw pricingError;
        if ((pricing ?? []).length !== rates.length) throw new Error("A grooming rate was changed. Review the Grooming booking.");
        const pkgIds = [...new Set((pricing ?? []).map(r => r.package_id))];
        const { data: durationRows, error: durationFailure } = await db.from("grooming_package_durations")
          .select("package_id,duration_minutes,verified").in("package_id", pkgIds);
        if (durationFailure) throw durationFailure;
        const byPkg = new Map<string, number>((durationRows ?? []).filter(r => r.verified && Number(r.duration_minutes) >= 30)
          .map(r => [r.package_id, Number(r.duration_minutes)] as const));
        for (const rate of pricing ?? []) durationByRate.set(rate.id, byPkg.get(rate.package_id) ?? 30);
      }
      return pending.map(p => ({
        groomerId: p.groomerId,
        startMinute: p.startMinute,
        endMinute: p.startMinute + (p.packagePricingId
          ? durationByRate.get(p.packagePricingId) ?? 30 : durationOf(p.addonIds ?? [])),
      }));
    })().then(intervals => { if (active) setPendingIntervals(intervals); })
      .catch(cause => { if (active) setPendingError(cause instanceof Error ? cause.message : "Unable to check other selected services."); })
      .finally(() => { if (active) setPendingLoading(false); });
    return () => { active = false; };
  }, [scheduledDate, completedLegs, durationOf]);

  useEffect(() => {
    const timer = window.setInterval(() => setTick(n => n + 1), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const ready = dateReady && !loadingAvailability && !durationLoading && !pendingLoading &&
    !availabilityError && !durationError && !pendingError && activeGroomers.length > 0;
  // Groomer preferences are distinct from confirmed assignments. The same groomer
  // can be preferred for multiple pets because the planner staggers their times.
  const [preferences, setPreferences] = useState<Record<string, string>>(() =>
    Object.fromEntries(petSelections.map(s => [s.pet.id, s.groomerId ?? ""])));
  const [preferredStart, setPreferredStart] = useState(() => _scheduledTime || "09:00");
  const [arranged, setArranged] = useState(false);
  const [planned, setPlanned] = useState<TimedSelection[]>([]);
  const [quickPreference, setQuickPreference] = useState("");

  function clearArrangement() {
    setArranged(false);
    setPlanned([]);
    setError(null);
    // Unverified assignments must not silently survive a change of preference.
    if (selected.some(s => s.groomerId || s.alaCarteScheduledTime)) {
      onSelectionsChange(selected.map(s => ({ ...s, groomerId: null, alaCarteScheduledTime: null })));
    }
  }
  function chooseDate(date: string) {
    onDateChange(date);
    clearArrangement();
  }
  function chooseStart(time: string) {
    setPreferredStart(time);
    onTimeChange(time);
    clearArrangement();
  }
  function chooseQuickGroomer(groomerId: string) {
    setQuickPreference(groomerId);
    setPreferences(Object.fromEntries(selected.map(s => [s.pet.id, groomerId])));
    clearArrangement();
  }
  function choosePreference(petId: string, groomerId: string) {
    setPreferences(previous => ({ ...previous, [petId]: groomerId }));
    setQuickPreference("");
    clearArrangement();
  }
  function availableForPlan(
    groomerId: string, start: number, duration: number,
    rows: Record<string, string[]>, reserved: PendingGroomerInterval[],
  ): boolean {
    // Last service must finish by 5:30 PM. Server slots start at 9 AM–5 PM.
    if (start < 540 || start + duration > 1050) return false;
    for (let minute = start; minute < start + duration; minute += 30) {
      const key = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
      if (!rows[key]?.includes(groomerId)) return false;
    }
    return !reserved.some(item => item.groomerId === groomerId &&
      overlaps(start, duration, item.startMinute, item.endMinute));
  }
  function toClock(minute: number) {
    return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
  }

  async function arrange() {
    if (!scheduledDate || !ready || checking || !selected.length) return;
    const firstMinute = clockMinutes(preferredStart);
    if (firstMinute === null) return;
    setChecking(true); setError(null); setArranged(false); setPlanned([]);
    try {
      const closed = await closures.verifyOpen(scheduledDate);
      if (closed) throw new Error(closed);
      const latest = await loadAvailability(scheduledDate);
      setAvailability(latest);
      const candidates = activeGroomers.map(g => g.id);
      const built: TimedSelection[] = [];
      const reserved: PendingGroomerInterval[] = [...pendingIntervals];
      const options = selected.map(s => ({
        pet: s, duration: durations.get(s.pet.id) ?? 30,
        preference: preferences[s.pet.id] || "",
      }));
      // Most-constrained pets first: a groomer requested for multiple pets
      // should be scheduled sequentially rather than rejected immediately.
      options.sort((a, b) => Number(!!b.preference) - Number(!!a.preference) || b.duration - a.duration);
      let checks = 0;
      const plan = (index: number): boolean => {
        if (index === options.length) return true;
        if (++checks > 30000) return false;
        const { pet, duration, preference } = options[index];
        const ids = preference ? [preference] : candidates;
        for (let minute = firstMinute; minute <= 1020; minute += 30) {
          if (scheduledDate === today && toClock(minute) <= now) continue;
          for (const groomerId of ids) {
            if (!availableForPlan(groomerId, minute, duration, latest, reserved)) continue;
            reserved.push({ groomerId, startMinute: minute, endMinute: minute + duration });
            built.push({ ...pet, groomerId, alaCarteScheduledTime: toClock(minute) });
            if (plan(index + 1)) return true;
            built.pop(); reserved.pop();
          }
        }
        return false;
      };
      if (!plan(0)) {
        throw new Error("No valid arrangement was found for the selected start time and groomer preferences. Choose an earlier time, another date, or allow automatic groomer assignment.");
      }
      const plannedByPet = new Map(built.map(item => [item.pet.id, item]));
      const result = selected.map(s => plannedByPet.get(s.pet.id) ?? s);
      setPlanned(result);
      setArranged(true);
      onSelectionsChange(result);
      const first = result.map(s => s.alaCarteScheduledTime).filter((value): value is string => !!value).sort()[0];
      if (first) onTimeChange(first);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to arrange À La Carte appointments.");
    } finally {
      setChecking(false);
    }
  }

  return <section className="ht-ala-carte-schedule mx-auto w-full max-w-4xl space-y-5">
    <header className="text-center">
      <h2 className="text-2xl font-bold text-brand-pink">À La Carte Schedule</h2>
      <p className="mt-2 text-sm text-zinc-600">Choose a preferred start time and groomers. We will arrange non-overlapping appointments for your pets automatically.</p>
    </header>
    <p className="rounded-xl border border-pink-100 bg-pink-50 px-4 py-3 text-center text-xs text-zinc-700">
      30-minute start intervals · Verified service durations · Philippine time · One groomer may handle multiple pets sequentially.
    </p>
    <BookingDayCalendar value={scheduledDate} onChange={chooseDate} closures={closures} title="À La Carte" />
    <section className="rounded-2xl border border-pink-100 bg-white p-4 sm:p-5">
      <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-800"><Clock3 size={17} className="text-brand-pink" /> Choose preferred start time</h3>
      <p className="mt-1 text-xs leading-5 text-zinc-500">This is the earliest time you would like to begin. The system will assign individual start times, based on the available groomers and the length of each service.</p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {SLOT_TIMES.map(time => {
          const unavailable = !ready || isPast(time);
          // Capacity displayed is an indication at the selected instant, not a
          // promise that every pet can start simultaneously.
          const count = !unavailable ? (availability[time]?.length ?? 0) : 0;
          const active = preferredStart === time;
          return <button type="button" key={time} disabled={unavailable} aria-pressed={active} onClick={() => chooseStart(time)}
            className={`min-h-14 rounded-xl border px-2 py-2 text-xs font-semibold ${unavailable ? "border-zinc-200 bg-zinc-50 text-zinc-400" : active ? "border-brand-pink bg-pink-50 text-brand-pink" : "border-pink-200 text-zinc-700 hover:border-brand-pink"}`}>
            <span className="block">{timeLabel(time)}</span>
            <span className="mt-1 block text-[10px]">{unavailable ? "Unavailable" : `${count} free now`}</span>
          </button>;
        })}
      </div>
      <div className="mt-6 rounded-2xl border border-pink-200 bg-white p-4">
        <h3 className="flex items-center gap-2 font-bold text-zinc-800"><UserRound size={18} className="text-brand-pink" /> Groomer preference for each pet</h3>
        <p className="mt-1 text-xs leading-5 text-zinc-500">You can select one groomer for all pets, choose different groomers, or leave the assignment automatic. A shared groomer will handle pets one after another.</p>
        <div className="mt-4 rounded-xl border border-pink-200 bg-pink-50/60 p-3">
          <label className="block text-sm font-semibold text-zinc-800" htmlFor="ala-quick-groomer">Quick select — apply to all {selected.length} pet{selected.length === 1 ? "" : "s"}</label>
          <p className="mt-1 text-xs text-zinc-500">Choose the same groomer for the group, or use automatic assignment.</p>
          <select id="ala-quick-groomer" value={quickPreference} onChange={e => chooseQuickGroomer(e.target.value)}
            className="mt-2 w-full rounded-xl border border-pink-200 bg-white px-3 py-3 text-sm">
            <option value="">No preference — assign automatically</option>
            {activeGroomers.map(g => <option value={g.id} key={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div className="mt-4 space-y-3">
          {selected.map(s => <label key={s.pet.id} className="block text-sm font-semibold text-zinc-800">{s.pet.name}
            <select value={preferences[s.pet.id] ?? ""} onChange={e => choosePreference(s.pet.id, e.target.value)}
              className="mt-1 block w-full rounded-xl border border-pink-200 bg-white px-3 py-3 text-sm">
              <option value="">No preference — assign automatically</option>
              {activeGroomers.map(g => <option value={g.id} key={g.id}>{g.name}</option>)}
            </select>
            <span className="mt-1 block text-[11px] font-normal text-zinc-500">Estimated service duration: {durations.get(s.pet.id) ?? 30} minutes</span>
          </label>)}
        </div>
        <button type="button" disabled={!ready || checking || !selected.length || isPast(preferredStart)}
          onClick={() => void arrange()} className="mt-5 min-h-12 w-full rounded-full border-2 border-brand-pink px-5 py-3 text-sm font-bold text-brand-pink disabled:opacity-40">
          {checking ? "Checking live availability…" : "Check & Arrange À La Carte Times"}
        </button>
      </div>
    </section>
    {arranged && planned.length > 0 && <section aria-label="Proposed À La Carte appointments" className="rounded-2xl border border-pink-200 bg-pink-50/60 p-4 sm:p-5">
      <h3 className="text-sm font-bold text-zinc-900">Proposed non-overlapping appointments</h3>
      <p className="mt-1 text-xs leading-5 text-zinc-600">Review the arranged times and groomers below. To make changes, select a different time or groomer and run Check &amp; Arrange again.</p>
      <div className="mt-3 space-y-2">
        {[...planned].sort((a, b) => (a.alaCarteScheduledTime ?? "").localeCompare(b.alaCarteScheduledTime ?? ""))
          .map(s => {
            const start = s.alaCarteScheduledTime ?? "09:00";
            const startMinute = clockMinutes(start) ?? 540;
            const duration = durations.get(s.pet.id) ?? 30;
            return <div key={s.pet.id} className="flex flex-col gap-1 rounded-xl bg-white px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <strong className="text-zinc-900">{s.pet.name}</strong>
              <span className="text-zinc-700 sm:text-right">{activeGroomers.find(g => g.id === s.groomerId)?.name ?? "Groomer"} · {timeLabel(start)}–{timeLabel(toClock(startMinute + duration))} · {duration} min</span>
            </div>;
          })}
      </div>
      <p className="mt-3 text-xs text-zinc-600">These arrangements are checked again at checkout; they are not final reservations until booking is completed.</p>
    </section>}
    {loadingAvailability || durationLoading || pendingLoading ? <p className="text-sm text-zinc-500">Checking live groomer availability and verified durations…</p> : null}
    {[availabilityError, durationError, pendingError].filter(Boolean).map(message =>
      <p role="alert" key={message} className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{message}</p>)}
    <label className="block text-sm font-semibold text-zinc-800">Special Requests
      <textarea rows={3} value={specialRequests} onChange={e => onRequestsChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-pink-200 p-3 text-sm" placeholder="Allergies, handling instructions, or other notes" />
    </label>
    {error && <div role="alertdialog" aria-modal="true" aria-label="Booking availability notice" className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"><h3 className="text-lg font-bold text-rose-700">Unable to arrange appointments</h3>
        <p className="mt-3 text-sm text-zinc-700">{error}</p>
        <button type="button" onClick={() => setError(null)} className="mt-5 rounded-full bg-brand-pink px-6 py-2.5 font-semibold text-white">Review Preferences</button>
      </div>
    </div>}
    <div className="grid grid-cols-2 gap-3">
      <button type="button" onClick={onBack} className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-pink-200 font-semibold text-brand-pink"><ArrowLeft size={16} /> Back</button>
      <button type="button" disabled={!arranged || checking} onClick={onConfirmed}
        className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-pink font-semibold text-white disabled:opacity-40">Continue <ArrowRight size={16} /></button>
    </div>
  </section>;
}
