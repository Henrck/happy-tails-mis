"use client";

import { useState } from "react";
import { updatePet } from "@/lib/supabase/appointments";
import type { Pet, Species, Sex } from "@/lib/types/appointments";
import SpeciesIcon from "./SpeciesIcon";
import PetServiceHistory from "@/components/shared/PetServiceHistory";

export default function PetDetailModal({ pet, ownerName, ownerContact, ownerAddress, onClose, onUpdated }: {
  pet: Pet; ownerName: string | null; ownerContact: string | null; ownerAddress: string | null;
  onClose: () => void; onUpdated: (updated: Pet) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(pet.name);
  const [breed, setBreed] = useState(pet.breed);
  const [species, setSpecies] = useState<Species>(pet.species);
  const [age, setAge] = useState(pet.age != null ? String(pet.age) : "");
  const [sex, setSex] = useState<Sex | "">(pet.sex ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function save() {
    if (saving) return;
    setSaving(true); setError(null);
    try {
      const { error: err } = await updatePet(pet.id, { name, breed, species, size_label: pet.size_label,
        age: age ? parseInt(age) : null, sex: sex || null });
      if (err) { setError(err.message); return; }
      onUpdated({ ...pet, name, breed, species, age: age ? parseInt(age) : null, sex: (sex || null) as Sex | null });
      setEditing(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to update pet."); }
    finally { setSaving(false); }
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-3 py-4" onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-label={`${pet.name} profile and service history`} className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-xl" onClick={e=>e.stopPropagation()}>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-pink-100 bg-white px-5 py-4 sm:px-7">
        <div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-tint"><SpeciesIcon species={pet.species} className="h-7 w-7 text-brand-pink"/></div>
          <div><h3 className="text-xl font-bold text-zinc-900">{pet.name}</h3><p className="text-xs text-zinc-500">{pet.breed} · {pet.sex ?? "—"}</p></div></div>
        <button type="button" onClick={onClose} aria-label="Close pet profile" className="rounded-full p-2 text-zinc-500 hover:bg-pink-50 hover:text-brand-pink">✕</button>
      </div>
      <div className="px-5 py-5 sm:px-7">
        <div className="grid gap-5 md:grid-cols-2">
          <section className="rounded-2xl border border-pink-100 bg-pink-50/30 p-4"><h4 className="mb-3 font-bold text-zinc-800">Pet Information</h4>
            {editing ? <div className="space-y-3">
              <Field label="Pet Name"><input value={name} onChange={e=>setName(e.target.value)} className="input"/></Field>
              <div className="grid grid-cols-2 gap-3"><Field label="Breed"><input value={breed} onChange={e=>setBreed(e.target.value)} className="input"/></Field><Field label="Age"><input type="number" min={0} value={age} onChange={e=>setAge(e.target.value)} className="input"/></Field></div>
              <div className="grid grid-cols-2 gap-3"><Field label="Sex"><select value={sex} onChange={e=>setSex(e.target.value as Sex|"")} className="input"><option value="">—</option><option value="Male">Male</option><option value="Female">Female</option></select></Field>
              <Field label="Species"><select value={species} onChange={e=>setSpecies(e.target.value as Species)} className="input"><option value="Dog">Dog</option><option value="Cat">Cat</option></select></Field></div>
              {error&&<p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
              <div className="flex gap-2"><button type="button" onClick={()=>{setEditing(false);setError(null);}} className="flex-1 rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold">Cancel</button><button type="button" disabled={saving} onClick={()=>void save()} className="flex-1 rounded-full bg-brand-pink px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving?"Saving…":"Save"}</button></div>
            </div> : <div className="space-y-2"><Row label="Breed" value={pet.breed}/><Row label="Size" value={pet.size_label}/><Row label="Age" value={pet.age != null?`${pet.age} yrs`:null}/><Row label="Sex" value={pet.sex}/>
              <button type="button" onClick={()=>setEditing(true)} className="mt-3 w-full rounded-full border-2 border-brand-pink py-2 text-sm font-semibold text-brand-pink hover:bg-pink-50">Edit Pet Info</button></div>}
          </section>
          <section className="rounded-2xl border border-pink-100 p-4"><h4 className="mb-3 font-bold text-zinc-800">Owner Information</h4><div className="space-y-2"><Row label="Owner Name" value={ownerName}/><Row label="Contact Number" value={ownerContact}/><Row label="Address" value={ownerAddress}/></div></section>
        </div>
        <PetServiceHistory petId={pet.id}/>
      </div>
      <style jsx>{`.input{width:100%;border-radius:0.75rem;border:1px solid #e4e4e7;background:white;padding:0.5rem 0.75rem;font-size:0.875rem}`}</style>
    </div>
  </div>;
}
function Field({label,children}:{label:string;children:React.ReactNode}) {return <label className="block text-xs font-semibold text-zinc-600">{label}<span className="mt-1 block">{children}</span></label>}
function Row({label,value}:{label:string;value:React.ReactNode}) {return <div className="flex justify-between gap-3 text-sm"><span className="text-zinc-500">{label}</span><span className="text-right font-medium text-zinc-800">{value||"—"}</span></div>}
