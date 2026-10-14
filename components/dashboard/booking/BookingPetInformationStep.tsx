"use client";
import { useState } from "react";
import { PawPrint, Plus, ArrowLeft, ArrowRight } from "lucide-react";
import type { Pet } from "@/lib/types/appointments";
import type { Customer } from "@/lib/types/users";
import BookingPetCard from "./BookingPetCard";
import AddPetModal from "./AddPetModal";
import WalkInPetProfileModal from "@/components/admin/pos/walk-in/WalkInPetProfileModal";
export default function BookingPetInformationStep({ customer, pets, onPetsChange, selectedIds, onSelectionChange, onBack, onNext }: {
  customer: Customer; pets: Pet[]; onPetsChange: (pets: Pet[]) => void; selectedIds: string[];
  onSelectionChange: (ids: string[]) => void; onBack: () => void; onNext: () => void;
}) {
  const [profilePet, setProfilePet] = useState<Pet | null>(null);
  const [addingPet, setAddingPet] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toggle = (id: string) => { onSelectionChange(selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds,id]); setError(null); };
  return <section className="ht-pet-choice flex flex-col">
    <header className="text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-pink-50 text-brand-pink"><PawPrint size={23}/></span>
      <h2 className="mt-3 text-2xl font-bold text-slate-800">Choose Your Pet</h2>
      <p className="mt-1 text-sm text-slate-500">Select one or more pets for this appointment.</p>
    </header>
    <div className="mt-5 flex items-center justify-between gap-3"><p className="text-sm font-bold text-slate-800">Your registered pets <span className="ml-1 text-xs font-medium text-slate-400">({pets.length})</span></p>
      <button type="button" onClick={() => setAddingPet(true)} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-brand-pink px-4 text-xs font-semibold text-brand-pink hover:bg-pink-50"><Plus size={15}/> Add New Pet</button>
    </div>
    <div className={`${pets.length > 10 ? "ht-pet-scroll-active" : ""} ht-pet-choice-scroll mt-3 overflow-y-auto overscroll-contain rounded-2xl border border-pink-100 bg-pink-50/20 p-3`} tabIndex={0} aria-label="Scroll registered pets">
      {pets.length ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{pets.map(pet => <BookingPetCard key={pet.id} pet={pet} selected={selectedIds.includes(pet.id)} onToggleSelect={() => toggle(pet.id)} onViewProfile={() => setProfilePet(pet)}/>)}</div>
      : <div className="py-12 text-center text-sm text-slate-500">No pets registered yet. Add your first pet to continue.</div>}
    </div>
    {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
    <div className="mt-5 grid grid-cols-2 gap-3 border-t border-pink-100 pt-5">
      <button type="button" onClick={onBack} className="flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-pink-200 text-sm font-semibold text-brand-pink"><ArrowLeft size={16}/> Back</button>
      <button type="button" onClick={() => selectedIds.length ? (setError(null),onNext()) : setError("Select at least one pet to continue.")} className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-pink text-sm font-semibold text-white">Next <ArrowRight size={16}/></button>
    </div>
    {profilePet && <WalkInPetProfileModal pet={profilePet} owner={customer} onClose={() => setProfilePet(null)}/>}
    {addingPet && <AddPetModal customerId={customer.id} onClose={() => setAddingPet(false)} onAdded={(pet) => {onPetsChange([...pets,pet]);onSelectionChange([...selectedIds,pet.id]);setAddingPet(false);}}/>}
  </section>;
}
