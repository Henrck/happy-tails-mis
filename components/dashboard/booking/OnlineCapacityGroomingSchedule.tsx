"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import BookingDayCalendar from "@/components/shared/BookingDayCalendar";
import { useBookingClosures, manilaTime, manilaToday } from "@/lib/booking/use-booking-closures";
import { createClient } from "@/lib/supabase/client";
import type { DraftPetSelection } from "@/lib/types/appointments";

type Planned = { index:number;time:string;durationMinutes:number;endTime:string };
type LiveSlot = {slot_time:string;capacity:number;booked:number;remaining:number};
type MonthDay = {day:string;open_slots:number;capacity:number};
const slots = Array.from({length:17},(_,i)=>{const minutes=540+i*30;return `${String(Math.floor(minutes/60)).padStart(2,"0")}:${String(minutes%60).padStart(2,"0")}`;});
function label(t:string){const [h,m]=t.split(":").map(Number);return `${h%12||12}:${String(m).padStart(2,"0")} ${h>=12?"PM":"AM"}`;}

type Props = {
  petSelections:DraftPetSelection[];
  scheduledDate:string|null;
  scheduledTime:string|null;
  specialRequests:string;
  onDateChange:(date:string)=>void;
  onTimeChange:(time:string)=>void;
  onRequestsChange:(text:string)=>void;
  onSelectionsChange:(items:DraftPetSelection[])=>void;
  onBack:()=>void;
  onConfirmed:(items:DraftPetSelection[])=>void;
};
export default function OnlineCapacityGroomingSchedule({petSelections,scheduledDate,scheduledTime,specialRequests,onDateChange,onTimeChange,onRequestsChange,onSelectionsChange,onBack,onConfirmed}:Props){
  const closures=useBookingClosures();
  const [month,setMonth]=useState(()=>(scheduledDate??manilaToday()).slice(0,7));
  const [fullDates,setFullDates]=useState<Record<string,string>>({});
  const [monthError,setMonthError]=useState<string|null>(null);
  const [live,setLive]=useState<Record<string,LiveSlot>>({});
  const [capacity,setCapacity]=useState<number|null>(null);
  const [loading,setLoading]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [plan,setPlan]=useState<Planned[]|null>(null);
  const planRef=useRef<Planned[]|null>(null);
  const [refresh,setRefresh]=useState(0);
  const today=manilaToday();

  const reloadMonth=useCallback(async(monthKey:string)=>{
    const {data,error:failure}=await createClient().rpc("happytails_groomer_month_availability",{p_first_day:`${monthKey}-01`});
    if(failure){setMonthError(failure.message);setFullDates({});return;}
    const unavailable:Record<string,string>={};
    for(const row of (data??[]) as MonthDay[]){
      if(row.open_slots===0)unavailable[row.day]=row.capacity===0?"No active groomers":"Fully booked";
    }
    setMonthError(null);setFullDates(unavailable);
  },[]);
  useEffect(()=>{let active=true;void (async()=>{if(!active)return;await reloadMonth(month);})();return()=>{active=false;};},[month,refresh,reloadMonth]);
  const loadSlots=useCallback(async(date:string)=>{
    const {data,error:failure}=await createClient().rpc("happytails_live_groomer_slots",{p_date:date});
    if(failure)throw new Error(failure.message);
    const items=(data??[]) as LiveSlot[];
    setLive(Object.fromEntries(items.map(item=>[item.slot_time,item])));
    setCapacity(items[0]?.capacity??0);
    return items;
  },[]);
  useEffect(()=>{
    if(!scheduledDate){setLive({});setCapacity(null);return;}
    let current=true;setLoading(true);setError(null);
    void loadSlots(scheduledDate).catch(e=>{if(current){setLive({});setError(`Unable to load active groomers: ${String(e.message??e)}`);}}).finally(()=>{if(current)setLoading(false);});
    return()=>{current=false;};
  },[scheduledDate,refresh,loadSlots]);
  useEffect(()=>{
    const timer=window.setInterval(()=>{if(document.visibilityState==="visible")setRefresh(v=>v+1);},10000);
    const focus=()=>setRefresh(v=>v+1);
    window.addEventListener("focus",focus);
    return()=>{window.clearInterval(timer);window.removeEventListener("focus",focus);};
  },[]);
  useEffect(()=>{
    if(scheduledDate && (closures.nameFor(scheduledDate)||fullDates[scheduledDate])){
      planRef.current=null;setPlan(null);onTimeChange("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[scheduledDate,closures.dates,fullDates]);

  async function calculate(date:string,time:string):Promise<Planned[]|null>{
    if(closures.loading||closures.error||monthError){setError("Unable to verify the booking calendar. Please refresh.");return null;}
    const closed=await closures.verifyOpen(date);
    if(closed){setError(closed);return null;}
    if(date<manilaToday()||(date===manilaToday()&&time<=manilaTime())){setError("Select a future start time.");return null;}
    if(!petSelections.length||petSelections.some(p=>!p.packagePricingId)){setError("Choose grooming packages for every pet first.");return null;}
    setBusy(true);setError(null);
    try{
      const current=await loadSlots(date);
      const first=current.find(row=>row.slot_time===time);
      if(!first||first.remaining<1)throw new Error("The selected time is full or no groomers are currently active.");
      // Keep the existing duration-aware, per-pet planner. Capacity is
      // independently verified against the active groomer roster below.
      const {data,error:failure}=await createClient().rpc("happytails_grooming_plan",{
        p_date:date,p_pricing_ids:petSelections.map(p=>p.packagePricingId as string),
        p_preferred_start:time,p_groomer_ids:petSelections.map(p=>p.groomerId)
      });
      if(failure)throw new Error(failure.message);
      const planned=data as Planned[];
      if(!Array.isArray(planned)||planned.length!==petSelections.length)throw new Error("Could not arrange a start time for every pet.");
      const demanded:Record<string,number>={};
      for(const item of planned){demanded[item.time]=(demanded[item.time]??0)+1;}
      for(const [slot,count] of Object.entries(demanded)){
        if(count>(current.find(s=>s.slot_time===slot)?.remaining??0))throw new Error(`Not enough active groomers for ${label(slot)}. Choose another start time.`);
      }
      planRef.current=planned;setPlan(planned);return planned;
    }catch(e){planRef.current=null;setPlan(null);setError(e instanceof Error?e.message:"Could not plan grooming time.");return null;}
    finally{setBusy(false);}
  }
  function chooseDate(date:string){
    setError(null);planRef.current=null;setPlan(null);setLive({});setCapacity(null);
    onDateChange(date);onTimeChange("");
    onSelectionsChange(petSelections.map(p=>({...p,groomingScheduledTime:undefined})));
  }
  function chooseTime(time:string){
    if(!scheduledDate)return;
    setError(null);planRef.current=null;setPlan(null);onTimeChange(time);
    onSelectionsChange(petSelections.map(p=>({...p,groomingScheduledTime:undefined})));
    void calculate(scheduledDate,time);
  }
  async function proceed(){
    if(!scheduledDate||!scheduledTime||busy||!planRef.current)return;
    const old=planRef.current;
    const checked=await calculate(scheduledDate,scheduledTime);
    if(!checked)return;
    if(JSON.stringify(old)!==JSON.stringify(checked)){
      setError("Availability changed. Review the new proposed pet times and click Next again.");return;
    }
    const selections=petSelections.map((p,i)=>({...p,groomingScheduledTime:checked[i].time}));
    onSelectionsChange(selections);onConfirmed(selections);
  }
  const disabled=closures.loading||Boolean(closures.error)||Boolean(monthError);
  return <section className="mx-auto w-full max-w-4xl space-y-5">
    <header className="text-center"><h2 className="text-2xl font-bold text-brand-pink">Grooming Schedule</h2>
      <p className="mt-2 text-sm text-zinc-600">Time-slot availability follows the groomers marked Active in Pet Services.</p></header>
    <p className="rounded-xl border border-pink-100 bg-pink-50 px-4 py-3 text-center text-xs text-zinc-700">Available groomers: <strong>{capacity===null?"Checking…":capacity}</strong> · 30-minute start times · 9:00 AM–5:00 PM · Philippine time</p>
    <BookingDayCalendar value={scheduledDate} onChange={chooseDate} closures={closures} unavailable={fullDates} onMonthChange={setMonth} title="Grooming"/>
    {monthError&&<p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">Unable to load monthly availability: {monthError}</p>}
    <div><div className="mb-2 flex flex-wrap items-center justify-between"><h3 className="text-sm font-semibold">Available time slots</h3><span className="text-xs text-zinc-500">{scheduledDate?"Refreshed every 10 seconds":"Select a date first"}</span></div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">{slots.map(slot=>{
        const item=live[slot];const past=!scheduledDate||scheduledDate<today||(scheduledDate===today&&slot<=manilaTime());
        const full=!!item&&item.remaining<=0;
        const inactive=disabled||loading||busy||past||!item||full||!!fullDates[scheduledDate??""];
        const status=past?"Unavailable":loading?"Checking…":!item?"Unavailable":full?"Full":`${item.remaining} of ${item.capacity} available`;
        return <button key={slot} type="button" disabled={inactive} aria-pressed={scheduledTime===slot} onClick={()=>chooseTime(slot)} title={status}
          className={`flex min-h-14 flex-col items-center justify-center rounded-xl border px-2 py-2 text-xs font-semibold ${full?"border-rose-200 bg-rose-50 text-rose-700":scheduledTime===slot?"border-brand-pink bg-pink-50 text-brand-pink":"border-pink-200 hover:border-brand-pink"} disabled:cursor-not-allowed disabled:opacity-60`}>
          <span>{label(slot)}</span><span className={`text-[10px] ${full?"text-rose-600":"text-zinc-500"}`}>{status}</span>
        </button>;
      })}</div>
    </div>
    {plan&&!busy&&<section className="rounded-2xl border border-pink-200 bg-pink-50 p-4"><h3 className="font-semibold">Proposed schedule</h3>
      <div className="mt-3 space-y-2">{petSelections.map((p,i)=><p key={p.pet.id} className="flex justify-between rounded-lg bg-white p-3 text-sm"><strong>{p.pet.name}</strong><span>Starts {label(plan[i].time)}</span></p>)}</div>
      <p className="mt-3 text-xs text-zinc-500">Start times can differ for each pet. Availability is rechecked before booking.</p></section>}
    <label className="block text-sm font-semibold">Special requests<textarea rows={3} value={specialRequests} onChange={e=>onRequestsChange(e.target.value)} className="mt-2 w-full rounded-xl border border-pink-200 p-3 text-sm"/></label>
    {error&&<p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    <div className="grid grid-cols-2 gap-3"><button type="button" onClick={onBack} className="rounded-full border border-pink-200 py-3 font-semibold text-brand-pink">Back</button>
      <button type="button" onClick={()=>void proceed()} disabled={disabled||busy||!plan||loading||Boolean(error)} className="rounded-full bg-brand-pink py-3 font-semibold text-white disabled:opacity-40">{busy?"Checking…":"Next"}</button></div>
  </section>;
}
