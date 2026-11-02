"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Clock3 } from "lucide-react";
import BookingDayCalendar from "@/components/shared/BookingDayCalendar";
import { checkGroomerTimeConflict } from "@/lib/supabase/appointments";
import { manilaTime, manilaToday, useBookingClosures } from "@/lib/booking/use-booking-closures";
import type { DraftPetSelection } from "@/lib/types/appointments";
import type { Customer } from "@/lib/types/users";
import type { Groomer } from "@/lib/types/pet-services";

const SLOTS = Array.from({ length: 18 }, (_, i) => {
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
  scheduledDate: string | null;
  scheduledTime: string | null;
  specialRequests: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onRequestsChange: (text: string) => void;
  onBack: () => void;
  onConfirmed: () => void;
};

/** One shared Ala Carte date/time UI for customer booking and the walk-in POS. */
export default function CustomerGroomingScheduleStep({
  customer, ownerContact, petSelections, groomers, scheduledDate, scheduledTime,
  specialRequests, onDateChange, onTimeChange, onRequestsChange, onBack, onConfirmed,
}: Props) {
  const closures = useBookingClosures();
  const [checking, setChecking] = useState(false);
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
  const canProceed = dateReady && !!scheduledTime && !isPast(scheduledDate, scheduledTime) && !checking;
  const groomerIds = Array.from(new Set(petSelections.map(s => s.groomerId).filter(Boolean))) as string[];

  useEffect(() => {
    if (scheduledDate && closures.nameFor(scheduledDate) && scheduledTime) onTimeChange("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduledDate, scheduledTime, closures.dates]);

  function chooseDate(date: string) {
    onDateChange(date);
    onTimeChange("");
    setConfirmed(false);
    setError(null);
  }

  async function verify() {
    if (!scheduledDate || !scheduledTime || checking) return;
    setChecking(true);
    setError(null);
    try {
      const closedMessage = await closures.verifyOpen(scheduledDate);
      if (closedMessage) { setError(closedMessage); onTimeChange(""); return; }
      if (isPast(scheduledDate, scheduledTime)) {
        setError("This time has passed. Choose a future appointment time.");
        onTimeChange("");
        return;
      }
      for (const id of groomerIds) {
        const result = await checkGroomerTimeConflict(id, scheduledDate, scheduledTime, customer?.id ?? null, ownerContact);
        if (result.error) { setError(`Could not verify availability: ${result.error}`); return; }
        if (result.conflict) {
          const name = groomers.find(g => g.id === id)?.name ?? "The selected groomer";
          setError(`${name} already has this customer booked at ${timeLabel(scheduledTime)}. Choose another time.`);
          return;
        }
      }
      setConfirmed(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not verify this schedule. Please try again.");
    } finally {
      setChecking(false);
    }
  }

  if (confirmed && scheduledDate && scheduledTime) return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="À La Carte schedule selected">
      <div className="w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-2xl">
        <Check className="mx-auto text-emerald-600" size={38} />
        <h2 className="mt-4 text-xl font-bold text-zinc-800">Schedule Selected</h2>
        <p className="mt-2 text-sm text-zinc-500">{scheduledDate} at {timeLabel(scheduledTime)}</p>
        <button type="button" onClick={() => onConfirmed()} className="mt-6 w-full rounded-full bg-brand-pink px-5 py-3 font-semibold text-white">Continue to More Services</button>
      </div>
    </div>
  );

  return (
    <section className="ht-ala-carte-schedule mx-auto w-full max-w-4xl space-y-5">
      <header className="text-center">
        <h2 className="text-2xl font-bold text-brand-pink">À La Carte Schedule</h2>
        <p className="mt-2 text-sm text-zinc-600">Choose your date and preferred start time.</p>
      </header>
      <p className="rounded-xl border border-pink-100 bg-pink-50 px-4 py-3 text-center text-xs text-zinc-700">
        30-minute start times · 9:00 AM–5:30 PM · Philippine time · Holiday and closure dates are unavailable.
      </p>
      <BookingDayCalendar value={scheduledDate} onChange={chooseDate} closures={closures} title="À La Carte" />
      <section>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-zinc-800"><Clock3 size={17} className="text-brand-pink" />Choose preferred start time</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" aria-label="À La Carte start times">
          {SLOTS.map(time => {
            const unavailable = !dateReady || isPast(scheduledDate, time);
            const selected = !unavailable && scheduledTime === time;
            return <button key={time} type="button" disabled={unavailable} aria-pressed={selected}
              onClick={() => { onTimeChange(time); setError(null); }}
              className={`flex min-h-14 flex-col items-center justify-center rounded-xl border px-2 py-2 text-xs font-semibold transition ${selected ? "border-brand-pink bg-pink-50 text-brand-pink" : "border-pink-200 bg-white text-zinc-700 hover:border-brand-pink"} disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400 disabled:opacity-60`}>
              <span>{timeLabel(time)}</span>
              <span className={`mt-0.5 text-[10px] ${selected ? "text-brand-pink" : "text-zinc-500"}`}>{unavailable ? "Unavailable" : selected ? "Selected" : "Select"}</span>
            </button>;
          })}
        </div>
        <p className="mt-2 text-xs text-zinc-500">À La Carte uses Grooming's calendar layout. These times are appointment start choices; Grooming's groomer-capacity counts do not apply to À La Carte.</p>
      </section>
      <label className="block text-sm font-semibold text-zinc-800">Special Requests
        <textarea rows={3} value={specialRequests} onChange={e => onRequestsChange(e.target.value)}
          className="mt-2 w-full rounded-xl border border-pink-200 p-3 text-sm" placeholder="Allergies, handling instructions, or other notes" />
      </label>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={onBack} className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-pink-200 font-semibold text-brand-pink"><ArrowLeft size={16} />Back</button>
        <button type="button" onClick={() => void verify()} disabled={!canProceed} className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-pink font-semibold text-white disabled:opacity-40">{checking ? "Checking…" : "Next"}<ArrowRight size={16} /></button>
      </div>
    </section>
  );
}
