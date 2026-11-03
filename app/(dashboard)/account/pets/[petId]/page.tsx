"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchPetsByCustomer } from "@/lib/supabase/appointments";
import { setCustomerPetArchived } from "@/lib/supabase/customer-pet-archive";
import { editCustomerPet } from "@/lib/utils/pet-size-guide";
import { normalizePetAge, petAgeLabel } from "@/lib/utils/pet-age";
import type { Pet } from "@/lib/types/appointments";
import { CustomerPetFields, useCustomerPetForm, blankCustomerPet, type CustomerPetForm } from "@/components/dashboard/CustomerPetFields";
import { usePetAvatarSettings } from "@/lib/hooks/usePetAvatarSettings";
import { resolvePetAvatar } from "@/lib/utils/pet-avatar";
import PetServiceHistory from "@/components/shared/PetServiceHistory";
import PetPhotoEditor from "@/components/shared/PetPhotoEditor";

type PetWithWeight = Pet & { weight_kg?: number | null; pet_size_id?: string | null; vaccination_status?: CustomerPetForm["vaccination_status"] | null };
export default function PetDetailPage() {
  const params = useParams<{petId:string}>();
  const router = useRouter();
  const [pet, setPet] = useState<PetWithWeight|null>(null);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [archiving,setArchiving] = useState(false);
  const [photoEditing,setPhotoEditing] = useState(false);
  const [confirmArchive,setConfirmArchive] = useState(false);
  const [message,setMessage] = useState("");
  const [isSuccess,setIsSuccess] = useState(false);
  const state=useCustomerPetForm();
  const settings=usePetAvatarSettings();
  useEffect(()=>{
    let active=true;
    void (async()=>{
      try {
        const {data:{user}, error: authError}=await createClient().auth.getUser();
        if(authError)throw authError;
        if(!user)return;
        const {pets,error: fetchError}=await fetchPetsByCustomer(user.id);
        if(fetchError)throw new Error(fetchError);
        if(!active)return;
        const row=(pets.find(p=>p.id===params.petId)??null) as PetWithWeight|null;
        setPet(row);
        if(row)state.setForm({...blankCustomerPet,vaccination_status:row.vaccination_status ?? blankCustomerPet.vaccination_status,name:row.name,species:row.species,breed:row.breed,weight:row.weight_kg==null?"":String(row.weight_kg),sex:row.sex??"",age:petAgeLabel(row)??""});
      } catch(e) {
        if(active)setMessage(e instanceof Error?e.message:"Unable to load pet details.");
      } finally {if(active)setLoading(false);}
    })();
    return()=>{active=false};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[params.petId]);

  async function save(e:FormEvent){
    e.preventDefault();
    if(!pet||saving||archiving||state.loadingGuide||!state.validate())return;
    setSaving(true);setMessage("");setIsSuccess(false);
    const {form,size}=state;
    const keepLegacySize=!form.weight.trim()&&form.species===pet.species;
    try {
      const changes = {
        name:form.name.trim(),species:form.species,breed:form.breed.trim(),
        vaccination_status: form.vaccination_status,
        size_label:size?.label??(keepLegacySize?pet.size_label:"Unclassified"),
        pet_size_id:size?.id??(keepLegacySize?pet.pet_size_id??null:null),
        weight_kg:form.weight.trim()?Number(form.weight):null,
        sex:form.sex||null,...normalizePetAge(form.age)!,
      };
      const {data,error}=await editCustomerPet(pet.id,changes);
      if(error)throw new Error(error.message);
      const saved=Array.isArray(data)?data[0]:null;
      if(!saved)throw new Error("The database did not confirm the update. Please try again.");
      setPet({ ...(saved as PetWithWeight), photo_url: (saved as PetWithWeight).photo_url ?? pet.photo_url });
      setMessage("Pet profile updated successfully.");setIsSuccess(true);
    } catch(e){setMessage(e instanceof Error?e.message:"Unable to save pet changes.");}
    finally{setSaving(false);}
  }

  async function archivePet(){
    if(!pet||saving||archiving)return;
    setArchiving(true);setMessage("");setIsSuccess(false);
    try {
      const error=await setCustomerPetArchived(pet.id,true);
      if(error){setMessage(error);setConfirmArchive(false);return;}
      router.replace("/account/pets");
    } catch(e) {
      setMessage(e instanceof Error?e.message:"Unable to archive this pet. Please try again.");
      setConfirmArchive(false);
    } finally {setArchiving(false);}
  }
  if(loading)return <p className="py-16 text-center text-zinc-500">Loading pet profile…</p>;
  if(!pet)return <p className="py-16 text-center text-zinc-500">{message||"Pet not found."}</p>;
  return <div className="mx-auto max-w-4xl space-y-6 pb-8">
    <button type="button" onClick={()=>router.push("/account/pets")} className="text-sm font-semibold text-brand-pink">← Back to My Pets</button>
    <div className="flex flex-wrap items-center gap-4 rounded-3xl bg-brand-pink p-6 text-white"><img src={pet.photo_url || resolvePetAvatar(settings,pet.species,pet.sex)} alt={`${pet.species} avatar`} className="h-20 w-20 shrink-0 rounded-full border-4 border-white/60 bg-white object-cover"/><div><p className="text-sm text-white/80">Pet Profile</p><h1 className="text-2xl font-bold">{pet.name}</h1></div><button type="button" disabled={saving||archiving} onClick={()=>setPhotoEditing(true)} className="rounded-full border border-white/70 bg-white/10 px-4 py-2 text-sm font-semibold text-white">{pet.photo_url?"Change Photo":"Add Photo"}</button></div>
    <form noValidate onSubmit={save} className="space-y-5 rounded-3xl border border-pink-100 bg-white p-6 md:p-8"><CustomerPetFields state={state}/>
      {pet.weight_kg==null&&<p className="text-xs text-amber-700">No weight is recorded. You can add it to update the estimated size. Without a weight, the existing size is kept if species is unchanged.</p>}
      {message&&<p role="status" className={`text-sm ${isSuccess?"text-green-600":"text-red-600"}`}>{message}</p>}
      <div className="flex justify-end"><button disabled={saving||archiving||state.loadingGuide} type="submit" className="rounded-xl bg-brand-pink px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving?"Saving…":"Save Pet Changes"}</button></div>
    </form>
    <PetServiceHistory petId={pet.id}/>
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6" aria-labelledby="pet-record-management">
      <h2 id="pet-record-management" className="text-base font-bold text-zinc-800">Pet record management</h2>
      <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm text-zinc-600">If this pet has passed away or is no longer in your care, archive their profile. Previous appointments and service history will be kept, and you can restore the profile later from Archived Pets.</p>
        <button type="button" disabled={saving||archiving} onClick={()=>setConfirmArchive(true)} className="shrink-0 rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50">Archive Pet</button>
      </div>
    </section>
    {confirmArchive&&<div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4"><div role="dialog" aria-modal="true" aria-labelledby="confirm-pet-archive-title" className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
      <h2 id="confirm-pet-archive-title" className="text-xl font-bold text-zinc-800">Archive {pet.name}?</h2>
      <p className="mt-3 text-sm text-zinc-600">This pet will be removed from active pets and new booking selections. Their existing history will be preserved. You can restore them from My Pets → Archived.</p>
      <div className="mt-6 flex gap-3"><button type="button" disabled={archiving} onClick={()=>setConfirmArchive(false)} className="flex-1 rounded-full border border-zinc-300 px-4 py-3 text-sm font-semibold">Keep Pet Active</button><button type="button" disabled={archiving} onClick={()=>void archivePet()} className="flex-1 rounded-full bg-brand-pink px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{archiving?"Archiving…":"Archive Pet"}</button></div>
    </div></div>}
    {photoEditing && <PetPhotoEditor petId={pet.id} petName={pet.name} onSaved={url=>setPet(p=>p?{...p,photo_url:url}:p)} onClose={()=>setPhotoEditing(false)}/>}
  </div>;
}
