"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchPetsByCustomer } from "@/lib/supabase/appointments";
import { editCustomerPet } from "@/lib/utils/pet-size-guide";
import type { Pet } from "@/lib/types/appointments";
import { CustomerPetFields, useCustomerPetForm } from "@/components/dashboard/CustomerPetFields";
import { usePetAvatarSettings } from "@/lib/hooks/usePetAvatarSettings";
import { resolvePetAvatar } from "@/lib/utils/pet-avatar";
import PetServiceHistory from "@/components/shared/PetServiceHistory";
type PetWithWeight = Pet & { weight_kg?: number | null; pet_size_id?: string | null };
export default function PetDetailPage() {
  const params = useParams<{petId:string}>();
  const router = useRouter();
  const [pet, setPet] = useState<PetWithWeight|null>(null);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [message,setMessage] = useState("");
  const state=useCustomerPetForm();
  const settings=usePetAvatarSettings();
  useEffect(()=>{
    let active=true;
    void (async()=>{
      const {data:{user}}=await createClient().auth.getUser();
      if(!user){if(active)setLoading(false);return;}
      const {pets}=await fetchPetsByCustomer(user.id);
      if(!active)return;
      const row=(pets.find(p=>p.id===params.petId)??null) as PetWithWeight|null;
      setPet(row);
      if(row)state.setForm({name:row.name,species:row.species,breed:row.breed,weight:row.weight_kg==null?"":String(row.weight_kg),sex:row.sex??"",age:row.age==null?"":String(row.age)});
      setLoading(false);
    })();
    return()=>{active=false};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[params.petId]);
  async function save(e:FormEvent){
    e.preventDefault();
    if(!pet||saving||!state.validate())return;
    setSaving(true);setMessage("");
    const {form,size}=state;
    const {error}=await editCustomerPet(pet.id,{name:form.name.trim(),species:form.species,breed:form.breed.trim(),size_label:size?.label??"Unclassified",pet_size_id:size?.id??null,weight_kg:form.weight.trim()?Number(form.weight):null,sex:form.sex||null,age:form.age.trim()?Number(form.age):null});
    setSaving(false);
    if(error)setMessage(error.message);
    else{setMessage("Pet profile updated successfully.");setPet({...pet,...form,size_label:size?.label??"Unclassified",pet_size_id:size?.id??null,weight_kg:form.weight.trim()?Number(form.weight):null,sex:form.sex||null,age:form.age.trim()?Number(form.age):null});}
  }
  if(loading)return <p className="py-16 text-center text-zinc-500">Loading pet profile…</p>;
  if(!pet)return <p className="py-16 text-center text-zinc-500">Pet not found.</p>;
  return <div className="mx-auto max-w-4xl space-y-6 pb-8">
    <button type="button" onClick={()=>router.push("/account/pets")} className="text-sm font-semibold text-brand-pink">← Back to My Pets</button>
    <div className="flex items-center gap-4 rounded-3xl bg-brand-pink p-6 text-white"><img src={resolvePetAvatar(settings,pet.species,pet.sex)} alt={`${pet.species} avatar`} className="h-20 w-20 shrink-0 rounded-full border-4 border-white/60 bg-white object-cover"/><div><p className="text-sm text-white/80">Pet Profile</p><h1 className="text-2xl font-bold">{pet.name}</h1></div></div>
    <form noValidate onSubmit={save} className="space-y-5 rounded-3xl border border-pink-100 bg-white p-6 md:p-8"><CustomerPetFields state={state}/>
      {pet.weight_kg==null&&<p className="text-xs text-amber-700">This pet was registered before weight tracking. Weight can be recorded by the staff when you visit the shop.</p>}
      {message&&<p role="status" className={`text-sm ${message.includes("successfully")?"text-green-600":"text-red-600"}`}>{message}</p>}
      <div className="flex justify-end"><button disabled={saving|| (!!state.form.weight.trim()?false:state.loadingGuide||!!state.guideError)} type="submit" className="rounded-xl bg-brand-pink px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving?"Saving…":"Save Pet Changes"}</button></div>
    </form>
    <PetServiceHistory petId={pet.id}/>
  </div>;
}
