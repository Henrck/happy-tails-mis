"use client";
import { useState, useMemo } from "react";
import { pets as initialPets, owners, type Pet, type Owner } from "@/lib/data/pet-records-mock";
import PetCard from "@/components/admin/pet-records/PetCard";
import PetFilters, { type PetFilterState } from "@/components/admin/pet-records/PetFilters";
import PetDetailModal from "@/components/admin/pet-records/PetDetailModal";
import OwnerPanel from "@/components/admin/pet-records/OwnerPanel";
import OwnerDetailModal from "@/components/admin/pet-records/OwnerDetailModal";

export default function PetRecordsPage() {
  const [pets, setPets] = useState(initialPets);
  const [filters, setFilters] = useState<PetFilterState>({ search: "", species: "all", ageSort: "none", breed: "" });
  const [ownerFilter, setOwnerFilter] = useState<string | "all">("all");
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null);

  const ownerById = (id: string) => owners.find((o) => o.id === id);

  const filteredPets = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    let result = pets.filter((pet) => {
      const owner = ownerById(pet.ownerId);
      const matchesSearch =
        !q || pet.name.toLowerCase().includes(q) || (owner?.name.toLowerCase().includes(q) ?? false);
      const matchesSpecies = filters.species === "all" || pet.species === filters.species;
      const matchesBreed = !filters.breed.trim() || pet.breed.toLowerCase().includes(filters.breed.trim().toLowerCase());
      const matchesOwner = ownerFilter === "all" || pet.ownerId === ownerFilter;
      return matchesSearch && matchesSpecies && matchesBreed && matchesOwner;
    });

    if (filters.ageSort === "youngest") result = [...result].sort((a, b) => a.age - b.age);
    if (filters.ageSort === "oldest") result = [...result].sort((a, b) => b.age - a.age);

    return result;
  }, [pets, filters, ownerFilter]);

  function updatePet(updated: Pet) {
    setPets((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setSelectedPet(updated);
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-brand-pink">Pet's Record</h1>

      <div className="mt-6 flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
          <PetFilters filters={filters} onChange={setFilters} />

          {ownerFilter !== "all" && (
            <div className="mt-3 flex items-center gap-2 text-sm text-zinc-600">
              Showing pets for <strong>{ownerById(ownerFilter)?.name}</strong>
              <button onClick={() => setOwnerFilter("all")} className="text-brand-pink hover:underline text-xs font-semibold">
                Clear
              </button>
            </div>
          )}

          <div className="mt-4 max-h-[calc(100vh-14rem)] overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 content-start">
            {filteredPets.length === 0 ? (
              <p className="col-span-full text-center text-zinc-400 py-10">No pets match your search/filter.</p>
            ) : (
              filteredPets.map((pet) => (
                <PetCard key={pet.id} pet={pet} owner={ownerById(pet.ownerId)} onView={() => setSelectedPet(pet)} />
              ))
            )}
          </div>
        </div>

        <OwnerPanel
          owners={owners}
          pets={pets}
          onSelectOwner={setSelectedOwner}
          onShowAll={() => setOwnerFilter("all")}
        />
      </div>

      {selectedPet && (
        <PetDetailModal
          pet={selectedPet}
          owner={ownerById(selectedPet.ownerId)}
          onClose={() => setSelectedPet(null)}
          onUpdate={updatePet}
        />
      )}

      {selectedOwner && (
        <OwnerDetailModal
          owner={selectedOwner}
          pets={pets}
          onClose={() => setSelectedOwner(null)}
          onViewPet={(pet) => {
            setSelectedOwner(null);
            setSelectedPet(pet);
          }}
        />
      )}
    </div>
  );
}
