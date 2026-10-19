"use client";
import { useEffect, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { checkGroomerTimeConflict } from "@/lib/supabase/appointments";
import { useBookingClosures, manilaToday, manilaTime, ClosureNotice } from "@/lib/booking/use-booking-closures";
import type { DraftPetSelection } from "@/lib/types/appointments";
import type { Customer } from "@/lib/types/users";
import type { Groomer } from "@/lib/types/pet-services";
const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const slots = Array.from({ length: 18 }, (_, i) => { const t = 540 + i * 30; return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`; });
function key(y:number,m:number,d:number) {return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;}
function timeLabel(v:string) { const [h,m]=v.split(":").map(Number);return `${h%12||12}:${String(m).padStart(2,"0")} ${h>=12?"PM":"AM"}`; }
export default function CustomerGroomingScheduleStep({customer,ownerContact,petSelections,groomers,scheduledDate,scheduledTime,specialRequests,onDateChange,onTimeChange,onRequestsChange,onBack,onConfirmed}: {
 customer:Customer|null;ownerContact:string;petSelections:DraftPetSelection[];groomers:Groomer[];scheduledDate:string|null;scheduledTime:string|null;specialRequests:string;
 onDateChange:(v:string)=>void;onTimeChange:(v:string)=>void;onRequestsChange:(v:string)=>void;onBack:()=>void;onConfirmed:()=>void;
}) {
 const closures=useBookingClosures();
 
 const today=manilaToday();
 const [month,setMonth]=useState(()=>{const p=(scheduledDate??today).split("-").map(Number);return new Date(p[0],p[1]-1,1)});
 const [checking,setChecking]=useState(false),[error,setError]=useState<string|null>(null),[confirmed,setConfirmed]=useState(false);
 const first=new Date(month.getFullYear(),month.getMonth(),1).getDay();
 const monthDays=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
 const cells=Array.from({length:Math.ceil((first+monthDays)/7)*7},(_,i)=>i-first+1);
 const todayMonth=new Date(`${today}T12:00:00`);
 const currentMonth=month.getFullYear()===todayMonth.getFullYear()&&month.getMonth()===todayMonth.getMonth();
 const closedName=closures.nameFor(scheduledDate);
 const past=(date:string|null,slot:string)=>!date||date<today||(date===today&&slot<=manilaTime());
 const ids=Array.from(new Set(petSelections.map(s=>s.groomerId).filter(Boolean))) as string[];
 useEffect(()=>{if(scheduledDate&&closures.nameFor(scheduledDate))onTimeChange("");},[scheduledDate,closures.dates]); // eslint-disable-line react-hooks/exhaustive-deps
 async function verify(){
  if(!scheduledDate||!scheduledTime||checking)return;
  setChecking(true);setError(null);
  try {
   const block=await closures.verifyOpen(scheduledDate);if(block){setError(block);onTimeChange("");return;}
   if(past(scheduledDate,scheduledTime)){setError("This time has already passed. Select a future slot.");onTimeChange("");return;}
   for(const id of ids){const r=await checkGroomerTimeConflict(id,scheduledDate,scheduledTime,customer?.id??null,ownerContact);
    if(r.error){setError(`Couldn't verify availability: ${r.error}`);return;}
    if(r.conflict){setError(`${groomers.find(g=>g.id===id)?.name??"The selected groomer"} already has this customer booked at ${timeLabel(scheduledTime)}. Choose another time.`);return;}}
   setConfirmed(true);
  } finally {setChecking(false)}
 }
 if(confirmed&&scheduledDate&&scheduledTime)return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true"><div className="w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-2xl"><Check className="mx-auto text-emerald-600" size={38}/><h2 className="mt-4 text-xl font-bold">Schedule selected</h2><p className="mt-2 text-sm text-zinc-500">{scheduledDate} at {timeLabel(scheduledTime)}</p><button type="button" onClick={onConfirmed} className="mt-6 w-full rounded-full bg-brand-pink py-3 font-semibold text-white">Continue to More Services</button></div></div>;
 return <section className="ht-calendar-booking mx-auto max-w-4xl">
  <header className="text-center"><CalendarDays className="mx-auto text-brand-pink"/><h2 className="mt-3 text-2xl font-bold">Choose Your Schedule</h2><p className="mt-1 text-sm text-zinc-500">Holiday and closure dates cannot be booked.</p></header>
  <p className="mt-5 rounded-xl border border-pink-100 bg-pink-50 px-4 py-3 text-center text-xs text-zinc-600">Regular hours: 9:00 AM–6:00 PM (Philippine time), except holidays and closures.</p>
  {closures.error&&<p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">Could not load holiday closures: {closures.error}</p>}
  <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
   <div className="rounded-2xl border border-pink-100 bg-white p-4 sm:p-5">
    <div className="mb-5 flex items-center justify-between"><button type="button" aria-label="Previous month" disabled={currentMonth||month<new Date(todayMonth.getFullYear(),todayMonth.getMonth(),1)} onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))} className="rounded-full p-2 disabled:opacity-30"><ChevronLeft size={19}/></button><h3 className="font-bold">{month.toLocaleDateString("en-US",{month:"long",year:"numeric"})}</h3><button type="button" aria-label="Next month" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))} className="rounded-full p-2"><ChevronRight size={19}/></button></div>
    <div className="grid grid-cols-7 gap-1 text-center">{days.map(d=><span key={d} className="py-2 text-[11px] font-semibold text-slate-400">{d}</span>)}{cells.map((d,i)=>{const inMonth=d>0&&d<=monthDays;const date=inMonth?key(month.getFullYear(),month.getMonth(),d):"";const holiday=closures.nameFor(date);const disabled=!inMonth||date<today||!!holiday||closures.loading||!!closures.error;return <button key={i} type="button" title={holiday?`Closed: ${holiday}`:undefined} aria-label={holiday?`${date} — Closed: ${holiday}`:date||"Outside current month"} aria-pressed={date===scheduledDate} disabled={disabled} onClick={()=>{onDateChange(date);onTimeChange("");setError(null)}} className={`relative aspect-square rounded-xl text-sm font-medium ${holiday?"border border-rose-200 bg-rose-50 text-rose-500 line-through":date===scheduledDate?"bg-brand-pink text-white":disabled?"text-slate-300":"text-slate-700 hover:bg-pink-50"}`}>{inMonth?d:""}{holiday&&<span aria-hidden="true" className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-rose-500"/>}</button>})}</div>
    <p className="mt-3 text-xs text-rose-600">Red dates = public holiday or HappyTails closure (not bookable).</p>
    {closures.dates.filter(d=>d.date.startsWith(key(month.getFullYear(),month.getMonth(),1).slice(0,7))).map(d=><p key={d.date} className="mt-1 text-xs text-zinc-500"><span className="font-semibold text-rose-600">{d.date.slice(-2)}</span> — {d.name}</p>)}
   </div>
   <div className="rounded-2xl border border-pink-100 bg-white p-4"><h3 className="mb-3 flex items-center gap-2 text-sm font-bold"><Clock3 size={16} className="text-brand-pink"/>Time slots</h3><p className="mb-3 text-xs text-slate-500">{scheduledDate?"Choose a time for the selected date":"Select an open date first"}</p><div className="grid max-h-[300px] grid-cols-2 gap-2 overflow-y-auto lg:grid-cols-1">{slots.map(time=><button key={time} type="button" disabled={!scheduledDate||!!closedName||closures.loading||!!closures.error||past(scheduledDate,time)} aria-pressed={scheduledTime===time} onClick={()=>{onTimeChange(time);setError(null)}} className={`min-h-9 rounded-lg border px-2 py-2 text-xs font-semibold ${scheduledTime===time?"border-brand-pink bg-brand-pink text-white":"border-pink-100 text-slate-700 hover:border-brand-pink disabled:opacity-35"}`}>{timeLabel(time)}</button>)}</div></div>
  </div>
  {scheduledDate&&closedName&&<ClosureNotice date={scheduledDate} name={closedName}/>}
  <label className="mt-5 block text-sm font-semibold" htmlFor="ht-grooming-requests">Special requests / medical conditions / allergies / feeding instructions</label><textarea id="ht-grooming-requests" rows={3} value={specialRequests} onChange={e=>onRequestsChange(e.target.value)} className="mt-2 w-full rounded-xl border border-pink-100 px-4 py-3 text-sm"/>
  {error&&<p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
  <div className="mt-6 grid grid-cols-2 gap-3"><button type="button" onClick={onBack} className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-pink-200 font-semibold text-brand-pink"><ArrowLeft size={16}/>Back</button><button type="button" onClick={()=>void verify()} disabled={!scheduledDate||!scheduledTime||checking||closures.loading||!!closures.error||!!closedName||past(scheduledDate,scheduledTime)} className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-pink font-semibold text-white disabled:opacity-40">{checking?"Checking…":"Next"}<ArrowRight size={16}/></button></div>
 </section>;
}
