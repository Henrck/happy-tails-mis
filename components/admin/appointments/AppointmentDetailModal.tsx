"use client";
import {useEffect,useRef,useState} from "react";
import {createClient} from "@/lib/supabase/client";
import {cancelStaffAppointment} from "@/lib/supabase/admin-appointment-cancellation";
import {fetchStaffCancellationDetails,type StaffCancellationDetails} from "@/lib/supabase/appointment-cancellation-details";
import {fetchAppointmentDetail,nextValidStatus,type AppointmentRow} from "@/lib/supabase/appointment-management";
import type {AppointmentStatus} from "@/lib/types/appointments";
import CheckInAssignmentModal from "./CheckInAssignmentModal";
import OnlineGroomingVerification from "./OnlineGroomingVerification";
import {X,AlertTriangle,CheckCircle2,ShieldCheck,CalendarCheck,ClipboardCheck} from "lucide-react";

const names:Record<string,string>={dog_grooming:"Dog Grooming",cat_grooming:"Cat Grooming",boarding:"Boarding",ala_carte:"À La Carte"};
const statuses:Record<string,string>={pending:"bg-amber-100 text-amber-700",confirmed:"bg-sky-100 text-sky-700",checked_in:"bg-violet-100 text-violet-700",completed:"bg-green-100 text-green-700",cancelled:"bg-red-100 text-red-700"};
const reasons=["Customer requested cancellation","Schedule conflict","Groomer unavailable","Kennel unavailable","Pet is unwell","Duplicate booking","Other"];
type ActionResult={action:"confirmed"|"checked_in"|"completed"|"cancelled"|"verified";petName?:string};
const feedback:Record<ActionResult["action"],{title:string;description:string;color:string}>={
 confirmed:{title:"Appointment Confirmed",description:"The appointment status has been changed to Confirmed.",color:"text-emerald-600 bg-emerald-50"},
 checked_in:{title:"Check-In Successful",description:"The appointment is now Checked In, and the assigned session has started.",color:"text-violet-600 bg-violet-50"},
 completed:{title:"Appointment Completed",description:"The appointment has been marked as Completed.",color:"text-emerald-600 bg-emerald-50"},
 cancelled:{title:"Appointment Cancelled",description:"The appointment has been cancelled and the reason has been saved.",color:"text-rose-600 bg-rose-50"},
 verified:{title:"Weight & Price Verified",description:"The verified weight and customer-approved price have been saved.",color:"text-emerald-600 bg-emerald-50"},
};
function Field({label,value}:{label:string;value:React.ReactNode}){return <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-1 text-sm"><span className="text-zinc-500">{label}</span><span className="min-w-0 break-words font-medium text-zinc-800">{value||"—"}</span></div>}
function Section({title,children}:{title:string;children:React.ReactNode}){return <section className="rounded-2xl border border-pink-100 bg-white p-4"><h4 className="mb-3 text-sm font-bold text-brand-pink">{title}</h4>{children}</section>}

function ActionSuccessDialog({result,appointment,onDone,onReview}:{result:ActionResult;appointment:AppointmentRow;onDone:()=>void;onReview:()=>void}){
 const doneRef=useRef<HTMLButtonElement>(null);
 useEffect(()=>{doneRef.current?.focus()},[]);
 const item=feedback[result.action];
 const petNames=appointment.pets.map(p=>p.name).filter(Boolean).join(", ")||"the selected pet";
 return <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/70 p-4" role="presentation">
  <div role="dialog" aria-modal="true" aria-labelledby="ht-appointment-result-title" aria-describedby="ht-appointment-result-description" className="w-full max-w-md overflow-hidden rounded-3xl border border-pink-100 bg-white p-6 text-center shadow-2xl sm:p-8">
   <span className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${item.color}`} aria-hidden="true">
    {result.action==="verified"?<ShieldCheck size={35} strokeWidth={1.9}/>:result.action==="confirmed"?<CalendarCheck size={35} strokeWidth={1.9}/>:result.action==="completed"?<ClipboardCheck size={35} strokeWidth={1.9}/>:<CheckCircle2 size={35} strokeWidth={1.9}/>}
   </span>
   <h3 id="ht-appointment-result-title" className="mt-4 text-xl font-extrabold text-zinc-900">{item.title}</h3>
   <p id="ht-appointment-result-description" className="mt-2 text-sm leading-6 text-zinc-600">{item.description}</p>
   <div className="mt-5 rounded-2xl bg-pink-50/70 p-4 text-left text-sm">
    <p className="font-semibold text-zinc-800">{names[appointment.service_type]??"Pet Service"}</p>
    <p className="mt-1 break-words text-zinc-600">{result.petName??petNames}</p>
    <p className="mt-1 break-words text-zinc-500">Owner: {appointment.owner_name}</p>
    <p className="mt-1 text-zinc-500">Scheduled: {appointment.scheduled_date}</p>
   </div>
   <p className="mt-3 text-xs text-zinc-500">You can review the updated record or return to the appointment table.</p>
   <div className="mt-5 grid gap-2 sm:grid-cols-2">
    <button type="button" onClick={onReview} className="min-h-11 rounded-full border-2 border-pink-200 px-4 py-2.5 text-sm font-semibold text-brand-pink transition-colors hover:bg-pink-50">Review Appointment</button>
    <button type="button" ref={doneRef} onClick={onDone} className="min-h-11 rounded-full bg-brand-pink px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-pink-dark">Back to Table</button>
   </div>
  </div>
 </div>;
}

export default function AppointmentDetailModal({appointment,onClose,onUpdateStatus,onRefresh}:{appointment:AppointmentRow;onClose:()=>void;onUpdateStatus:(id:string,status:AppointmentStatus)=>Promise<string|null>;onRefresh?:()=>Promise<void>|void}){
 const [busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null),[checkIn,setCheckIn]=useState(false),[cancelOpen,setCancelOpen]=useState(false),[reason,setReason]=useState(""),[other,setOther]=useState(""),[record,setRecord]=useState<StaffCancellationDetails|null>(null);
 const [result,setResult]=useState<ActionResult|null>(null);
 const onlineGrooming=!appointment.is_walk_in&&(appointment.service_type==="dog_grooming"||appointment.service_type==="cat_grooming");
 const [verified,setVerified]=useState(false),[checking,setChecking]=useState(onlineGrooming),[weightError,setWeightError]=useState<string|null>(null);
 useEffect(()=>{if(!onlineGrooming)return;let active=true;setChecking(true);void createClient().rpc("happytails_online_grooming_ready_for_checkin",{p_appointment_id:appointment.id}).then(({data,error})=>{if(!active)return;setVerified(!error&&data===true);setWeightError(error?.message??null);setChecking(false)});return()=>{active=false}},[onlineGrooming,appointment.id,result]);
 useEffect(()=>{let active=true;if(appointment.status!=="cancelled")return;void fetchStaffCancellationDetails(appointment.id).then(r=>{if(active)setRecord(r)}).catch(()=>{});return()=>{active=false}},[appointment.id,appointment.status]);
 async function refreshQuietly(){try{await onRefresh?.()}catch{ /* The mutation was confirmed by its API: a refresh issue must not report it as failed. */ }}
 async function update(status:"confirmed"|"completed"){
  if(busy)return;
  setBusy(true);setError(null);
  try{
   const message=await onUpdateStatus(appointment.id,status);
   if(message){setError(message);return}
   await refreshQuietly();
   setResult({action:status});
  }catch(e){setError(e instanceof Error?e.message:"Unable to update appointment")}
  finally{setBusy(false)}
 }
 async function cancelled(){
  const text=reason==="Other"?other.trim():reason;
  if(busy||text.length<5||text.length>500)return;
  setBusy(true);setError(null);
  try{
   const response=await cancelStaffAppointment(appointment.id,text);
   if(response.error){setError(response.error);return}
   setCancelOpen(false);
   await refreshQuietly();
   setResult({action:"cancelled"});
  }catch(e){setError(e instanceof Error?e.message:"Cancellation failed")}
  finally{setBusy(false)}
 }
 async function checkedIn(){
  setCheckIn(false);setBusy(true);setError(null);
  try{
   // The legacy check-in helper can report success when the final UPDATE
   // touches zero rows. Confirm the saved status before showing success.
   const fresh=await fetchAppointmentDetail(appointment.id);
   if(fresh.error||fresh.row?.status!=="checked_in"){
    setError("Check-in could not be verified. Refresh the appointment and check its status before trying again.");
    await refreshQuietly();
    return;
   }
   await refreshQuietly();
   setResult({action:"checked_in"});
  }catch{setError("Unable to verify the check-in. Refresh the appointment before trying again.")}
  finally{setBusy(false)}
 }
 async function verifiedOnlineGrooming(petName:string){
  // Weight verification is NOT check-in. Previously this callback closed the
  // appointment details, making the action look like it did nothing.
  await refreshQuietly();
  setResult({action:"verified",petName});
 }
 const cancellable=appointment.status==="pending"||appointment.status==="confirmed";
 const effective=reason==="Other"?other.trim():reason;
 return <>
  <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-2 sm:p-5" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy&&!result&&!checkIn&&!cancelOpen)onClose()}}>
   <div role="dialog" aria-modal="true" aria-label="Appointment details" className="flex max-h-[94dvh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-brand-tint shadow-2xl">
    <header className="flex shrink-0 items-center justify-between gap-3 bg-brand-pink p-4 text-white sm:px-6">
     <div className="min-w-0"><p className="text-xs text-white/80">Appointment Management</p><h3 className="text-lg font-bold">{names[appointment.service_type]??"Appointment"}</h3></div>
     <button type="button" disabled={busy||!!result} aria-label="Close appointment details" onClick={onClose} className="rounded-full bg-white/15 p-2 disabled:opacity-40"><X size={21}/></button>
    </header>
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
     <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white p-3"><span className="text-sm text-zinc-500">{appointment.is_walk_in?"Walk-in":"Online"} appointment</span><span className={`rounded-full px-3 py-1 text-xs font-bold ${statuses[appointment.status]}`}>{appointment.status.replace("_"," ")}</span></div>
     <div className="grid gap-4 md:grid-cols-2">
      <Section title="Owner Information"><Field label="Name" value={appointment.owner_name}/><Field label="Contact" value={appointment.owner_contact}/><Field label="Address" value={appointment.owner_address}/></Section>
      <Section title="Appointment Schedule"><Field label="Date" value={appointment.scheduled_date}/>{appointment.service_type==="boarding"?<><Field label="Drop-off" value={appointment.drop_off_at?new Date(appointment.drop_off_at).toLocaleString("en-PH"):null}/><Field label="Pick-up" value={appointment.pick_up_at?new Date(appointment.pick_up_at).toLocaleString("en-PH"):null}/></>:<Field label="Time" value={appointment.scheduled_time}/>}</Section>
     </div>
     <div className="grid gap-4 md:grid-cols-2"><div className="space-y-4">
      {appointment.pets.map(p=><Section key={p.appointmentPetId} title={`Pet — ${p.name}`}><Field label="Breed" value={p.breed}/><Field label="Registered size" value={p.size_label}/>{p.packageName&&<Field label="Package" value={p.packageName}/>} {p.packagePricingLabel&&<Field label="Rate" value={p.packagePricingLabel}/>} {p.kennelLabel&&<Field label="Kennel" value={p.kennelLabel}/>} {p.groomerName&&<Field label="Groomer" value={p.groomerName}/>} {p.addonNames.length>0&&<Field label="Add-ons" value={p.addonNames.join(", ")}/>}<Field label="Charge" value={`₱${p.lineAmount.toLocaleString()}`}/>{onlineGrooming&&<OnlineGroomingVerification appointment={appointment} pet={p} onSaved={()=>verifiedOnlineGrooming(p.name)}/>}</Section>)}
     </div><div className="space-y-4">
      <Section title="Pricing Summary"><Field label="Booked total" value={`₱${appointment.total_amount.toLocaleString()}`}/>{onlineGrooming&&<p className="mt-2 text-xs text-zinc-500">Final grooming price is subject to verified weight.</p>}</Section>
      <Section title="Notes & Instructions"><p className="whitespace-pre-wrap break-words text-sm text-zinc-700">{appointment.special_requests||"No notes provided."}</p></Section>
      {record&&<Section title="Cancellation Record"><p className="whitespace-pre-wrap break-words text-sm text-red-700">{record.reason}</p><p className="mt-1 text-xs text-zinc-500">{new Date(record.cancelled_at).toLocaleString("en-PH")}</p></Section>}
     </div></div>
     <Section title="Appointment Actions">
      {error&&!cancelOpen&&<p role="alert" className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {onlineGrooming&&appointment.status==="confirmed"&&!verified&&<p className="mb-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">{checking?"Verifying pet weight…":weightError??"Check-in requires verified pet weight and price."}</p>}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
       <button type="button" disabled={busy||nextValidStatus(appointment.status)!=="confirmed"} onClick={()=>void update("confirmed")} className="rounded-full border-2 border-blue-400 p-3 text-sm font-semibold text-blue-600 disabled:opacity-40">{busy?"Please wait…":"Confirm"}</button>
       <button type="button" disabled={busy||appointment.status!=="confirmed"||(onlineGrooming&&(!verified||checking))} onClick={()=>setCheckIn(true)} className="rounded-full border-2 border-violet-400 p-3 text-sm font-semibold text-violet-600 disabled:opacity-40">Check In</button>
       <button type="button" disabled={busy||nextValidStatus(appointment.status)!=="completed"} onClick={()=>void update("completed")} className="rounded-full border-2 border-green-500 p-3 text-sm font-semibold text-green-600 disabled:opacity-40">Complete</button>
       <button type="button" disabled={busy||!cancellable} onClick={()=>{setError(null);setCancelOpen(true)}} className="rounded-full border-2 border-red-400 p-3 text-sm font-semibold text-red-600 disabled:opacity-40">Cancel</button>
      </div>
     </Section>
    </div>
   </div>
  </div>
  {cancelOpen&&<div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/65 p-4"><div role="dialog" aria-modal="true" aria-label="Cancel appointment" className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl sm:p-6">
   <div className="flex items-center gap-2"><AlertTriangle className="text-red-600"/><h3 className="text-lg font-bold">Cancel Appointment</h3></div>
   <p className="mt-3 text-sm text-zinc-600">This cancels the entire appointment for all included pets. The customer will receive the reason in their notification.</p>
   <label className="mt-4 block text-sm font-semibold">Reason *<select className="mt-2 w-full rounded-xl border border-pink-200 p-3" disabled={busy} value={reason} onChange={e=>setReason(e.target.value)}><option value="">Select a reason</option>{reasons.map(r=><option key={r} value={r}>{r}</option>)}</select></label>
   {reason==="Other"&&<label className="mt-3 block text-sm font-semibold">Explanation *<textarea value={other} disabled={busy} maxLength={500} onChange={e=>setOther(e.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-pink-200 p-3"/></label>}
   {error&&<p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
   <div className="mt-5 grid grid-cols-2 gap-3"><button disabled={busy} type="button" onClick={()=>setCancelOpen(false)} className="rounded-full border border-zinc-300 py-3 disabled:opacity-40">Back</button><button disabled={busy||effective.length<5||effective.length>500} type="button" onClick={()=>void cancelled()} className="rounded-full bg-red-600 py-3 font-semibold text-white disabled:opacity-40">{busy?"Cancelling…":"Confirm Cancellation"}</button></div>
  </div></div>}
  {checkIn&&<CheckInAssignmentModal appointment={appointment} onClose={()=>setCheckIn(false)} onSuccess={checkedIn}/>}
  {result&&<ActionSuccessDialog result={result} appointment={appointment} onReview={()=>setResult(null)} onDone={onClose}/>}
 </>;
}
