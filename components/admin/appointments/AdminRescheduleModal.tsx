"use client";

import { useEffect, useState } from "react";
import { CalendarClock, X } from "lucide-react";
import BookingDayCalendar from "@/components/shared/BookingDayCalendar";
import { useBookingClosures } from "@/lib/booking/use-booking-closures";
import { createClient } from "@/lib/supabase/client";
import type { AppointmentRow } from "@/lib/supabase/appointment-management";

const slots = Array.from({ length: 19 }, (_, i) => {
  const minutes = 9 * 60 + 30 * i;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});
function timeLabel(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}
function phNow() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const read = (key: string) => parts.find(p => p.type === key)?.value ?? "00";
  return { date: `${read("year")}-${read("month")}-${read("day")}`, time: `${read("hour")}:${read("minute")}` };
}
function localTime(timestamp: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(timestamp));
}
function formatSchedule(date: string, time: string) {
  return new Date(`${date}T${time}:00+08:00`).toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" });
}
export default function AdminRescheduleModal({ appointment, onClose, onSaved }: {
  appointment: AppointmentRow;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const closures = useBookingClosures();
  const boarding = appointment.service_type === "boarding";
  const grooming = appointment.service_type === "dog_grooming" || appointment.service_type === "cat_grooming";
  const previousTime = boarding && appointment.drop_off_at
    ? localTime(appointment.drop_off_at)
    : appointment.scheduled_time?.slice(0, 5) ?? "09:00";
  const [date, setDate] = useState(appointment.scheduled_date);
  const [month, setMonth] = useState(appointment.scheduled_date.slice(0, 7));
  const [blockedDates, setBlockedDates] = useState<Record<string, string>>({});
  const [monthError, setMonthError] = useState<string | null>(null);
  const [slotAvailability, setSlotAvailability] = useState<Record<string, number> | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [time, setTime] = useState(previousTime);
  const [now, setNow] = useState(phNow);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [reason, setReason] = useState("");
  const [delivery, setDelivery] = useState<string | null>(null);
  useEffect(() => {
    const id = window.setInterval(() => setNow(phNow()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [saving, onClose]);
  useEffect(() => {
    if (!grooming) return;
    let active = true;
    void createClient().rpc("happytails_groomer_month_availability", {
      p_first_day: `${month}-01`,
    }).then(({ data, error: failure }) => {
      if (!active) return;
      if (failure) { setMonthError(failure.message); setBlockedDates({}); return; }
      const blocked: Record<string, string> = {};
      for (const item of (data ?? []) as { day: string; open_slots: number; capacity: number }[]) {
        if (item.open_slots === 0 && item.day !== appointment.scheduled_date) {
          blocked[item.day] = item.capacity === 0 ? "No groomers available" : "Fully booked";
        }
      }
      setMonthError(null);
      setBlockedDates(blocked);
    }).then(undefined, () => {
  if (active) setMonthError("Unable to load monthly grooming availability.");
});
    return () => { active = false; };
  }, [grooming, month, appointment.scheduled_date]);
  useEffect(() => {
    if (!grooming || !date) { setSlotAvailability(null); setSlotsError(null); return; }
    let active = true;
    setSlotsLoading(true); setSlotAvailability(null); setSlotsError(null);
    void createClient().rpc("happytails_live_groomer_slots", { p_date: date })
      .then(({ data, error: failure }) => {
        if (!active) return;
        if (failure) { setSlotsError(failure.message); return; }
        const availability: Record<string, number> = {};
        for (const item of (data ?? []) as { slot_time: string; remaining: number }[]) {
          availability[item.slot_time.slice(0, 5)] = Math.max(0, Number(item.remaining) || 0);
        }
        setSlotAvailability(availability);
      }).then(undefined, () => {
  if (active) {
    setSlotsError("Unable to check grooming start times.");
  }
}).then(() => {
  if (active) {
    setSlotsLoading(false);
  }
});
    return () => { active = false; };
  }, [grooming, date]);
  const maxTime = grooming ? "17:00" : "18:00";
  const closure = closures.nameFor(date);
  const availableStart = !grooming || (slotAvailability !== null && (slotAvailability[time] ?? 0) > 0)
    || (date === appointment.scheduled_date && time === previousTime);
  const calendarReady = !closures.loading && !closures.error && (!grooming || !monthError);
  const valid = (appointment.status === "pending" || appointment.status === "confirmed")
    && !!date && !!time && /^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{2}:\d{2}$/.test(time)
    && date >= now.date && (date > now.date || time > now.time)
    && time >= "09:00" && time <= maxTime
    && calendarReady && !closure && !blockedDates[date] && availableStart && !slotsLoading && !slotsError
    && (date !== appointment.scheduled_date || time !== previousTime)
    && reason.trim().length >= 5 && reason.trim().length <= 500;
  async function submit() {
    if (!valid || saving) return;
    setSaving(true); setError(null);
    try {
      const closed = await closures.verifyOpen(date);
      if (closed) throw new Error(closed);
      const response = await fetch("/api/admin/appointment-reschedule", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: appointment.id, date, time, reason: reason.trim() }),
      });
      const payload: { error?: string; delivery?: string } = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to reschedule the appointment.");
      setDelivery(payload.delivery ?? "failed");
      setSuccess(true);
      try { await onSaved(); } catch { /* Saved successfully; realtime refresh can retry. */ }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to reschedule the appointment.");
    } finally { setSaving(false); }
  }
  return <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 p-3 sm:p-5" onMouseDown={e => { if (e.target === e.currentTarget && !saving) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-label="Reschedule appointment" className="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
      <header className="flex items-center justify-between border-b border-pink-100 px-5 py-4">
        <div className="flex items-center gap-2"><CalendarClock className="text-brand-pink" size={22}/><h3 className="text-lg font-bold">Reschedule Appointment</h3></div>
        <button type="button" aria-label="Close" disabled={saving} onClick={onClose} className="rounded-full p-2 hover:bg-pink-50"><X size={20}/></button>
      </header>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        {success ? <div role="status" className="space-y-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
          <p className="font-semibold">Appointment rescheduled successfully. The reason has been recorded.</p>
          <p>{delivery === "sent" ? "The customer notification email was sent." : delivery === "no_customer" ? "No registered customer account is linked to this booking. Email was not sent." : delivery === "no_email" ? "The customer has no available email address. Email was not sent." : delivery === "not_configured" ? "Email delivery is not configured on the server. The schedule was saved." : "The schedule was saved, but the email could not be delivered. Notify the customer manually."}</p>
        </div> : <>
          <div className="rounded-xl bg-pink-50 p-3 text-sm text-zinc-700">
            <p><strong>Customer:</strong> {appointment.owner_name}</p>
            <p><strong>Pets:</strong> {appointment.pets.map(p => p.name).join(", ") || "—"}</p>
            <p><strong>Current schedule:</strong> {formatSchedule(appointment.scheduled_date, previousTime)}</p>
            <p className="mt-2 text-xs text-zinc-500">Pets, services, prices, and {boarding ? "boarding duration" : "groomer assignments"} are retained. Availability is verified before saving.</p>
          </div>
          <BookingDayCalendar
            value={date} onChange={next => { setDate(next); setTime(""); setError(null); }}
            closures={closures} unavailable={grooming ? blockedDates : {}}
            onMonthChange={setMonth} title="Reschedule"
          />
          {monthError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-700">Cannot verify the grooming calendar: {monthError}</p>}
          {slotsError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-700">Cannot verify time availability: {slotsError}</p>}
          <section>
            <h4 className="mb-2 text-sm font-bold text-zinc-800">Choose new {boarding ? "drop-off" : "appointment start"} time</h4>
            <p className="mb-3 text-xs text-zinc-500">
              {grooming ? "Live grooming start-slot availability · final groomer and package checks happen before saving." : "Booking-hour choices in Philippine time · availability is confirmed by the server before saving."}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Reschedule start times">
              {slots.filter(slot => slot <= maxTime).map(slot => {
                const past = !date || date < now.date || (date === now.date && slot <= now.time);
                const capacity = slotAvailability?.[slot] ?? 0;
                const originalSlot = date === appointment.scheduled_date && slot === previousTime;
                const full = grooming && slotAvailability !== null && capacity <= 0 && !originalSlot;
                const disabled = saving || past || !calendarReady || !!closure || !!blockedDates[date] || slotsLoading || !!slotsError || (grooming && (slotAvailability === null || full));
                const selected = time === slot;
                return <button key={slot} type="button" disabled={disabled} aria-pressed={selected}
                  onClick={() => { setTime(slot); setError(null); }}
                  className={`min-h-14 rounded-xl border px-2 py-2 text-xs font-semibold transition ${selected ? "border-brand-pink bg-pink-50 text-brand-pink" : full ? "border-rose-200 bg-rose-50 text-rose-700" : "border-pink-200 bg-white text-zinc-700 hover:border-brand-pink"} disabled:cursor-not-allowed disabled:opacity-50`}>
                  <span className="block">{timeLabel(slot)}</span>
                  <span className="mt-0.5 block text-[10px]">{past ? "Past" : grooming ? slotsLoading || !slotAvailability ? "Checking…" : full ? "Full" : `${capacity} open` : selected ? "Selected" : "Select"}</span>
                </button>;
              })}
            </div>
          </section>
          {boarding && <p className="text-xs text-zinc-500">Both drop-off and pick-up will move together, retaining the original stay duration and kennel reservation.</p>}
          <label className="block text-sm font-semibold text-zinc-800">Reason for rescheduling *
            <textarea value={reason} onChange={e => { setReason(e.target.value); setError(null); }} rows={3} maxLength={500}
              placeholder="Explain why the appointment is being moved (shown in the customer's email)"
              className="mt-2 w-full rounded-xl border border-pink-200 p-3 text-sm font-normal" />
            <span className="mt-1 block text-xs font-normal text-zinc-500">Required: 5–500 characters · {reason.trim().length}/500</span>
          </label>
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {!valid && !monthError && !slotsError && <p className="text-xs text-amber-700">Choose a new available future date and time between 9:00 AM and {grooming ? "5:00 PM" : "6:00 PM"}.</p>}
        </>}
      </div>
      <footer className="flex gap-3 border-t border-pink-100 p-4">
        <button type="button" disabled={saving} onClick={onClose} className="flex-1 rounded-full border border-zinc-300 px-4 py-3 text-sm font-semibold">{success ? "Done" : "Cancel"}</button>
        {!success && <button type="button" disabled={!valid || saving} onClick={() => void submit()} className="flex-1 rounded-full bg-brand-pink px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">{saving ? "Checking…" : "Confirm Schedule"}</button>}
      </footer>
    </div>
  </div>;
}
