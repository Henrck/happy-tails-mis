"use client";

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
    onSelectionChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    );
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
    <div className="w-full">
      <h2 className="text-xl font-bold text-brand-pink sm:text-2xl">
        Pet Information
      </h2>
      <p className="mt-1 text-sm text-zinc-500">
        Tell us about your furry friend!
      </p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 font-bold text-zinc-800">
          <span className="text-lg">🐾</span>
          <span>Your Registered Pets</span>
        </p>

        <button
          type="button"
          onClick={() => setAddingPet(true)}
          className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full bg-brand-pink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-pink-dark sm:w-auto"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          Add New Pet
        </button>
      </div>

      {pets.length === 0 ? (
        <div className="mt-4 rounded-2xl border-2 border-dashed border-pink-200 bg-white px-5 py-10 text-center sm:px-6 sm:py-12">
          <p className="text-4xl">🐾</p>
          <p className="mt-2 font-semibold text-zinc-700">No pets registered yet</p>
          <p className="mt-1 text-sm text-zinc-500">
            Add your pet&apos;s info to book their first appointment.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-3 lg:gap-4">
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

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-2.5 sm:mt-6 sm:gap-3">
        <button
          type="button"
          onClick={onBack}
          className="min-h-11 rounded-full border-2 border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-500 transition-colors hover:border-zinc-400"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="min-h-11 rounded-full bg-brand-pink px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-pink-dark"
        >
          Next
        </button>
      </div>

      {profilePet && (
        <WalkInPetProfileModal
          pet={profilePet}
          owner={customer}
          onClose={() => setProfilePet(null)}
        />
      )}

      {addingPet && (
        <AddPetModal
          customerId={customer.id}
          onClose={() => setAddingPet(false)}
          onAdded={handlePetAdded}
        />
      )}
    </div>
  );
}
