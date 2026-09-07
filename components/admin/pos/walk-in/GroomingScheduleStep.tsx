"use client";
// Grooming Scheduling: store hours reminder, time slot picker, real
// conflict checking (same groomer + same customer + same time =
// blocked; same groomer + different customer = allowed, matching the
// agreed rule). Runs the conflict check per UNIQUE groomer actually
// used across this booking's pets — groomer is chosen per-pet in
// Selection, so a 2-dog booking could have 2 different groomers, each
// needing its own conflict check against the same requested time.
import { useState } from "react";
import { checkGroomerTimeConflict } from "@/lib/supabase/appointments";
import type { DraftPetSelection } from "@/lib/types/appointments";
import type { Customer } from "@/lib/types/users";
import type { Groomer } from "@/lib/types/pet-services";

const STORE_HOURS_TEXT = "Hours: Monday – Sunday, 9:00 AM – 6:00 PM  |  📍 Walk-ins welcome on a first-come, first-served basis.";

function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let hour = 9; hour < 18; hour++) {
    slots.push(`${String(hour).padStart(2, "0")}:00`);
    slots.push(`${String(hour).padStart(2, "0")}:30`);
  }
  return slots;
}

function formatTime12h(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

export default function GroomingScheduleStep({
  customer,
  ownerContact,
  petSelections,
  groomers,
  scheduledDate,
  scheduledTime,
  specialRequests,
  onDateChange,
  onTimeChange,
  onRequestsChange,
  onBack,
  onConfirmed,
}: {
  customer: Customer | null;
  ownerContact: string;
  petSelections: DraftPetSelection[];
  groomers: Groomer[];
  scheduledDate: string | null;
  scheduledTime: string | null;
  specialRequests: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onRequestsChange: (text: string) => void;
  onBack: () => void;
  onConfirmed: () => void;
}) {
  const [checking, setChecking] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const slots = generateTimeSlots();
  const groomerIdsInUse = Array.from(new Set(petSelections.map((s) => s.groomerId).filter(Boolean))) as string[];

  async function handleConfirm() {
    if (!scheduledDate || !scheduledTime) return;
    setChecking(true);
    setConflictError(null);

    for (const groomerId of groomerIdsInUse) {
      const { conflict, error } = await checkGroomerTimeConflict(groomerId, scheduledDate, scheduledTime, customer?.id ?? null, ownerContact);
      if (error) {
        setChecking(false);
        setConflictError(`Couldn't verify availability: ${error}`);
        return;
      }
      if (conflict) {
        const groomerName = groomers.find((g) => g.id === groomerId)?.name ?? "This groomer";
        setChecking(false);
        setConflictError(`${groomerName} already has this customer booked at ${formatTime12h(scheduledTime)} on this date. Pick a different time.`);
        return;
      }
    }

    setChecking(false);
    setConfirmed(true);
  }

  if (confirmed && scheduledDate && scheduledTime) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
        <div className="w-full max-w-sm bg-white rounded-3xl p-6 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-600"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <h3 className="mt-4 text-lg font-bold text-zinc-800">Appointment Scheduled</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Scheduled for {formatDateLong(scheduledDate)}, at {formatTime12h(scheduledTime)}.
          </p>
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

      <div className="mt-6">
        <label className="text-sm font-semibold text-zinc-700">Appointment Date *</label>
        <input
          type="date"
          value={scheduledDate ?? ""}
          min={new Date().toISOString().split("T")[0]}
          onChange={(e) => { onDateChange(e.target.value); setConflictError(null); }}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
        />
      </div>

      <div className="mt-4">
        <label className="text-sm font-semibold text-zinc-700">Time *</label>
        <div className="mt-1.5 grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
          {slots.map((slot) => (
            <button
              key={slot}
              onClick={() => { onTimeChange(slot); setConflictError(null); }}
              className={`px-2 py-2 rounded-lg text-xs font-semibold border-2 transition-colors ${
                scheduledTime === slot ? "bg-brand-pink border-brand-pink text-white" : "border-pink-200 text-zinc-600 hover:border-brand-pink"
              }`}
            >
              {formatTime12h(slot)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <label className="text-sm font-semibold text-zinc-700">Special Requests / Medical Conditions / Allergies / Feeding Instruction</label>
        <textarea
          value={specialRequests}
          onChange={(e) => onRequestsChange(e.target.value)}
          placeholder="e.g Allergies, sensitivities, special instructions..."
          rows={3}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink resize-none"
        />
      </div>

      {conflictError && <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{conflictError}</p>}

      <div className="mt-6 flex gap-3">
        <button onClick={onBack} className="flex-1 border-2 border-zinc-300 text-zinc-500 font-semibold py-2.5 rounded-full hover:border-zinc-400 transition-colors">
          Back
        </button>
        <button
          onClick={handleConfirm}
          disabled={!scheduledDate || !scheduledTime || checking}
          className="flex-1 bg-brand-pink hover:bg-brand-pink-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-full transition-colors"
        >
          {checking ? "Checking availability…" : "Next"}
        </button>
      </div>
    </div>
  );
}
