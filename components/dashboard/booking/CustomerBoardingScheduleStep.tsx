"use client";

import { useEffect, useMemo, useState } from "react";
import type { DraftPetSelection } from "@/lib/types/appointments";
import type { PackagePricing, AddonPrice } from "@/lib/types/services";
import type { Kennel } from "@/lib/types/pet-services";

const STORE_TIMEZONE = "Asia/Manila";
const OPEN = "09:00";
const CLOSE = "18:00";
const BELONGINGS = ["Pet Bed", "Toys", "Cat Litter", "Leash/Collar", "Others"];
type PetSchedule = { date: string; time: string };

function shopParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: STORE_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}
function dropOffDate(date: string, time: string): Date {
  return new Date(`${date}T${time}:00+08:00`);
}
function nightsFor(sel: DraftPetSelection, pricing: PackagePricing[]): number {
  const tier = pricing.find((p) => p.id === sel.packagePricingId);
  if (!tier) return 1;
  if (tier.is_per_night) return Math.max(1, Number(sel.boardingNights || 7));
  if (tier.nights) return Math.max(1, tier.nights);
  const match = `${tier.size_detail ?? ""} ${tier.size_label ?? ""}`.match(/\d+\s*days?\s*&\s*(\d+)\s*nights?/i);
  return Math.max(1, match ? Number(match[1]) : 1);
}
function validate(schedule: PetSchedule | undefined, now: Date): string | null {
  if (!schedule?.date || !schedule.time) return "Choose a drop-off date and time.";
  const today = shopParts(now).date;
  if (schedule.date < today) return "Past dates cannot be booked.";
  if (schedule.time < OPEN || schedule.time > CLOSE) return "Drop-off must be between 9:00 AM and 6:00 PM.";
  const timestamp = dropOffDate(schedule.date, schedule.time);
  if (!Number.isFinite(timestamp.getTime())) return "Select a valid date and time.";
  if (timestamp.getTime() <= now.getTime()) return "This drop-off time has already passed. Choose a later time.";
  return null;
}
function pickupFor(schedule: PetSchedule, nights: number) {
  return new Date(dropOffDate(schedule.date, schedule.time).getTime() + nights * 86400000);
}
function formatShop(when: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: STORE_TIMEZONE, weekday: "long", month: "long", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  }).format(when);
}

export default function CustomerBoardingScheduleStep({
  petSelections, pricing, petBelongings, specialRequests, onSelectionsChange,
  onBelongingsChange, onRequestsChange, onBack, onConfirmed,
}: {
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
  onDropOffChange: (iso: string) => void;
  onPickUpChange: (iso: string) => void;
  onBelongingsChange: (items: string[]) => void;
  onRequestsChange: (text: string) => void;
  onSelectionsChange: (selections: DraftPetSelection[]) => void;
  onBack: () => void;
  onConfirmed: () => void;
}) {
  const [now, setNow] = useState(() => new Date());
  const [schedules, setSchedules] = useState<Record<string, PetSchedule>>({});
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    setSchedules((prev) => {
      const next = { ...prev };
      for (const sel of petSelections) {
        if (!next[sel.pet.id]) {
          const saved = sel.boardingDropOffAt ? shopParts(new Date(sel.boardingDropOffAt)) : null;
          next[sel.pet.id] = { date: sel.boardingScheduledDate ?? saved?.date ?? "", time: saved?.time ?? "" };
        }
      }
      return next;
    });
  }, [petSelections]);

  const today = shopParts(now).date;
  const valid = useMemo(() => petSelections.length > 0 && petSelections.every(
    (sel) => validate(schedules[sel.pet.id], now) === null
  ), [petSelections, schedules, now]);

  function updateSchedule(sel: DraftPetSelection, patch: Partial<PetSchedule>) {
    const next = { ...(schedules[sel.pet.id] ?? { date: "", time: "" }), ...patch };
    setSchedules((prev) => ({ ...prev, [sel.pet.id]: next }));
    setError(null);
    if (validate(next, new Date()) !== null) return;
    const start = dropOffDate(next.date, next.time);
    onSelectionsChange(petSelections.map((item) => item.pet.id !== sel.pet.id ? item : {
      ...item, boardingScheduledDate: next.date, boardingDropOffAt: start.toISOString(),
      boardingPickUpAt: pickupFor(next, nightsFor(item, pricing)).toISOString(),
    }));
  }

  function confirm() {
    const actualNow = new Date();
    const firstInvalid = petSelections.find((sel) => validate(schedules[sel.pet.id], actualNow) !== null);
    if (firstInvalid) {
      setNow(actualNow);
      setError(`${firstInvalid.pet.name}: ${validate(schedules[firstInvalid.pet.id], actualNow)}`);
      return;
    }
    onSelectionsChange(petSelections.map((sel) => {
      const schedule = schedules[sel.pet.id];
      const start = dropOffDate(schedule.date, schedule.time);
      return { ...sel, boardingScheduledDate: schedule.date, boardingDropOffAt: start.toISOString(),
        boardingPickUpAt: pickupFor(schedule, nightsFor(sel, pricing)).toISOString() };
    }));
    setConfirmed(true);
  }

  if (confirmed) return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-xl">
      <h3 className="text-lg font-bold text-zinc-800">Boarding Schedules Set</h3>
      <p className="mt-2 text-sm text-zinc-500">Each pet has an individual boarding schedule.</p>
      <button type="button" onClick={onConfirmed} className="mt-5 w-full rounded-full bg-brand-pink py-3 font-semibold text-white">Continue to Summary</button>
    </div>
  </div>;

  return <div className="mx-auto max-w-3xl">
    <h2 className="text-center text-2xl font-bold text-brand-pink">Boarding Schedule</h2>
    <p className="mt-2 text-center text-sm text-zinc-500">Set a separate drop-off and pick-up schedule for each pet.</p>
    <p className="mt-5 rounded-xl border border-pink-100 bg-pink-50 p-3 text-center text-xs text-zinc-600">
      Shop hours: 9:00 AM–6:00 PM (Philippine time). Same-day drop-offs must be later than the current time.
    </p>
    <div className="mt-5 space-y-4">{petSelections.map((sel) => {
      const schedule = schedules[sel.pet.id] ?? { date: "", time: "" };
      const reason = schedule.date && schedule.time ? validate(schedule, now) : null;
      const nights = nightsFor(sel, pricing);
      const pickup = !reason && schedule.date && schedule.time ? pickupFor(schedule, nights) : null;
      return <section key={sel.pet.id} className="rounded-2xl border-2 border-pink-100 bg-white p-4 sm:p-5">
        <h3 className="font-bold text-zinc-800">{sel.pet.name}</h3>
        <p className="mt-1 text-xs text-zinc-500">{sel.pet.size_label} · {sel.boardingKennelSize === "small" ? "Small Kennel" : "Big Kennel"} · {nights} night(s)</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-zinc-700">Drop Off Date *
            <input type="date" min={today} value={schedule.date} onChange={(e) => updateSchedule(sel, { date: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm" />
          </label>
          <label className="text-sm font-semibold text-zinc-700">Drop Off Time *
            <input type="time" min="09:00" max="18:00" step={60} value={schedule.time}
              onChange={(e) => updateSchedule(sel, { time: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm" />
          </label>
        </div>
        {reason && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">{reason}</p>}
        {schedule.date === today && <p className="mt-2 text-xs text-zinc-500">Current Philippine time: {new Intl.DateTimeFormat("en-US", { timeZone: STORE_TIMEZONE, hour: "numeric", minute: "2-digit" }).format(now)}</p>}
        <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-zinc-700"><strong>Pick Up:</strong> {pickup ? formatShop(pickup) : "Calculated after a valid drop-off is selected"}</p>
      </section>;
    })}</div>
    <div className="mt-5"><p className="text-sm font-semibold text-zinc-700">Pet Belongings Brought <span className="font-normal text-zinc-400">(Optional)</span></p>
      <div className="mt-2 flex flex-wrap gap-2">{BELONGINGS.map((item) => <button key={item} type="button" onClick={() => onBelongingsChange(petBelongings.includes(item) ? petBelongings.filter((v) => v !== item) : [...petBelongings, item])}
        className={`rounded-full border-2 px-3 py-1.5 text-xs font-semibold ${petBelongings.includes(item) ? "border-brand-pink bg-brand-pink text-white" : "border-pink-200 text-zinc-600"}`}>{item}</button>)}</div>
    </div>
    <label className="mt-4 block text-sm font-semibold text-zinc-700">Special Requests / Notes
      <textarea rows={3} value={specialRequests} onChange={(e) => onRequestsChange(e.target.value)} className="mt-2 block w-full resize-none rounded-lg border border-zinc-300 p-3 text-sm" />
    </label>
    {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="mt-6 flex gap-3">
      <button type="button" onClick={onBack} className="flex-1 rounded-full border-2 border-zinc-300 py-3 font-semibold text-zinc-600">Back</button>
      <button type="button" onClick={confirm} disabled={!valid} className="flex-1 rounded-full bg-brand-pink py-3 font-semibold text-white disabled:opacity-40">Next</button>
    </div>
  </div>;
}
