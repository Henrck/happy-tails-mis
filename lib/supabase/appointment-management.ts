import {createClient} from "./client";
import type {Appointment,AppointmentStatus} from "@/lib/types/appointments";

export type AppointmentPetDetail={
 appointmentPetId:string; id:string; name:string; breed:string; size_label:string;
 groomerId:string|null; groomerName:string|null; packageName:string|null;
 packagePricingLabel:string|null; requestedKennelSize:"small"|"big"|null; kennelLabel:string|null; addonNames:string[]; lineAmount:number;
};
export type AppointmentRow=Appointment&{pets:AppointmentPetDetail[];groomerNames:string[]};
type RawPet={id:string;pet_id:string;groomer_id:string|null;kennel_id:string|null;line_amount:number|null;
 pets:{id:string;name:string;breed:string;size_label:string}|null;
 groomers:{id:string;name:string}|null;packages:{id:string;name:string}|null;
 package_pricing:{id:string;package_id:string;size_label:string;size_detail:string|null;packages:{name:string}|null}|null;
 kennels:{id:string;size:string;number:number}|null;
 appointment_addons:{addons:{name:string}|null}[]|null};
type RawAppointment=Appointment&{appointment_pets:RawPet[]|null};

async function fetchRaw(customerId?:string){
 const s=createClient();let q=s.from("appointments").select(`*,appointment_pets(
 id,pet_id,groomer_id,kennel_id,line_amount,pets(id,name,breed,size_label),
 groomers(id,name),packages(id,name),package_pricing(id,package_id,size_label,size_detail,packages(name)),
 kennels(id,size,number),appointment_addons(addons(name)))`)
 .order("scheduled_date",{ascending:false}).order("created_at",{ascending:false});
 if(customerId)q=q.eq("customer_id",customerId);
 const {data,error}=await q;if(error)return {rows:[] as AppointmentRow[],error:error.message};
 const rows=((data??[]) as unknown as RawAppointment[]).map(a=>{
  const pets=(a.appointment_pets??[]).map(p=>({
   appointmentPetId:p.id,id:p.pets?.id??"",name:p.pets?.name??"—",breed:p.pets?.breed??"—",
   size_label:p.pets?.size_label??"—",groomerId:p.groomer_id,groomerName:p.groomers?.name??null,
   packageName:p.packages?.name??null,
   packagePricingLabel:p.package_pricing?(p.package_pricing.size_detail??p.package_pricing.size_label):null,
   requestedKennelSize: (()=>{
    const text = `${p.packages?.name??p.package_pricing?.packages?.name??""} ${p.package_pricing?.size_label??""} ${p.package_pricing?.size_detail??""}`.toLowerCase();
    if (text.includes("small")) return "small" as const;
    if (text.includes("big")) return "big" as const;
    return null;
   })(),
   kennelLabel:p.kennels?`${p.kennels.size==="small"?"Small":"Big"} #${p.kennels.number}`:null,
   addonNames:(p.appointment_addons??[]).map(x=>x.addons?.name).filter((x):x is string=>Boolean(x)),
   lineAmount:p.line_amount??0
  }));
  return {...a,pets,groomerNames:Array.from(new Set(pets.map(p=>p.groomerName).filter(Boolean))) as string[]};
 });
 return {rows,error:null};
}
export async function fetchAppointments(){return fetchRaw()}
export async function fetchAppointmentsByCustomer(id:string){return fetchRaw(id)}
export async function fetchTodaysAppointmentCount(){
 const s=createClient(),today=new Date().toISOString().split("T")[0];
 const {count,error}=await s.from("appointments").select("id",{count:"exact",head:true}).eq("scheduled_date",today).neq("status","cancelled");
 return {count:count??0,error:error?.message};
}
export async function fetchTodaysTransactionTotal(){
 const s=createClient(),today=new Date().toISOString().split("T")[0];
 const {data,error}=await s.from("appointments").select("total_amount").eq("scheduled_date",today).neq("status","cancelled");
 return {total:(data??[]).reduce((n,r)=>n+(r.total_amount??0),0),error:error?.message};
}
const ORDER:AppointmentStatus[]=["pending","confirmed","checked_in","completed"];
export function nextValidStatus(s:AppointmentStatus){const i=ORDER.indexOf(s);return i<0||i===ORDER.length-1?null:ORDER[i+1]}
export async function updateAppointmentStatus(id:string,status:AppointmentStatus){
 const s=createClient();const {data,error}=await s.from("appointments").update({status}).eq("id",id).select().single();return {data,error};
}
export function subscribeToAppointments(onChange:()=>void){
 const s=createClient(),ch=s.channel("appointments-realtime-"+Math.random().toString(36).slice(2))
 .on("postgres_changes",{event:"*",schema:"public",table:"appointments"},onChange)
 .on("postgres_changes",{event:"*",schema:"public",table:"appointment_pets"},onChange).subscribe();
 return ()=>{s.removeChannel(ch)};
}
