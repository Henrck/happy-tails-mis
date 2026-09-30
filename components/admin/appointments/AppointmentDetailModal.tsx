"use client";
import {useState} from "react";
import type {AppointmentRow} from "@/lib/supabase/appointment-management";
import {nextValidStatus} from "@/lib/supabase/appointment-management";
import type {AppointmentStatus} from "@/lib/types/appointments";
import CheckInAssignmentModal from "./CheckInAssignmentModal";

const styles:Record<string,string>={pending:"bg-yellow-100 text-yellow-700",confirmed:"bg-blue-100 text-blue-700",checked_in:"bg-purple-100 text-purple-700",completed:"bg-green-100 text-green-700",cancelled:"bg-red-100 text-red-700"};
const labels:Record<string,string>={dog_grooming:"Grooming Appointment",cat_grooming:"Grooming Appointment",boarding:"Boarding Appointment",ala_carte:"A La Carte Appointment"};
function Section({title,children}:{title:string;children:React.ReactNode}){return <div className="mt-5 md:mt-0"><h4 className="text-sm font-bold text-brand-pink">{title}</h4><div className="mt-2">{children}</div></div>}
function Row({label,value}:{label:string;value:React.ReactNode}){return <div className="flex justify-between gap-4 text-sm py-1"><span className="text-zinc-500 shrink-0">{label}</span><span className="text-zinc-800 font-medium text-right break-words min-w-0">{value||"—"}</span></div>}

export default function AppointmentDetailModal({appointment,onClose,onUpdateStatus,onRefresh}:{appointment:AppointmentRow;onClose:()=>void;onUpdateStatus:(id:string,status:AppointmentStatus)=>Promise<string|null>;onRefresh?:()=>Promise<void>|void}){
 const [busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null),[checkIn,setCheckIn]=useState(false);
 const next=nextValidStatus(appointment.status),boarding=appointment.service_type==="boarding";
 async function update(status:AppointmentStatus){setBusy(true);setError(null);const e=await onUpdateStatus(appointment.id,status);setBusy(false);if(e)setError(e)}
 async function success(){setCheckIn(false);await onRefresh?.();onClose()}
 return <>
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4" onClick={onClose}>
   <div className="w-full max-w-[calc(100vw-1rem)] sm:max-w-lg md:max-w-5xl md:h-[min(800px,90vh)] bg-brand-tint rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl" onClick={e=>e.stopPropagation()}>
    <div className="bg-brand-pink px-4 sm:px-6 py-4 flex justify-between items-center shrink-0 sticky top-0 z-10">
      <div className="min-w-0"><p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-white/75">Appointment Management</p><h3 className="text-white font-bold truncate">{labels[appointment.service_type]??"Appointment Details"}</h3></div>
      <button onClick={onClose} className="ml-3 shrink-0 w-9 h-9 rounded-full bg-white/15 text-white hover:bg-white/25 flex items-center justify-center text-xl" aria-label="Close">×</button>
    </div>
    <div className="px-4 sm:px-6 pb-6 overflow-y-auto overscroll-contain md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-6 md:pt-5">
      <Section title="Owner Information"><div className="flex justify-between py-1"><span className="text-sm text-zinc-500">Status</span><span className={`text-xs font-semibold px-3 py-1 rounded-full ${styles[appointment.status]}`}>{appointment.status.replace("_"," ")}</span></div><Row label="Owner Name" value={appointment.owner_name}/><Row label="Contact No." value={appointment.owner_contact}/><Row label="Address" value={appointment.owner_address}/></Section>
      <Section title="Appointment Schedule"><Row label="Appointment Date" value={appointment.scheduled_date}/>{boarding?<><Row label="Drop Off" value={appointment.drop_off_at?new Date(appointment.drop_off_at).toLocaleString():null}/><Row label="Pick Up" value={appointment.pick_up_at?new Date(appointment.pick_up_at).toLocaleString():null}/></>:<Row label="Time Slot" value={appointment.scheduled_time}/>} {appointment.groomerNames.length>0&&<Row label="Groomer(s)" value={appointment.groomerNames.join(", ")}/>}</Section>
      <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">
       <div className="space-y-5">{appointment.pets.map(p=><Section key={p.appointmentPetId} title={`Pet Information — ${p.name}`}><Row label="Breed" value={p.breed}/><Row label="Size" value={p.size_label}/>{p.packageName&&<Row label="Package" value={p.packageName}/>} {p.packagePricingLabel&&<Row label="Duration & Rate" value={p.packagePricingLabel}/>} {boarding&&<Row label="Kennel Size" value={p.requestedKennelSize=== "small" ? "Small Kennel" : p.requestedKennelSize=== "big" ? "Big Kennel" : "Not recorded"}/>} {p.kennelLabel&&<Row label="Assigned Kennel" value={p.kennelLabel}/>} {p.groomerName&&<Row label="Groomer" value={p.groomerName}/>} {p.addonNames.length>0&&<Row label="Add-ons" value={p.addonNames.join(", ")}/>}<Row label="Amount" value={`₱${p.lineAmount.toLocaleString()}`}/></Section>)}</div>
       <div className="space-y-5"><Section title="Pricing Summary"><div className="rounded-2xl bg-white/70 border border-pink-100 p-4"><div className="flex justify-between text-sm"><span className="text-zinc-500">Total Amount</span><b className="text-brand-pink">₱{appointment.total_amount.toLocaleString()}</b></div></div></Section><Section title="Notes & Instructions"><div className="bg-white rounded-xl border border-pink-100 min-h-[60px] p-3 text-sm text-zinc-600 whitespace-pre-wrap break-words">{appointment.special_requests||"No notes provided."}</div></Section></div>
      </div>
      <div className="md:col-span-2"><Section title="Appointment Actions">{error&&<p className="mb-2 text-xs text-red-600 bg-red-50 rounded-lg p-2">{error}</p>}<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
        <button onClick={()=>update("confirmed")} disabled={busy||next!=="confirmed"} className="border-2 border-blue-400 text-blue-600 disabled:opacity-40 font-semibold text-xs py-2.5 rounded-full">Confirm</button>
        <button onClick={()=>setCheckIn(true)} disabled={busy||appointment.status!=="confirmed"} className="border-2 border-purple-400 text-purple-600 disabled:opacity-40 font-semibold text-xs py-2.5 rounded-full">Check In</button>
        <button onClick={()=>update("completed")} disabled={busy||next!=="completed"} className="border-2 border-green-500 text-green-600 disabled:opacity-40 font-semibold text-xs py-2.5 rounded-full">Complete</button>
        <button onClick={()=>update("cancelled")} disabled={busy||appointment.status==="cancelled"||appointment.status==="completed"} className="border-2 border-red-400 text-red-500 disabled:opacity-40 font-semibold text-xs py-2.5 rounded-full">Cancel</button>
      </div><p className="mt-2 text-[11px] text-zinc-400">{appointment.status==="confirmed"?"Check In requires a groomer or kennel assignment.":appointment.status==="checked_in"?"The service is currently in progress.":""}</p></Section></div>
    </div>
   </div>
  </div>
  {checkIn&&<CheckInAssignmentModal appointment={appointment} onClose={()=>setCheckIn(false)} onSuccess={success}/>} 
 </>
}
