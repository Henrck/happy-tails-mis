"use client";
// Read-only pet detail popup, matching the "view profile" cards from the
// customer dashboard design (pet info + owner info in one card).
import type { Pet } from "@/lib/types/appointments";
import type { Customer } from "@/lib/types/users";

export default function WalkInPetProfileModal({
  pet,
  owner,
  onClose,
}: {
  pet: Pet;
  owner: { name: string; contact: string; address: string } | Customer | null;
  onClose: () => void;
}) {
  const isCustomer = (o: typeof owner): o is Customer => !!o && "full_name" in o;
  const ownerName = isCustomer(owner) ? owner.full_name : owner?.name ?? "—";
  const ownerContact = isCustomer(owner) ? owner.phone_number ?? "—" : owner?.contact ?? "—";
  const ownerAddress = isCustomer(owner) ? owner.address ?? "—" : owner?.address ?? "—";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="bg-brand-pink px-6 py-4 flex items-center justify-between">
          <h3 className="text-white font-bold">{pet.name}</h3>
          <button onClick={onClose} className="text-white hover:opacity-80" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 text-sm">
          <div>
            <p className="font-semibold text-zinc-700 mb-1.5">Pet Information</p>
            <div className="grid grid-cols-3 gap-2 text-zinc-600">
              <div><p className="text-xs text-zinc-400">Pet Name</p><p>{pet.name}</p></div>
              <div><p className="text-xs text-zinc-400">Breed</p><p>{pet.breed}</p></div>
              <div><p className="text-xs text-zinc-400">Size</p><p>{pet.size_label}</p></div>
            </div>
          </div>
          <div>
            <p className="font-semibold text-zinc-700 mb-1.5">Owner Information</p>
            <div className="text-zinc-600 space-y-1">
              <p><span className="text-xs text-zinc-400">Owner Name: </span>{ownerName}</p>
              <p><span className="text-xs text-zinc-400">Contact Number: </span>{ownerContact}</p>
              <p><span className="text-xs text-zinc-400">Address: </span>{ownerAddress}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
