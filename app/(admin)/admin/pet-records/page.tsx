"use client";

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
const PAGE_SIZE = 9;

export default function PetRecordsPage() {
  const [tab, setTab] = useState<Tab>("registered");
  const [registeredPets, setRegisteredPets] = useState<Pet[]>([]);
  const [walkInPets, setWalkInPets] = useState<Pet[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PetFilterState>({ search: "", species: "all", ageSort: "none", breed: "" });
  const [ownerFilter, setOwnerFilter] = useState<string | "all">("all");
  const [pages, setPages] = useState<Record<Tab, number>>({ registered: 1, "walk-in": 1 });
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const loadData = useCallback(async () => {
    const [regResult, walkResult, custResult] = await Promise.all([
      fetchPetsWithAccounts(), fetchPetsWithoutAccounts(), fetchCustomers(),
    ]);
    if (regResult.error) { setLoadError(regResult.error); return; }
    if (walkResult.error) { setLoadError(walkResult.error); return; }
    setLoadError(null);
    setRegisteredPets(regResult.pets);
    setWalkInPets(walkResult.pets);
    setCustomers(custResult.customers ?? []);
  }, []);

  useEffect(() => {
    setLoading(true);
    void loadData().finally(() => setLoading(false));
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

  const pageCount = Math.max(1, Math.ceil(filteredPets.length / PAGE_SIZE));
  const currentPage = Math.min(pages[tab], pageCount);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visiblePets = filteredPets.slice(startIndex, startIndex + PAGE_SIZE);

  function setPage(next: number) {
    setPages((previous) => ({ ...previous, [tab]: Math.max(1, Math.min(next, pageCount)) }));
  }
  function resetCurrentPage() {
    setPages((previous) => ({ ...previous, [tab]: 1 }));
  }
  function changeFilters(next: PetFilterState) {
    setFilters(next);
    resetCurrentPage();
  }
  function changeOwnerFilter(next: string | "all") {
    setOwnerFilter(next);
    resetCurrentPage();
  }
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
      <div className="mt-4 flex w-fit rounded-full border border-pink-200 bg-white p-1">
        <button type="button" onClick={() => switchTab("registered")} className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${tab === "registered" ? "bg-brand-pink text-white" : "text-zinc-600"}`}>
          Registered Owners <span className="ml-1 opacity-80">({registeredPets.length})</span>
        </button>
        <button type="button" onClick={() => switchTab("walk-in")} className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${tab === "walk-in" ? "bg-brand-pink text-white" : "text-zinc-600"}`}>
          Walk-in Only <span className="ml-1 opacity-80">({walkInPets.length})</span>
        </button>
      </div>
      {loadError && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{loadError}</p>}
      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        <div className="min-w-0 flex-1">
          <PetFilters filters={filters} onChange={changeFilters} />
          {tab === "registered" && ownerFilter !== "all" && (
            <div className="mt-3 flex items-center gap-2 text-sm text-zinc-600">
              Showing pets for <strong>{customerById(ownerFilter)?.full_name}</strong>
              <button type="button" onClick={() => changeOwnerFilter("all")} className="text-xs font-semibold text-brand-pink hover:underline">Clear</button>
            </div>
          )}
          <div className="mt-4 grid grid-cols-1 content-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <p className="col-span-full py-10 text-center text-zinc-400">Loading pets…</p>
            ) : filteredPets.length === 0 ? (
              <p className="col-span-full py-10 text-center text-zinc-400">
                {tab === "walk-in" ? "No walk-in-only pets match your filters." : "No pets match your search/filter."}
              </p>
            ) : visiblePets.map((pet) => (
              <PetCard key={pet.id} pet={pet} ownerName={ownerNameFor(pet)} onView={() => setSelectedPet(pet)} />
            ))}
          </div>
          {!loading && filteredPets.length > 0 && (
            <nav aria-label="Pet records pagination" className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-pink-100 bg-white px-4 py-3">
              <p className="text-xs text-zinc-500">
                Showing <strong>{startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, filteredPets.length)}</strong> of <strong>{filteredPets.length}</strong> pets
              </p>
              {pageCount > 1 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <button type="button" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1} className="rounded-full border border-pink-200 px-3 py-1.5 text-xs font-semibold text-brand-pink disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
                  {Array.from({ length: pageCount }, (_, index) => index + 1).filter((page) => page === 1 || page === pageCount || Math.abs(page - currentPage) <= 1).map((page, index, arr) => (
                    <span key={page} className="inline-flex items-center gap-1.5">
                      {index > 0 && page - arr[index - 1] > 1 && <span className="px-1 text-zinc-400" aria-hidden="true">…</span>}
                      <button type="button" aria-label={`Page ${page}`} aria-current={currentPage === page ? "page" : undefined} onClick={() => setPage(page)} className={`min-h-8 min-w-8 rounded-full px-2 text-xs font-bold ${currentPage === page ? "bg-brand-pink text-white" : "border border-pink-200 text-brand-pink hover:bg-pink-50"}`}>{page}</button>
                    </span>
                  ))}
                  <button type="button" onClick={() => setPage(currentPage + 1)} disabled={currentPage === pageCount} className="rounded-full border border-pink-200 px-3 py-1.5 text-xs font-semibold text-brand-pink disabled:cursor-not-allowed disabled:opacity-40">Next</button>
                </div>
              )}
            </nav>
          )}
        </div>
        {tab === "registered" && (
          <OwnerPanel customers={customers} pets={registeredPets} onSelectOwner={setSelectedCustomer} onShowAll={() => changeOwnerFilter("all")} />
        )}
      </div>
      {selectedPet && selectedPetOwner && (
        <PetDetailModal pet={selectedPet} ownerName={selectedPetOwner.name} ownerContact={selectedPetOwner.contact} ownerAddress={selectedPetOwner.address} onClose={() => setSelectedPet(null)} onUpdated={handlePetUpdated} />
      )}
      {selectedCustomer && (
        <OwnerDetailModal customer={selectedCustomer} pets={registeredPets} onClose={() => setSelectedCustomer(null)} onViewPet={(pet) => { setSelectedCustomer(null); setSelectedPet(pet); }} />
      )}
    </div>
  );
}
