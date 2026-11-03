"use client";
import { useEffect, useState } from "react";
import { PawPrint, Plus, ArrowLeft, ArrowRight, CheckSquare2, X } from "lucide-react";
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
  const pageSize = 4;
  const [page, setPage] = useState(1);
  const activePets = pets.filter(p => !(p as Pet & { archived_at?: string | null }).archived_at);
  const activeIds = new Set(activePets.map(p => p.id));
  const selectedActiveIds = selectedIds.filter(id => activeIds.has(id));
  const allSelected = activePets.length > 0 && selectedActiveIds.length === activePets.length;
  const pageCount = Math.max(1, Math.ceil(activePets.length / pageSize));
  useEffect(() => { setPage(current => Math.min(current, pageCount)); }, [pageCount]);
  useEffect(() => {
    if (selectedIds.some(id => !activeIds.has(id))) onSelectionChange(selectedIds.filter(id => activeIds.has(id)));
  // Only trim selections when the active pet IDs change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePets.map(p => p.id).join("|")]);
  const shownPets = activePets.slice((page - 1) * pageSize, page * pageSize);
  const toggle = (id: string) => { onSelectionChange(selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedActiveIds,id]); setError(null); };
  const selectAll = () => { onSelectionChange(activePets.map(p => p.id)); setError(null); };
  const clearAll = () => { onSelectionChange([]); setError(null); };
  return <section className="ht-pet-choice flex flex-col">
    <header className="text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-pink-50 text-brand-pink"><PawPrint size={23}/></span>
      <h2 className="mt-3 text-2xl font-bold text-slate-800">Choose Your Pet</h2>
      <p className="mt-1 text-sm text-slate-500">Select one or more active pets for this appointment. Archived pets can be restored in My Pets.</p>
    </header>
    <div className="mt-5 flex items-center justify-between gap-3"><p className="text-sm font-bold text-slate-800">Your active pets <span className="ml-1 text-xs font-medium text-slate-400">({activePets.length})</span></p>
      <button type="button" onClick={() => setAddingPet(true)} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-brand-pink px-4 text-xs font-semibold text-brand-pink hover:bg-pink-50"><Plus size={15}/> Add New Pet</button>
    </div>
    {activePets.length > 0 && <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-pink-100 bg-white px-3 py-2.5 sm:px-4">
      <span className="text-xs font-semibold text-zinc-600" aria-live="polite">{selectedActiveIds.length} of {activePets.length} pets selected</span>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={selectAll} disabled={allSelected} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full bg-pink-50 px-3 text-xs font-semibold text-brand-pink transition hover:bg-pink-100 disabled:cursor-not-allowed disabled:opacity-50" aria-label="Select all active pets on every page"><CheckSquare2 size={15}/> Select All Pets</button>
        <button type="button" onClick={clearAll} disabled={selectedActiveIds.length === 0} className="inline-flex min-h-9 items-center justify-center gap-1 rounded-full border border-zinc-200 px-3 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Clear all selected pets"><X size={14}/> Clear</button>
      </div>
    </div>}
    <div className="mt-3 rounded-2xl border border-pink-100 bg-pink-50/20 p-3">
      {activePets.length ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{shownPets.map(pet => <BookingPetCard key={pet.id} pet={pet} selected={selectedActiveIds.includes(pet.id)} onToggleSelect={() => toggle(pet.id)} onViewProfile={() => setProfilePet(pet)}/>)}</div>
      : <div className="py-12 text-center text-sm text-slate-500">No active pets available. Add a new pet or restore one in My Pets.</div>}
    </div>
    {activePets.length > pageSize && <nav aria-label="Pet pages" className="mt-3 flex flex-wrap items-center justify-center gap-2">
      <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-full border border-pink-200 px-3 py-1.5 text-xs font-semibold text-brand-pink disabled:opacity-40">Previous</button>
      {Array.from({length: pageCount}, (_, i) => i + 1).map(n => <button type="button" key={n} onClick={() => setPage(n)} aria-current={page === n ? "page" : undefined} className={`h-8 min-w-8 rounded-full px-2 text-xs font-bold ${page === n ? "bg-brand-pink text-white" : "border border-pink-200 bg-white text-brand-pink"}`}>{n}</button>)}
      <button type="button" onClick={() => setPage(p => Math.min(pageCount, p + 1))} disabled={page === pageCount} className="rounded-full border border-pink-200 px-3 py-1.5 text-xs font-semibold text-brand-pink disabled:opacity-40">Next</button>
      <span className="w-full text-center text-xs text-slate-500">Showing {(page - 1) * pageSize + 1}–{Math.min(activePets.length, page * pageSize)} of {activePets.length} pets</span>
    </nav>}
    {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
    <div className="mt-5 grid grid-cols-2 gap-3 border-t border-pink-100 pt-5">
      <button type="button" onClick={onBack} className="flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-pink-200 text-sm font-semibold text-brand-pink"><ArrowLeft size={16}/> Back</button>
      <button type="button" disabled={selectedActiveIds.length === 0} onClick={() => selectedActiveIds.length ? (setError(null),onNext()) : setError("Select at least one active pet to continue.")} className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-pink text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Next <ArrowRight size={16}/></button>
    </div>
    {profilePet && <WalkInPetProfileModal pet={profilePet} owner={customer} onClose={() => setProfilePet(null)}/>}
    {addingPet && <AddPetModal customerId={customer.id} onClose={() => setAddingPet(false)} onAdded={(pet) => {onPetsChange([...pets,pet]);onSelectionChange([...selectedActiveIds,pet.id]);setAddingPet(false);setPage(Math.ceil((activePets.length + 1) / pageSize));}}/>}
  </section>;
}
