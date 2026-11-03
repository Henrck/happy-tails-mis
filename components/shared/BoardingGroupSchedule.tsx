"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import BookingDayCalendar from "@/components/shared/BookingDayCalendar";
import { useBookingClosures, manilaToday } from "@/lib/booking/use-booking-closures";
import { checkBoardingGroup, fetchBoardingGroupMonth, type BoardingGroupPet, type BoardingGroupDay, fetchBoardingKennelCounts, type BoardingKennelCounts } from "@/lib/supabase/boarding-group-availability";
import { hasValidBoardingDuration, isExtendedBoardingRate, parseExtendedBoardingNights } from "@/lib/booking/boarding-duration";
import type { DraftPetSelection } from "@/lib/types/appointments";
import type { PackagePricing } from "@/lib/types/services";
import type { Kennel } from "@/lib/types/pet-services";
import { shareGroups, type ShareSelection } from "@/lib/booking/boarding-share";
import FeedbackDialog from "@/components/admin/operations/FeedbackDialog";
import { boardingPhysicalCapacity, boardingCapacityMessage } from "@/lib/booking/boarding-capacity";

const BELONGINGS = ["Pet Bed", "Toys", "Cat Litter", "Leash/Collar", "Others"];
const DAY_MS = 86_400_000;

function nightsFor(sel: DraftPetSelection, rates: PackagePricing[]): number | null {
  const rate = rates.find((p) => p.id === sel.packagePricingId);
  if (!rate || !hasValidBoardingDuration(sel, rates)) return null;
  if (isExtendedBoardingRate(rate)) return parseExtendedBoardingNights(sel.boardingNights);
  if (rate.nights != null) return rate.nights;
  const match = `${rate.size_detail ?? ""} ${rate.size_label}`.match(/(\d+)\s*nights?/i);
  return match ? Number(match[1]) : sel.boardingNights ?? null;
}
function addNights(day: string, nights: number) {
  return new Date(Date.parse(`${day}T00:00:00Z`) + nights * DAY_MS).toISOString().slice(0, 10);
}
function dateTime(day: string, time: string) {
  return new Date(`${day}T${time}:00+08:00`).toISOString();
}
function display(iso: string) {
  return new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

type Props = {
  petSelections: DraftPetSelection[];
  pricing: PackagePricing[];
  kennels: Kennel[];
  petBelongings: string[];
  specialRequests: string;
  onBelongingsChange: (items: string[]) => void;
  onRequestsChange: (text: string) => void;
  onSelectionsChange: (items: DraftPetSelection[]) => void;
  onBack: () => void;
  onConfirmed: (items: DraftPetSelection[]) => void;
};

export default function BoardingGroupSchedule({ petSelections, pricing, kennels, petBelongings, specialRequests,
  onBelongingsChange, onRequestsChange, onSelectionsChange, onBack, onConfirmed }: Props) {
  const closures = useBookingClosures();
  const savedDates = petSelections.map((s) => s.boardingScheduledDate).filter(Boolean);
  const restored = savedDates.length === petSelections.length && new Set(savedDates).size === 1 ? savedDates[0]! : "";
  const [date, setDate] = useState(restored);
  const [time, setTime] = useState(() => {
    const saved = petSelections[0]?.boardingDropOffAt;
    if (!restored || !saved) return "09:00";
    try {
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
      }).formatToParts(new Date(saved));
      const hour = parts.find((part) => part.type === "hour")?.value ?? "09";
      const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
      return `${hour}:${minute}`;
    } catch { return "09:00"; }
  });
  const [month, setMonth] = useState(() => (restored || manilaToday()).slice(0, 7));
  const [days, setDays] = useState<BoardingGroupDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<BoardingKennelCounts | null>(null);
  const [countsLoading, setCountsLoading] = useState(false);
  const [countsError, setCountsError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [review, setReview] = useState(false);
  const [verified, setVerified] = useState<DraftPetSelection[]>([]);

  // Respect Calendar Management for ALL closure types. A holiday that
  // SuperAdmin explicitly opens has is_open_override=true and is selectable.
  // A holiday kept closed is blocked; no separate Philippine-holiday rule here.
  const boardingClosures = closures;

  const requirements = useMemo((): BoardingGroupPet[] => petSelections.map((sel) => ({
    pet_id: sel.pet.id,
    kennel_size: sel.boardingKennelSize === "big" ? "big" : "small",
    nights: nightsFor(sel, pricing) ?? 0,
    share_group: (sel as ShareSelection).boardingShareGroupId ?? null,
  })), [petSelections, pricing]);
  const longestStay = requirements.reduce((max, pet) => Math.max(max, pet.nights), 0);
  const physicalCapacity = useMemo(() => boardingPhysicalCapacity(petSelections, kennels), [petSelections, kennels]);
  useEffect(() => {
    let active = true;
    setCounts(null); setCountsError(null);
    if (!date || !longestStay || !/^\d{2}:\d{2}$/.test(time)) { setCountsLoading(false); return; }
    setCountsLoading(true);
    void fetchBoardingKennelCounts(date, time, longestStay).then(({ counts: result, error: failure }) => {
      if (!active) return;
      setCounts(result); setCountsError(failure); setCountsLoading(false);
    });
    return () => { active = false; };
  }, [date, time, longestStay, refresh]);
  const signature = JSON.stringify(requirements);
  const validDetails = petSelections.length > 0 && requirements.every((s, index) =>
    s.nights >= 1 && !!petSelections[index].packagePricingId && !!petSelections[index].boardingKennelSize &&
    (s.kennel_size === "big" || ["small", "medium"].includes(petSelections[index].pet.size_label.trim().toLowerCase())));

  useEffect(() => {
    let active = true;
    if (!validDetails || physicalCapacity.exceeded) { setLoading(false); setDays([]); return; }
    setLoading(true); setLoadError(null);
    void fetchBoardingGroupMonth(month, time, requirements).then((result) => {
      if (!active) return;
      setDays(result.days);
      setLoadError(result.error);
      setLoading(false);
    });
    return () => { active = false; };
    // Recheck when kennel sizes, nights, arrival time, or month change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, time, signature, validDetails, refresh, closures.dates]);
  useEffect(() => {
    const timer = setInterval(() => setRefresh((x) => x + 1), 30_000);
    return () => clearInterval(timer);
  }, []);

  const onMonthChange = useCallback((next: string) => setMonth((current) => current === next ? current : next), []);
  const availability: Record<string, number> = {};
  const unavailable: Record<string, string> = {};
  for (const item of days) {
    const arrivalClosure = boardingClosures.nameFor(item.day);
    const pickupClosure = requirements.map(p => ({ day: addNights(item.day, p.nights), name: boardingClosures.nameFor(addNights(item.day, p.nights)) })).find(x => x.name);
    const reason = arrivalClosure ? `Shop closed: ${arrivalClosure}` : pickupClosure ? `Pickup on ${pickupClosure.day} is closed: ${pickupClosure.name}` : !item.available ? item.reason ?? "Fully booked for the selected group" : null;
    availability[item.day] = reason ? 0 : 1;
    if (reason) unavailable[item.day] = reason;
  }

  const setSchedule = (day: string, clock: string) => petSelections.map((s) => {
    const nights = nightsFor(s, pricing)!;
    return {
      ...s,
      boardingScheduledDate: day,
      boardingDropOffAt: dateTime(day, clock),
      boardingPickUpAt: dateTime(addNights(day, nights), clock),
      kennelId: null,
    };
  });
  const clearSchedules = () => onSelectionsChange(petSelections.map((s) => ({
    ...s, boardingScheduledDate: null, boardingDropOffAt: null, boardingPickUpAt: null, kennelId: null,
  })));

  async function choose(day: string) {
    if (checking || loading || closures.loading || closures.error || physicalCapacity.exceeded) return;
    setChecking(true); setError(null);
    try {
      const closed = await closures.verifyOpen(day);
      if (closed) { setError(closed); return; }
      for (const item of requirements) {
        const pickupClosed = await closures.verifyOpen(addNights(day, item.nights));
        if (pickupClosed) { setError(`Pickup date: ${pickupClosed}`); return; }
      }
      const result = await checkBoardingGroup(day, time, requirements);
      if (!result.available) { setError(result.reason || "The requested group no longer fits. Choose another date."); setRefresh((n) => n + 1); return; }
      setDate(day);
      onSelectionsChange(setSchedule(day, time));
    } finally { setChecking(false); }
  }
  function changeTime(next: string) {
    setTime(next); setDate(""); setError(null); clearSchedules();
  }
  const selectedAvailable = !!date && availability[date] === 1;
  const valid = validDetails && !physicalCapacity.exceeded && selectedAvailable && !loading && !checking && !loadError && !closures.loading && !closures.error &&
    /^\d{2}:\d{2}$/.test(time) && time >= "09:00" && time <= "18:00" &&
    new Date(`${date}T${time}:00+08:00`).getTime() > Date.now();
  async function confirm() {
    if (!valid || checking) return;
    setChecking(true); setError(null);
    try {
      const closed = await closures.verifyOpen(date);
      if (closed) { setError(closed); return; }
      for (const item of requirements) {
        const pickupClosed = await closures.verifyOpen(addNights(date, item.nights));
        if (pickupClosed) { setError(`Pickup date: ${pickupClosed}`); return; }
      }
      const result = await checkBoardingGroup(date, time, requirements);
      if (!result.available) { setError(result.reason || "Kennel availability changed. Choose another date."); setRefresh((n) => n + 1); return; }
      const final = setSchedule(date, time);
      onSelectionsChange(final);
      setVerified(final);
      setReview(true);
    } finally { setChecking(false); }
  }

  if (review) return <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4" role="presentation">
    <div role="dialog" aria-modal="true" aria-label="Review boarding allocation" className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-xl sm:p-6">
      <h3 className="text-lg font-bold text-zinc-800">Review Boarding Reservation</h3>
      <p className="mt-2 text-sm text-zinc-600">All {petSelections.length} pet(s) fit the selected stay. Only the explicitly selected eligible sharing groups will occupy one Big kennel. Other pets have separate kennels.</p>
      <div className="mt-4 space-y-2">
        {shareGroups(verified as ShareSelection[]).map(group => <div key={group[0].boardingShareGroupId} className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm">
          <b>One shared Big kennel</b> · {group.map(s => s.pet.name).join(" + ")}
          <p className="mt-1 font-semibold text-emerald-900">Combined charge: ₱{group.reduce((sum,s) => sum + s.lineAmount,0).toLocaleString()}</p>
          <p className="mt-1 text-xs text-emerald-800">One kennel base rate; per-pet add-ons are retained.</p>
        </div>)}
        {verified.map((s) => <div key={s.pet.id} className="rounded-xl border border-pink-100 bg-pink-50 p-3 text-sm">
        <b>{s.pet.name}</b> · {s.boardingKennelSize === "big" ? "Big" : "Small"} Kennel · ₱{s.lineAmount.toLocaleString()}
        <p className="mt-1 text-xs text-zinc-600">{display(s.boardingDropOffAt!)} → {display(s.boardingPickUpAt!)}</p>
      </div>)}</div>
      <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">Availability is not reserved until final booking submission. Holiday check-in and pickup are allowed only when Calendar Management marks those dates open. Existing caretaker arrangements do not bypass a closed shop day.</p>
      <div className="mt-5 grid grid-cols-2 gap-3"><button onClick={() => setReview(false)} className="rounded-full border border-pink-200 py-3 text-sm font-semibold text-brand-pink">Review dates</button><button onClick={() => { setReview(false); onConfirmed(verified); }} className="rounded-full bg-brand-pink py-3 text-sm font-semibold text-white">Continue</button></div>
    </div>
  </div>;

  return <div className="mx-auto max-w-4xl space-y-5">
    <div className="rounded-2xl border border-pink-100 bg-pink-50 p-4">
      <h2 className="text-lg font-bold text-brand-pink">Boarding Dates — Live Group Availability</h2><p className="mt-1 text-xs font-semibold text-zinc-500">Step 2 of 2 · Choose your drop-off day and review each pickup date</p>
      <p className="mt-1 text-sm text-zinc-700">The calendar checks all selected pets together. The current active capacity is {kennels.filter((k) => k.size === "small" && k.is_active !== false).length} Small and {kennels.filter((k) => k.size === "big" && k.is_active !== false).length} Big.</p>
      <p className="mt-2 text-xs text-zinc-600"><b>Sharing rules:</b> One shared Big kennel holds two Small pets, Small + Medium, Medium + Medium, or three Small pets, only when the Share One Big Kennel option was selected in Details. A Large or larger pet uses one Big kennel alone. A Small kennel holds one Small or Medium pet.</p>
    </div>
    <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">The calendar checks the <strong>entire stay</strong>, not just the arrival date. For example, arriving November 3 for six nights overlaps Big kennels reserved from November 5, so the date is unavailable. A stay that checks out before those reservations begin may still be available.</p>
    {physicalCapacity.exceeded && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"><b>Book these pets in separate appointments.</b><p className="mt-2">{boardingCapacityMessage(physicalCapacity)}</p><button type="button" className="mt-3 rounded-full bg-brand-pink px-4 py-2 text-xs font-bold text-white" onClick={onBack}>Return to Boarding Details</button></div>}
    {!physicalCapacity.exceeded && <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_230px]">
      <BookingDayCalendar title="Group check-in" value={date} closures={boardingClosures}
        availability={availability} unavailable={unavailable} groupMode onBlocked={setError}
        capacityLoading={loading || checking || !validDetails} capacityError={loadError}
        onMonthChange={onMonthChange} onChange={(day) => { void choose(day); }}/>
      <div className="space-y-3 rounded-2xl border border-pink-100 bg-white p-4">
        <label className="block text-sm font-semibold text-zinc-800">Drop-off time (all pets)
          <input type="time" min="09:00" max="18:00" step={60} value={time} onChange={(e) => changeTime(e.target.value)} className="mt-2 w-full rounded-xl border border-pink-200 p-3 text-sm"/>
        </label>
        <p className="text-xs leading-5 text-zinc-600">Pickup is calculated separately for each pet using the selected duration and the same arrival time.</p>
        <div className="rounded-xl border border-pink-200 bg-pink-50 p-3" aria-live="polite">
          <p className="text-sm font-bold text-zinc-800">Kennels available for your dates</p>
          <p className="mt-1 text-[11px] leading-4 text-zinc-600">{date ? `${date} · ${longestStay} night${longestStay === 1 ? "" : "s"} from ${time} (entire longest selected stay)` : "Choose an available date to see live counts."}</p>
          {date && (countsLoading ? <p className="mt-3 text-xs text-zinc-500">Checking active kennels…</p> : counts ?
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-white p-3 text-center"><span className="block text-xs text-zinc-600">Small kennels</span><strong className="text-xl text-brand-pink">{counts.small}</strong><span className="block text-[10px] text-zinc-500">of {counts.totalSmall} active</span></div>
              <div className="rounded-lg bg-white p-3 text-center"><span className="block text-xs text-zinc-600">Big kennels</span><strong className="text-xl text-brand-pink">{counts.big}</strong><span className="block text-[10px] text-zinc-500">of {counts.totalBig} active</span></div>
            </div> : <p className="mt-2 text-xs text-amber-800">{countsError ?? "Select a date to view available kennels."}</p>)}
          <p className="mt-2 text-[11px] leading-4 text-zinc-500">Counts reflect existing reservations, before adding this booking. Final group allocation is checked again when saving.</p>
        </div>

        {petSelections.map((s) => {
          const n = nightsFor(s, pricing);
          return <div key={s.pet.id} className="rounded-xl bg-slate-50 p-3 text-xs text-zinc-700">
            <b>{s.pet.name}</b><p>{s.boardingKennelSize === "big" ? "Big" : "Small"} · {n ?? "—"} nights</p>
            <p>{date && n ? `${date} → ${addNights(date,n)}` : "Choose an available arrival date"}</p>
          </div>;
        })}
        <p className="text-xs text-amber-800">Shop closures apply to holiday check-in and pickup unless SuperAdmin has opened the date in Calendar Management.</p>
      </div>
    </div>}
    <div><p className="text-sm font-semibold text-zinc-800">Pet belongings (optional)</p><div className="mt-2 flex flex-wrap gap-2">{BELONGINGS.map((item) => <button key={item} type="button" onClick={() => onBelongingsChange(petBelongings.includes(item) ? petBelongings.filter((v) => v !== item) : [...petBelongings,item])} className={`rounded-full border px-3 py-2 text-xs font-semibold ${petBelongings.includes(item) ? "border-brand-pink bg-brand-pink text-white" : "border-pink-200 bg-white text-zinc-700"}`}>{item}</button>)}</div></div>
    <label className="block text-sm font-semibold text-zinc-800">Care instructions / special requests<textarea value={specialRequests} rows={3} onChange={(e) => onRequestsChange(e.target.value)} className="mt-2 w-full rounded-xl border border-pink-200 bg-white p-3 text-sm"/></label>
    {error && <FeedbackDialog title="Boarding Date Unavailable" tone="warning" message={error} onClose={() => setError(null)} />}
    {loadError && <FeedbackDialog title="Could Not Check Boarding Calendar" message={loadError} onClose={() => setLoadError(null)} />}
    <div className="grid grid-cols-2 gap-3"><button type="button" onClick={onBack} className="rounded-full border border-pink-200 py-3 font-semibold text-brand-pink">Back</button><button type="button" disabled={!valid} onClick={() => { void confirm(); }} className="rounded-full bg-brand-pink py-3 font-semibold text-white disabled:opacity-40">{checking ? "Checking…" : "Review Schedule"}</button></div>
  </div>;
}
