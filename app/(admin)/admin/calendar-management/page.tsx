"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { addExceptionalClosure, deleteExceptionalClosure, fetchBookingClosedDates, setHolidayOpen, type BookingClosedDate } from "@/lib/supabase/booking-closures";
import { manilaToday } from "@/lib/booking/use-booking-closures";
import { createClient } from "@/lib/supabase/client";

type Confirmation = { date:string; title:string; detail:string; action:"open"|"close"|"remove" };
export default function CalendarManagementPage(){
  const [allowed,setAllowed]=useState<boolean|null>(null);
  const [dates,setDates]=useState<BookingClosedDate[]>([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [notice,setNotice]=useState<string|null>(null);
  const [selected,setSelected]=useState<string|null>(null);
  const [reason,setReason]=useState("");
  const [confirm,setConfirm]=useState<Confirmation|null>(null);
  const [month,setMonth]=useState(()=>{const [y,m]=manilaToday().split("-").map(Number);return new Date(y,m-1,1);});
  const refresh=useCallback(async()=>{
    const result=await fetchBookingClosedDates();
    if(result.error){setError(result.error);}else{setDates(result.dates);setError(null);}
    setLoading(false);
  },[]);
  useEffect(()=>{let alive=true;void (async()=>{
    const {data:{user}}=await createClient().auth.getUser();
    if(!user){if(alive){setAllowed(false);setLoading(false);}return;}
    const {data}=await createClient().from("profiles").select("role").eq("id",user.id).maybeSingle();
    if(!alive)return;
    setAllowed(data?.role==="superadmin");
    if(data?.role==="superadmin")await refresh();else setLoading(false);
  })();return()=>{alive=false;};},[refresh]);
  const key=`${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,"0")}`;
  const first=new Date(month.getFullYear(),month.getMonth(),1).getDay();
  const total=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
  const cells=Array.from({length:Math.ceil((first+total)/7)*7},(_,i)=>i-first+1);
  const byDate=useMemo(()=>new Map(dates.map(d=>[d.date,d])),[dates]);
  const current=selected?byDate.get(selected):undefined;
  const isHoliday=current?.category==="regular_holiday"||current?.category==="special_non_working";
  const closed=current && !current.is_open_override;
  async function execute(action:Confirmation){
    if(busy)return;
    setBusy(true);setError(null);setNotice(null);
    const failure=action.action==="remove"?await deleteExceptionalClosure(action.date):await setHolidayOpen(action.date,action.action==="open");
    if(failure)setError(failure);else{setNotice(`${action.date}: Calendar updated.`);await refresh();}
    setConfirm(null);setBusy(false);
  }
  async function add(){
    if(!selected||reason.trim().length<2||busy)return;
    setBusy(true);setError(null);setNotice(null);
    const failure=await addExceptionalClosure(selected,reason);
    if(failure)setError(failure);else{setNotice(`${selected}: Closed date added.`);setReason("");await refresh();}
    setBusy(false);
  }
  if(loading||allowed===null)return <p className="p-6 text-sm text-zinc-500">Loading calendar…</p>;
  if(!allowed)return <p role="alert" className="rounded-xl bg-rose-50 p-5 text-rose-700">Calendar Management is for Superadmin accounts only.</p>;
  return <main className="mx-auto max-w-6xl space-y-5 pb-16">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="flex items-center gap-2 text-2xl font-bold text-brand-pink"><CalendarDays/> Calendar Management</h1><p className="mt-1 text-sm text-zinc-600">Manage store day-offs, closures, and holiday opening overrides for every booking flow.</p></div>
      <Link href="/admin/pet-services/grooming" className="rounded-full border border-pink-200 bg-white px-4 py-2 text-sm font-semibold text-brand-pink hover:bg-pink-50">Manage Groomers</Link>
    </header>
    {error&&<p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {notice&&!error&&<p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="rounded-2xl border border-pink-100 bg-white p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3"><button type="button" aria-label="Previous month" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))} className="rounded-full p-2 hover:bg-pink-50"><ChevronLeft size={20}/></button>
          <h2 className="text-lg font-bold">{month.toLocaleDateString("en-PH",{month:"long",year:"numeric"})}</h2><button type="button" aria-label="Next month" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))} className="rounded-full p-2 hover:bg-pink-50"><ChevronRight size={20}/></button></div>
        <div className="grid grid-cols-7 gap-1.5 text-center">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=><span key={d} className="py-2 text-xs font-semibold text-zinc-400">{d}</span>)}
          {cells.map((day,i)=>{const date=day>0&&day<=total?`${key}-${String(day).padStart(2,"0")}`:"";const row=byDate.get(date);const unavailable=!!row&&!row.is_open_override;
            return <button key={i} type="button" disabled={!date} onClick={()=>{setSelected(date);setError(null);setNotice(null);}} aria-pressed={selected===date}
              title={row?`${unavailable?"Closed":"Open"}: ${row.name}`:undefined}
              className={`flex min-h-16 flex-col items-center justify-center rounded-xl border p-1 text-sm font-semibold ${unavailable?"border-rose-200 bg-rose-50 text-rose-700":row?.is_open_override?"border-emerald-200 bg-emerald-50 text-emerald-700":selected===date?"border-brand-pink bg-pink-50 text-brand-pink":"border-transparent text-zinc-700 hover:bg-pink-50"} ${selected===date?"ring-2 ring-brand-pink ring-offset-1":""}`}>
              {date?day:""}{row&&<span className="mt-1 text-[9px] leading-none">{unavailable?"Closed":"Open"}</span>}
            </button>})}
        </div><p className="mt-4 text-xs text-zinc-500">Red: closed for booking · Green: holiday opened by Superadmin · Select any date to manage it.</p>
      </section>
      <aside className="space-y-3 rounded-2xl border border-pink-100 bg-white p-5">
        <h2 className="font-bold text-zinc-800">{selected?`Date: ${selected}`:"Select a date"}</h2>
        {!selected?<p className="text-sm text-zinc-500">Choose a date on the calendar to manage availability.</p>:<>
          {current?<div className={`rounded-xl border p-3 ${closed?"border-rose-200 bg-rose-50":"border-emerald-200 bg-emerald-50"}`}><p className="text-sm font-bold">{closed?"Closed":"Open for booking"}</p><p className="mt-1 text-sm">{current.name}</p><p className="mt-1 text-xs text-zinc-500">{current.category==="exceptional_closure"?"Custom shop closure":"Official Philippine holiday"}</p></div>:<p className="text-sm text-emerald-700">This date is open for bookings.</p>}
          {isHoliday?<><p className="text-xs text-zinc-600">Holiday overrides are reversible. Holiday information is kept in the database.</p>
            <button type="button" disabled={busy} onClick={()=>setConfirm({date:selected,title:closed?"Open on this holiday?":"Close on this holiday?",detail:closed?"New appointments will be allowed on this official holiday.":"New appointments will be blocked for this holiday.",action:closed?"open":"close"})} className={`w-full rounded-full px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${closed?"bg-emerald-600":"bg-brand-pink"}`}>{closed?"Allow bookings on holiday":"Close for holiday"}</button></>
            :current?.category==="exceptional_closure"?<button type="button" disabled={busy} onClick={()=>setConfirm({date:selected,title:"Remove custom closure?",detail:"New bookings will be allowed on this date. Existing appointments will not change.",action:"remove"})} className="w-full rounded-full border border-rose-300 px-4 py-2.5 text-sm font-semibold text-rose-700 disabled:opacity-50">Remove closure / Reopen</button>
            :<><label className="block text-xs font-semibold text-zinc-600">Reason for shop closure<input value={reason} maxLength={160} onChange={e=>setReason(e.target.value)} placeholder="Day off, equipment maintenance…" className="mt-2 w-full rounded-xl border border-pink-200 px-3 py-2.5 text-sm"/></label>
              <button type="button" disabled={busy||reason.trim().length<2} onClick={()=>void add()} className="w-full rounded-full bg-brand-pink px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">Mark Closed</button></>}
        </>}
        <p className="border-t border-pink-100 pt-4 text-xs leading-5 text-zinc-500">Existing appointments are not automatically cancelled when a date is closed. Contact customers about any required rescheduling.</p>
      </aside>
    </div>
    {confirm&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={()=>{if(!busy)setConfirm(null)}} role="presentation"><section role="dialog" aria-modal="true" aria-label={confirm.title} onClick={e=>e.stopPropagation()} className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">{confirm.title}</h2><button type="button" disabled={busy} onClick={()=>setConfirm(null)} aria-label="Cancel" className="rounded-lg p-1 text-zinc-500"><X size={18}/></button></div>
      <p className="mt-3 text-sm leading-6 text-zinc-600">{confirm.date} — {confirm.detail}</p><div className="mt-5 grid grid-cols-2 gap-3"><button type="button" disabled={busy} onClick={()=>setConfirm(null)} className="rounded-full border border-pink-200 py-3 text-sm font-semibold">Cancel</button><button type="button" disabled={busy} onClick={()=>void execute(confirm)} className="rounded-full bg-brand-pink py-3 text-sm font-semibold text-white disabled:opacity-50">{busy?"Updating…":"Confirm"}</button></div>
    </section></div>}
  </main>;
}
