import { createClient } from "./client";
import type { Groomer, Kennel } from "@/lib/types/pet-services";
import type { BoardingStage } from "@/lib/data/boarding-kennels-mock";

export type GroomingSessionRow = {
  appointmentId:string; appointmentPetId:string; petId:string; petName:string; breed:string;
  ownerName:string; scheduledDate:string; scheduledTime:string|null; groomerId:string; groomerName:string;
};
export type BoardingSessionRow = {
  appointmentId:string; appointmentPetId:string; petId:string; petName:string; breed:string;
  ownerName:string; dropOffAt:string|null; pickUpAt:string|null; kennelId:string;
  kennelSize:"small"|"big"; kennelNumber:number; stage:BoardingStage;
};

export async function fetchGroomingSessions() {
  const s=createClient();
  const {data,error}=await s.from("appointment_pets").select(`
    id, pet_id, groomer_id,
    appointments!inner(id,owner_name,scheduled_date,scheduled_time,status,service_type),
    pets(id,name,breed), groomers(id,name)
  `).not("groomer_id","is",null).eq("appointments.status","checked_in")
   .in("appointments.service_type",["dog_grooming","cat_grooming","ala_carte"]);
  if(error)return {sessions:[] as GroomingSessionRow[],error:error.message};
  const rows=(data??[]) as any[];
  return {sessions:rows.map(r=>({
    appointmentId:r.appointments.id, appointmentPetId:r.id, petId:r.pets?.id??r.pet_id,
    petName:r.pets?.name??"Unknown pet", breed:r.pets?.breed??"—", ownerName:r.appointments.owner_name,
    scheduledDate:r.appointments.scheduled_date, scheduledTime:r.appointments.scheduled_time,
    groomerId:r.groomers?.id??r.groomer_id, groomerName:r.groomers?.name??"Unassigned"
  })) as GroomingSessionRow[],error:null};
}

export async function fetchBoardingSessions() {
  const s=createClient();
  const {data,error}=await s.from("appointment_pets").select(`
    id, pet_id, kennel_id,
    appointments!inner(id,owner_name,drop_off_at,pick_up_at,status,service_type),
    pets(id,name,breed), kennels(id,size,number)
  `).not("kennel_id","is",null).in("appointments.status",["confirmed","checked_in"])
   .eq("appointments.service_type","boarding");
  if(error)return {sessions:[] as BoardingSessionRow[],error:error.message};
  const rows=(data??[]) as any[];
  return {sessions:rows.map(r=>({
    appointmentId:r.appointments.id, appointmentPetId:r.id, petId:r.pets?.id??r.pet_id,
    petName:r.pets?.name??"Unknown pet", breed:r.pets?.breed??"—", ownerName:r.appointments.owner_name,
    dropOffAt:r.appointments.drop_off_at, pickUpAt:r.appointments.pick_up_at,
    kennelId:r.kennels?.id??r.kennel_id, kennelSize:r.kennels?.size??"small",
    kennelNumber:r.kennels?.number??0,
    stage:r.appointments.status === "confirmed" ? "booked" : "checked_in"
  })) as BoardingSessionRow[],error:null};
}

export async function fetchAvailableGroomers() {
  const s=createClient();
  const [{data,error},{sessions,error:se}]=await Promise.all([
    s.from("groomers").select("*").eq("status","active").order("name"), fetchGroomingSessions()
  ]);
  if(error||se)return {groomers:[] as Groomer[],error:error?.message??se};
  const busy=new Set(sessions.map(x=>x.groomerId));
  return {groomers:((data??[]) as Groomer[]).filter(x=>!busy.has(x.id)),error:null};
}

export async function fetchAvailableKennels() {
  const s=createClient();
  const [{data,error},{sessions,error:se}]=await Promise.all([
    s.from("kennels").select("*").order("size").order("number"), fetchBoardingSessions()
  ]);
  if(error||se)return {kennels:[] as Kennel[],error:error?.message??se};
  const busy=new Set(sessions.map(x=>x.kennelId));
  return {kennels:((data??[]) as Kennel[]).filter(x=>!busy.has(x.id)),error:null};
}

export async function checkInAppointment(id:string, assignments:{appointmentPetId:string;resourceId:string;resourceType:"groomer"|"kennel"}[]) {
  const s=createClient();
  if(!assignments.length)return {error:"Assign a resource to every pet before checking in."};
  const {data:a,error:ae}=await s.from("appointments").select("id,service_type,status").eq("id",id).single();
  if(ae||!a)return {error:ae?.message??"Appointment not found."};
  if(a.status!=="confirmed")return {error:"Only confirmed appointments can be checked in."};
  const type=a.service_type==="boarding"?"kennel":"groomer";
  if(assignments.some(x=>x.resourceType!==type))return {error:`This appointment requires ${type} assignment.`};
  const active=type==="groomer"?await fetchGroomingSessions():await fetchBoardingSessions();
  if(active.error)return {error:active.error};
  const busy =
  type === "groomer"
    ? new Set(
        active.sessions
          .filter(
            (x): x is GroomingSessionRow =>
              x.appointmentId !== id && "groomerId" in x
          )
          .map((x) => x.groomerId)
      )
    : new Set(
        active.sessions
          .filter(
            (x): x is BoardingSessionRow =>
              x.appointmentId !== id && "kennelId" in x
          )
          .map((x) => x.kennelId)
      );
  if(assignments.some(x=>busy.has(x.resourceId)))return {error:`A selected ${type} is already in use.`};
  if(new Set(assignments.map(x=>x.appointmentPetId)).size!==assignments.length)return {error:"Each pet can only have one assignment."};

  if(type==="kennel"){
    const ids=assignments.map(x=>x.appointmentPetId);
    const {data:petRows,error:pe}=await s.from("appointment_pets")
      .select("id,package_id,package_pricing_id,packages(name),package_pricing(package_id,size_label,size_detail,packages(name))")
      .eq("appointment_id",id).in("id",ids);
    if(pe)return {error:pe.message};
    const rowById=new Map((petRows??[]).map((r:any)=>[r.id,r]));
    const {data:kennelRows,error:ke}=await s.from("kennels").select("id,size").in("id",assignments.map(x=>x.resourceId));
    if(ke)return {error:ke.message};
    const kennelById=new Map((kennelRows??[]).map((k:any)=>[k.id,k]));
    for(const x of assignments){
      const row:any=rowById.get(x.appointmentPetId);
      const kennel:any=kennelById.get(x.resourceId);
      if(!row||!kennel)return {error:"The selected kennel or appointment pet could not be verified."};
      const text=`${row.packages?.name??row.package_pricing?.packages?.name??""} ${row.package_pricing?.size_label??""} ${row.package_pricing?.size_detail??""}`.toLowerCase();
      const required=text.includes("small")?"small":text.includes("big")?"big":null;
      if(!required)return {error:"This boarding appointment does not have a saved kennel size. Please review the appointment booking."};
      if(kennel.size!==required)return {error:`${row.packages?.name??row.package_pricing?.packages?.name??"This pet"} requires a ${required} kennel. Please select an available ${required} kennel.`};
    }
  }

  for(const x of assignments){
    const patch=type==="groomer"?{groomer_id:x.resourceId}:{kennel_id:x.resourceId};
    const {error}=await s.from("appointment_pets").update(patch).eq("id",x.appointmentPetId).eq("appointment_id",id);
    if(error)return {error:error.message};
  }
  const {error}=await s.from("appointments").update({status:"checked_in"}).eq("id",id);
  return {error:error?.message??null};
}

export function subscribeToServiceSessions(onChange:()=>void){
  const s=createClient(), ch=s.channel("pet-service-sessions-"+Math.random().toString(36).slice(2))
    .on("postgres_changes",{event:"*",schema:"public",table:"appointments"},onChange)
    .on("postgres_changes",{event:"*",schema:"public",table:"appointment_pets"},onChange)
    .on("postgres_changes",{event:"*",schema:"public",table:"groomers"},onChange)
    .on("postgres_changes",{event:"*",schema:"public",table:"kennels"},onChange).subscribe();
  return ()=>{s.removeChannel(ch)};
}
