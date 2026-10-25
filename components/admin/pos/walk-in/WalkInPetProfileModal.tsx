"use client";
import type { Pet } from "@/lib/types/appointments";
import type { Customer } from "@/lib/types/users";
import PetServiceHistory from "@/components/shared/PetServiceHistory";

export default function WalkInPetProfileModal({pet,owner,onClose}:{pet:Pet;owner:{name:string;contact:string;address:string}|Customer|null;onClose:()=>void}) {
  const isCustomer=(o:typeof owner):o is Customer=>!!o&&"full_name" in o;
  const ownerName=isCustomer(owner)?owner.full_name:owner?.name??"—";
  const ownerContact=isCustomer(owner)?owner.phone_number??"—":owner?.contact??"—";
  const ownerAddress=isCustomer(owner)?owner.address??"—":owner?.address??"—";
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 sm:p-4" onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-label={`${pet.name} pet profile and service history`} className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-xl" onClick={e=>e.stopPropagation()}>
      <div className="sticky top-0 z-10 flex items-center justify-between bg-brand-pink px-5 py-4 sm:px-6"><h3 className="text-lg font-bold text-white">{pet.name} — Pet Profile</h3><button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1 text-white hover:bg-white/20">✕</button></div>
      <div className="p-4 sm:p-6"><div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-pink-100 p-4"><h4 className="mb-3 text-sm font-bold text-zinc-800">Pet Information</h4><div className="space-y-2 text-sm text-zinc-700"><Row label="Pet Name" value={pet.name}/><Row label="Breed" value={pet.breed}/><Row label="Species" value={pet.species}/><Row label="Size" value={pet.size_label}/></div></section>
        <section className="rounded-2xl border border-pink-100 p-4"><h4 className="mb-3 text-sm font-bold text-zinc-800">Owner Information</h4><div className="space-y-2 text-sm text-zinc-700"><Row label="Owner Name" value={ownerName}/><Row label="Contact" value={ownerContact}/><Row label="Address" value={ownerAddress}/></div></section>
      </div><PetServiceHistory petId={pet.id}/></div>
    </div>
  </div>;
}
function Row({label,value}:{label:string;value:string|null}) {return <div className="flex justify-between gap-3"><span className="text-zinc-500">{label}</span><span className="text-right font-medium">{value||"—"}</span></div>}
