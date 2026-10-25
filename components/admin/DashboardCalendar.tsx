"use client";

import { useState } from "react";
import { calendarEvents, type CalendarEvent } from "@/lib/data/admin-mock";
import { useBookingClosures, manilaToday } from "@/lib/booking/use-booking-closures";

const weekdays=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
function serviceColor(service:string){return /boarding|kennel/i.test(service)?"bg-sky-400":"bg-brand-pink";}
export default function DashboardCalendar(){
  const closures=useBookingClosures();
  const [month,setMonth]=useState(()=>{const [y,m]=manilaToday().split("-").map(Number);return new Date(y,m-1,1);});
  const [selected,setSelected]=useState<string|null>(null);
  const year=month.getFullYear(),m=month.getMonth();
  const key=`${year}-${String(m+1).padStart(2,"0")}`;
  const offset=new Date(year,m,1).getDay(),num=new Date(year,m+1,0).getDate();
  const cells=Array.from({length:42},(_,i)=>i-offset+1);
  const selectedEvents=selected ? calendarEvents[Number(selected.slice(-2))]??[] : [];
  const selectedReason=closures.nameFor(selected);
  return <section className="flex h-full flex-col rounded-2xl border border-pink-100 bg-white p-4 shadow-sm">
    <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-brand-pink">Calendar</h3><span className="text-[11px] text-zinc-400">Shop closure dates marked in red</span></div>
    <div className="mt-3 flex items-center justify-between"><button type="button" aria-label="Previous month" onClick={()=>setMonth(new Date(year,m-1,1))} className="rounded-full px-2 py-1 text-zinc-500 hover:bg-pink-50">‹</button><p className="text-sm font-bold">{month.toLocaleDateString("en-PH",{month:"long",year:"numeric"})}</p><button type="button" aria-label="Next month" onClick={()=>setMonth(new Date(year,m+1,1))} className="rounded-full px-2 py-1 text-zinc-500 hover:bg-pink-50">›</button></div>
    <div className="mt-3 grid grid-cols-7 text-center">{weekdays.map(day=><span key={day} className="py-1 text-[10px] font-semibold text-zinc-400">{day}</span>)}</div>
    <div className="grid flex-1 grid-cols-7 grid-rows-6 gap-1">{cells.map((day,i)=>{
      const inside=day>=1&&day<=num;const date=inside?`${key}-${String(day).padStart(2,"0")}`:"";
      const closed=closures.nameFor(date);const events=inside?calendarEvents[day]??[]:[];
      return <button type="button" key={i} disabled={!inside} title={closed?`Closed: ${closed}`:date} onClick={()=>setSelected(date)} aria-label={closed?`${date} Closed: ${closed}`:date||"Outside month"}
        className={`flex min-h-8 flex-col items-center justify-center rounded-lg text-[11px] ${closed?"border border-rose-200 bg-rose-50 font-semibold text-rose-700":inside?"text-zinc-700 hover:bg-pink-50":"text-zinc-200"}`}>
        {inside?day:""}{closed?<span className="text-[8px] font-bold text-rose-600">Closed</span>:events.length>0?<span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${serviceColor(events[0].service)}`}/>:null}
      </button>})}</div>
    {closures.error&&<p role="alert" className="mt-2 text-xs text-rose-600">Calendar unavailable: {closures.error}</p>}
    <p className="mt-2 border-t border-pink-100 pt-2 text-center text-[10px] text-zinc-500">Pink: Grooming · Blue: Boarding · Red: Closed</p>
    {selected&&<div role="presentation" className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4" onClick={()=>setSelected(null)}><section role="dialog" aria-modal="true" className="w-full max-w-sm overflow-hidden rounded-2xl bg-white" onClick={e=>e.stopPropagation()}><div className="flex items-center justify-between bg-brand-pink px-5 py-3 text-white"><h4 className="font-bold">{selected}</h4><button type="button" onClick={()=>setSelected(null)} aria-label="Close">✕</button></div><div className="max-h-80 space-y-3 overflow-y-auto p-5">{selectedReason&&<p className="rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-700">Closed — {selectedReason}</p>}{selectedEvents.length?selectedEvents.map((ev:CalendarEvent,i)=><div key={i} className="flex gap-3 text-sm"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${serviceColor(ev.service)}`}/><div><b>{ev.time} · {ev.petName}</b><p className="text-xs text-zinc-500">{ev.service}</p></div></div>):<p className="text-sm text-zinc-500">No displayed schedule events for this day.</p>}</div></section></div>}
  </section>;
}
