"use client";

import { useEffect, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import OnlineCapacityGroomingSchedule from "@/components/dashboard/booking/OnlineCapacityGroomingSchedule";
import { useBookingClosures, manilaToday } from "@/lib/booking/use-booking-closures";
import type { DraftPetSelection } from "@/lib/types/appointments";

type Props = {
  petSelections: DraftPetSelection[];
  scheduledDate: string | null;
  scheduledTime: string | null;
  specialRequests: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onRequestsChange: (value: string) => void;
  onSelectionsChange: (items: DraftPetSelection[]) => void;
  onBack: () => void;
  onConfirmed: (items: DraftPetSelection[]) => void;
};

export default function HolidayLabeledCapacityCalendar(props: Props) {
  const closures = useBookingClosures();
  const today = manilaToday();
  const [month, setMonth] = useState(() => {
    const [year, m] = (props.scheduledDate || today).split("-").map(Number);
    return new Date(year, m - 1, 1);
  });
  const [notice, setNotice] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [closedSelection, setClosedSelection] = useState<string | null>(null);
  const first = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
  const cells = Array.from({ length: Math.ceil((first + total) / 7) * 7 }, (_, i) => i - first + 1);
  const currentMonth = today.slice(0, 7);

  // If a closure is newly added while a booking is open, invalidate the time.
  useEffect(() => {
    if (props.scheduledDate && closures.nameFor(props.scheduledDate)) {
      props.onTimeChange("");
      setClosedSelection(props.scheduledDate);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.scheduledDate, closures.dates]);

  async function choose(date: string) {
    if (checking || closures.loading || closures.error) return;
    const known = closures.nameFor(date);
    if (known) { setClosedSelection(date); setNotice(null); return; }
    setChecking(true);
    try {
      const message = await closures.verifyOpen(date);
      if (message) { setClosedSelection(date); setNotice(message); return; }
      setClosedSelection(null); setNotice(null);
      props.onDateChange(date);
      props.onTimeChange("");
      props.onSelectionsChange(props.petSelections.map(p => ({ ...p, groomingScheduledTime: undefined })));
    } finally { setChecking(false); }
  }

  async function finish(items: DraftPetSelection[]) {
    if (!props.scheduledDate || checking) return;
    setChecking(true);
    try {
      const message = await closures.verifyOpen(props.scheduledDate);
      if (message) { setClosedSelection(props.scheduledDate); setNotice(message); props.onTimeChange(""); return; }
      setNotice(null); props.onConfirmed(items);
    } finally { setChecking(false); }
  }

  const selectedClosedName = closures.nameFor(closedSelection);
  return <div className="ht-closure-capacity space-y-4">
    <section className="mx-auto w-full max-w-[460px] rounded-2xl border border-pink-100 bg-white p-3 sm:p-4" aria-label="Holiday-aware appointment calendar">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button type="button" aria-label="Previous month" disabled={key <= currentMonth} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="rounded-full p-2 text-slate-600 hover:bg-pink-50 disabled:opacity-30"><ChevronLeft size={18}/></button>
        <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-800"><CalendarDays size={17} className="text-brand-pink"/>{month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h3>
        <button type="button" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="rounded-full p-2 text-slate-600 hover:bg-pink-50"><ChevronRight size={18}/></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(day => <span key={day} className="py-1 text-[10px] font-semibold text-slate-400">{day}</span>)}
        {cells.map((day, i) => {
          const inMonth = day > 0 && day <= total;
          const date = inMonth ? `${key}-${String(day).padStart(2, "0")}` : "";
          const holiday = closures.nameFor(date);
          const past = inMonth && date < today;
          const inactive = !inMonth || past || !!holiday || closures.loading || !!closures.error || checking;
          return <button type="button" key={i} disabled={inactive} title={holiday ? `Closed: ${holiday}` : undefined} aria-label={holiday ? `${date}: Closed — ${holiday}` : date || "Outside month"} aria-pressed={date === props.scheduledDate} onClick={() => void choose(date)} className={`flex min-h-12 flex-col items-center justify-center rounded-lg px-0.5 py-1 text-xs font-semibold transition ${holiday ? "border border-rose-200 bg-rose-50 text-rose-700" : past || !inMonth ? "text-slate-300" : date === props.scheduledDate ? "bg-brand-pink text-white" : "text-zinc-700 hover:bg-pink-50"} disabled:cursor-not-allowed`}>
            {inMonth ? day : ""}
            {holiday && <span className="mt-0.5 text-[8px] font-extrabold leading-none text-rose-600">Closed</span>}
          </button>;
        })}
      </div>
      <p className="mt-3 text-center text-xs text-rose-600">Dates marked <strong>Closed</strong> are holidays or shop closures and cannot be booked.</p>
      {closures.loading && <p className="mt-2 text-center text-xs text-zinc-500">Loading holiday availability…</p>}
      {closures.error && <p role="alert" className="mt-2 text-center text-xs text-red-700">Unable to load shop closures: {closures.error}</p>}
      {selectedClosedName && <p className="mt-2 text-center text-xs font-semibold text-rose-700">Closed — {selectedClosedName}</p>}
    </section>
    {notice && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{notice}</p>}
    <div className="ht-closure-capacity-inner">
      <OnlineCapacityGroomingSchedule key={props.scheduledDate ?? "no-date"} {...props} onConfirmed={(items) => { void finish(items); }}/>
    </div>
  </div>;
}
