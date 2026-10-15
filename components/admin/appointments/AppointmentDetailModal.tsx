"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AppointmentRow } from "@/lib/supabase/appointment-management";
import { nextValidStatus } from "@/lib/supabase/appointment-management";
import type { AppointmentStatus } from "@/lib/types/appointments";
import CheckInAssignmentModal from "./CheckInAssignmentModal";
import OnlineGroomingVerification from "./OnlineGroomingVerification";

const styles: Record<string,string> = {pending:"bg-yellow-100 text-yellow-700",confirmed:"bg-blue-100 text-blue-700",checked_in:"bg-purple-100 text-purple-700",completed:"bg-green-100 text-green-700",cancelled:"bg-red-100 text-red-700"};
const labels:Record<string,string>={dog_grooming:"Grooming Appointment",cat_grooming:"Grooming Appointment",boarding:"Boarding Appointment",ala_carte:"A La Carte Appointment"};
function Section({title,children}:{title:string;children:React.ReactNode}){return <section className="mt-5 md:mt-0"><h4 className="text-sm font-bold text-brand-pink">{title}</h4><div className="mt-2">{children}</div></section>}
function Row({label,value}:{label:string;value:React.ReactNode}){return <div className="flex justify-between gap-4 py-1 text-sm"><span className="shrink-0 text-zinc-500">{label}</span><span className="min-w-0 break-words text-right font-medium text-zinc-800">{value||"—"}</span></div>}

export default function AppointmentDetailModal({appointment,onClose,onUpdateStatus,onRefresh}:{appointment:AppointmentRow;onClose:()=>void;onUpdateStatus:(id:string,status:AppointmentStatus)=>Promise<string|null>;onRefresh?:()=>Promise<void>|void}){
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [checkIn,setCheckIn]=useState(false);
  const next=nextValidStatus(appointment.status);
  const boarding=appointment.service_type==="boarding";
  const onlineGrooming=!appointment.is_walk_in && (appointment.service_type==="dog_grooming"||appointment.service_type==="cat_grooming");
  const [weightVerified,setWeightVerified]=useState(false);
  const [checkingWeight,setCheckingWeight]=useState(onlineGrooming);
  const [weightError,setWeightError]=useState<string|null>(null);
  useEffect(()=>{
    if (!onlineGrooming) return;
    let active=true;
    const check=async()=>{
      setCheckingWeight(true);
      const {data,error}=await createClient().rpc("happytails_online_grooming_ready_for_checkin",{p_appointment_id:appointment.id});
      if (!active) return;
      setWeightVerified(!error && data===true);
      setWeightError(error ? "Unable to confirm weighing status. " + error.message : null);
      setCheckingWeight(false);
    };
    void check();
    return ()=>{active=false};
  },[onlineGrooming,appointment.id]);
  async function update(status:AppointmentStatus){setBusy(true);setError(null);const result=await onUpdateStatus(appointment.id,status);setBusy(false);if(result)setError(result)}
  async function success(){setCheckIn(false);await onRefresh?.();onClose()}
  return <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-2xl bg-brand-tint shadow-2xl sm:max-w-lg sm:rounded-3xl md:h-[min(800px,90vh)] md:max-w-5xl" onClick={e=>e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between bg-brand-pink px-4 py-4 sm:px-6">
          <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-wider text-white/75 sm:text-xs">Appointment Management</p><h3 className="truncate font-bold text-white">{labels[appointment.service_type]??"Appointment Details"}</h3></div>
          <button type="button" onClick={onClose} className="ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-xl text-white hover:bg-white/25" aria-label="Close">×</button>
        </div>
        <div className="grid gap-y-6 overflow-y-auto overscroll-contain px-4 pb-6 pt-5 sm:px-6 md:grid-cols-2 md:gap-x-8">
          <Section title="Owner Information"><div className="flex justify-between py-1"><span className="text-sm text-zinc-500">Status</span><span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles[appointment.status]}`}>{appointment.status.replace("_"," ")}</span></div><Row label="Owner Name" value={appointment.owner_name}/><Row label="Contact No." value={appointment.owner_contact}/><Row label="Address" value={appointment.owner_address}/></Section>
          <Section title="Appointment Schedule"><Row label="Appointment Date" value={appointment.scheduled_date}/>{boarding?<><Row label="Drop Off" value={appointment.drop_off_at?new Date(appointment.drop_off_at).toLocaleString():null}/><Row label="Pick Up" value={appointment.pick_up_at?new Date(appointment.pick_up_at).toLocaleString():null}/></>:<Row label="Time Slot" value={appointment.scheduled_time}/>} {appointment.groomerNames.length>0&&<Row label="Groomer(s)" value={appointment.groomerNames.join(", ")}/>}</Section>
          <div className="grid gap-5 md:col-span-2 md:grid-cols-2 md:gap-8">
            <div className="space-y-5">{appointment.pets.map(p=><Section key={p.appointmentPetId} title={`Pet Information — ${p.name}`}>
              <Row label="Breed" value={p.breed}/><Row label="Registered Size" value={p.size_label}/>{p.packageName&&<Row label="Package" value={p.packageName}/>} {p.packagePricingLabel&&<Row label="Booked Rate" value={p.packagePricingLabel}/>} {boarding&&<Row label="Kennel Size" value={p.requestedKennelSize==="small"?"Small Kennel":p.requestedKennelSize==="big"?"Big Kennel":"Not recorded"}/>} {p.kennelLabel&&<Row label="Assigned Kennel" value={p.kennelLabel}/>} {p.groomerName&&<Row label="Groomer" value={p.groomerName}/>} {p.addonNames.length>0&&<Row label="Add-ons" value={p.addonNames.join(", ")}/>}<Row label="Amount" value={`₱${p.lineAmount.toLocaleString()}`}/>
              {onlineGrooming&&<OnlineGroomingVerification appointment={appointment} pet={p} onSaved={success}/>}</Section>)}</div>
            <div className="space-y-5"><Section title="Pricing Summary"><div className="rounded-2xl border border-pink-100 bg-white/70 p-4"><div className="flex justify-between text-sm"><span className="text-zinc-500">Total Amount</span><b className="text-brand-pink">₱{appointment.total_amount.toLocaleString()}</b></div>{onlineGrooming&&<p className="mt-2 text-xs text-zinc-500">Online grooming quotes are provisional until verified at the shop.</p>}</div></Section><Section title="Notes & Instructions"><div className="min-h-[60px] break-words rounded-xl border border-pink-100 bg-white p-3 text-sm whitespace-pre-wrap text-zinc-600">{appointment.special_requests||"No notes provided."}</div></Section></div>
          </div>
          <div className="md:col-span-2"><Section title="Appointment Actions">{error&&<p className="mb-2 rounded-lg bg-red-50 p-2 text-xs text-red-600">{error}</p>}<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4">
            <button type="button" onClick={()=>update("confirmed")} disabled={busy||next!=="confirmed"} className="rounded-full border-2 border-blue-400 py-2.5 text-xs font-semibold text-blue-600 disabled:opacity-40">Confirm</button>
            <button type="button" onClick={()=>{if(!onlineGrooming||weightVerified)setCheckIn(true)}} disabled={busy||appointment.status!=="confirmed"||(onlineGrooming&&(!weightVerified||checkingWeight))} className="rounded-full border-2 border-purple-400 py-2.5 text-xs font-semibold text-purple-600 disabled:opacity-40">Check In</button>
            <button type="button" onClick={()=>update("completed")} disabled={busy||next!=="completed"} className="rounded-full border-2 border-green-500 py-2.5 text-xs font-semibold text-green-600 disabled:opacity-40">Complete</button>
            <button type="button" onClick={()=>update("cancelled")} disabled={busy||appointment.status==="cancelled"||appointment.status==="completed"} className="rounded-full border-2 border-red-400 py-2.5 text-xs font-semibold text-red-500 disabled:opacity-40">Cancel</button>
          </div>{onlineGrooming&&appointment.status==="confirmed"&&!weightVerified&&<p role="status" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">{checkingWeight?"Checking weight verification…":weightError??"Check In is locked. Confirm the measured weight and final price for every pet above before checking in."}</p>}<p className="mt-2 text-[11px] text-zinc-400">{appointment.status==="confirmed"?"Check In requires a groomer or kennel assignment.":appointment.status==="checked_in"?"The service is currently in progress.":""}</p></Section></div>
        </div>
      </div>
    </div>
    {checkIn&&<CheckInAssignmentModal appointment={appointment} onClose={()=>setCheckIn(false)} onSuccess={success}/>}
  </>;
}
