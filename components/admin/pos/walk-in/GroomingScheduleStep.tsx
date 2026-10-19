"use client";
import { useState } from "react";
import { checkGroomerTimeConflict } from "@/lib/supabase/appointments";
import { useBookingClosures, manilaToday, manilaTime, ClosureNotice } from "@/lib/booking/use-booking-closures";
import type { DraftPetSelection } from "@/lib/types/appointments";
import type { Customer } from "@/lib/types/users";
import type { Groomer } from "@/lib/types/pet-services";
const slots=Array.from({length:18},(_,i)=>{const n=540+i*30;return `${String(Math.floor(n/60)).padStart(2,"0")}:${String(n%60).padStart(2,"0")}`});
function timeLabel(v:string){const[h,m]=v.split(":").map(Number);return `${h%12||12}:${String(m).padStart(2,"0")} ${h>=12?"PM":"AM"}`;}
function longDate(v:string){return new Date(`${v}T12:00:00`).toLocaleDateString("en-PH",{weekday:"long",month:"long",day:"numeric",year:"numeric"});}
export default function GroomingScheduleStep({customer,ownerContact,petSelections,groomers,scheduledDate,scheduledTime,specialRequests,onDateChange,onTimeChange,onRequestsChange,onBack,onConfirmed}:{customer:Customer|null;ownerContact:string;petSelections:DraftPetSelection[];groomers:Groomer[];scheduledDate:string|null;scheduledTime:string|null;specialRequests:string;onDateChange:(date:string)=>void;onTimeChange:(time:string)=>void;onRequestsChange:(text:string)=>void;onBack:()=>void;onConfirmed:()=>void}){
 const closures=useBookingClosures();const [checking,setChecking]=useState(false),[error,setError]=useState<string|null>(null),[confirmed,setConfirmed]=useState(false);
 const today=manilaToday(),closedName=closures.nameFor(scheduledDate);
 const past=!!scheduledDate&&(scheduledDate<today||(scheduledDate===today&&!!scheduledTime&&scheduledTime<=manilaTime()));
 const groomerIds=Array.from(new Set(petSelections.map(s=>s.groomerId).filter(Boolean))) as string[];
 async function handleConfirm(){if(!scheduledDate||!scheduledTime||checking)return;setChecking(true);setError(null);try{
  const block=await closures.verifyOpen(scheduledDate);if(block){setError(block);onTimeChange("");return;}
  if(scheduledDate<manilaToday()||(scheduledDate===manilaToday()&&scheduledTime<=manilaTime())){setError("Choose a future date and time.");return;}
  for(const id of groomerIds){const r=await checkGroomerTimeConflict(id,scheduledDate,scheduledTime,customer?.id??null,ownerContact);if(r.error){setError(`Couldn't verify availability: ${r.error}`);return;}if(r.conflict){setError(`${groomers.find(g=>g.id===id)?.name??"The groomer"} already has this customer booked at ${timeLabel(scheduledTime)}. Pick another time.`);return;}}
  setConfirmed(true);
 }finally{setChecking(false)}}
 if(confirmed&&scheduledDate&&scheduledTime)return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"><div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center"><h3 className="text-lg font-bold">Appointment Scheduled</h3><p className="mt-2 text-sm text-zinc-500">{longDate(scheduledDate)} at {timeLabel(scheduledTime)}</p><button onClick={onConfirmed} className="mt-5 w-full rounded-full bg-brand-pink py-3 font-semibold text-white">Continue to Summary</button></div></div>;
 return <div className="mx-auto max-w-xl"><h2 className="text-center text-2xl font-bold text-brand-pink">Scheduled Appointment</h2><p className="mt-1 text-center text-sm text-zinc-500">Set the date and time for this visit.</p>
  <p className="mt-5 rounded-xl border border-pink-100 p-3 text-center text-xs text-zinc-600">Regular hours: 9:00 AM–6:00 PM (Philippine time), excluding holidays and closures.</p>
  {closures.error&&<p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">Unable to load holidays: {closures.error}</p>}
  <div className="mt-6"><label className="text-sm font-semibold text-zinc-700">Appointment Date *</label><input type="date" min={today} value={scheduledDate??""} onChange={e=>{const date=e.target.value;onDateChange(date);onTimeChange("");setError(closures.nameFor(date)?`Closed — ${closures.nameFor(date)}. Choose another date.`:null)}} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm"/></div>
  {scheduledDate&&closedName&&<ClosureNotice date={scheduledDate} name={closedName}/>}
  {closures.dates.length>0&&<details className="mt-3 rounded-xl border border-pink-100 p-3 text-xs text-zinc-600"><summary className="cursor-pointer font-semibold text-brand-pink">View holiday & closure dates</summary><ul className="mt-2 max-h-44 space-y-1 overflow-y-auto">{closures.dates.filter(d=>d.date>=today).map(d=><li key={d.date}>{d.date} — {d.name}</li>)}</ul></details>}
  <div className="mt-4"><label className="text-sm font-semibold text-zinc-700">Time *</label><div className="mt-2 grid max-h-48 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">{slots.map(slot=><button key={slot} type="button" disabled={!scheduledDate||!!closedName||closures.loading||!!closures.error||(scheduledDate===today&&slot<=manilaTime())} onClick={()=>{onTimeChange(slot);setError(null)}} className={`rounded-lg border-2 px-2 py-2 text-xs font-semibold ${scheduledTime===slot?"border-brand-pink bg-brand-pink text-white":"border-pink-200 text-zinc-600 hover:border-brand-pink disabled:opacity-35"}`}>{timeLabel(slot)}</button>)}</div></div>
  <div className="mt-4"><label className="text-sm font-semibold text-zinc-700">Special Requests / Medical Conditions / Allergies / Feeding Instruction</label><textarea rows={3} value={specialRequests} onChange={e=>onRequestsChange(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"/></div>
  {error&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
  <div className="mt-6 flex gap-3"><button type="button" onClick={onBack} className="flex-1 rounded-full border-2 border-zinc-300 py-3 font-semibold text-zinc-500">Back</button><button type="button" onClick={()=>void handleConfirm()} disabled={!scheduledDate||!scheduledTime||checking||closures.loading||!!closures.error||!!closedName||past} className="flex-1 rounded-full bg-brand-pink py-3 font-semibold text-white disabled:opacity-40">{checking?"Checking…":"Next"}</button></div>
 </div>;
}
