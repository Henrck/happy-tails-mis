"use client";
import {useEffect,useState} from "react";
import type {AppointmentRow} from "@/lib/supabase/appointment-management";
import type {Groomer,Kennel} from "@/lib/types/pet-services";
import {checkInAppointment,fetchAvailableGroomers,fetchAvailableKennels} from "@/lib/supabase/service-sessions";

export default function CheckInAssignmentModal({appointment,onClose,onSuccess}:{
 appointment:AppointmentRow; onClose:()=>void; onSuccess:()=>void;
}){
 const boarding=appointment.service_type==="boarding";
 const [groomers,setGroomers]=useState<Groomer[]>([]);
 const [kennels,setKennels]=useState<Kennel[]>([]);
 const [chosen,setChosen]=useState<Record<string,string>>({});
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState<string|null>(null);

 useEffect(()=>{(async()=>{
   const r=boarding?await fetchAvailableKennels():await fetchAvailableGroomers();
   if(boarding)setKennels(r.kennels);else setGroomers(r.groomers);
   setError(r.error);setLoading(false);
 })()},[boarding]);

 const kennelOptions=(pet:{requestedKennelSize:"small"|"big"|null})=>
   pet.requestedKennelSize ? kennels.filter(k=>k.size===pet.requestedKennelSize) : [];
 const complete=appointment.pets.length>0&&appointment.pets.every(p=>chosen[p.appointmentPetId]);
 async function save(){
   if(!complete){setError("Assign a resource to every pet before checking in.");return}
   setSaving(true);setError(null);
   const r=await checkInAppointment(appointment.id,appointment.pets.map(p=>({
     appointmentPetId:p.appointmentPetId,resourceId:chosen[p.appointmentPetId],
     resourceType:boarding?"kennel":"groomer"
   })));
   setSaving(false);if(r.error){setError(r.error);return} onSuccess();
 }
 return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
  <div className="w-full max-w-lg rounded-3xl bg-brand-tint overflow-hidden shadow-xl" onClick={e=>e.stopPropagation()}>
   <div className="bg-brand-pink px-6 py-4 flex justify-between items-center">
    <div><h3 className="font-bold text-white">{boarding?"Assign Kennels":"Assign Groomers"}</h3>
    <p className="text-xs text-white/80 mt-1">{boarding?"Choose an available kennel for each pet.":"One groomer can handle one pet per active session."}</p></div>
    <button onClick={onClose} className="text-white text-2xl">×</button>
   </div>
   <div className="p-6">
    {loading?<p className="py-8 text-center text-zinc-400">Loading availability…</p>:<>
     <div className="space-y-3">{appointment.pets.map(p=><div key={p.appointmentPetId} className="bg-white rounded-2xl border border-pink-100 p-4">
      <div className="flex justify-between mb-2"><div><b className="text-zinc-800">{p.name}</b><p className="text-xs text-zinc-400">{p.breed} · {p.size_label}</p></div>
      <span className="text-[11px] bg-pink-50 text-brand-pink px-2 py-1 rounded-full">{boarding?"Boarding":"Grooming"}</span></div>
      <select value={chosen[p.appointmentPetId]??""} onChange={e=>setChosen({...chosen,[p.appointmentPetId]:e.target.value})} className="w-full rounded-xl border border-pink-200 px-3 py-2.5 text-sm">
       <option value="">Select {boarding?"a kennel":"a groomer"}</option>
       {boarding?kennelOptions(p).map(k=><option key={k.id} value={k.id}>{k.size==="small"?"Small":"Big"} Kennel #{k.number}</option>)
       :groomers.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
      </select>
      {boarding && !p.requestedKennelSize && <p className="mt-2 text-xs text-red-500">No kennel size is recorded for this appointment.</p>}
      {boarding && p.requestedKennelSize && kennelOptions(p).length===0 && <p className="mt-2 text-xs text-yellow-700">No available {p.requestedKennelSize} kennels for this appointment.</p>}
     </div>)}</div>
     {error&&<p className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600">{error}</p>}
     {((boarding&&!kennels.length)||(!boarding&&!groomers.length))&&<p className="mt-3 bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-700">No available {boarding?"kennels":"groomers"} right now.</p>}
     <div className="flex gap-2 mt-5"><button onClick={onClose} className="flex-1 border-2 border-zinc-300 rounded-full py-2.5 text-sm">Cancel</button>
     <button disabled={saving||!complete} onClick={save} className="flex-1 bg-brand-pink text-white rounded-full py-2.5 text-sm font-semibold disabled:opacity-40">{saving?"Starting…":"Check In & Start Session"}</button></div>
    </>}
   </div>
  </div>
 </div>
}
