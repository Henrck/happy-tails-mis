"use client";
import {useState} from "react";
import type {AppointmentRow} from "@/lib/supabase/appointment-management";
import {nextValidStatus} from "@/lib/supabase/appointment-management";
import type {AppointmentStatus} from "@/lib/types/appointments";
import CheckInAssignmentModal from "./CheckInAssignmentModal";

const styles:Record<string,string>={pending:"bg-yellow-100 text-yellow-700",confirmed:"bg-blue-100 text-blue-700",checked_in:"bg-purple-100 text-purple-700",completed:"bg-green-100 text-green-700",cancelled:"bg-red-100 text-red-700"};
const labels:Record<string,string>={dog_grooming:"Grooming Details",cat_grooming:"Grooming Details",boarding:"Boarding Details",ala_carte:"Ala Carte Details"};
function Section({title,icon,children}:{title:string;icon:string;children:React.ReactNode}){return <div className="mt-5"><h4 className="flex items-center gap-1.5 text-sm font-bold text-brand-pink"><span>{icon}</span>{title}</h4><div className="mt-2">{children}</div></div>}
function Row({label,value}:{label:string;value:React.ReactNode}){return <div className="flex justify-between gap-4 text-sm py-1"><span className="text-zinc-500">{label}</span><span className="text-zinc-800 font-medium text-right">{value||"—"}</span></div>}

export default function AppointmentDetailModal({appointment,onClose,onUpdateStatus,onRefresh}:{appointment:AppointmentRow;onClose:()=>void;onUpdateStatus:(id:string,status:AppointmentStatus)=>Promise<string|null>;onRefresh?:()=>Promise<void>|void}){
 const [busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null),[checkIn,setCheckIn]=useState(false);
 const next=nextValidStatus(appointment.status),boarding=appointment.service_type==="boarding";
 async function update(status:AppointmentStatus){setBusy(true);setError(null);const e=await onUpdateStatus(appointment.id,status);setBusy(false);if(e)setError(e)}
 async function success(){setCheckIn(false);await onRefresh?.();onClose()}
 return <>
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}><div className="w-full max-w-md bg-brand-tint rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
   <div className="bg-brand-pink px-6 py-4 flex justify-between sticky top-0 z-10"><h3 className="text-white font-bold">{labels[appointment.service_type]??"Appointment Details"}</h3><button onClick={onClose} className="text-white text-xl">×</button></div>
   <div className="px-6 pb-6">
    <Section title="Owner Information" icon="📋"><div className="flex justify-between py-1"><span className="text-sm text-zinc-500">Status</span><span className={`text-xs font-semibold px-3 py-1 rounded-full ${styles[appointment.status]}`}>{appointment.status.replace("_"," ")}</span></div><Row label="Owner Name" value={appointment.owner_name}/><Row label="Contact No." value={appointment.owner_contact}/><Row label="Address" value={appointment.owner_address}/></Section>
    {appointment.pets.map(p=><Section key={p.appointmentPetId} title={`Pet: ${p.name}`} icon="🐾"><Row label="Breed" value={p.breed}/><Row label="Size" value={p.size_label}/>{p.packageName&&<Row label="Package" value={p.packageName}/>} {p.packagePricingLabel&&<Row label="Duration & Rate" value={p.packagePricingLabel}/>} {boarding&&<Row label="Kennel Size" value={p.requestedKennelSize=== "small" ? "Small Kennel" : p.requestedKennelSize=== "big" ? "Big Kennel" : "Not recorded"}/>} {p.kennelLabel&&<Row label="Assigned Kennel" value={p.kennelLabel}/>} {p.groomerName&&<Row label="Groomer" value={p.groomerName}/>} {p.addonNames.length>0&&<Row label="Add-ons" value={p.addonNames.join(", ")}/>}<Row label="Amount" value={`₱${p.lineAmount.toLocaleString()}`}/></Section>)}
    <Section title="Scheduled Appointment" icon="🕐"><Row label="Appointment Date" value={appointment.scheduled_date}/>{boarding?<><Row label="Drop Off" value={appointment.drop_off_at?new Date(appointment.drop_off_at).toLocaleString():null}/><Row label="Pick Up" value={appointment.pick_up_at?new Date(appointment.pick_up_at).toLocaleString():null}/></>:<Row label="Time Slot" value={appointment.scheduled_time}/>} {appointment.groomerNames.length>0&&<Row label="Groomer(s)" value={appointment.groomerNames.join(", ")}/>}</Section>
    <Section title="Pricing" icon="💰"><div className="flex justify-between border-t border-pink-200 pt-2 text-sm"><b className="text-brand-pink">Total Amount</b><b className="text-brand-pink">₱{appointment.total_amount.toLocaleString()}</b></div></Section>
    <Section title="Notes & Instruction" icon="📝"><div className="bg-white rounded-xl border border-pink-100 min-h-[60px] p-3 text-sm text-zinc-600">{appointment.special_requests||"No notes provided."}</div></Section>
    <Section title="Action" icon="⚡">{error&&<p className="mb-2 text-xs text-red-600 bg-red-50 rounded-lg p-2">{error}</p>}<div className="grid grid-cols-2 gap-2">
      <button onClick={()=>update("confirmed")} disabled={busy||next!=="confirmed"} className="border-2 border-blue-400 text-blue-600 disabled:opacity-40 font-semibold text-xs py-2 rounded-full">Confirm</button>
      <button onClick={()=>setCheckIn(true)} disabled={busy||appointment.status!=="confirmed"} className="border-2 border-purple-400 text-purple-600 disabled:opacity-40 font-semibold text-xs py-2 rounded-full">Check In</button>
      <button onClick={()=>update("completed")} disabled={busy||next!=="completed"} className="border-2 border-green-500 text-green-600 disabled:opacity-40 font-semibold text-xs py-2 rounded-full">Complete</button>
      <button onClick={()=>update("cancelled")} disabled={busy||appointment.status==="cancelled"||appointment.status==="completed"} className="border-2 border-red-400 text-red-500 disabled:opacity-40 font-semibold text-xs py-2 rounded-full">Cancel</button>
    </div><p className="mt-2 text-[11px] text-zinc-400">{appointment.status==="confirmed"?"Check In requires a groomer or kennel assignment.":appointment.status==="checked_in"?"The service is currently in progress.":""}</p></Section>
   </div>
  </div></div>
  {checkIn&&<CheckInAssignmentModal appointment={appointment} onClose={()=>setCheckIn(false)} onSuccess={success}/>}
 </>
}
