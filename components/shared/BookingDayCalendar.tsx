"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { manilaToday, useBookingClosures } from "@/lib/booking/use-booking-closures";

type Closures = ReturnType<typeof useBookingClosures>;
export default function BookingDayCalendar({ value, onChange, closures, unavailable = {}, availability, capacityLoading = false, capacityError = null, onMonthChange, title = "Choose a date" }: {
  value: string | null;
  onChange: (date: string) => void;
  closures: Closures;
  unavailable?: Record<string, string>;
  availability?: Record<string, number>;
  capacityLoading?: boolean;
  capacityError?: string | null;
  onMonthChange?: (month: string) => void;
  title?: string;
}) {
  const today = manilaToday();
  const [explanation, setExplanation] = useState<string | null>(null);
  const [month, setMonth] = useState(() => {
    const [year, m] = (value || today).split("-").map(Number);
    return new Date(year, m - 1, 1);
  });
  const year = month.getFullYear();
  const m = month.getMonth();
  const monthKey = `${year}-${String(m + 1).padStart(2,"0")}`;
  useEffect(() => { onMonthChange?.(monthKey); }, [monthKey, onMonthChange]);
  const offset = new Date(year, m, 1).getDay();
  const length = new Date(year, m + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((offset + length) / 7) * 7 }, (_, index) => index - offset + 1);
  const unavailableNow = closures.loading || Boolean(closures.error) || capacityLoading || Boolean(capacityError);
  return <section className="mx-auto w-full max-w-[490px] rounded-2xl border border-pink-100 bg-white p-3 sm:p-4" aria-label="Booking date calendar">
    <div className="mb-3 flex items-center justify-between gap-3">
      <button type="button" aria-label="Previous month" disabled={monthKey <= today.slice(0,7)} onClick={() => setMonth(new Date(year,m-1,1))} className="rounded-full p-2 text-zinc-600 hover:bg-pink-50 disabled:opacity-30"><ChevronLeft size={18}/></button>
      <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-800"><CalendarDays size={16} className="text-brand-pink"/>{title} · {month.toLocaleDateString("en-PH",{month:"long",year:"numeric"})}</h3>
      <button type="button" aria-label="Next month" onClick={() => setMonth(new Date(year,m+1,1))} className="rounded-full p-2 text-zinc-600 hover:bg-pink-50"><ChevronRight size={18}/></button>
    </div>
    <div className="grid grid-cols-7 gap-1 text-center">
      {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(day => <span key={day} className="py-1 text-[10px] font-semibold text-zinc-400">{day}</span>)}
      {cells.map((day,index) => {
        const inMonth = day>0 && day<=length;
        const date = inMonth ? `${monthKey}-${String(day).padStart(2,"0")}` : "";
        const reason = closures.nameFor(date) ?? unavailable[date] ?? null;
        const past = inMonth && date < today;
        // Red dates can be tapped to read the reason, but never invoke onChange.
        const blocked = !inMonth || past || unavailableNow || (Boolean(availability) && inMonth && availability?.[date] === undefined);
        return <button type="button" key={index} disabled={blocked} aria-disabled={Boolean(reason)} aria-label={!inMonth?"Outside month":reason?`${date}: Closed - ${reason}`:past?`${date}: Past date`:date} title={reason ? `Closed: ${reason}` : availability && inMonth ? `${availability[date] ?? "Checking"} kennels available for the selected stay` : undefined} aria-pressed={value===date} onClick={() => { if(reason){setExplanation(`${date}: ${reason}`);return;}setExplanation(null);onChange(date); }}
          className={`flex min-h-12 flex-col items-center justify-center rounded-lg border px-0.5 py-1 text-xs font-semibold transition ${reason ? "border-rose-200 bg-rose-50 text-rose-700" : past ? "border-transparent bg-rose-50/60 text-rose-400" : value===date ? "border-brand-pink bg-brand-pink text-white" : "border-transparent text-zinc-700 hover:bg-pink-50"} disabled:cursor-not-allowed ${reason?"cursor-not-allowed":""}`}>
          {inMonth?day:""}
          {reason ? <span className="mt-0.5 max-w-full truncate text-[8px] font-extrabold leading-3 text-rose-600">{reason.toLowerCase().includes("pickup") ? "Pickup closed" : reason.toLowerCase().includes("full") ? "Full" : "Closed"}</span> : past ? <span className="mt-0.5 text-[8px] font-bold text-rose-500">Past</span> : availability && inMonth ? <span className="mt-0.5 text-[8px] font-bold text-emerald-700">{availability[date] === undefined ? "Checking" : `${availability[date]} left`}</span> : null}
        </button>;
      })}
    </div>
    <p className="mt-3 text-center text-[11px] text-rose-700">Red dates cannot be selected. Tap a red date to see why. Counts cover the entire stay, including pickup-day opening hours.</p>
    {explanation && <p role="status" className="mt-2 rounded-lg bg-rose-50 p-2 text-center text-xs font-medium text-rose-700">{explanation}</p>}
    {capacityError && <p role="alert" className="mt-2 text-center text-xs text-rose-700">Kennel availability unavailable: {capacityError}</p>}
    {capacityLoading && <p className="mt-2 text-center text-xs text-zinc-500">Checking kennel space…</p>}
    {closures.loading && <p className="mt-2 text-center text-xs text-zinc-500">Checking shop calendar…</p>}
    {closures.error && <p role="alert" className="mt-2 text-center text-xs text-rose-700">Unable to load closures: {closures.error}</p>}
  </section>;
}
