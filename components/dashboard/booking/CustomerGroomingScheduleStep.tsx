"use client";

import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { checkGroomerTimeConflict } from "@/lib/supabase/appointments";
import type { DraftPetSelection } from "@/lib/types/appointments";
import type { Customer } from "@/lib/types/users";
import type { Groomer } from "@/lib/types/pet-services";

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function todayKey() { const d = new Date(); return dateKey(d.getFullYear(), d.getMonth(), d.getDate()); }
function timeLabel(value: string) {
  const [h, m] = value.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}
const slots = Array.from({ length: 18 }, (_, i) => {
  const minutes = 9 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});
const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CustomerGroomingScheduleStep({ customer, ownerContact, petSelections, groomers, scheduledDate, scheduledTime, specialRequests, onDateChange, onTimeChange, onRequestsChange, onBack, onConfirmed }: {
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
  const now = new Date();
  const [month, setMonth] = useState(() => {
    const parts = scheduledDate?.split("-").map(Number);
    return parts && parts.length === 3 ? new Date(parts[0], parts[1] - 1, 1) : new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const startOffset = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((startOffset + daysInMonth) / 7) * 7 }, (_, i) => i - startOffset + 1);
  const currentMonth = month.getFullYear() === now.getFullYear() && month.getMonth() === now.getMonth();
  const activeGroomerIds = Array.from(new Set(petSelections.map(s => s.groomerId).filter(Boolean))) as string[];

  async function verify() {
    if (!scheduledDate || !scheduledTime || checking) return;
    setChecking(true); setError(null);
    try {
      for (const id of activeGroomerIds) {
        const result = await checkGroomerTimeConflict(id, scheduledDate, scheduledTime, customer?.id ?? null, ownerContact);
        if (result.error) { setError(`Couldn't verify availability: ${result.error}`); return; }
        if (result.conflict) {
          const name = groomers.find(g => g.id === id)?.name ?? "The selected groomer";
          setError(`${name} already has this customer booked at ${timeLabel(scheduledTime)} on this date. Choose another time.`);
          return;
        }
      }
      setConfirmed(true);
    } finally { setChecking(false); }
  }

  if (confirmed && scheduledDate && scheduledTime) return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Appointment schedule confirmed">
    <div className="w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-2xl">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Check size={30}/></span>
      <h2 className="mt-4 text-xl font-bold text-slate-800">Schedule selected</h2>
      <p className="mt-2 text-sm text-slate-500">{scheduledDate} at {timeLabel(scheduledTime)}</p>
      <button type="button" onClick={onConfirmed} className="mt-6 w-full rounded-full bg-brand-pink py-3 text-sm font-semibold text-white">Continue to More Services</button>
    </div>
  </div>;

  return <section className="ht-calendar-booking mx-auto max-w-4xl">
    <header className="text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-50 text-brand-pink"><CalendarDays size={24}/></span>
      <h2 className="mt-3 text-2xl font-bold text-slate-800">Choose Your Schedule</h2>
      <p className="mt-1 text-sm text-slate-500">Select your preferred appointment date and time.</p>
    </header>
    <p className="mt-5 rounded-xl border border-pink-100 bg-pink-50/60 px-4 py-3 text-center text-xs text-slate-600">Open daily, 9:00 AM – 6:00 PM · Walk-ins are first-come, first-served.</p>
    <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
      <div className="rounded-2xl border border-pink-100 bg-white p-4 sm:p-5">
        <div className="mb-5 flex items-center justify-between">
          <button type="button" aria-label="Previous month" disabled={currentMonth || month < new Date(now.getFullYear(), now.getMonth(), 1)} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="rounded-full p-2 text-slate-700 hover:bg-pink-50 disabled:opacity-30"><ChevronLeft size={19}/></button>
          <h3 className="font-bold text-slate-800">{month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h3>
          <button type="button" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="rounded-full p-2 text-slate-700 hover:bg-pink-50"><ChevronRight size={19}/></button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">{days.map(day => <span key={day} className="py-2 text-[11px] font-semibold text-slate-400">{day}</span>)}
          {cells.map((day, i) => {
            const inRange = day > 0 && day <= daysInMonth;
            const date = inRange ? dateKey(month.getFullYear(), month.getMonth(), day) : "";
            const disabled = !inRange || date < todayKey();
            return <button key={i} type="button" disabled={disabled} aria-label={inRange ? date : "Outside current month"} aria-pressed={date === scheduledDate} onClick={() => { onDateChange(date); onTimeChange(""); setError(null); }} className={`aspect-square rounded-xl text-sm font-medium transition ${date === scheduledDate ? "bg-brand-pink text-white" : disabled ? "text-slate-300" : "text-slate-700 hover:bg-pink-50"}`}>{inRange ? day : ""}</button>;
          })}
        </div>
      </div>
      <div className="rounded-2xl border border-pink-100 bg-white p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800"><Clock3 size={16} className="text-brand-pink"/> Time slots</h3>
        <p className="mb-3 text-xs text-slate-500">{scheduledDate ? "Choose a time for the selected date" : "Select a date first"}</p>
        <div className="grid max-h-[300px] grid-cols-2 gap-2 overflow-y-auto pr-1 lg:grid-cols-1" aria-label="Appointment time slots">{slots.map(time => <button type="button" key={time} disabled={!scheduledDate} aria-pressed={scheduledTime === time} onClick={() => { onTimeChange(time); setError(null); }} className={`min-h-9 rounded-lg border px-2 py-2 text-xs font-semibold transition ${scheduledTime === time ? "border-brand-pink bg-brand-pink text-white" : "border-pink-100 text-slate-700 hover:border-brand-pink disabled:cursor-not-allowed disabled:opacity-40"}`}>{timeLabel(time)}</button>)}</div>
      </div>
    </div>
    <label className="mt-5 block text-sm font-semibold text-slate-700" htmlFor="ht-grooming-requests">Special requests / medical conditions / allergies / feeding instructions</label>
    <textarea id="ht-grooming-requests" rows={3} value={specialRequests} onChange={e => onRequestsChange(e.target.value)} placeholder="Share any instructions our team should know..." className="mt-2 w-full resize-y rounded-xl border border-pink-100 px-4 py-3 text-sm focus:border-brand-pink focus:outline-none"/>
    {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
    <div className="mt-6 grid grid-cols-2 gap-3"><button type="button" onClick={onBack} className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-pink-200 font-semibold text-brand-pink"><ArrowLeft size={16}/> Back</button><button type="button" onClick={verify} disabled={!scheduledDate || !scheduledTime || checking} className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-pink font-semibold text-white disabled:opacity-40">{checking ? "Checking..." : "Next"} <ArrowRight size={16}/></button></div>
  </section>;
}
