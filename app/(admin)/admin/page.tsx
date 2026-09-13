// Dashboard design refinement: clean service-focused layout.
// Also fixes the calendar/schedule timestamp glitch and keeps only
// Grooming (pink) and Boarding (blue) service colors.
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DashboardHeader from "@/components/admin/DashboardHeader";
import { fetchAppointments, type AppointmentRow } from "@/lib/supabase/appointment-management";
import { fetchProducts, fetchAllBatches } from "@/lib/supabase/products";

const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

const timeLabel = (value: string | null) => {
  if (!value) return "—";
  const m = value.match(/(?:T|\s)(\d{1,2}):(\d{2})/) || value.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return "—";
  const h = Number(m[1]), min = Number(m[2]);
  return `${String(h % 12 || 12).padStart(2,"0")}:${String(min).padStart(2,"0")} ${h >= 12 ? "PM" : "AM"}`;
};

const money = (n:number) => `₱${n.toLocaleString("en-PH",{minimumFractionDigits:0,maximumFractionDigits:2})}`;

type ServiceType = "grooming" | "boarding";
const dot:Record<ServiceType,string> = { grooming:"bg-brand-pink", boarding:"bg-sky-400" };
const tint:Record<ServiceType,string> = { grooming:"bg-brand-tint text-brand-pink", boarding:"bg-sky-50 text-sky-600" };
const serviceOf = (a:AppointmentRow):ServiceType => a.service_type === "boarding" ? "boarding" : "grooming";

function CalendarIcon(){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M8 2.5v4M16 2.5v4M3 9h18" strokeLinecap="round"/></svg>}
function PawIcon(){return <svg viewBox="0 0 32 32" fill="currentColor" className="h-5 w-5"><circle cx="9" cy="9" r="4"/><circle cx="23" cy="9" r="4"/><circle cx="6" cy="18" r="3.5"/><circle cx="26" cy="18" r="3.5"/><path d="M16 13c-5 0-8 4-8 8 0 4 3 6 8 6s8-2 8-6c0-4-3-8-8-8Z"/></svg>}

export default function AdminDashboardPage(){
 const [appointments,setAppointments]=useState<AppointmentRow[]>([]);
 const [products,setProducts]=useState<any[]>([]);
 const [batches,setBatches]=useState<any[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState<string|null>(null);
 const [month,setMonth]=useState(()=>{const d=new Date();return new Date(d.getFullYear(),d.getMonth(),1)});
 const [selectedDay,setSelectedDay]=useState<string|null>(null);

 const load=useCallback(async()=>{
  const [a,p,b]=await Promise.all([fetchAppointments(),fetchProducts({activeOnly:true}),fetchAllBatches()]);
  setAppointments(a.rows);setProducts(p.products);setBatches(b.batches);setError(a.error||p.error||b.error||null);setLoading(false);
 },[]);
 useEffect(()=>{void load();const t=window.setInterval(()=>void load(),30000);return()=>window.clearInterval(t)},[load]);

 const today=dateKey(new Date());
 const active=useMemo(()=>appointments.filter(a=>a.status!=="cancelled"),[appointments]);
 const todayRows=useMemo(()=>active.filter(a=>a.scheduled_date===today),[active,today]);
 const pending=appointments.filter(a=>a.status==="pending").length;
 const groomingToday=todayRows.filter(a=>serviceOf(a)==="grooming").length;
 const boardingToday=todayRows.filter(a=>serviceOf(a)==="boarding").length;
 const todayRevenue=todayRows.filter(a=>a.status==="completed").reduce((s,a)=>s+Number(a.total_amount||0),0);
 const prefix=`${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,"0")}`;
 const monthRevenue=active.filter(a=>a.status==="completed"&&a.scheduled_date.startsWith(prefix)).reduce((s,a)=>s+Number(a.total_amount||0),0);

 const lowStock=useMemo(()=>{
  const stock=new Map<string,number>();
  for(const b of batches) stock.set(b.product_id,(stock.get(b.product_id)||0)+Number(b.quantity||0));
  return products.map(p=>({id:p.id,name:p.name,remaining:stock.get(p.id)||0,min:Number(p.min_stock||0)}))
   .filter(p=>p.remaining<=p.min).sort((a,b)=>a.remaining-b.remaining).slice(0,5);
 },[products,batches]);

 const events=useMemo(()=>{
  const map:Record<string,{type:ServiceType,time:string,pet:string,service:string}[]>={};
  for(const a of active){
   const type=serviceOf(a), pet=a.pets[0], list=(map[a.scheduled_date] ||= []);
   list.push({type,time:timeLabel(a.scheduled_time||a.drop_off_at||a.pick_up_at),pet:pet?.name||a.owner_name,
    service:type==="boarding"?(pet?.packagePricingLabel||"Boarding"):(pet?.packageName||"Grooming")});
  }
  Object.values(map).forEach(list=>list.sort((a,b)=>a.time.localeCompare(b.time)));
  return map;
 },[active]);

 const schedule=useMemo(()=>todayRows.map(a=>({
  id:a.id,time:timeLabel(a.scheduled_time||a.drop_off_at||a.pick_up_at),
  pet:a.pets.map(p=>p.name).join(", ")||a.owner_name,service:serviceOf(a),status:a.status,
  title:serviceOf(a)==="boarding"?(a.pick_up_at?"Boarding Pickup":"Boarding Check-in"):"Grooming Appointment"
 })).sort((a,b)=>a.time.localeCompare(b.time)).slice(0,8),[todayRows]);

 const cells=useMemo(()=>{
  const first=new Date(month.getFullYear(),month.getMonth(),1),days=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
  const out:{key:string,day:number,muted:boolean}[]=[];
  for(let i=first.getDay()-1;i>=0;i--){const d=new Date(month.getFullYear(),month.getMonth(),-i);out.push({key:dateKey(d),day:d.getDate(),muted:true})}
  for(let d=1;d<=days;d++){const x=new Date(month.getFullYear(),month.getMonth(),d);out.push({key:dateKey(x),day:d,muted:false})}
  while(out.length<42){const d=new Date(month.getFullYear(),month.getMonth()+1,out.length-days-first.getDay()+1);out.push({key:dateKey(d),day:d.getDate(),muted:true})}
  return out;
 },[month]);

 if(loading)return <div className="py-16 text-center text-sm text-zinc-400">Loading dashboard…</div>;

 return <div className="flex flex-col gap-4 pb-5">
  <DashboardHeader/>
  {error&&<div className="rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-xs text-red-600">Some dashboard data could not be loaded: {error}</div>}

  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
   <Link href="/admin/appointments" className="group"><div className="flex min-h-[86px] items-center gap-3 rounded-2xl border border-pink-100 bg-white px-4 shadow-sm hover:shadow-md">
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand-pink"><CalendarIcon/></div>
    <div><p className="text-[11px] text-zinc-400">Today’s Appointments</p><p className="text-2xl font-bold text-zinc-900">{todayRows.length}</p></div><span className="ml-auto text-xl text-zinc-300 group-hover:text-brand-pink">›</span>
   </div></Link>
   <div className="flex min-h-[86px] items-center gap-3 rounded-2xl border border-pink-100 bg-white px-4 shadow-sm">
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-tint font-bold text-brand-pink">₱</div>
    <div><p className="text-[11px] text-zinc-400">This Month’s Revenue</p><p className="text-2xl font-bold text-zinc-900">{money(monthRevenue)}</p></div>
   </div>
   <div className="flex min-h-[86px] items-center gap-3 rounded-2xl border border-pink-100 bg-white px-4 shadow-sm">
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-brand-pink"><PawIcon/></div>
    <div><p className="text-[11px] text-zinc-400">Grooming Today</p><p className="text-2xl font-bold text-zinc-900">{groomingToday}</p></div>
   </div>
   <Link href="/admin/appointments" className="group"><div className="flex min-h-[86px] items-center gap-3 rounded-2xl border border-pink-100 bg-white px-4 shadow-sm">
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 font-bold text-sky-600">⌂</div>
    <div><p className="text-[11px] text-zinc-400">Boarding Today</p><p className="text-2xl font-bold text-zinc-900">{boardingToday}</p></div><span className="ml-auto text-xl text-zinc-300 group-hover:text-sky-500">›</span>
   </div></Link>
  </div>

  <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
   <section className="rounded-2xl border border-pink-100 bg-white p-4 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3">
     <div><h3 className="text-base font-bold text-zinc-800">Appointment Calendar</h3><p className="text-[11px] text-zinc-400">Click a date to view appointments</p></div>
     <div className="flex items-center gap-1 rounded-xl border border-zinc-100 bg-zinc-50 p-1">
      <button onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))} className="h-8 w-8 rounded-lg text-zinc-500 hover:bg-white hover:text-brand-pink">‹</button>
      <span className="min-w-[125px] text-center text-xs font-semibold text-zinc-700">{month.toLocaleDateString("en-US",{month:"long",year:"numeric"})}</span>
      <button onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))} className="h-8 w-8 rounded-lg text-zinc-500 hover:bg-white hover:text-brand-pink">›</button>
     </div>
    </div>
    <div className="mt-4 grid grid-cols-7 border-b border-zinc-100 text-center">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=><span key={d} className="pb-2 text-[10px] font-semibold text-zinc-400">{d}</span>)}</div>
    <div className="mt-1 grid grid-cols-7 gap-1">
     {cells.map(c=>{const es=events[c.key]||[],g=es.some(e=>e.type==="grooming"),b=es.some(e=>e.type==="boarding"),sel=selectedDay===c.key;
      return <button key={c.key} disabled={c.muted} onClick={()=>!c.muted&&setSelectedDay(es.length?c.key:null)} className={`min-h-[52px] rounded-xl text-xs ${c.muted?"text-zinc-200":"hover:bg-zinc-50"} ${sel?"bg-brand-tint font-bold text-brand-pink ring-1 ring-pink-200":"text-zinc-600"}`}>
       <span>{c.day}</span>{es.length>0&&<span className="mt-1 flex justify-center gap-1">{g&&<i className={`h-1.5 w-1.5 rounded-full ${dot.grooming}`}/>} {b&&<i className={`h-1.5 w-1.5 rounded-full ${dot.boarding}`}/>}</span>}
      </button>
     })}
    </div>
    <div className="mt-3 flex justify-center gap-5 border-t border-zinc-100 pt-3 text-[10px] text-zinc-500">
     <span><i className={`mr-1.5 inline-block h-2 w-2 rounded-full ${dot.grooming}`}/>Grooming</span>
     <span><i className={`mr-1.5 inline-block h-2 w-2 rounded-full ${dot.boarding}`}/>Boarding</span>
    </div>
    {selectedDay&&<div className="mt-3 rounded-xl border border-zinc-100 bg-zinc-50 p-3">
     <div className="mb-2 flex justify-between"><b className="text-xs">Schedule · {selectedDay}</b><button onClick={()=>setSelectedDay(null)} className="text-[11px] text-zinc-400">Close</button></div>
     {events[selectedDay]?.length?<div className="space-y-1">{events[selectedDay].map((e,i)=><div key={`${e.pet}-${i}`} className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-2 text-xs">
      <i className={`h-2 w-2 shrink-0 rounded-full ${dot[e.type]}`}/><span className="w-[66px] shrink-0 text-zinc-500">{e.time}</span><b className="min-w-0 truncate">{e.pet}</b><span className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] ${tint[e.type]}`}>{e.service}</span>
     </div>)}</div>:<p className="py-2 text-center text-xs text-zinc-400">No appointments for this date.</p>}
    </div>}
   </section>

   <div className="flex flex-col gap-4">
    <section className="rounded-2xl border border-pink-100 bg-white p-4 shadow-sm">
     <div className="flex items-center justify-between"><div><h3 className="text-base font-bold text-zinc-800">Today’s Schedule</h3><p className="text-[11px] text-zinc-400">{todayRows.length} appointments</p></div><Link href="/admin/appointments" className="text-[11px] font-semibold text-brand-pink">View All</Link></div>
     <div className="mt-3 divide-y divide-zinc-100">
      {schedule.length?schedule.map(x=><div key={x.id} className="flex items-center gap-2 py-2.5">
       <span className="w-[64px] shrink-0 text-[11px] font-semibold text-zinc-500">{x.time}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-zinc-800">{x.title} — {x.pet}</p><p className="mt-0.5 text-[10px] capitalize text-zinc-400">{x.status.replaceAll("_"," ")}</p></div>
       <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${tint[x.service]}`}>{x.service==="grooming"?"Grooming":"Boarding"}</span>
      </div>):<p className="py-8 text-center text-xs text-zinc-400">No appointments scheduled today.</p>}
     </div>
    </section>

    <section className="rounded-2xl border border-pink-100 bg-white p-4 shadow-sm">
     <div className="flex items-center justify-between"><div><h3 className="text-base font-bold text-zinc-800">Low Stock</h3><p className="text-[11px] text-zinc-400">Items that need attention</p></div><Link href="/admin/inventory" className="text-[11px] font-semibold text-brand-pink">Inventory</Link></div>
     <div className="mt-3 space-y-2">{lowStock.length?lowStock.map(x=><div key={x.id} className="flex items-center justify-between gap-3 rounded-xl bg-red-50/60 px-3 py-2"><span className="truncate text-xs font-medium">{x.name}</span><span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">{x.remaining} left</span></div>):<p className="py-5 text-center text-xs text-zinc-400">No low-stock products.</p>}</div>
    </section>
   </div>
  </div>

  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
   <section className="rounded-2xl border border-pink-100 bg-white p-4 shadow-sm">
    <div className="flex items-center justify-between"><h3 className="text-base font-bold text-zinc-800">Today’s Services</h3><span className="text-[11px] text-zinc-400">{todayRows.length} total</span></div>
    <div className="mt-3 grid grid-cols-2 gap-3">
     <div className="rounded-2xl bg-brand-tint p-4"><p className="text-xs font-semibold text-brand-pink">Grooming</p><p className="mt-1 text-2xl font-bold">{groomingToday}</p><p className="text-[10px] text-zinc-400">appointments today</p></div>
     <div className="rounded-2xl bg-sky-50 p-4"><p className="text-xs font-semibold text-sky-600">Boarding</p><p className="mt-1 text-2xl font-bold">{boardingToday}</p><p className="text-[10px] text-zinc-400">appointments today</p></div>
    </div>
   </section>
   <section className="rounded-2xl border border-pink-100 bg-white p-4 shadow-sm">
    <div className="flex items-center justify-between"><h3 className="text-base font-bold text-zinc-800">Service Revenue</h3><span className="text-[11px] text-zinc-400">Selected month</span></div>
    <div className="mt-3 flex items-end justify-between gap-4"><div><p className="text-2xl font-bold">{money(monthRevenue)}</p><p className="mt-1 text-[10px] text-zinc-400">Completed service revenue</p></div><div className="rounded-xl bg-brand-tint px-3 py-2 text-right"><p className="text-[10px] text-brand-pink">Today</p><p className="text-sm font-bold text-brand-pink">{money(todayRevenue)}</p></div></div>
   </section>
  </div>

  <div className="rounded-2xl border border-pink-100 bg-white p-4 shadow-sm">
   <div className="flex items-center justify-between"><div><h3 className="text-base font-bold text-zinc-800">Appointment Status</h3><p className="text-[10px] text-zinc-400">Current booking summary</p></div><span className="rounded-full bg-brand-tint px-3 py-1 text-[10px] font-semibold text-brand-pink">{pending} pending</span></div>
   <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
    {(["pending","confirmed","checked_in","completed"] as const).map(s=><div key={s} className="rounded-xl bg-zinc-50 px-3 py-2"><p className="text-[10px] capitalize text-zinc-400">{s.replaceAll("_"," ")}</p><p className="text-lg font-bold">{appointments.filter(a=>a.status===s).length}</p></div>)}
   </div>
  </div>
 </div>;
}
