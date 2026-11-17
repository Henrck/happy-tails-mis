"use client";
import { formatPeso } from "@/lib/utils/currency";

import { useCallback, useEffect, useMemo, useState } from "react";
import BoardingStayCalendar, { type BoardingDayStatus } from "@/components/shared/BoardingStayCalendar";
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronUp, Clock, Info, Sparkles } from "lucide-react";
import { useBookingClosures, manilaToday, boardingClosures as withoutClosureBlocks } from "@/lib/booking/use-booking-closures";
import { checkBoardingGroup, fetchBoardingGroupMonth, type BoardingGroupPet, type BoardingGroupDay, fetchBoardingKennelCounts, type BoardingKennelCounts } from "@/lib/supabase/boarding-group-availability";
import { hasValidBoardingDuration, isExtendedBoardingRate, parseExtendedBoardingNights } from "@/lib/booking/boarding-duration";
import type { DraftPetSelection } from "@/lib/types/appointments";
import type { PackagePricing } from "@/lib/types/services";
import type { Kennel } from "@/lib/types/pet-services";
import { shareGroups, type ShareSelection } from "@/lib/booking/boarding-share";
import FeedbackDialog from "@/components/admin/operations/FeedbackDialog";
import BookingStepConfirmation from "@/components/shared/BookingStepConfirmation";

const BELONGINGS = ["Pet Bed", "Toys", "Cat Litter", "Leash/Collar", "Others"];
/** Drop-off window: 9:00 AM to 6:00 PM, in 15-minute steps (6:00 PM is the last slot). */
const DROP_OFF_HOURS = ["09", "10", "11", "12", "13", "14", "15", "16", "17", "18"];
const DROP_OFF_MINUTES = ["00", "15", "30", "45"];
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
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<BoardingKennelCounts | null>(null);
  const [countsLoading, setCountsLoading] = useState(false);
  const [countsError, setCountsError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [review, setReview] = useState(false);
  const [confirmBack, setConfirmBack] = useState(false);
  const [verified, setVerified] = useState<DraftPetSelection[]>([]);
  const [showRules, setShowRules] = useState(false);

  // Boarding is allowed on holidays and shop closures (a caretaker is on duty),
  // so closures never block; they are only shown as an informational note.
  const boardingClosures = useMemo(() => withoutClosureBlocks(closures), [closures]);

  const requirements = useMemo((): BoardingGroupPet[] => petSelections.map((sel) => ({
    pet_id: sel.pet.id,
    kennel_size: sel.boardingKennelSize === "big" ? "big" : "small",
    nights: nightsFor(sel, pricing) ?? 0,
    share_group: (sel as ShareSelection).boardingShareGroupId ?? null,
  })), [petSelections, pricing]);
  const longestStay = requirements.reduce((max, pet) => Math.max(max, pet.nights), 0);
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
    if (!validDetails) { setLoading(false); setDays([]); return; }
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
  }, [month, time, signature, validDetails, refresh]);
  useEffect(() => {
    const timer = setInterval(() => { setRefresh((x) => x + 1); setNow(Date.now()); }, 30_000);
    return () => clearInterval(timer);
  }, []);

  const onMonthChange = useCallback((next: string) => setMonth((current) => current === next ? current : next), []);
  const availability: Record<string, number> = {};
  const unavailable: Record<string, string> = {};
  const today = manilaToday();
  for (const item of days) {
    // A day explicitly opened in Calendar Management can still be in the past.
    // Do not mislabel past days as shop closures when the SQL planner rejects them.
    if (item.day < today) continue;
    availability[item.day] = item.available ? 1 : 0;
    if (!item.available) {
      const selectedDropOff = new Date(`${item.day}T${time}:00+08:00`).getTime();
      unavailable[item.day] = item.day === today && selectedDropOff <= now
        ? "Drop-off time has passed"
        : item.reason ?? "Fully booked for the selected group";
    }
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
    if (checking || loading || closures.loading || closures.error) return;
    setChecking(true); setError(null);
    try {
      const result = await checkBoardingGroup(day, time, requirements);
      if (!result.available) { setError(result.reason || "The requested group no longer fits. Choose another date."); setRefresh((n) => n + 1); return; }
      setDate(day);
      onSelectionsChange(setSchedule(day, time));
    } finally { setChecking(false); }
  }
  function changeTime(next: string) {
    setTime(next); setDate(""); setError(null); clearSchedules();
  }
  const selectedAvailable = !!date && days.some((row) => row.day === date && row.available);
  const valid = validDetails && selectedAvailable && !loading && !checking && !loadError && !closures.loading && !closures.error &&
    /^\d{2}:\d{2}$/.test(time) && time >= "09:00" && time <= "18:00" &&
    new Date(`${date}T${time}:00+08:00`).getTime() > now;
  async function confirm() {
    if (!valid || checking) return;
    setChecking(true); setError(null);
    try {
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
          <p className="mt-1 font-semibold text-emerald-900">Combined charge: {formatPeso(group.reduce((sum,s) => sum + s.lineAmount,0))}</p>
          <p className="mt-1 text-xs text-emerald-800">One kennel base rate; per-pet add-ons remain retained.</p>
        </div>)}
        {verified.map((s) => <div key={s.pet.id} className="mt-2 rounded-xl border border-pink-100 bg-pink-50 p-3 text-sm">
          <b>{s.pet.name}</b> · {s.boardingKennelSize === "big" ? "Big" : "Small"} Kennel · {formatPeso(s.lineAmount)}
          <p className="mt-1 text-xs text-zinc-600">{display(s.boardingDropOffAt!)} → {display(s.boardingPickUpAt!)}</p>
        </div>)}
      </div>
      <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">Availability is not reserved until final booking submission. On holidays and shop closures, a caretaker on duty supervises boarded pets and handles drop-off and pickup during the 9 AM–6 PM window.</p>
      <div className="mt-5 grid grid-cols-2 gap-3"><button onClick={() => setReview(false)} className="rounded-full border border-pink-200 py-3 text-sm font-semibold text-brand-pink">Review dates</button><button onClick={() => { setReview(false); onConfirmed(verified); }} className="rounded-full bg-brand-pink py-3 text-sm font-semibold text-white">Confirm & Proceed</button></div>
    </div>
  </div>;

  // ---- Display helpers (layout only; availability logic above is unchanged) ----
  const nightsByPet = petSelections.map((s) => ({ sel: s, nights: nightsFor(s, pricing) }));
  const uniformNights = new Set(nightsByPet.map((p) => p.nights)).size === 1 ? longestStay : null;
  const stayLabel = uniformNights ? `${uniformNights}-night stay` : `Up to ${longestStay}-night stay`;
  const pickupDays = date ? Array.from(new Set(nightsByPet.filter((p) => p.nights).map((p) => addNights(date, p.nights!)))) : [];
  const stayEnd = date && longestStay ? addNights(date, longestStay) : "";
  const activeSmall = kennels.filter((k) => k.size === "small" && k.is_active !== false).length;
  const activeBig = kennels.filter((k) => k.size === "big" && k.is_active !== false).length;
  const calendarBusy = loading || checking || !validDetails || closures.loading;
  // Customer-chosen drop-off time: any quarter hour from 9:00 AM to 6:00 PM.
  const [timeHour, timeMinute] = time.split(":");
  const minuteOptions = Array.from(new Set([...DROP_OFF_MINUTES, ...(DROP_OFF_MINUTES.includes(timeMinute) ? [] : [timeMinute])])).sort();
  const setTimeParts = (hour: string, minute: string) => {
    const next = `${hour}:${hour === "18" ? "00" : minute}`;
    if (next !== time) changeTime(next);
  };
  const statusFor = (day: string): BoardingDayStatus => {
    if (day < today) return { kind: "past" };
    const reason = boardingClosures.nameFor(day) ?? unavailable[day];
    if (reason) return { kind: "blocked", reason };
    if (calendarBusy || availability[day] === undefined) return { kind: "checking" };
    const note = boardingClosures.noteFor(day);
    return note ? { kind: "available", note } : { kind: "available" };
  };
  const card = "rounded-2xl border border-pink-100 bg-white p-4 shadow-sm sm:p-5";

  return <div className="mx-auto max-w-6xl">
    {confirmBack && <BookingStepConfirmation
      title="Return to boarding details?"
      description="You can review or change the kennel and duration. Changing those details may clear the selected boarding schedule and require another availability check."
      confirmLabel="Go Back" danger
      onCancel={() => setConfirmBack(false)}
      onConfirm={() => { setConfirmBack(false); onBack(); }} />}
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-5">
        <header className={card}>
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-brand-pink">Step 2 of 2 · Boarding Dates</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">{longestStay ? stayLabel : "Stay length not set"}</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Select Boarding Dates</h2>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-600 sm:text-sm">Choose your drop-off day. Dates are available only when kennels are open for {petSelections.length > 1 ? "every selected pet's" : "your"} <strong className="font-semibold text-slate-800">entire stay</strong>.</p>
          <div className="mt-4 border-t border-slate-100 pt-3">
            <button type="button" onClick={() => setShowRules((v) => !v)} aria-expanded={showRules}
              className="flex w-full items-center justify-between py-1 text-left text-xs font-semibold text-slate-700 hover:text-brand-pink">
              <span className="flex items-center gap-1.5"><Info size={16} className="shrink-0 text-brand-pink"/>Kennel rules &amp; capacity ({activeSmall} Small, {activeBig} Big active)</span>
              {showRules ? <ChevronUp size={16} className="text-slate-400"/> : <ChevronDown size={16} className="text-slate-400"/>}
            </button>
            {showRules && <div className="mt-2.5 space-y-2 rounded-xl border border-pink-100 bg-[#FFF8FB] p-3.5 text-xs leading-relaxed text-slate-600">
              <p><strong className="text-slate-800">Entire-stay check:</strong> The calendar checks every night of the stay, not just the arrival date. For example, arriving on the 3rd for six nights overlaps Big kennels reserved from the 5th, so that date is unavailable; a stay that checks out before those reservations begin may still be available.</p>
              <p><strong className="text-slate-800">Kennel sizing &amp; sharing:</strong> A Small kennel holds one Small or Medium pet. One shared Big kennel holds two Small pets, Small + Medium, Medium + Medium, or three Small pets, only when Share One Big Kennel was selected in Details. A Large or larger pet uses one Big kennel alone.</p>
              <p><strong className="text-slate-800">Holidays &amp; closures:</strong> Boarding continues on holidays and shop closures. A caretaker is on duty for boarded pets, so drop-off, the stay and pickup (9 AM to 6 PM) can fall on those dates. They&apos;re marked in amber on the calendar.</p>
            </div>}
          </div>
        </header>

        <BoardingStayCalendar value={date} today={today} statusFor={statusFor} stayEnd={stayEnd} pickupDays={pickupDays}
          stayLabel={uniformNights ? `${uniformNights}-night stay` : "Stay"} busy={checking || closures.loading || loading}
          busyLabel={checking ? "Checking the whole stay…" : closures.loading ? "Checking shop calendar…" : "Checking kennel space…"}
          errorText={closures.error ? `Unable to load closures: ${closures.error}` : !validDetails ? "Complete valid Boarding Details first." : null}
          onMonthChange={onMonthChange} onSelect={(day) => { void choose(day); }}/>

        <section className={card}>
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900">Drop-off time{petSelections.length > 1 ? " (all pets)" : ""}</h3>
            <span className="rounded-md border border-pink-100 bg-[#FFF5F9] px-2 py-0.5 text-[11px] font-medium text-brand-pink">Same pickup time</span>
          </div>
          <p className="mb-3.5 text-xs text-slate-500">Choose any time within shop hours (9:00 AM–6:00 PM). Pickup is at the same time of day after each pet&apos;s stay. Changing the time clears the selected date so the stay can be re-checked.</p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-0">
              <span className="mb-1 block text-[11px] font-semibold text-slate-500">Hour</span>
              <select value={timeHour} onChange={(e) => setTimeParts(e.target.value, timeMinute)} aria-label="Drop-off hour"
                className="w-32 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 focus:border-brand-pink focus:outline-none focus:ring-2 focus:ring-pink-100">
                {DROP_OFF_HOURS.map((h) => <option key={h} value={h}>{clockLabel(`${h}:00`).replace(":00", "")}</option>)}
              </select>
            </label>
            <span className="pb-2.5 text-lg font-bold text-slate-400" aria-hidden="true">:</span>
            <label className="min-w-0">
              <span className="mb-1 block text-[11px] font-semibold text-slate-500">Minute</span>
              <select value={timeMinute} onChange={(e) => setTimeParts(timeHour, e.target.value)} aria-label="Drop-off minute" disabled={timeHour === "18"}
                className="w-24 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 focus:border-brand-pink focus:outline-none focus:ring-2 focus:ring-pink-100 disabled:bg-slate-50 disabled:text-slate-400">
                {minuteOptions.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
            <p className="flex items-center gap-1.5 rounded-xl bg-pink-50 px-3.5 py-2.5 text-sm font-bold text-brand-pink" aria-live="polite">
              <Clock size={16} aria-hidden="true"/>Drop-off at {clockLabel(time)}
            </p>
          </div>
          {timeHour === "18" && <p className="mt-2 text-[11px] text-slate-500">6:00 PM is the latest drop-off time.</p>}
        </section>

        <section className={`${card} space-y-4`}>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Pet belongings <span className="font-normal text-slate-400">(optional)</span></h3>
            <div className="mt-2.5 flex flex-wrap gap-2">{BELONGINGS.map((item) => {
              const checked = petBelongings.includes(item);
              return <button key={item} type="button" aria-pressed={checked}
                onClick={() => onBelongingsChange(checked ? petBelongings.filter((v) => v !== item) : [...petBelongings, item])}
                className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${checked ? "border-brand-pink bg-pink-100 text-[#B81D6B]" : "border-slate-200 bg-white text-slate-600 hover:border-pink-300"}`}>
                {checked && <Check size={14} className="text-brand-pink"/>}{item}
              </button>;
            })}</div>
          </div>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-900">Care instructions / special requests</span>
            <textarea value={specialRequests} rows={3} maxLength={1000} onChange={(e) => onRequestsChange(e.target.value)}
              placeholder={`Feeding schedule, medication notes or special care for ${petSelections.map((s) => s.pet.name).join(", ") || "your pet"}…`}
              className="w-full rounded-xl border border-slate-200 bg-[#FFFBFD] px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-pink focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-100"/>
          </label>
        </section>
      </div>

      <aside className={`${card} xl:sticky xl:top-4`} aria-label="Booking summary">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <h3 className="text-base font-bold text-slate-900">Booking Summary</h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-pink-100/70 px-2.5 py-0.5 text-[11px] font-bold text-brand-pink"><Sparkles size={12}/>Live counts</span>
        </div>

        <div className="space-y-3 border-b border-slate-100 py-4">
          <SummaryDate label="Drop-off" date={date} time={time}/>
          <SummaryDate label={uniformNights ? `Pickup (${uniformNights} night${uniformNights === 1 ? "" : "s"})` : "Last pickup"} date={stayEnd} time={time} muted/>
        </div>

        <div className="border-b border-slate-100 py-4" aria-live="polite">
          <div className="rounded-xl border border-pink-200/80 bg-[#FFF5F9] p-3.5">
            <p className="text-xs font-bold text-slate-900">Kennels available for your dates</p>
            <p className="mt-0.5 text-[11px] text-slate-500">{date ? `${date} · ${longestStay} night${longestStay === 1 ? "" : "s"} from ${clockLabel(time).toLowerCase()}` : "Choose an available date to see live counts."}</p>
            {date && (countsLoading ? <p className="mt-3 text-xs text-slate-500">Checking active kennels…</p> : counts ?
              <div className="my-3 grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border border-pink-100 bg-white p-2.5 text-center"><p className="text-[11px] font-semibold text-slate-600">Small kennels</p><p className="my-0.5 text-xl font-extrabold text-brand-pink">{counts.small}</p><p className="text-[10px] text-slate-400">of {counts.totalSmall} active</p></div>
                <div className="rounded-xl border border-pink-100 bg-white p-2.5 text-center"><p className="text-[11px] font-semibold text-slate-600">Big kennels</p><p className="my-0.5 text-xl font-extrabold text-brand-pink">{counts.big}</p><p className="text-[10px] text-slate-400">of {counts.totalBig} active</p></div>
              </div> : <p className="mt-2 text-xs text-amber-800">{countsError ?? "Select a date to view available kennels."}</p>)}
            <p className="mt-2 text-[10px] leading-relaxed text-slate-500">Counts reflect existing reservations before adding this booking. Final group allocation is checked again when saving.</p>
          </div>
        </div>

        <div className="space-y-2 border-b border-slate-100 py-4">
          {nightsByPet.map(({ sel, nights }) => <div key={sel.pet.id} className="rounded-xl border border-slate-200/70 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-xs font-bold text-slate-900">{sel.pet.name}</p>
              <span className="shrink-0 rounded-full bg-pink-100/70 px-2 py-0.5 text-[11px] font-semibold text-brand-pink">{sel.boardingKennelSize === "big" ? "Big" : "Small"} · {nights ?? "—"} night{nights === 1 ? "" : "s"}</span>
            </div>
            <p className="mt-1.5 font-mono text-xs font-semibold text-slate-600">{date && nights ? `${date} → ${addNights(date, nights)}` : "Choose an available arrival date"}</p>
          </div>)}
        </div>

        {(petBelongings.length > 0 || specialRequests.trim()) && <div className="space-y-1.5 border-b border-slate-100 py-3 text-xs">
          {petBelongings.length > 0 && <p className="text-slate-600"><span className="font-semibold text-slate-800">Belongings:</span> {petBelongings.join(", ")}</p>}
          {specialRequests.trim() && <p className="truncate italic text-slate-600"><span className="font-semibold not-italic text-slate-800">Note:</span> &ldquo;{specialRequests.trim()}&rdquo;</p>}
        </div>}

        <div className="space-y-2.5 pt-4">
          <button type="button" disabled={!valid} onClick={() => { void confirm(); }}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-pink px-4 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-pink-dark disabled:opacity-50">
            {checking ? "Checking…" : <>Review Schedule <ArrowRight size={16}/></>}
          </button>
          <button type="button" onClick={() => setConfirmBack(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-full border border-pink-200 bg-white px-4 py-2.5 text-sm font-semibold text-brand-pink hover:bg-[#FFF5F9]">
            <ArrowLeft size={16}/>Back
          </button>
        </div>
      </aside>
    </div>
    {error && <FeedbackDialog title="Boarding Date Unavailable" tone="warning" message={error} onClose={() => setError(null)} />}
    {loadError && <FeedbackDialog title="Could Not Check Boarding Calendar" message={loadError} onClose={() => setLoadError(null)} />}
  </div>;
}

function clockLabel(time: string) {
  const [h, m] = time.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

function SummaryDate({ label, date, time, muted = false }: { label: string; date: string; time: string; muted?: boolean }) {
  const friendly = date ? new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${date}T00:00:00Z`)) : "Select a date";
  return <div className="flex items-start justify-between gap-2">
    <div className="min-w-0">
      <p className="text-[11px] font-medium text-slate-400">{label}</p>
      <p className="text-sm font-bold text-slate-900">{friendly}</p>
      {date && <p className={`text-xs ${muted ? "text-slate-500" : "font-semibold text-brand-pink"}`}>{clockLabel(time)}</p>}
    </div>
    {date && <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-500">{date}</span>}
  </div>;
}
