"use client";
import type { Owner, Pet } from "@/lib/data/pet-records-mock";

export default function OwnerDetailModal({
  owner,
  pets,
  onClose,
  onViewPet,
}: {
  owner: Owner;
  pets: Pet[];
  onClose: () => void;
  onViewPet: (pet: Pet) => void;
}) {
  const ownerPets = pets.filter((p) => p.ownerId === owner.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="bg-brand-pink px-6 py-4 flex items-center justify-between sticky top-0">
          <h3 className="text-white font-bold">Owner Details</h3>
          <button onClick={onClose} className="text-white hover:opacity-80" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="w-14 h-14 rounded-full bg-brand-tint text-brand-pink text-xl font-bold flex items-center justify-center">
              {owner.name.charAt(0)}
            </span>
            <div>
              <h4 className="text-lg font-bold text-zinc-900">{owner.name}</h4>
              <p className="text-xs text-zinc-400">{owner.id}</p>
            </div>
          </div>

          <div className="mt-4 space-y-2 text-sm">
            <Row label="Age" value={`${owner.age} yrs`} />
            <Row label="Sex" value={owner.sex} />
            <Row label="Contact Number" value={owner.contactNumber} />
            <Row label="Address" value={owner.address} />
          </div>

          <h5 className="mt-5 text-sm font-bold text-brand-pink">
            Registered Pets ({ownerPets.length})
          </h5>
          <div className="mt-2 space-y-2">
            {ownerPets.map((pet) => (
              <button
                key={pet.id}
                onClick={() => onViewPet(pet)}
                className="w-full flex items-center justify-between bg-brand-tint hover:bg-pink-100 rounded-xl px-4 py-2.5 text-left transition-colors"
              >
                <div>
                  <p className="text-sm font-semibold text-zinc-800">{pet.name}</p>
                  <p className="text-xs text-zinc-500">{pet.breed} · {pet.sex}</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-pink">
                  <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <span className="text-zinc-500">{label}</span>
      <span className="font-medium text-zinc-800">{value || "—"}</span>
    </div>
  );
}
