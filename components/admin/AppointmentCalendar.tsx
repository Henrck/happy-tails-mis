"use client";
// Month calendar with clickable days. Selecting a day shows that day's
// scheduled appointments below the grid (pulled from the mock data keyed
// by day-of-month — swap for a real query by date range once appointments
// exist in the database).
import { useState } from "react";
import { calendarAppointments } from "@/lib/data/admin-mock";

const weekDays = ["S", "M", "T", "W", "T", "F", "S"];

export default function AppointmentCalendar() {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  function changeMonth(delta: number) {
    setViewDate(new Date(year, month + delta, 1));
    setSelectedDay(null);
  }

  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const selectedAppointments = selectedDay ? calendarAppointments[selectedDay] ?? [] : [];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-pink-100 p-5">
      <div className="flex items-center justify-between">
        <button onClick={() => changeMonth(-1)} className="text-zinc-400 hover:text-brand-pink px-2">‹</button>
        <h3 className="font-bold text-brand-pink text-sm">
          {viewDate.toLocaleString("default", { month: "long", year: "numeric" })}
        </h3>
        <button onClick={() => changeMonth(1)} className="text-zinc-400 hover:text-brand-pink px-2">›</button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs">
        {weekDays.map((d, i) => (
          <div key={i} className="text-zinc-400 font-semibold py-1">{d}</div>
        ))}
        {cells.map((day, i) => {
          const hasAppointments = day !== null && !!calendarAppointments[day];
          const isSelected = day !== null && day === selectedDay;
          return (
            <button
              key={i}
              disabled={day === null}
              onClick={() => day && setSelectedDay(day)}
              className={`aspect-square rounded-lg text-xs flex items-center justify-center relative transition-colors ${
                day === null
                  ? ""
                  : isSelected
                  ? "bg-brand-pink text-white font-bold"
                  : "hover:bg-brand-tint text-zinc-700"
              }`}
            >
              {day}
              {hasAppointments && !isSelected && (
                <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-brand-pink" />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 border-t border-pink-100 pt-3">
        <p className="text-xs font-semibold text-zinc-500 mb-2">
          {selectedDay ? `Schedule — ${viewDate.toLocaleString("default", { month: "short" })} ${selectedDay}` : "Select a day"}
        </p>
        {selectedAppointments.length === 0 ? (
          <p className="text-xs text-zinc-400">No appointments this day.</p>
        ) : (
          <ul className="space-y-1.5">
            {selectedAppointments.map((appt, i) => (
              <li key={i} className="text-xs text-zinc-700">
                <span className="font-semibold text-brand-pink">{appt.time}</span> — {appt.pet} · {appt.service}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
