"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import { checkGroomerTimeConflict } from "@/lib/supabase/appointments";
import { manilaTime, manilaToday, useBookingClosures } from "@/lib/booking/use-booking-closures";
import type { DraftPetSelection } from "@/lib/types/appointments";
import type { Customer } from "@/lib/types/users";
import type { Groomer } from "@/lib/types/pet-services";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SLOTS = Array.from({ length: 18 }, (_, i) => {
  const minutes = 9 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});
function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
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

/** Shared À La Carte scheduler for the Customer and POS booking flows. */
export default function CustomerGroomingScheduleStep({
  customer, ownerContact, petSelections, groomers, scheduledDate, scheduledTime,
  specialRequests, onDateChange, onTimeChange, onRequestsChange, onBack, onConfirmed,
}: Props) {
  const closures = useBookingClosures();
  const [clockTick, setClockTick] = useState(0);
  const today = manilaToday();
  const currentTime = manilaTime();
  const [month, setMonth] = useState(() => {
    const [y, m] = (scheduledDate || manilaToday()).split("-").map(Number);
    return new Date(y, m - 1, 1);
  });
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  // Keep today/time restrictions fresh without changing the chosen date/time.
  useEffect(() => {
    const timer = window.setInterval(() => setClockTick((tick) => tick + 1), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  void clockTick;

  const monthKey = dateKey(month.getFullYear(), month.getMonth(), 1).slice(0, 7);
  const todayMonth = today.slice(0, 7);
  const startOffset = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((startOffset + daysInMonth) / 7) * 7 }, (_, i) => i - startOffset + 1);
  const selectedClosed = closures.nameFor(scheduledDate);
  const pastSlot = (date: string | null, slot: string) =>
    !date || date < today || (date === today && slot <= currentTime);
  const canChooseSlot = !!scheduledDate && !selectedClosed && !closures.loading && !closures.error;
  const canProceed = canChooseSlot && !!scheduledTime && !pastSlot(scheduledDate, scheduledTime) && !checking;
  const groomerIds = [...new Set(petSelections.map((sel) => sel.groomerId).filter(Boolean))] as string[];

  useEffect(() => {
    if (scheduledDate && closures.nameFor(scheduledDate)) onTimeChange("");
  // Re-evaluate when closure records load/change, without resetting valid selections.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduledDate, closures.dates]);

  function chooseDate(date: string) {
    onDateChange(date);
    onTimeChange("");
    setError(null);
  }

  async function verify() {
    if (!scheduledDate || !scheduledTime || checking) return;
    setChecking(true);
    setError(null);
    try {
      const closure = await closures.verifyOpen(scheduledDate);
      if (closure) { setError(closure); onTimeChange(""); return; }
      if (pastSlot(scheduledDate, scheduledTime)) {
        setError("This time has already passed. Please choose a future time slot.");
        onTimeChange("");
        return;
      }
      for (const groomerId of groomerIds) {
        const result = await checkGroomerTimeConflict(groomerId, scheduledDate, scheduledTime, customer?.id ?? null, ownerContact);
        if (result.error) { setError(`Could not verify availability: ${result.error}`); return; }
        if (result.conflict) {
          const name = groomers.find((g) => g.id === groomerId)?.name ?? "The selected groomer";
          setError(`${name} already has this customer booked at ${timeLabel(scheduledTime)}. Choose another time.`);
          return;
        }
      }
      setConfirmed(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not verify this appointment. Please try again.");
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
        <button type="button" onClick={onConfirmed} className="mt-6 w-full rounded-full bg-brand-pink px-5 py-3 font-semibold text-white">Continue to More Services</button>
      </div>
    </div>
  );

  return (
    <section className="ht-ala-carte-schedule mx-auto w-full max-w-4xl space-y-5">
      <header className="text-center">
        <CalendarDays className="mx-auto text-brand-pink" size={26} />
        <h2 className="mt-3 text-2xl font-bold text-zinc-800">À La Carte Schedule</h2>
        <p className="mt-1 text-sm text-zinc-500">Choose an appointment date, then select an available half-hour time slot.</p>
      </header>
      <p className="rounded-xl border border-pink-100 bg-pink-50 px-4 py-3 text-center text-xs text-zinc-700">
        Shop hours: 9:00 AM – 6:00 PM (Philippine time). Holidays and shop closures are unavailable.
      </p>
      {closures.error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Unable to load closure dates: {closures.error}</p>}

      <section className="mx-auto w-full max-w-[460px] rounded-2xl border border-pink-100 bg-white p-3 sm:p-4" aria-label="À La Carte appointment calendar">
        <div className="mb-3 flex items-center justify-between gap-2">
          <button type="button" aria-label="Previous month" disabled={monthKey <= todayMonth} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="rounded-full p-2 text-slate-600 hover:bg-pink-50 disabled:cursor-not-allowed disabled:opacity-30"><ChevronLeft size={19} /></button>
          <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-800"><CalendarDays size={17} className="text-brand-pink" />{month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h3>
          <button type="button" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="rounded-full p-2 text-slate-600 hover:bg-pink-50"><ChevronRight size={19} /></button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((day) => <span key={day} className="py-1 text-[10px] font-semibold text-slate-400">{day}</span>)}
          {cells.map((day, index) => {
            const inMonth = day > 0 && day <= daysInMonth;
            const date = inMonth ? dateKey(month.getFullYear(), month.getMonth(), day) : "";
            const closedName = closures.nameFor(date);
            const disabled = !inMonth || date < today || !!closedName || closures.loading || !!closures.error;
            const selected = date === scheduledDate && !disabled;
            return (
              <button key={index} type="button" disabled={disabled} title={closedName ? `Closed: ${closedName}` : undefined}
                aria-label={closedName ? `${date}, closed: ${closedName}` : date || "Outside month"} aria-pressed={selected}
                onClick={() => chooseDate(date)}
                className={`relative flex min-h-11 flex-col items-center justify-center rounded-lg border text-xs font-semibold transition sm:min-h-12 ${closedName ? "border-rose-200 bg-rose-50 text-rose-600" : selected ? "border-brand-pink bg-brand-pink text-white" : disabled ? "border-transparent text-slate-300" : "border-transparent text-zinc-700 hover:border-pink-200 hover:bg-pink-50"} disabled:cursor-not-allowed`}>
                {inMonth && <span>{day}</span>}
                {closedName && <span className="mt-0.5 text-[8px] font-bold leading-none text-rose-600 sm:text-[9px]">Closed</span>}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-center text-[11px] text-zinc-500"><span className="font-semibold text-rose-600">Red Closed</span> dates are holidays or shop closures and cannot be selected.</p>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-800"><Clock3 size={17} className="text-brand-pink" />Appointment time slots</h3>
          <span className="text-xs text-zinc-500">{scheduledDate ? `Selected date: ${scheduledDate}` : "Choose a date first"}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" aria-label="À La Carte time slots">
          {SLOTS.map((slot) => {
            const unavailable = !canChooseSlot || pastSlot(scheduledDate, slot);
            const selected = slot === scheduledTime && !unavailable;
            return (
              <button key={slot} type="button" disabled={unavailable} aria-pressed={selected}
                onClick={() => { onTimeChange(slot); setError(null); }}
                className={`min-h-14 rounded-xl border-2 px-2 py-2 text-xs font-semibold transition ${selected ? "border-brand-pink bg-brand-pink text-white" : unavailable ? "border-zinc-100 bg-zinc-50 text-zinc-400" : "border-pink-100 bg-white text-zinc-700 hover:border-brand-pink hover:bg-pink-50"} disabled:cursor-not-allowed`}>
                <span className="block">{timeLabel(slot)}</span>
                <span className={`mt-1 block text-[10px] font-normal ${selected ? "text-white/90" : "text-zinc-400"}`}>{unavailable ? "Unavailable" : selected ? "Selected" : "Select"}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-zinc-500">Times are subject to final availability verification before confirmation.</p>
      </section>
      <div>
        <label htmlFor="ht-ala-carte-requests" className="block text-sm font-semibold text-zinc-700">Special requests / medical conditions / allergies / feeding instructions</label>
        <textarea id="ht-ala-carte-requests" rows={3} value={specialRequests} onChange={(event) => onRequestsChange(event.target.value)} className="mt-2 w-full rounded-xl border border-pink-100 px-4 py-3 text-sm focus:border-brand-pink focus:outline-none" />
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={onBack} className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-pink-200 font-semibold text-brand-pink"><ArrowLeft size={16} />Back</button>
        <button type="button" onClick={() => void verify()} disabled={!canProceed} className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-pink font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{checking ? "Checking…" : "Next"}<ArrowRight size={16} /></button>
      </div>
    </section>
  );
}
