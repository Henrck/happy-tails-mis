"use client";
import { useState } from "react";
import { calendarEvents, type CalendarEventType } from "@/lib/data/admin-mock";

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dotColor: Record<CalendarEventType, string> = {
  grooming: "bg-brand-pink", boarding: "bg-sky-400", walkin: "bg-amber-400", other: "bg-purple-400",
};
const legendLabel: Record<CalendarEventType, string> = {
  grooming: "Grooming", boarding: "Boarding", walkin: "Walk-in", other: "Others",
};

export default function DashboardCalendar() {
  const [viewDate, setViewDate] = useState(new Date(2026, 6, 1));
  const [scheduleModalDay, setScheduleModalDay] = useState<number | null>(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  function changeMonth(delta: number) {
    setViewDate(new Date(year, month + delta, 1));
  }

  const cells: { day: number; inMonth: boolean }[] = [];
  for (let i = firstDayOfWeek - 1; i >= 0; i--) cells.push({ day: prevMonthDays - i, inMonth: false });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, inMonth: true });
  // ALWAYS pad to exactly 42 cells (6 full weeks) regardless of the
  // month's actual day count — this is what makes the calendar's height
  // constant every month, instead of shrinking/growing between 5-row and
  // 6-row months (28-31 days can need either 5 or 6 rows depending on
  // which weekday the 1st falls on).
  let nextDay = 1;
  while (cells.length < 42) cells.push({ day: nextDay++, inMonth: false });

  const modalEvents = scheduleModalDay ? calendarEvents[scheduleModalDay] ?? [] : [];

  return (
    <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-brand-pink text-sm">Calendar</h3>
        <span className="text-[11px] font-semibold text-zinc-400">Click a day for its schedule</span>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <button onClick={() => changeMonth(-1)} className="text-zinc-400 hover:text-brand-pink px-1" aria-label="Previous month">‹</button>
        <p className="text-sm font-bold text-zinc-800">{viewDate.toLocaleString("default", { month: "long", year: "numeric" })}</p>
        <button onClick={() => changeMonth(1)} className="text-zinc-400 hover:text-brand-pink px-1" aria-label="Next month">›</button>
      </div>

      <div className="mt-2 grid grid-cols-7 text-center">
        {weekDays.map((d) => <div key={d} className="text-[10px] font-semibold text-zinc-400 py-1">{d}</div>)}
      </div>

      {/* Fixed 6-row grid — height is now identical every month. */}
      <div className="grid grid-cols-7 grid-rows-6 gap-y-0.5 flex-1">
        {cells.map((cell, i) => {
          const events = cell.inMonth ? calendarEvents[cell.day] ?? [] : [];
          const hasEvents = events.length > 0;
          const isToday = cell.inMonth && cell.day === 22 && month === 6 && year === 2026;
          return (
            <button
              key={i}
              disabled={!cell.inMonth}
              onClick={() => cell.inMonth && hasEvents && setScheduleModalDay(cell.day)}
              className={`flex flex-col items-center justify-center rounded-lg text-xs transition-colors ${
                !cell.inMonth ? "text-zinc-200" : isToday ? "border border-brand-pink text-brand-pink font-semibold" : hasEvents ? "text-zinc-700 hover:bg-brand-tint cursor-pointer" : "text-zinc-700"
              }`}
            >
              {cell.day}
              {hasEvents && <span className={`mt-0.5 w-1 h-1 rounded-full ${dotColor[events[0].type]}`} />}
            </button>
          );
        })}
      </div>

      <div className="mt-2 pt-2 border-t border-pink-50 flex flex-wrap gap-x-3 gap-y-1 justify-center">
        {(Object.keys(legendLabel) as CalendarEventType[]).map((type) => (
          <span key={type} className="flex items-center gap-1 text-[10px] text-zinc-500">
            <span className={`w-1.5 h-1.5 rounded-full ${dotColor[type]}`} /> {legendLabel[type]}
          </span>
        ))}
      </div>

      {/* Day schedule modal */}
      {scheduleModalDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setScheduleModalDay(null)}>
          <div className="w-full max-w-xs bg-white rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-brand-pink px-5 py-3 flex items-center justify-between">
              <h4 className="text-white font-bold text-sm">
                {viewDate.toLocaleString("default", { month: "long" })} {scheduleModalDay}, {year}
              </h4>
              <button onClick={() => setScheduleModalDay(null)} className="text-white hover:opacity-80" aria-label="Close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>
              </button>
            </div>
            <div className="p-4 space-y-2.5 max-h-80 overflow-y-auto">
              {modalEvents.map((event, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor[event.type]}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-800">{event.time} — {event.petName}</p>
                    <p className="text-[11px] text-zinc-500">{event.service}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
