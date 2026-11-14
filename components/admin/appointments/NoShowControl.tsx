"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AppointmentRow } from "@/lib/supabase/appointment-management";
import { AlertTriangle, UserX } from "lucide-react";

export default function NoShowControl({ appointment, onRecorded }: { appointment: AppointmentRow; onRecorded: () => Promise<void> | void }) {
  const [recorded, setRecorded] = useState(false);
  const [checking, setChecking] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("Customer did not arrive for the scheduled appointment.");

  useEffect(() => {
    let active = true;
    if (!appointment.customer_id || appointment.status !== "confirmed") { setChecking(false); return; }
    void createClient().rpc("happytails_appointment_has_no_show", { p_appointment_id: appointment.id }).then(({ data, error: rpcError }) => {
      if (!active) return;
      setRecorded(!rpcError && data === true);
      setChecking(false);
    });
    return () => { active = false; };
  }, [appointment.id, appointment.customer_id, appointment.status]);

  const scheduledStart = appointment.service_type === "boarding" && appointment.drop_off_at
    ? new Date(appointment.drop_off_at).getTime()
    : new Date(`${appointment.scheduled_date}T${(appointment.scheduled_time ?? "00:00").slice(0, 5)}:00+08:00`).getTime();
  const schedulePassed = Number.isFinite(scheduledStart) && scheduledStart <= Date.now();
  if (!appointment.customer_id || appointment.status !== "confirmed") return null;

  async function markNoShow() {
    if (busy || reason.trim().length < 5 || reason.trim().length > 500) return;
    setBusy(true); setError("");
    try {
      const { error: rpcError } = await createClient().rpc("happytails_record_customer_no_show", { p_appointment_id: appointment.id, p_reason: reason.trim() });
      if (rpcError) throw new Error(rpcError.message);
      setRecorded(true); setConfirmOpen(false);
      await onRecorded();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to record this no-show."); }
    finally { setBusy(false); }
  }

  return <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
    {recorded ? <p className="flex items-center gap-2 text-sm font-bold text-amber-800"><UserX size={17}/> No-show recorded · 2 penalty points applied</p> : <div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><p className="text-sm font-semibold text-amber-900">Customer no-show</p><p className="mt-0.5 text-xs text-amber-800">Adds 2 penalty points and a 1-day booking restriction. At 3 total points, the restriction becomes 1 month.</p></div><button type="button" disabled={checking || !schedulePassed} onClick={() => { setError(""); setConfirmOpen(true); }} className="shrink-0 rounded-full border border-amber-500 px-4 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40">{checking ? "Checking…" : "Mark No-show"}</button></div>}
    {!recorded && !schedulePassed && <p className="mt-2 text-xs text-amber-800">This action becomes available after the scheduled drop-off or appointment time.</p>}
    {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
    {confirmOpen && <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setConfirmOpen(false); }}><div role="dialog" aria-modal="true" aria-label="Confirm no-show" className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-center gap-2 text-amber-700"><AlertTriangle size={22}/><h3 className="text-lg font-bold text-zinc-900">Mark Customer as No-show?</h3></div><p className="mt-3 text-sm leading-6 text-zinc-600">This records that the customer did not arrive. It adds 2 penalty points and applies a 1-day booking restriction, or a 1-month restriction if the customer reaches 3 points. This action is recorded in the penalty history.</p><label className="mt-4 block text-sm font-semibold">Record note<textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={3} className="mt-2 w-full rounded-xl border border-pink-200 p-3 font-normal"/></label><div className="mt-5 grid grid-cols-2 gap-3"><button type="button" disabled={busy} onClick={() => setConfirmOpen(false)} className="rounded-full border border-zinc-300 py-3 text-sm font-semibold">Cancel</button><button type="button" disabled={busy || reason.trim().length < 5} onClick={() => void markNoShow()} className="rounded-full bg-amber-600 py-3 text-sm font-bold text-white disabled:opacity-40">{busy ? "Saving…" : "Confirm No-show"}</button></div></div></div>}
  </div>;
}
