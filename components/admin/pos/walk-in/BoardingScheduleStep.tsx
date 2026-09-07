"use client";
// Boarding Scheduling: store hours reminder, drop-off/pick-up dates
// auto-computed from the chosen duration tier where possible (fixed
// tiers like "3 Days & 2 Nights" have a known night count — only "7
// Days Up" is open-ended since it's priced per night, so THAT one
// needs a real pick-up date entered manually). Pet belongings
// (optional) and request box.
//
// Also fixes a real gap from the Selection step: boarding rates marked
// is_per_night (currently only "7 Days Up") were being stored as a flat
// price regardless of actual night count. The real night count only
// exists once dates are set here, so this step recomputes each
// pet's lineAmount using the real nights actually stayed before moving
// on — fixed tiers are untouched (they're already a flat total for
// that exact stay length, per the pricing card), only per-night rates
// get multiplied.
import { useState } from "react";
import type { DraftPetSelection } from "@/lib/types/appointments";
import type { PackagePricing, AddonPrice } from "@/lib/types/services";
import type { Kennel } from "@/lib/types/pet-services";

const STORE_HOURS_TEXT = "Hours: Monday – Sunday, 9:00 AM – 6:00 PM  |  📍 Walk-ins welcome on a first-come, first-served basis.";

const BELONGING_OPTIONS = ["Pet Bed", "Toys", "Cat Litter", "Leash/Collar", "Others"];

function nightsFromFixedTier(detail: string): number | null {
  const normalized = detail.toLowerCase();
  if (normalized.includes("1 night") && !normalized.includes("&")) return 1;
  const match = normalized.match(/(\d+)\s*days?\s*&\s*(\d+)\s*nights?/);
  if (match) return parseInt(match[2]);
  return null;
}

function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

export default function BoardingScheduleStep({
  petSelections,
  kennels,
  pricing,
  addonPrices,
  scheduledDate,
  dropOffAt,
  pickUpAt,
  petBelongings,
  specialRequests,
  onDateChange,
  onDropOffChange,
  onPickUpChange,
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
  const [dropOffTime, setDropOffTime] = useState("08:00");
  const [manualPickUpDate, setManualPickUpDate] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const hasPerNightRate = petSelections.some((sel) => {
    const rate = pricing.find((p) => p.id === sel.packagePricingId);
    return rate?.is_per_night;
  });

  function handleDropOffDateChange(dateStr: string, timeStr?: string) {
    onDateChange(dateStr);
    const effectiveTime = timeStr ?? dropOffTime;
    const iso = `${dateStr}T${effectiveTime}:00`;

    // REAL BUG FIXED: native date/time inputs can briefly report an
    // empty or incomplete value while the person is still typing (e.g.
    // clearing the time field to retype it) — that produced a
    // malformed string here, which new Date() turned into an Invalid
    // Date, and .toISOString() throws a hard RangeError on an invalid
    // date rather than failing quietly. Guarding here means a
    // transient incomplete value is just skipped for this keystroke —
    // the very next valid one recalculates correctly, matching what
    // was actually observed ("accurate once you finish typing").
    const dropOff = new Date(iso);
    if (isNaN(dropOff.getTime())) return;

    onDropOffChange(iso);

    if (!hasPerNightRate) {
      let maxNights = 1;
      for (const sel of petSelections) {
        const rate = pricing.find((p) => p.id === sel.packagePricingId);
        if (rate?.size_detail && !rate.is_per_night) {
          const nights = nightsFromFixedTier(rate.size_detail);
          if (nights && nights > maxNights) maxNights = nights;
        }
      }
      const pickUp = new Date(dropOff);
      pickUp.setDate(pickUp.getDate() + maxNights);
      onPickUpChange(pickUp.toISOString());
    }
  }

  function toggleBelonging(item: string) {
    onBelongingsChange(petBelongings.includes(item) ? petBelongings.filter((b) => b !== item) : [...petBelongings, item]);
  }

  function handleConfirm() {
    if (hasPerNightRate && manualPickUpDate) {
      const dropOff = new Date(dropOffAt ?? "");
      const pickUp = new Date(`${manualPickUpDate}T18:00:00`);

      // Same guard as handleDropOffDateChange — dropOffAt could
      // theoretically still be unset/invalid if this is reached in an
      // unexpected order (the Confirm button is disabled until
      // scheduledDate is set, but this is cheap insurance against a
      // hard crash rather than trusting that disabled-state alone).
      if (isNaN(dropOff.getTime()) || isNaN(pickUp.getTime())) {
        setConfirmed(false);
        return;
      }

      onPickUpChange(pickUp.toISOString());

      const nights = Math.max(1, Math.round((pickUp.getTime() - dropOff.getTime()) / (1000 * 60 * 60 * 24)));
      const updated = petSelections.map((sel) => {
        const rate = pricing.find((p) => p.id === sel.packagePricingId);
        if (!rate?.is_per_night) return sel;
        const addonsTotal = sel.addonIds.reduce((sum, id) => sum + (addonPrices.find((p) => p.addon_id === id)?.price ?? 0), 0);
        return { ...sel, lineAmount: rate.price * nights + addonsTotal };
      });
      onSelectionsChange(updated);
    }
    setConfirmed(true);
  }

  if (confirmed && scheduledDate) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
        <div className="w-full max-w-sm bg-white rounded-3xl p-6 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-600"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <h3 className="mt-4 text-lg font-bold text-zinc-800">Boarding Scheduled</h3>
          <p className="mt-1 text-sm text-zinc-500">Drop-off on {formatDateLong(scheduledDate)}.</p>
          <button onClick={onConfirmed} className="mt-5 w-full bg-brand-pink hover:bg-brand-pink-dark text-white font-semibold py-2.5 rounded-full transition-colors">
            Continue to Summary
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-2xl font-bold text-brand-pink text-center">Scheduled Appointment</h2>
      <p className="mt-1 text-sm text-zinc-500 text-center">Set the date and time for this visit.</p>

      <div className="mt-5 rounded-full border-2 border-pink-100 px-4 py-2.5 text-xs text-zinc-600 text-center">
        {STORE_HOURS_TEXT}
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-semibold text-zinc-700">Drop Off Date / Time *</label>
          <div className="mt-1 flex gap-2">
            <input type="date" value={scheduledDate ?? ""} min={new Date().toISOString().split("T")[0]} onChange={(e) => handleDropOffDateChange(e.target.value)} className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
            <input type="time" value={dropOffTime} onChange={(e) => { setDropOffTime(e.target.value); if (scheduledDate) handleDropOffDateChange(scheduledDate, e.target.value); }} className="w-28 rounded-lg border border-zinc-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-zinc-700">Pick Up Date / Time {hasPerNightRate ? "*" : ""}</label>
          {hasPerNightRate ? (
            <input type="date" value={manualPickUpDate} min={scheduledDate ?? undefined} onChange={(e) => setManualPickUpDate(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
          ) : (
            <div className="mt-1 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500">
              {pickUpAt ? formatDateLong(pickUpAt.split("T")[0]) : "Auto-set from duration"}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4">
        <p className="text-sm font-semibold text-zinc-700">Pet Belongings Brought <span className="font-normal text-zinc-400">(Optional)</span></p>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {BELONGING_OPTIONS.map((item) => (
            <button
              key={item}
              onClick={() => toggleBelonging(item)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-colors ${
                petBelongings.includes(item) ? "bg-brand-pink border-brand-pink text-white" : "border-pink-200 text-zinc-600 hover:border-brand-pink"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <label className="text-sm font-semibold text-zinc-700">Special Requests / Notes</label>
        <textarea
          value={specialRequests}
          onChange={(e) => onRequestsChange(e.target.value)}
          placeholder="e.g Specific groomer request, arrive early"
          rows={3}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink resize-none"
        />
      </div>

      <div className="mt-6 flex gap-3">
        <button onClick={onBack} className="flex-1 border-2 border-zinc-300 text-zinc-500 font-semibold py-2.5 rounded-full hover:border-zinc-400 transition-colors">
          Back
        </button>
        <button
          onClick={handleConfirm}
          disabled={!scheduledDate || (hasPerNightRate && !manualPickUpDate)}
          className="flex-1 bg-brand-pink hover:bg-brand-pink-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-full transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}
