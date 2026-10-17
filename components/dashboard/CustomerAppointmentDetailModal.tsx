"use client";

import { useEffect, useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import { fetchAppointmentDetail, type AppointmentRow } from "@/lib/supabase/appointment-management";
import { cancelCustomerAppointment } from "@/lib/supabase/customer-appointment-cancellation";
import type { AppointmentStatus, AppointmentServiceType } from "@/lib/types/appointments";

const statusStyles: Record<AppointmentStatus,string> = {
  pending:"bg-amber-100 text-amber-700", confirmed:"bg-sky-100 text-sky-700",
  checked_in:"bg-purple-100 text-purple-700",completed:"bg-green-100 text-green-700",
  cancelled:"bg-red-100 text-red-600"
};
const names: Record<AppointmentServiceType,string> = {
  dog_grooming:"Dog Grooming",cat_grooming:"Cat Grooming",boarding:"Boarding",ala_carte:"À La Carte"
};
const reasons = ["Change of plans", "Schedule conflict", "Pet is unwell", "Booked by mistake", "Other"] as const;

export default function CustomerAppointmentDetailModal({appointmentId,onClose,onCancelled}:{
  appointmentId:string;onClose:()=>void;onCancelled?:()=>void;
}) {
  const [row,setRow]=useState<AppointmentRow|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  const [stage,setStage]=useState<"details"|"reason"|"success">("details");
  const [reason,setReason]=useState<string>("");
  const [details,setDetails]=useState("");
  const [saving,setSaving]=useState(false);
  useEffect(()=>{
    let mounted=true;
    setLoading(true);setError(null);setStage("details");setReason("");setDetails("");
    void fetchAppointmentDetail(appointmentId).then(result=>{
      if(mounted){setRow(result.row);setError(result.error);setLoading(false);}
    });
    return ()=>{mounted=false};
  },[appointmentId]);
  useEffect(()=>{
    function onKey(event:KeyboardEvent){if(event.key==="Escape"&&!saving)onClose();}
    window.addEventListener("keydown",onKey);
    return ()=>window.removeEventListener("keydown",onKey);
  },[onClose,saving]);
  const cancellable=row&&!row.is_walk_in&&(row.status==="pending"||row.status==="confirmed");
  const effectiveReason=reason==="Other"?details.trim():reason;
  const reasonValid=effectiveReason.length>=5&&effectiveReason.length<=500;
  async function submit(){
    if(!row||!cancellable||!reasonValid||saving)return;
    setSaving(true);setError(null);
    const result=await cancelCustomerAppointment(row.id,effectiveReason);
    setSaving(false);
    if(result.error){setError(result.error);return;}
    setRow({...row,status:"cancelled"});setStage("success");onCancelled?.();
  }
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-3 sm:p-5" onMouseDown={e=>{if(e.target===e.currentTarget&&!saving)onClose();}}>
    <div role="dialog" aria-modal="true" aria-label={stage==="reason"?"Cancel appointment":"Appointment details"} className="flex max-h-[min(90dvh,780px)] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
      <header className="flex shrink-0 items-center justify-between border-b border-pink-100 px-5 py-4 sm:px-6">
        <h3 className="text-lg font-bold text-zinc-800">{stage==="reason"?"Cancel Appointment":stage==="success"?"Appointment Cancelled":"Appointment Details"}</h3>
        <button type="button" onClick={onClose} disabled={saving} aria-label="Close appointment dialog" title="Close" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-pink-100 bg-white text-zinc-600 transition hover:border-brand-pink hover:bg-pink-50 hover:text-brand-pink focus-visible:outline-2 focus-visible:outline-brand-pink disabled:opacity-40"><X size={20}/></button>
      </header>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
        {loading&&<p className="py-8 text-center text-sm text-zinc-500">Loading appointment…</p>}
        {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {!loading&&row&&stage==="details"&&<>
          <div className="flex items-start justify-between gap-3"><div><strong className="text-zinc-800">{names[row.service_type]}</strong><p className="mt-1 text-sm text-zinc-500">{row.drop_off_at?new Date(row.drop_off_at).toLocaleString("en-PH",{dateStyle:"medium",timeStyle:"short"}):`${row.scheduled_date}${row.scheduled_time?` · ${row.scheduled_time}`:""}`}</p>{row.pick_up_at&&<p className="mt-1 text-xs text-zinc-500">Pick-up: {new Date(row.pick_up_at).toLocaleString("en-PH",{dateStyle:"medium",timeStyle:"short"})}</p>}</div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[row.status]}`}>{row.status.replace("_"," ")}</span></div>
          <section className="space-y-3"><h4 className="text-xs font-bold uppercase tracking-wide text-zinc-500">{row.pets.length} {row.pets.length===1?"pet":"pets"}</h4>{row.pets.map(p=><div key={p.appointmentPetId} className="rounded-2xl border border-pink-100 bg-pink-50/40 p-3.5"><div className="flex items-start justify-between gap-2"><div><p className="text-sm font-bold text-zinc-800">{p.name}</p><p className="text-xs text-zinc-500">{p.breed} · {p.size_label}</p></div><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusStyles[p.status]}`}>{p.status.replace("_"," ")}</span></div><div className="mt-2 space-y-1 text-xs text-zinc-600">{p.packageName&&<p>Package: {p.packageName}{p.packagePricingLabel?` (${p.packagePricingLabel})`:""}</p>}{p.addonNames.length>0&&<p>Add-ons: {p.addonNames.join(", ")}</p>}{p.groomerName&&<p>Groomer: {p.groomerName}</p>}{p.kennelLabel&&<p>Kennel: {p.kennelLabel}</p>}</div><p className="mt-2 text-sm font-bold text-brand-pink">₱{p.lineAmount.toFixed(2)}</p></div>)}</section>
          {row.special_requests&&<section><p className="text-xs font-semibold text-zinc-500">Special requests</p><p className="mt-1 whitespace-pre-wrap break-words text-sm text-zinc-700">{row.special_requests}</p></section>}
          <div className="flex items-center justify-between border-t border-pink-100 pt-4"><span className="text-sm font-semibold text-zinc-600">Total Amount</span><strong className="text-lg text-brand-pink">₱{row.total_amount.toFixed(2)}</strong></div>
          {!cancellable&&<p className="rounded-xl bg-zinc-50 p-3 text-xs text-zinc-500">Cancellation is available only for pending or confirmed online appointments, before check-in.</p>}
        </>}
        {stage==="reason"&&<>
          <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3"><AlertTriangle className="shrink-0 text-amber-700" size={20}/><p className="text-sm text-amber-900">Cancelling this appointment affects every pet included in it. This action cannot be undone. Please tell us why you need to cancel.</p></div>
          <label className="block text-sm font-semibold text-zinc-700">Reason for cancellation <span className="text-red-600">*</span><select value={reason} onChange={e=>{setReason(e.target.value);setError(null)}} className="mt-2 w-full rounded-xl border border-pink-200 bg-white p-3 text-sm"><option value="">Select a reason</option>{reasons.map(r=><option key={r} value={r}>{r}</option>)}</select></label>
          {reason==="Other"&&<label className="block text-sm font-semibold text-zinc-700">Please describe your reason <span className="text-red-600">*</span><textarea maxLength={500} rows={3} value={details} onChange={e=>setDetails(e.target.value)} className="mt-2 w-full rounded-xl border border-pink-200 p-3 text-sm" placeholder="Enter at least 5 characters"/></label>}
          <p className="text-xs text-zinc-500">Your reason will be saved for HappyTails staff records.</p>
        </>}
        {stage==="success"&&<div role="status" className="py-8 text-center"><p className="text-4xl">✓</p><p className="mt-3 text-lg font-bold text-zinc-800">Your appointment was cancelled</p><p className="mt-2 text-sm text-zinc-500">The cancellation and reason have been recorded.</p></div>}
      </div>
      {!loading&&row&&<footer className="shrink-0 border-t border-pink-100 px-5 py-4 sm:px-6">
        {stage==="details"&&cancellable&&<button type="button" onClick={()=>{setStage("reason");setError(null)}} className="w-full rounded-full border-2 border-red-400 px-4 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50">Cancel Appointment</button>}
        {stage==="reason"&&<div className="flex gap-3"><button type="button" onClick={()=>{setStage("details");setError(null)}} disabled={saving} className="flex-1 rounded-full border-2 border-zinc-200 py-3 text-sm font-semibold text-zinc-700">Go Back</button><button type="button" disabled={!reasonValid||saving} onClick={()=>void submit()} className="flex-1 rounded-full bg-red-600 py-3 text-sm font-bold text-white disabled:opacity-40">{saving?"Cancelling…":"Confirm Cancellation"}</button></div>}
        {stage==="success"&&<button type="button" onClick={onClose} className="w-full rounded-full bg-brand-pink py-3 text-sm font-semibold text-white">Done</button>}
      </footer>}
    </div>
  </div>;
}
