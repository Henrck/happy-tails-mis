// Pet/customer helpers and atomic booking submission. Keep all existing exports
// so POS, customer dashboard, and Pet Records continue to use the same API.
import { createClient } from "./client";
import type { Pet, Species, Sex, Appointment, AppointmentServiceType, DraftPetSelection, GroomingSizeTier } from "@/lib/types/appointments";
import { prepareBoardingShares } from "@/lib/booking/boarding-shared-checkout";

export async function fetchPetsByCustomer(customerId: string) {
  const { data, error } = await createClient().from("pets").select("*").eq("customer_id",customerId).order("name");
  return { pets: (data ?? []) as Pet[], error: error?.message };
}
export function subscribeToCustomerPets(customerId: string, onChange: () => void) {
  const client = createClient();
  const channel = client.channel(`customer-pets-${customerId}`)
    .on("postgres_changes",{event:"*",schema:"public",table:"pets",filter:`customer_id=eq.${customerId}`},onChange).subscribe();
  return () => { client.removeChannel(channel); };
}
export async function fetchAllPets() {
  const { data, error } = await createClient().from("pets").select("*").order("name");
  return { pets: (data ?? []) as Pet[], error: error?.message };
}
export async function fetchPetsWithAccounts() {
  const { data, error } = await createClient().from("pets").select("*").not("customer_id","is",null).order("name");
  return { pets: (data ?? []) as Pet[], error: error?.message };
}
export async function fetchPetsWithoutAccounts() {
  const { data, error } = await createClient().from("pets").select("*").is("customer_id",null).order("name");
  return { pets: (data ?? []) as Pet[], error: error?.message };
}
export async function updatePet(id: string, fields: { name: string; species: Species; breed: string; size_label: string; age: number | null; sex: Sex | null }) {
  const { data, error } = await createClient().from("pets").update(fields).eq("id",id).select();
  if(error) return {data,error};
  if (!data?.length) return {data,error:{message:"Update didn't apply — you may not have permission to edit this pet."}};
  return {data,error:null};
}
export async function addPet(pet: { customer_id: string|null; name: string; species: Species; breed: string; size_label: string; sex?: Sex|null; age?: number|null; owner_name?: string|null; owner_contact?: string|null }) {
  return createClient().from("pets").insert(pet).select().single();
}
export async function searchCustomers(query: string) {
  const q=query.trim();
  if(!q) return {customers:[],error:null};
  const {data,error}=await createClient().from("customers").select("*").ilike("full_name",`%${q}%`).eq("status","active").limit(10);
  return {customers:data??[],error:error?.message};
}
export function kennelFitCategory(sizeLabel: string): "small"|"medium"|"large" {
  const s=sizeLabel.trim().toLowerCase(); return s==="small"?"small":s==="medium"?"medium":"large";
}
export function weightKgToSizeTier(weightKg: number): GroomingSizeTier {
  if(weightKg<5) return "Small";if(weightKg<=12)return "Medium";if(weightKg<=17)return "Large";if(weightKg<=29)return "Extra Large";return "2X Extra Large";
}
export type KennelOccupant={size_label:string};
/** Legacy helper retained for existing callers. One Small kennel holds 1 Small or Medium;
 * a Big kennel holds 1 Large, Small+Medium, Medium+Medium, or 3 Small. */
export function canFitInKennel(kennelSize:"small"|"big",occupants:KennelOccupant[],newPetSizeLabel:string):{fits:boolean;reason?:string}{
  const all=[...occupants.map(p=>kennelFitCategory(p.size_label)),kennelFitCategory(newPetSizeLabel)].sort();
  const key=all.join("+");
  const okay=kennelSize==="small" ? (all.length===1 && all[0]!=="large")
    : ["small","medium","large","medium+small","medium+medium","small+small","small+small+small"].includes(key);
  return okay?{fits:true}:{fits:false,reason:"This combination exceeds the kennel's capacity or sharing policy."};
}
export async function fetchKennelOccupants(kennelId:string,date:string){
  const {data,error}=await createClient().from("appointment_pets")
   .select("pet_id,pets(size_label),appointments!inner(scheduled_date,drop_off_at,pick_up_at,status)")
   .eq("kennel_id",kennelId).neq("appointments.status","cancelled");
  if(error)return {occupants:[] as KennelOccupant[],error:error.message};
  const time=new Date(date).getTime();
  const found=(data??[]).filter((item:any)=>{
    const start=item.appointments?.drop_off_at?new Date(item.appointments.drop_off_at).getTime():null;
    const end=item.appointments?.pick_up_at?new Date(item.appointments.pick_up_at).getTime():null;
    return start!==null&&end!==null&&time>=start&&time<=end;
  });
  return {occupants:found.map((item:any)=>({size_label:item.pets?.size_label??""})),error:null};
}
export async function checkGroomerTimeConflict(groomerId:string,date:string,time:string,customerId:string|null,ownerContact:string){
  const {data,error}=await createClient().from("appointment_pets")
    .select("appointments!inner(id,customer_id,owner_contact,scheduled_date,scheduled_time,status)").eq("groomer_id",groomerId);
  if(error)return {conflict:false,error:error.message};
  const conflict=(data??[]).some((item:any)=>{
    const a=item.appointments;
    if(!a||a.status==="cancelled"||a.scheduled_date!==date||a.scheduled_time!==time)return false;
    return customerId?a.customer_id===customerId:a.owner_contact===ownerContact;
  });
  return {conflict,error:null};
}

export type CreateAppointmentInput={
  service_type:AppointmentServiceType;is_walk_in:boolean;customer_id:string|null;
  owner_name:string;owner_contact:string;owner_address:string|null;
  scheduled_date:string;scheduled_time:string|null;drop_off_at:string|null;
  pick_up_at:string|null;special_requests:string|null;petSelections:DraftPetSelection[];
};

/** Submit all services atomically. Explicit shared Boarding groups become ONE
 * appointment each. Return one response entry per ORIGINAL input for backward
 * compatibility with both existing summary screens' count checks.
 */
export async function createAppointmentsAtomic(params:CreateAppointmentInput[]){
  if(!params.length)return {appointments:[] as Appointment[],error:"No appointments to save."};
  const prepared=prepareBoardingShares(params);
  if(prepared.error)return {appointments:[] as Appointment[],error:prepared.error};
  const payload=prepared.inputs.map(appt=>({
    service_type:appt.service_type,is_walk_in:appt.is_walk_in,customer_id:appt.customer_id,
    owner_name:appt.owner_name,owner_contact:appt.owner_contact,owner_address:appt.owner_address,
    scheduled_date:appt.scheduled_date,scheduled_time:appt.scheduled_time,
    drop_off_at:appt.drop_off_at,pick_up_at:appt.pick_up_at,
    special_requests:appt.special_requests,
    pet_selections:appt.petSelections.map(sel=>({pet_id:sel.pet.id,package_id:sel.packageId,
      package_pricing_id:sel.packagePricingId,size_id:sel.sizeId,kennel_id:sel.kennelId,
      groomer_id:sel.groomerId,line_amount:sel.lineAmount,addon_ids:sel.addonIds})),
  }));
  const {data,error}=await createClient().rpc("happytails_create_appointments_atomic",{p_appointments:payload});
  if(error)return {appointments:[] as Appointment[],error:error.message};
  if(!Array.isArray(data)||data.length!==prepared.inputs.length)return {appointments:[] as Appointment[],error:"The booking result could not be confirmed. Check existing appointments before retrying."};
  const mapped=prepared.inputToSaved.map(index=>data[index] as Appointment);
  return {appointments:mapped,error:null};
}
export async function createAppointment(params:CreateAppointmentInput){
  const {appointments,error}=await createAppointmentsAtomic([params]);
  return {appointment:appointments[0]??null,error};
}
