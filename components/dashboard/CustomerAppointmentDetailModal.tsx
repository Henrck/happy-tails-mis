"use client";

import { useCallback, useEffect, useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import { fetchAppointmentDetail, type AppointmentRow } from "@/lib/supabase/appointment-management";
import { cancelCustomerAppointment } from "@/lib/supabase/customer-appointment-cancellation";
import { rescheduleCustomerAppointment } from "@/lib/supabase/customer-appointment-reschedule";
import CustomerCancellationReason from "./CustomerCancellationReason";
import CustomerRescheduleCalendar from "./CustomerRescheduleCalendar";

const reasons = ["Change of plans", "Schedule conflict", "Pet is unwell", "Booked by mistake", "Other"];
const serviceNames: Record<string, string> = { dog_grooming: "Dog Grooming", cat_grooming: "Cat Grooming", boarding: "Boarding", ala_carte: "À La Carte" };
function manilaDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" });
}
function originalTimeFor(row: AppointmentRow) {
  if (row.service_type === "boarding" && row.drop_off_at) {
    return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(row.drop_off_at));
  }
  return row.scheduled_time?.slice(0, 5) ?? "";
}

type Stage = "details" | "reason" | "reschedule" | "success" | "rescheduled";
export default function CustomerAppointmentDetailModal({ appointmentId, onClose, onCancelled }: {
  appointmentId: string;
  onClose: () => void;
  onCancelled?: () => void;
}) {
  const [row, setRow] = useState<AppointmentRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("details");
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [scheduleValid, setScheduleValid] = useState(false);
  const [saving, setSaving] = useState(false);
  const onScheduleValidityChange = useCallback((valid: boolean) => setScheduleValid(valid), []);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null); setStage("details"); setScheduleValid(false);
    void fetchAppointmentDetail(appointmentId).then(result => {
      if (!alive) return;
      setRow(result.row); setError(result.error); setLoading(false);
      if (result.row) { setDate(result.row.scheduled_date); setTime(originalTimeFor(result.row)); }
    }).catch(() => {
      if (alive) { setError("Unable to load appointment details."); setLoading(false); }
    });
    return () => { alive = false; };
  }, [appointmentId]);
  useEffect(() => {
    const esc = (event: KeyboardEvent) => { if (event.key === "Escape" && !saving) onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [saving, onClose]);

  const canCancel = !!row && !row.is_walk_in && (row.status === "pending" || row.status === "confirmed");
  const canReschedule = !!row && !row.is_walk_in && row.status === "pending";
  const effective = reason === "Other" ? details.trim() : reason;
  const validReason = effective.length >= 5 && effective.length <= 500;

  async function cancel() {
    if (!row || !canCancel || !validReason || saving) return;
    setSaving(true); setError(null);
    try {
      const result = await cancelCustomerAppointment(row.id, effective);
      if (result.error) { setError(result.error); return; }
      setRow({ ...row, status: "cancelled" }); setStage("success"); onCancelled?.();
    } catch { setError("Unable to cancel this appointment. Please try again."); }
    finally { setSaving(false); }
  }

  async function reschedule() {
    if (!row || !canReschedule || !scheduleValid || saving) return;
    setSaving(true); setError(null);
    try {
      // This RPC is responsible for ownership, Pending status, current availability,
      // and preservation of boarding pickup duration. UI previews are advisory.
      const result = await rescheduleCustomerAppointment(row.id, date, time);
      if (result.error) { setError(result.error); return; }
      const stayDuration = row.drop_off_at && row.pick_up_at
        ? new Date(row.pick_up_at).getTime() - new Date(row.drop_off_at).getTime() : 0;
      const drop = row.service_type === "boarding" ? new Date(`${date}T${time}:00+08:00`) : null;
      setRow({ ...row, scheduled_date: date, scheduled_time: row.service_type === "boarding" ? null : time,
        drop_off_at: drop?.toISOString() ?? row.drop_off_at,
        pick_up_at: drop && stayDuration > 0 ? new Date(drop.getTime() + stayDuration).toISOString() : row.pick_up_at });
      setStage("rescheduled"); onCancelled?.();
    } catch { setError("Unable to reschedule this appointment. Please try again."); }
    finally { setSaving(false); }
  }

  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-3 sm:p-5"
    onMouseDown={event => { if (event.currentTarget === event.target && !saving) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-label="Appointment details"
      className={`flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ${stage === "reschedule" ? "max-w-2xl" : "max-w-xl"}`}>
      <header className="flex shrink-0 items-center justify-between border-b border-pink-100 px-5 py-4">
        <h2 className="text-lg font-bold text-zinc-800">{stage === "reason" ? "Cancel Appointment" : stage === "reschedule" ? "Reschedule Appointment" : stage === "success" ? "Appointment Cancelled" : stage === "rescheduled" ? "Appointment Rescheduled" : "Appointment Details"}</h2>
        <button type="button" onClick={onClose} disabled={saving} aria-label="Close" className="rounded-full p-2 hover:bg-pink-50 disabled:opacity-40"><X size={20}/></button>
      </header>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
        {loading && <p className="py-8 text-center text-zinc-500">Loading appointment…</p>}
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {row && stage === "details" && <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h3 className="font-bold text-zinc-800">{serviceNames[row.service_type] ?? row.service_type}</h3>
              <p className="mt-1 text-sm text-zinc-500">{row.scheduled_date}{row.scheduled_time ? ` · ${row.scheduled_time}` : ""}</p>
              {row.drop_off_at && <p className="text-xs text-zinc-500">Drop off: {manilaDateTime(row.drop_off_at)}</p>}
              {row.pick_up_at && <p className="text-xs text-zinc-500">Pick up: {manilaDateTime(row.pick_up_at)}</p>}
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${row.status === "cancelled" ? "bg-red-100 text-red-700" : "bg-pink-100 text-brand-pink"}`}>{row.status.replace("_", " ")}</span>
          </div>
          <section className="space-y-3"><h4 className="text-xs font-bold uppercase text-zinc-500">Pets ({row.pets.length})</h4>
            {row.pets.map(p => <div key={p.appointmentPetId} className="rounded-2xl border border-pink-100 bg-pink-50/30 p-4">
              <div className="flex justify-between gap-2"><strong className="text-zinc-800">{p.name}</strong><strong className="text-brand-pink">₱{p.lineAmount.toFixed(2)}</strong></div>
              <p className="text-xs text-zinc-500">{p.breed} · {p.size_label}</p>
              {p.packageName && <p className="mt-2 text-sm text-zinc-600">Package: {p.packageName}{p.packagePricingLabel ? ` (${p.packagePricingLabel})` : ""}</p>}
              {p.addonNames.length > 0 && <p className="text-sm text-zinc-600">Add-ons: {p.addonNames.join(", ")}</p>}
              {p.groomerName && <p className="text-sm text-zinc-600">Groomer: {p.groomerName}</p>}
              {p.kennelLabel && <p className="text-sm text-zinc-600">Kennel: {p.kennelLabel}</p>}
            </div>)}
          </section>
          {row.status === "cancelled" && <CustomerCancellationReason appointmentId={row.id}/>} 
          {row.special_requests && <section className="rounded-xl border border-pink-100 p-3"><h4 className="text-xs font-semibold text-zinc-500">Special requests</h4><p className="mt-1 whitespace-pre-wrap break-words text-sm">{row.special_requests}</p></section>}
          <div className="flex justify-between border-t border-pink-100 pt-4"><strong>Total amount</strong><strong className="text-brand-pink">₱{row.total_amount.toFixed(2)}</strong></div>
        </>}
        {row && stage === "reschedule" && <CustomerRescheduleCalendar appointment={row} date={date} time={time}
          onDateChange={setDate} onTimeChange={setTime} onValidityChange={onScheduleValidityChange}/>} 
        {stage === "reason" && <>
          <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm"><AlertTriangle size={20} className="shrink-0 text-amber-600"/>Cancelling affects every pet on this appointment and cannot be undone.</div>
          <label className="block text-sm font-semibold">Reason *<select value={reason} onChange={e => setReason(e.target.value)} className="mt-2 w-full rounded-xl border border-pink-200 p-3"><option value="">Select a reason</option>{reasons.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
          {reason === "Other" && <label className="block text-sm font-semibold">Please explain *<textarea rows={3} maxLength={500} value={details} onChange={e => setDetails(e.target.value)} className="mt-2 w-full rounded-xl border border-pink-200 p-3"/></label>}
        </>}
        {stage === "success" && <p role="status" className="py-8 text-center font-semibold text-green-700">Your appointment has been cancelled.</p>}
        {stage === "rescheduled" && <p role="status" className="py-8 text-center font-semibold text-green-700">Your new schedule has been saved. The appointment remains Pending until staff confirm it.</p>}
      </div>
      {!loading && row && <footer className="shrink-0 border-t border-pink-100 p-4">
        {stage === "details" && (canCancel || canReschedule) && <div className="grid gap-3 sm:grid-cols-2">
          {canReschedule && <button type="button" onClick={() => { setScheduleValid(false); setError(null); setStage("reschedule"); }} className="rounded-full bg-brand-pink py-3 font-semibold text-white">Reschedule</button>}
          {canCancel && <button type="button" onClick={() => { setError(null); setStage("reason"); }} className="rounded-full border-2 border-red-400 py-3 font-semibold text-red-600">Cancel Appointment</button>}
        </div>}
        {stage === "reason" && <div className="grid grid-cols-2 gap-3"><button type="button" disabled={saving} onClick={() => { setError(null); setStage("details"); }} className="rounded-full border border-zinc-300 py-3">Back</button><button type="button" disabled={!validReason || saving} onClick={() => void cancel()} className="rounded-full bg-red-600 py-3 font-semibold text-white disabled:opacity-40">{saving ? "Cancelling…" : "Confirm Cancellation"}</button></div>}
        {stage === "reschedule" && <div className="grid grid-cols-2 gap-3"><button type="button" disabled={saving} onClick={() => { setError(null); setStage("details"); }} className="rounded-full border border-zinc-300 py-3">Back</button><button type="button" disabled={!scheduleValid || saving} onClick={() => void reschedule()} className="rounded-full bg-brand-pink py-3 font-semibold text-white disabled:opacity-40">{saving ? "Checking…" : "Confirm Schedule"}</button></div>}
        {(stage === "success" || stage === "rescheduled") && <button type="button" onClick={onClose} className="w-full rounded-full bg-brand-pink py-3 font-semibold text-white">Done</button>}
      </footer>}
    </div>
  </div>;
}
