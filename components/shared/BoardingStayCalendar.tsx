"use client";
// Boarding-only month calendar: shows the check-in day, the whole stay span and
// each pickup ("Out") day, with an inline explanation for unavailable dates.
// Availability itself is computed by the parent (BoardingGroupSchedule).
import { useEffect, useState } from "react";
import { AlertCircle, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

export type BoardingDayStatus =
  | { kind: "past" }
  | { kind: "checking" }
  | { kind: "available"; note?: { name: string; label: string } }
  | { kind: "blocked"; reason: string };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Short badge for a blocked day, from the planner's reason text. */
export function blockedLabel(reason: string) {
  const text = reason.toLowerCase();
  if (text.includes("time has passed")) return "Past time";
  if (text.includes("pickup")) return "Pickup closed";
  if (text.includes("full") || text.includes("no ")) return "Full";
  return "Closed";
}

function friendly(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
}

export default function BoardingStayCalendar({ value, today, statusFor, stayEnd, pickupDays, stayLabel, busy, busyLabel,
  errorText, onSelect, onMonthChange }: {
  value: string;
  today: string;
  statusFor: (date: string) => BoardingDayStatus;
  /** Last pickup date of the selected stay (inclusive), or "" when none. */
  stayEnd: string;
  /** Pickup dates to mark "Out" (pets may have different stay lengths). */
  pickupDays: string[];
  stayLabel: string;
  busy: boolean;
  busyLabel: string;
  errorText: string | null;
  onSelect: (date: string) => void;
  onMonthChange: (month: string) => void;
}) {
  const [month, setMonth] = useState(() => {
    const [year, m] = (value || today).split("-").map(Number);
    return new Date(year, m - 1, 1);
  });
  const [notice, setNotice] = useState<{ date: string; label: string; reason: string } | null>(null);
  const year = month.getFullYear();
  const m = month.getMonth();
  const monthKey = `${year}-${String(m + 1).padStart(2, "0")}`;
  useEffect(() => { onMonthChange(monthKey); }, [monthKey, onMonthChange]);
  const offset = new Date(year, m, 1).getDay();
  const length = new Date(year, m + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((offset + length) / 7) * 7 }, (_, index) => index - offset + 1);

  return <section aria-label="Boarding check-in calendar" className="rounded-2xl border border-pink-100 bg-white p-4 shadow-sm sm:p-5">
    <div className="mb-4 flex items-center justify-between gap-2">
      <h3 className="flex items-center gap-2 whitespace-nowrap text-sm font-bold text-slate-900"><CalendarDays size={16} className="shrink-0 text-brand-pink"/>Group check-in</h3>
      <div className="flex items-center gap-1">
        <button type="button" aria-label="Previous month" disabled={monthKey <= today.slice(0, 7)} onClick={() => { setNotice(null); setMonth(new Date(year, m - 1, 1)); }}
          className="rounded-lg p-1.5 text-slate-600 hover:bg-pink-50 hover:text-brand-pink disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"><ChevronLeft size={16}/></button>
        <span className="px-1 text-center text-xs font-bold text-slate-800 sm:min-w-28 sm:text-sm">{month.toLocaleDateString("en-PH", { month: "long", year: "numeric" })}</span>
        <button type="button" aria-label="Next month" onClick={() => { setNotice(null); setMonth(new Date(year, m + 1, 1)); }}
          className="rounded-lg p-1.5 text-slate-600 hover:bg-pink-50 hover:text-brand-pink"><ChevronRight size={16}/></button>
      </div>
    </div>

    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-slate-100 pb-3 text-[11px] text-slate-500">
      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500"/>Available</span>
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand-pink"/>Check-in</span>
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border border-pink-300 bg-pink-100"/>{stayLabel}</span>
      <span className="flex items-center gap-1.5"><span className="text-[9px] font-bold text-amber-600">Holiday</span>Caretaker on duty</span>
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border border-rose-200 bg-rose-50"/>Full / Past time</span>
    </div>

    <div className="grid grid-cols-7 gap-1 text-center sm:gap-1.5">
      {WEEKDAYS.map(day => <div key={day} className="py-1 text-[11px] font-semibold text-slate-400">{day}</div>)}
      {cells.map((day, index) => {
        const inMonth = day > 0 && day <= length;
        if (!inMonth) return <div key={index} aria-hidden="true"/>;
        const date = `${monthKey}-${String(day).padStart(2, "0")}`;
        const status = statusFor(date);
        const selected = value === date;
        const inStay = !!value && !!stayEnd && date > value && date <= stayEnd;
        const pickup = inStay && pickupDays.includes(date);
        const blocked = status.kind === "blocked";
        let cls = "relative flex h-11 flex-col items-center justify-center rounded-xl text-xs transition-all sm:text-sm ";
        if (selected) cls += "bg-brand-pink font-bold text-white shadow-sm ring-2 ring-brand-pink ring-offset-1";
        else if (inStay) cls += "border border-pink-300 bg-pink-100/80 font-semibold text-[#B81D6B]";
        else if (status.kind === "past") cls += "cursor-not-allowed bg-slate-50/60 text-slate-300";
        else if (blocked) cls += "border border-rose-200 bg-rose-50 font-medium text-rose-500 hover:bg-rose-100/80";
        else if (status.kind === "checking") cls += "cursor-wait border border-slate-100 bg-white text-slate-400";
        else cls += "border border-slate-200 bg-white font-bold text-slate-800 hover:border-brand-pink hover:ring-2 hover:ring-pink-100";
        return <button key={index} type="button" className={cls}
          disabled={status.kind === "past" || status.kind === "checking" || busy}
          aria-pressed={selected}
          aria-label={blocked ? `${friendly(date)}: unavailable, ${status.reason}` : status.kind === "past" ? `${friendly(date)}: past date` : `${friendly(date)}${selected ? ", check-in" : pickup ? ", pickup" : inStay ? ", during stay" : ", available"}`}
          title={blocked ? `${blockedLabel(status.reason)}: ${status.reason}` : status.kind === "available" ? `${friendly(date)} — Available${status.note ? ` (${status.note.name}: caretaker on duty)` : ""}` : undefined}
          onClick={() => {
            if (blocked) { setNotice({ date, label: blockedLabel(status.reason), reason: status.reason }); return; }
            setNotice(null); onSelect(date);
          }}>
          <span className={blocked ? "line-through" : undefined}>{day}</span>
          {selected ? <span className="mt-0.5 text-[8px] font-semibold uppercase leading-none tracking-wider text-pink-100">In</span>
            : pickup ? <span className="mt-0.5 text-[8px] font-bold uppercase leading-none tracking-wider text-brand-pink">Out</span>
            : blocked ? <span className="mt-0.5 max-w-full truncate px-0.5 text-[8px] font-bold leading-none text-rose-500">{blockedLabel(status.reason)}</span>
            : status.kind === "available" && status.note ? <span className={`mt-0.5 max-w-full truncate px-0.5 text-[8px] font-bold leading-none ${selected ? "text-pink-100" : "text-amber-600"}`}>{status.note.label}</span>
            : status.kind === "available" && !inStay ? <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500"/> : null}
        </button>;
      })}
    </div>

    {notice && <div role="alert" className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
      <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-500"/>
      <p className="flex-1"><span className="font-bold">{friendly(notice.date)} ({notice.label}): </span>{notice.reason}</p>
      <button type="button" onClick={() => setNotice(null)} className="font-semibold text-rose-600 underline hover:text-rose-800">Close</button>
    </div>}
    {busy && <p role="status" className="mt-3 text-center text-xs text-slate-500">{busyLabel}</p>}
    {errorText && <p role="alert" className="mt-3 text-center text-xs text-rose-700">{errorText}</p>}
    {!notice && !busy && !errorText && <p className="mt-3 text-center text-[11px] text-slate-400">Tap a red date to see why it can&apos;t be booked.</p>}
  </section>;
}
