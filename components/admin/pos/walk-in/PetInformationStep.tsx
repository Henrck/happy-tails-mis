"use client";
import { useCallback, useEffect, useState } from "react";
import BookingPetInformationStep from "@/components/dashboard/booking/BookingPetInformationStep";
import { addPet, fetchPetsByCustomer, weightKgToSizeTier } from "@/lib/supabase/appointments";
import { normalizePetAge } from "@/lib/utils/pet-age";
import type { Pet } from "@/lib/types/appointments";
import type { Customer } from "@/lib/types/users";
import NewCustomerPetForm, { type NewPetEntry } from "./NewCustomerPetForm";

export default function PetInformationStep({ customer, onBack, onNext }: {
  customer: Customer | null; onBack: () => void;
  onNext: (pets: Pet[], ownerOverride?: { name: string; contact: string; address: string }) => void;
}) {
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(Boolean(customer));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const loadPets = useCallback(async () => {
    if (!customer) return;
    setLoading(true);setError(null);
    try {
      const result = await fetchPetsByCustomer(customer.id);
      if (result.error) {setError(result.error);return;}
      setPets(result.pets);
      setSelectedIds(ids=>ids.filter(id=>result.pets.some(p=>p.id===id)));
    } catch (caught) { setError(caught instanceof Error?caught.message:"Unable to load this customer's pets."); }
    finally {setLoading(false);}
  },[customer]);
  useEffect(()=>{if(customer)void loadPets();},[customer,loadPets]);
  async function handleNewCustomerSubmit(owner: {name:string;contact:string;address:string}, entries:NewPetEntry[]) {
    if(saving)return;
    setSaving(true);setError(null);
    const savedPets:Pet[]=[];
    try {
      for(const entry of entries){
        const weight=Number(entry.sizeKg);
        const age=normalizePetAge(entry.age);
        if(!age)throw new Error(`Invalid age for ${entry.name}.`);
        const {data,error:petError}=await addPet({
          customer_id:null,name:entry.name,species:entry.species,breed:entry.breed,
          size_label:weightKgToSizeTier(weight),owner_name:owner.name,owner_contact:owner.contact,
          ...age,sex:entry.sex||null,
        });
        if(petError||!data){setError(`Saved ${savedPets.length} of ${entries.length} pets, then failed: ${petError?.message??"No pet record returned"}`);return;}
        savedPets.push(data as Pet);
      }
      onNext(savedPets,owner);
    }catch(e){setError(e instanceof Error?e.message:"Unable to register the new pets.");}
    finally{setSaving(false);}
  }
  if(!customer)return <div className="mx-auto max-w-3xl">{error&&<p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}{saving&&<p role="status" className="mb-3 text-center text-sm text-zinc-500">Saving pet records…</p>}<NewCustomerPetForm onBack={onBack} onNext={handleNewCustomerSubmit}/></div>;
  if(loading)return <p role="status" className="py-16 text-center text-sm text-zinc-500">Loading registered pets…</p>;
  return <div className="mx-auto w-full max-w-4xl">{error&&<div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"><span>{error}</span><button type="button" onClick={()=>void loadPets()} className="font-semibold underline">Retry</button></div>}
    <BookingPetInformationStep customer={customer} pets={pets} onPetsChange={setPets} selectedIds={selectedIds} onSelectionChange={setSelectedIds} onBack={onBack} onNext={()=>{const chosen=pets.filter(p=>selectedIds.includes(p.id));if(chosen.length)onNext(chosen);}}/>
  </div>;
}
