"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Clock3, RefreshCw } from "lucide-react";
import BookingDayCalendar from "@/components/shared/BookingDayCalendar";
import { manilaToday, manilaTime, useBookingClosures } from "@/lib/booking/use-booking-closures";
import { createClient } from "@/lib/supabase/client";
import type { AppointmentRow } from "@/lib/supabase/appointment-management";

const slots = Array.from({ length: 19 }, (_, i) => {
  const minutes = 9 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});
const clockLabel = (value: string) => {
  const [h, m] = value.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};
type LiveSlot = { slot_time: string; remaining: number; capacity: number };
type Props = {
  appointment: AppointmentRow;
  date: string;
  time: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onValidityChange: (valid: boolean) => void;
};

/** Reuses Grooming's calendar. Live capacity is informational; the save RPC makes the final decision. */
export default function CustomerRescheduleCalendar({ appointment, date, time, onDateChange, onTimeChange, onValidityChange }: Props) {
  const closures = useBookingClosures();
  const isGrooming = appointment.service_type === "dog_grooming" || appointment.service_type === "cat_grooming";
  const isBoarding = appointment.service_type === "boarding";
  const [slotsByTime, setSlotsByTime] = useState<Record<string, LiveSlot>>({});
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [clock, setClock] = useState(0);
  const today = manilaToday();
  const nowTime = manilaTime();
  const closed = closures.nameFor(date);
  const originalTime = isBoarding && appointment.drop_off_at
    ? new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(appointment.drop_off_at))
    : (appointment.scheduled_time?.slice(0, 5) ?? "");
  const dateChanged = date !== appointment.scheduled_date || time !== originalTime;
  const currentAppointmentSlot = date === appointment.scheduled_date && time === originalTime;
  void clock;

  const reload = useCallback(async (target: string, signal: AbortSignal) => {
    const { data, error } = await createClient().rpc("happytails_live_groomer_slots", { p_date: target }).abortSignal(signal);
    if (error) throw new Error(error.message);
    return Object.fromEntries(((data ?? []) as LiveSlot[]).map(slot => [slot.slot_time, slot]));
  }, []);

  useEffect(() => {
    if (!isGrooming || !date || closures.loading || !!closures.error || !!closed) {
      setSlotsByTime({}); setLoadingSlots(false); setSlotsError(null); return;
    }
    const controller = new AbortController();
    let active = true;
    setLoadingSlots(true); setSlotsError(null); setSlotsByTime({});
    void reload(date, controller.signal).then(results => { if (active) setSlotsByTime(results); })
      .catch(error => { if (active) setSlotsError(error instanceof Error ? error.message : "Unable to check live availability."); })
      .finally(() => { if (active) setLoadingSlots(false); });
    return () => { active = false; controller.abort(); };
  }, [isGrooming, date, closed, closures.loading, closures.error, reload, refresh]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(n => n + 1);
      if (document.visibilityState === "visible") setRefresh(n => n + 1);
    }, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const validTime = /^\d{2}:\d{2}$/.test(time) && time >= "09:00" && time <= (isGrooming ? "17:00" : "18:00");
  const inFuture = !!date && (date > today || (date === today && time > nowTime));
  // The current appointment already occupies its original grooming slot.
  // The server handles its own reservation when saving a reschedule.
  const selectedGroomingSlot = slotsByTime[time];
  const roomForSelection = !isGrooming || (selectedGroomingSlot !== undefined &&
    (selectedGroomingSlot.remaining > 0 || currentAppointmentSlot));
  const canProceed = dateChanged && validTime && inFuture && !closed && !closures.loading && !closures.error &&
    (!isGrooming || (!loadingSlots && !slotsError && roomForSelection));

  useEffect(() => { onValidityChange(Boolean(canProceed)); }, [canProceed, onValidityChange]);

  return <div className="space-y-4">
    <div className="flex items-start gap-3 rounded-xl border border-pink-100 bg-pink-50 p-3 text-sm text-zinc-700">
      <CalendarClock size={21} className="mt-0.5 shrink-0 text-brand-pink" />
      <span>Select a new date and {isBoarding ? "drop-off" : "appointment"} time. Your pet services and prices stay the same. Only Pending appointments can be rescheduled.</span>
    </div>
    <BookingDayCalendar value={date || null} onChange={next => { onDateChange(next); onTimeChange(""); }} closures={closures} title="Reschedule" />
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-800"><Clock3 size={17} className="text-brand-pink" />Choose {isBoarding ? "drop-off" : "start"} time</h3>
      {isGrooming && <button type="button" onClick={() => setRefresh(n => n + 1)} disabled={!date || loadingSlots}
        className="flex items-center gap-1 text-xs font-semibold text-brand-pink disabled:opacity-40"><RefreshCw size={13}/> Refresh availability</button>}
    </div>
    {isGrooming && <p className="text-xs text-zinc-500">Availability is checked live and refreshed every 30 seconds. Final capacity is verified again when you save.</p>}
    {!isGrooming && <p className="text-xs text-zinc-500">Closed dates and past times are blocked. {isBoarding ? "Kennel availability and pickup constraints" : "Final availability"} will be checked when you confirm the change.</p>}
    {slotsError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Unable to load live grooming availability: {slotsError}</p>}
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Rescheduling time slots">
      {slots.filter(slot => slot <= (isGrooming ? "17:00" : "18:00")).map(slot => {
        const past = !date || date < today || (date === today && slot <= nowTime);
        const live = slotsByTime[slot];
        const ownSlot = date === appointment.scheduled_date && slot === originalTime;
        const noRoom = isGrooming && (!live || (live.remaining <= 0 && !ownSlot));
        const unavailable = past || !!closed || closures.loading || !!closures.error || (isGrooming && (loadingSlots || !!slotsError || noRoom));
        const chosen = slot === time;
        const status = past ? "Past" : closed ? "Closed" : isGrooming
          ? loadingSlots ? "Checking…" : slotsError || !live ? "Unavailable" : noRoom ? "Full" : `${Math.max(0, live.remaining)} available${ownSlot ? " · your slot" : ""}`
          : "Select time";
        return <button type="button" key={slot} disabled={unavailable} onClick={() => onTimeChange(slot)} aria-pressed={chosen && !unavailable}
          className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-xs font-semibold transition ${chosen && !unavailable ? "border-brand-pink bg-brand-pink text-white" : unavailable ? "border-zinc-100 bg-zinc-50 text-zinc-400" : "border-pink-200 bg-white text-zinc-700 hover:border-brand-pink hover:bg-pink-50"} disabled:cursor-not-allowed`}>
          <span>{clockLabel(slot)}</span><span className={`text-[10px] font-normal ${chosen && !unavailable ? "text-white/90" : "opacity-75"}`}>{status}</span>
        </button>;
      })}
    </div>
    {isBoarding && <p className="rounded-xl bg-zinc-50 p-3 text-xs text-zinc-600">Your original boarding stay length is preserved; pickup shifts with the new drop-off. The database validates the requested schedule.</p>}
    {!!date && !!time && !dateChanged && <p className="text-xs text-amber-700">Choose a different date or time from your current appointment.</p>}
  </div>;
}
