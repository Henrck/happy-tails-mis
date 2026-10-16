"use client";

// Use the same registered-pet selection experience as customer booking.
// The walk-in-only new-customer path remains available for guests who do not
// have a HappyTails customer account.
import { useCallback, useEffect, useState } from "react";
import BookingPetInformationStep from "@/components/dashboard/booking/BookingPetInformationStep";
import { addPet, fetchPetsByCustomer, weightKgToSizeTier } from "@/lib/supabase/appointments";
import type { Pet } from "@/lib/types/appointments";
import type { Customer } from "@/lib/types/users";
import NewCustomerPetForm, { type NewPetEntry } from "./NewCustomerPetForm";

export default function PetInformationStep({
  customer,
  onBack,
  onNext,
}: {
  customer: Customer | null;
  onBack: () => void;
  onNext: (pets: Pet[], ownerOverride?: { name: string; contact: string; address: string }) => void;
}) {
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(Boolean(customer));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadPets = useCallback(async () => {
    if (!customer) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchPetsByCustomer(customer.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setPets(result.pets);
      setSelectedIds((ids) => ids.filter((id) => result.pets.some((pet) => pet.id === id)));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load this customer's pets.");
    } finally {
      setLoading(false);
    }
  }, [customer]);

  useEffect(() => {
    if (customer) void loadPets();
  }, [customer, loadPets]);

  async function handleNewCustomerSubmit(
    owner: { name: string; contact: string; address: string },
    entries: NewPetEntry[],
  ) {
    if (saving) return;
    setSaving(true);
    setError(null);
    const savedPets: Pet[] = [];
    try {
      for (const entry of entries) {
        const weight = parseFloat(entry.sizeKg);
        const sizeLabel = Number.isNaN(weight) ? entry.sizeKg : weightKgToSizeTier(weight);
        const { data, error: petError } = await addPet({
          customer_id: null,
          name: entry.name,
          species: entry.species,
          breed: entry.breed,
          size_label: sizeLabel,
          owner_name: owner.name,
          owner_contact: owner.contact,
          age: entry.age ? parseInt(entry.age, 10) : null,
          sex: entry.sex || null,
        });
        if (petError || !data) {
          setError(`Saved ${savedPets.length} of ${entries.length} pets, then failed: ${petError?.message ?? "No pet record returned"}`);
          return;
        }
        savedPets.push(data as Pet);
      }
      onNext(savedPets, owner);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to register the new pets.");
    } finally {
      setSaving(false);
    }
  }

  if (!customer) {
    return (
      <div className="mx-auto max-w-3xl">
        {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {saving && <p role="status" className="mb-3 text-center text-sm text-zinc-500">Saving pet records…</p>}
        <NewCustomerPetForm onBack={onBack} onNext={handleNewCustomerSubmit} />
      </div>
    );
  }

  if (loading) {
    return <p role="status" className="py-16 text-center text-sm text-zinc-500">Loading registered pets…</p>;
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      {error && (
        <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" onClick={() => void loadPets()} className="font-semibold underline">Retry</button>
        </div>
      )}
      <BookingPetInformationStep
        customer={customer}
        pets={pets}
        onPetsChange={setPets}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onBack={onBack}
        onNext={() => {
          const selectedPets = pets.filter((pet) => selectedIds.includes(pet.id));
          if (selectedPets.length > 0) onNext(selectedPets);
        }}
      />
    </div>
  );
}
