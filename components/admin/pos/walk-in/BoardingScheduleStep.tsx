"use client";

import { useEffect, useMemo, useState } from "react";
import type { DraftPetSelection } from "@/lib/types/appointments";
import type { PackagePricing, AddonPrice } from "@/lib/types/services";
import type { Kennel } from "@/lib/types/pet-services";

const STORE_HOURS_TEXT = "Hours: Monday – Sunday, 9:00 AM – 6:00 PM  |  📍 Walk-ins welcome on a first-come, first-served basis.";
const BELONGING_OPTIONS = ["Pet Bed", "Toys", "Cat Litter", "Leash/Collar", "Others"];

type PetSchedule = {
  date: string;
  time: string;
};

function nightsFromFixedTier(detail: string): number | null {
  const normalized = detail.toLowerCase();
  if (normalized.includes("1 night") && !normalized.includes("&")) return 1;
  const match = normalized.match(/(\d+)\s*days?\s*&\s*(\d+)\s*nights?/);
  if (match) return parseInt(match[2]);
  return null;
}

function formatDateLong(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

function nightsForSelection(sel: DraftPetSelection, pricing: PackagePricing[]): number {
  const rate = pricing.find((p) => p.id === sel.packagePricingId);
  if (!rate) return 1;
  if (rate.is_per_night) return Math.max(1, Number(sel.boardingNights || 7));
  if (rate.nights) return Math.max(1, rate.nights);
  return Math.max(1, nightsFromFixedTier(`${rate.size_detail ?? ""} ${rate.size_label ?? ""}`) ?? 1);
}

function toIso(date: string, time: string) {
  return `${date}T${time}:00`;
}

export default function BoardingScheduleStep({
  petSelections,
  kennels: _kennels,
  pricing,
  addonPrices: _addonPrices,
  scheduledDate: _scheduledDate,
  dropOffAt: _dropOffAt,
  pickUpAt: _pickUpAt,
  petBelongings,
  specialRequests,
  onDateChange: _onDateChange,
  onDropOffChange: _onDropOffChange,
  onPickUpChange: _onPickUpChange,
  onBelongingsChange,
  onRequestsChange,
  onSelectionsChange,
  onBack,
  onConfirmed,
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
  const today = new Date().toISOString().split("T")[0];
  const [schedules, setSchedules] = useState<Record<string, PetSchedule>>({});
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSchedules((prev) => {
      const next = { ...prev };
      for (const sel of petSelections) {
        if (!next[sel.pet.id]) {
          const existingDate = sel.boardingScheduledDate ?? "";
          const existingTime = sel.boardingDropOffAt
            ? new Date(sel.boardingDropOffAt).toTimeString().slice(0, 5)
            : "08:00";
          next[sel.pet.id] = { date: existingDate, time: existingTime };
        }
      }
      return next;
    });
  }, [petSelections]);

  const allScheduled = useMemo(
    () => petSelections.length > 0 && petSelections.every((sel) => Boolean(schedules[sel.pet.id]?.date && schedules[sel.pet.id]?.time)),
    [petSelections, schedules]
  );

  function updatePetSchedule(sel: DraftPetSelection, patch: Partial<PetSchedule>) {
    const current = schedules[sel.pet.id] ?? { date: "", time: "08:00" };
    const next = { ...current, ...patch };
    setSchedules((prev) => ({ ...prev, [sel.pet.id]: next }));
    setError(null);

    if (!next.date || !next.time) return;
    const dropOff = new Date(toIso(next.date, next.time));
    if (isNaN(dropOff.getTime())) return;
    const pickUp = new Date(dropOff);
    pickUp.setDate(pickUp.getDate() + nightsForSelection(sel, pricing));

    onSelectionsChange(petSelections.map((item) =>
      item.pet.id === sel.pet.id
        ? { ...item, boardingScheduledDate: next.date, boardingDropOffAt: dropOff.toISOString(), boardingPickUpAt: pickUp.toISOString() }
        : item
    ));
  }

  function toggleBelonging(item: string) {
    onBelongingsChange(petBelongings.includes(item)
      ? petBelongings.filter((b) => b !== item)
      : [...petBelongings, item]);
  }

  function handleConfirm() {
    if (!allScheduled) {
      setError("Choose a drop-off date and time for every pet before continuing.");
      return;
    }
    // Make sure the latest local values are persisted before the summary.
    const nextSelections = petSelections.map((sel) => {
      const schedule = schedules[sel.pet.id];
      if (!schedule?.date || !schedule.time) return sel;
      const dropOff = new Date(toIso(schedule.date, schedule.time));
      const pickUp = new Date(dropOff);
      pickUp.setDate(pickUp.getDate() + nightsForSelection(sel, pricing));
      return { ...sel, boardingScheduledDate: schedule.date, boardingDropOffAt: dropOff.toISOString(), boardingPickUpAt: pickUp.toISOString() };
    });
    onSelectionsChange(nextSelections);
    setConfirmed(true);
  }

  if (confirmed) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
        <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-600"><path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <h3 className="mt-4 text-lg font-bold text-zinc-800">Boarding Schedules Set</h3>
          <p className="mt-1 text-sm text-zinc-500">Each pet now has its own boarding schedule and will be saved as its own appointment.</p>
          <button onClick={onConfirmed} className="mt-5 w-full rounded-full bg-brand-pink py-2.5 font-semibold text-white hover:bg-brand-pink-dark">Continue to Summary</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="text-center text-2xl font-bold text-brand-pink">Boarding Schedule</h2>
      <p className="mt-1 text-center text-sm text-zinc-500">Because kennel sizes can differ, each pet gets an independent drop-off and pick-up schedule.</p>

      <div className="mt-5 rounded-full border-2 border-pink-100 px-4 py-2.5 text-center text-xs text-zinc-600">{STORE_HOURS_TEXT}</div>

      <div className="mt-6 space-y-4">
        {petSelections.map((sel) => {
          const schedule = schedules[sel.pet.id] ?? { date: "", time: "08:00" };
          const nights = nightsForSelection(sel, pricing);
          const pickup = schedule.date && schedule.time ? (() => {
            const d = new Date(toIso(schedule.date, schedule.time));
            d.setDate(d.getDate() + nights);
            return d;
          })() : null;
          return (
            <div key={sel.pet.id} className="rounded-2xl border-2 border-pink-100 bg-white p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-zinc-800">{sel.pet.name}</h3>
                  <p className="text-xs text-zinc-500">{sel.pet.size_label} · {sel.boardingKennelSize === "small" ? "Small Kennel" : "Big Kennel"} · {nights} night(s)</p>
                </div>
                <span className="rounded-full bg-pink-50 px-2.5 py-1 text-[11px] font-semibold text-brand-pink">Separate schedule</span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-zinc-700">Drop Off Date *</label>
                  <input type="date" min={today} value={schedule.date} onChange={(e) => updatePetSchedule(sel, { date: e.target.value })} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-zinc-700">Drop Off Time *</label>
                  <input type="time" min="09:00" max="18:00" value={schedule.time} onChange={(e) => updatePetSchedule(sel, { time: e.target.value })} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-zinc-700">
                <span className="font-semibold">Pick Up:</span> {pickup ? `${formatDateLong(pickup.toISOString().split("T")[0])}, ${pickup.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : "Auto-calculated after drop-off"}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5">
        <p className="text-sm font-semibold text-zinc-700">Pet Belongings Brought <span className="font-normal text-zinc-400">(Optional)</span></p>
        <div className="mt-1.5 flex flex-wrap gap-2">{BELONGING_OPTIONS.map((item) => <button key={item} onClick={() => toggleBelonging(item)} className={`rounded-full border-2 px-3 py-1.5 text-xs font-semibold ${petBelongings.includes(item) ? "border-brand-pink bg-brand-pink text-white" : "border-pink-200 text-zinc-600 hover:border-brand-pink"}`}>{item}</button>)}</div>
      </div>

      <div className="mt-4">
        <label className="text-sm font-semibold text-zinc-700">Special Requests / Notes</label>
        <textarea value={specialRequests} onChange={(e) => onRequestsChange(e.target.value)} placeholder="e.g. specific feeding or care instructions" rows={3} className="mt-1 w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex gap-3">
        <button onClick={onBack} className="flex-1 rounded-full border-2 border-zinc-300 py-2.5 font-semibold text-zinc-500 hover:border-zinc-400">Back</button>
        <button onClick={handleConfirm} disabled={!allScheduled} className="flex-1 rounded-full bg-brand-pink py-2.5 font-semibold text-white hover:bg-brand-pink-dark disabled:cursor-not-allowed disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}
