"use client";
// Real Pet's Record page — two tabs per your requested split: pets tied
// to a registered customer account, and walk-in-only pets with no
// account (pets.customer_id is null). This is a genuine schema
// distinction, not a UI-only filter — customer_id was made nullable
// from the start specifically for this case.
import { useState, useEffect, useCallback } from "react";
import { fetchPetsWithAccounts, fetchPetsWithoutAccounts } from "@/lib/supabase/appointments";
import { fetchCustomers } from "@/lib/supabase/users";
import type { Pet } from "@/lib/types/appointments";
import type { Customer } from "@/lib/types/users";
import PetCard from "@/components/admin/pet-records/PetCard";
import PetFilters, { type PetFilterState } from "@/components/admin/pet-records/PetFilters";
import PetDetailModal from "@/components/admin/pet-records/PetDetailModal";
import OwnerPanel from "@/components/admin/pet-records/OwnerPanel";
import OwnerDetailModal from "@/components/admin/pet-records/OwnerDetailModal";

type Tab = "registered" | "walk-in";

export default function PetRecordsPage() {
  const [tab, setTab] = useState<Tab>("registered");
  const [registeredPets, setRegisteredPets] = useState<Pet[]>([]);
  const [walkInPets, setWalkInPets] = useState<Pet[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [filters, setFilters] = useState<PetFilterState>({ search: "", species: "all", ageSort: "none", breed: "" });
  const [ownerFilter, setOwnerFilter] = useState<string | "all">("all");
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const loadData = useCallback(async () => {
    const [regResult, walkResult, custResult] = await Promise.all([
      fetchPetsWithAccounts(),
      fetchPetsWithoutAccounts(),
      fetchCustomers(),
    ]);
    if (regResult.error) { setLoadError(regResult.error); return; }
    setLoadError(null);
    setRegisteredPets(regResult.pets);
    setWalkInPets(walkResult.pets);
    setCustomers(custResult.customers ?? []);
  }, []);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const pets = tab === "registered" ? registeredPets : walkInPets;
  const customerById = (id: string) => customers.find((c) => c.id === id);

  function ownerNameFor(pet: Pet): string | null {
    if (tab === "registered") return pet.customer_id ? customerById(pet.customer_id)?.full_name ?? null : null;
    return pet.owner_name;
  }

  const filteredPets = (() => {
    const q = filters.search.trim().toLowerCase();
    let result = pets.filter((pet) => {
      const owner = ownerNameFor(pet);
      const matchesSearch = !q || pet.name.toLowerCase().includes(q) || (owner?.toLowerCase().includes(q) ?? false);
      const matchesSpecies = filters.species === "all" || pet.species === filters.species;
      const matchesBreed = !filters.breed.trim() || pet.breed.toLowerCase().includes(filters.breed.trim().toLowerCase());
      const matchesOwner = tab === "walk-in" || ownerFilter === "all" || pet.customer_id === ownerFilter;
      return matchesSearch && matchesSpecies && matchesBreed && matchesOwner;
    });

    if (filters.ageSort === "youngest") result = [...result].sort((a, b) => (a.age ?? 999) - (b.age ?? 999));
    if (filters.ageSort === "oldest") result = [...result].sort((a, b) => (b.age ?? -1) - (a.age ?? -1));

    return result;
  })();

  function handlePetUpdated(updated: Pet) {
    const setter = tab === "registered" ? setRegisteredPets : setWalkInPets;
    setter((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setSelectedPet(updated);
  }

  function switchTab(next: Tab) {
    setTab(next);
    setOwnerFilter("all");
    setFilters((f) => ({ ...f, search: "" }));
  }

  const selectedPetOwner = selectedPet
    ? tab === "registered"
      ? { name: customerById(selectedPet.customer_id ?? "")?.full_name ?? null, contact: customerById(selectedPet.customer_id ?? "")?.phone_number ?? null, address: customerById(selectedPet.customer_id ?? "")?.address ?? null }
      : { name: selectedPet.owner_name, contact: selectedPet.owner_contact, address: null }
    : null;

  return (
    <div>
      <h1 className="text-3xl font-bold text-brand-pink">Pet's Record</h1>

      <div className="mt-4 flex rounded-full border border-pink-200 bg-white p-1 w-fit">
        <button
          onClick={() => switchTab("registered")}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${tab === "registered" ? "bg-brand-pink text-white" : "text-zinc-600"}`}
        >
          Registered Owners <span className="ml-1 opacity-80">({registeredPets.length})</span>
        </button>
        <button
          onClick={() => switchTab("walk-in")}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${tab === "walk-in" ? "bg-brand-pink text-white" : "text-zinc-600"}`}
        >
          Walk-in Only <span className="ml-1 opacity-80">({walkInPets.length})</span>
        </button>
      </div>

      {loadError && <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{loadError}</p>}

      <div className="mt-6 flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
          <PetFilters filters={filters} onChange={setFilters} />

          {tab === "registered" && ownerFilter !== "all" && (
            <div className="mt-3 flex items-center gap-2 text-sm text-zinc-600">
              Showing pets for <strong>{customerById(ownerFilter)?.full_name}</strong>
              <button onClick={() => setOwnerFilter("all")} className="text-brand-pink hover:underline text-xs font-semibold">
                Clear
              </button>
            </div>
          )}

          <div className="mt-4 max-h-[calc(100vh-14rem)] overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 content-start">
            {loading ? (
              <p className="col-span-full text-center text-zinc-400 py-10">Loading pets…</p>
            ) : filteredPets.length === 0 ? (
              <p className="col-span-full text-center text-zinc-400 py-10">
                {tab === "walk-in" ? "No walk-in-only pets recorded yet." : "No pets match your search/filter."}
              </p>
            ) : (
              filteredPets.map((pet) => (
                <PetCard key={pet.id} pet={pet} ownerName={ownerNameFor(pet)} onView={() => setSelectedPet(pet)} />
              ))
            )}
          </div>
        </div>

        {tab === "registered" && (
          <OwnerPanel
            customers={customers}
            pets={registeredPets}
            onSelectOwner={setSelectedCustomer}
            onShowAll={() => setOwnerFilter("all")}
          />
        )}
      </div>

      {selectedPet && selectedPetOwner && (
        <PetDetailModal
          pet={selectedPet}
          ownerName={selectedPetOwner.name}
          ownerContact={selectedPetOwner.contact}
          ownerAddress={selectedPetOwner.address}
          onClose={() => setSelectedPet(null)}
          onUpdated={handlePetUpdated}
        />
      )}

      {selectedCustomer && (
        <OwnerDetailModal
          customer={selectedCustomer}
          pets={registeredPets}
          onClose={() => setSelectedCustomer(null)}
          onViewPet={(pet) => {
            setSelectedCustomer(null);
            setSelectedPet(pet);
          }}
        />
      )}
    </div>
  );
}
