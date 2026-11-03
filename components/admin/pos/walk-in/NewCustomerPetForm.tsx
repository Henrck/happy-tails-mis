"use client";
import { useState } from "react";
import { COMMON_BREEDS } from "@/lib/data/breed-suggestions";
import { normalizePetAge } from "@/lib/utils/pet-age";

export type NewPetEntry = { name: string; species: "Dog" | "Cat"; breed: string; sizeKg: string; age: string; sex: "Male" | "Female" | "" };
const emptyPet = (): NewPetEntry => ({ name: "", species: "Dog", breed: "", sizeKg: "", age: "", sex: "" });
const phoneError = (value: string) => !value ? "Contact number is required." : !/^\d+$/.test(value) ? "Use numbers only for the contact number." : value.length !== 11 ? "Enter exactly 11 digits (09XXXXXXXXX)." : !/^09\d{9}$/.test(value) ? "Mobile number must start with 09." : null;
function petError(pet: NewPetEntry, index: number): string | null {
  const label = `Pet ${index + 1}`;
  if (!pet.name.trim()) return `${label}: Enter the pet's name.`;
  if (!pet.breed.trim()) return `${label}: Enter or select a breed.`;
  if (!pet.sizeKg.trim()) return `${label}: Enter the pet's weight in kilograms.`;
  const weight = Number(pet.sizeKg);
  if (!Number.isFinite(weight) || weight <= 0 || weight > 200) return `${label}: Weight must be greater than 0 and no more than 200 kg.`;
  if (normalizePetAge(pet.age) === null) return `${label}: Enter an age such as 3 weeks, 6 months, or 2 years, or leave it blank.`;
  return null;
}
export default function NewCustomerPetForm({ onBack, onNext }: {
  onBack: () => void;
  onNext: (owner: { name: string; contact: string; address: string }, pets: NewPetEntry[]) => void;
}) {
  const [ownerName, setOwnerName] = useState("");
  const [ownerContact, setOwnerContact] = useState("");
  const [ownerAddress, setOwnerAddress] = useState("");
  const [pets, setPets] = useState<NewPetEntry[]>([emptyPet()]);
  const [error, setError] = useState<string | null>(null);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const contactError = phoneTouched ? phoneError(ownerContact) : null;
  const controlClass = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink";
  function updatePet(index: number, patch: Partial<NewPetEntry>) { setError(null);setPets(prev=>prev.map((pet,i)=>i===index?{...pet,...patch}:pet)); }
  function handleNext() {
    if (ownerName.trim().length < 2 || ownerName.trim().length > 100) { setError("Owner name must contain 2 to 100 characters."); return; }
    const issue = phoneError(ownerContact);
    if (issue) { setPhoneTouched(true);setError(issue);return; }
    if (ownerAddress.trim().length>300) { setError("Address must not exceed 300 characters."); return; }
    for (const [i, pet] of pets.entries()) { const problem = petError(pet,i);if(problem){setError(problem);return;} }
    setError(null);
    onNext({name:ownerName.trim(),contact:ownerContact,address:ownerAddress.trim()},pets.map(p=>({...p,name:p.name.trim(),breed:p.breed.trim(),sizeKg:p.sizeKg.trim(),age:p.age.trim()})));
  }
  return <div className="mx-auto max-w-2xl">
    <h2 className="text-center text-2xl font-bold text-brand-pink">Pet &amp; Owner Information</h2>
    <p className="mt-1 text-center text-sm text-zinc-500">Tell us about the customer and their pet(s).</p>
    <div className="mt-6 max-h-[60vh] space-y-6 overflow-y-auto pr-1">
      <section className="rounded-2xl border border-pink-100 bg-white p-5"><h3 className="mb-3 font-bold">Owner Information</h3><div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">Owner Name *<input className={controlClass} maxLength={100} autoComplete="name" value={ownerName} onChange={e=>{setOwnerName(e.target.value);setError(null);}}/></label>
        <label className="text-sm font-semibold">Contact Number *<input className={controlClass} type="tel" inputMode="numeric" maxLength={11} placeholder="09XXXXXXXXX" value={ownerContact} onBlur={()=>setPhoneTouched(true)} onChange={e=>{setOwnerContact(e.target.value.replace(/\D/g,"").slice(0,11));setError(null);}}/>{contactError&&<span role="alert" className="block text-xs text-red-600">{contactError}</span>}</label>
        <label className="text-sm font-semibold sm:col-span-2">Address<input className={controlClass} maxLength={300} value={ownerAddress} onChange={e=>{setOwnerAddress(e.target.value);setError(null);}}/></label>
      </div></section>
      {pets.map((pet,i)=><section className="relative rounded-2xl border border-pink-100 bg-white p-5" key={i}>
        <div className="mb-3 flex items-center justify-between"><h3 className="font-bold">Pet {i+1} Information</h3>{pets.length>1&&<button type="button" onClick={()=>setPets(prev=>prev.length>1?prev.filter((_,j)=>j!==i):prev)} className="text-xs font-semibold text-red-500">Remove</button>}</div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">Pet Name *<input className={controlClass} maxLength={100} value={pet.name} onChange={e=>updatePet(i,{name:e.target.value})}/></label>
          <label className="text-sm font-semibold">Species<select className={controlClass} value={pet.species} onChange={e=>updatePet(i,{species:e.target.value as NewPetEntry["species"]})}><option value="Dog">Dog</option><option value="Cat">Cat</option></select></label>
          <label className="text-sm font-semibold">Breed *<input className={controlClass} value={pet.breed} list={`breed-options-${i}`} maxLength={100} placeholder="Type or select a breed" onChange={e=>updatePet(i,{breed:e.target.value})}/><datalist id={`breed-options-${i}`}>{COMMON_BREEDS.map(b=><option value={b} key={b}/>)}</datalist></label>
          <label className="text-sm font-semibold">Weight (kg) *<input className={controlClass} type="text" inputMode="decimal" value={pet.sizeKg} placeholder="e.g. 5.5" onChange={e=>updatePet(i,{sizeKg:e.target.value.replace(/[^\d.]/g,"").replace(/(\..*)\./g,"$1").slice(0,8)})}/></label>
          <label className="text-sm font-semibold">Age <span className="font-normal text-zinc-400">(Optional)</span><input className={controlClass} type="text" maxLength={20} placeholder="e.g. 3 weeks, 6 months, 2 years" value={pet.age} onChange={e=>updatePet(i,{age:e.target.value})}/></label>
          <label className="text-sm font-semibold">Sex <span className="font-normal text-zinc-400">(Optional)</span><select className={controlClass} value={pet.sex} onChange={e=>updatePet(i,{sex:e.target.value as NewPetEntry["sex"]})}><option value="">—</option><option value="Male">Male</option><option value="Female">Female</option></select></label>
        </div>
      </section>)}
      <button type="button" className="w-full rounded-xl border-2 border-dashed border-pink-200 py-2.5 text-sm font-semibold text-brand-pink" onClick={()=>{setError(null);setPets(prev=>[...prev,emptyPet()]);}}>+ Add Another Pet</button>
    </div>
    {error&&<p role="alert" className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}
    <div className="mt-6 flex gap-3"><button type="button" onClick={onBack} className="flex-1 rounded-full border-2 border-zinc-300 py-2.5 font-semibold text-zinc-500">Back</button><button type="button" onClick={handleNext} className="flex-1 rounded-full bg-brand-pink py-2.5 font-semibold text-white">Next</button></div>
  </div>;
}
