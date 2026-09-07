"use client";
// Pet Information step of the customer Book Appointment wizard —
// matches the uploaded reference image: "Your Registered Pets" grid,
// a Select toggle mode, and "+ Add New Pet" opening the real-data modal.
// Reuses WalkInPetProfileModal (already generic — accepts a real
// Customer directly) rather than forking a second read-only pet modal.
import { useState } from "react";
import type { Pet } from "@/lib/types/appointments";
import type { Customer } from "@/lib/types/users";
import BookingPetCard from "./BookingPetCard";
import AddPetModal from "./AddPetModal";
import WalkInPetProfileModal from "@/components/admin/pos/walk-in/WalkInPetProfileModal";

export default function BookingPetInformationStep({
  customer,
  pets,
  onPetsChange,
  selectedIds,
  onSelectionChange,
  onBack,
  onNext,
}: {
  customer: Customer;
  pets: Pet[];
  onPetsChange: (pets: Pet[]) => void;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [profilePet, setProfilePet] = useState<Pet | null>(null);
  const [addingPet, setAddingPet] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleSelect(id: string) {
    onSelectionChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  }

  function handlePetAdded(pet: Pet) {
    onPetsChange([...pets, pet]);
    onSelectionChange([...selectedIds, pet.id]);
    setAddingPet(false);
  }

  function handleNext() {
    if (selectedIds.length === 0) {
      setError("Select at least one pet to continue.");
      return;
    }
    setError(null);
    onNext();
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-brand-pink">Pet Information</h2>
      <p className="mt-1 text-sm text-zinc-500">Tell us about your furry friend!</p>

      <div className="mt-5 flex items-center justify-between">
        <p className="flex items-center gap-2 font-bold text-zinc-800">
          <span className="text-lg">🐾</span> Your Registered Pets
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setAddingPet(true)}
            className="flex items-center gap-1.5 bg-brand-pink hover:bg-brand-pink-dark text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>
            Add New Pet
          </button>
        </div>
      </div>

      {pets.length === 0 ? (
        <div className="mt-4 bg-white rounded-2xl border-2 border-dashed border-pink-200 py-12 px-6 text-center">
          <p className="text-4xl">🐾</p>
          <p className="mt-2 font-semibold text-zinc-700">No pets registered yet</p>
          <p className="mt-1 text-sm text-zinc-500">Add your pet's info to book their first appointment.</p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pets.map((pet) => (
            <BookingPetCard
              key={pet.id}
              pet={pet}
              selected={selectedIds.includes(pet.id)}
              onToggleSelect={() => toggleSelect(pet.id)}
              onViewProfile={() => setProfilePet(pet)}
            />
          ))}
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="mt-6 flex gap-3">
        <button onClick={onBack} className="flex-1 border-2 border-zinc-300 text-zinc-500 font-semibold py-2.5 rounded-full hover:border-zinc-400 transition-colors">
          Back
        </button>
        <button onClick={handleNext} className="flex-1 bg-brand-pink hover:bg-brand-pink-dark text-white font-semibold py-2.5 rounded-full transition-colors">
          Next
        </button>
      </div>

      {profilePet && <WalkInPetProfileModal pet={profilePet} owner={customer} onClose={() => setProfilePet(null)} />}

      {addingPet && (
        <AddPetModal customerId={customer.id} onClose={() => setAddingPet(false)} onAdded={handlePetAdded} />
      )}
    </div>
  );
}
