"use client";
// Pet Information step. Branches on whether this is an existing customer
// (real pet cards, multi-select, fetched from the pets table) or a new
// one (the owner+pet form, which saves real pets with customer_id=null).
import { useState, useEffect, useCallback } from "react";
import { fetchPetsByCustomer, addPet, weightKgToSizeTier } from "@/lib/supabase/appointments";
import type { Pet } from "@/lib/types/appointments";
import type { Customer } from "@/lib/types/users";
import WalkInPetCard from "./WalkInPetCard";
import WalkInPetProfileModal from "./WalkInPetProfileModal";
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
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [profilePet, setProfilePet] = useState<Pet | null>(null);
  const [addingNewPet, setAddingNewPet] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadPets = useCallback(async () => {
    if (!customer) return;
    const { pets: data, error: err } = await fetchPetsByCustomer(customer.id);
    if (err) { setError(err); return; }
    setPets(data);
  }, [customer]);

  useEffect(() => {
    setLoading(true);
    loadPets().finally(() => setLoading(false));
  }, [loadPets]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleAddNewPetForExistingCustomer(name: string, species: "Dog" | "Cat", breed: string, sizeKg: string, age: string, sex: "Male" | "Female" | "") {
    if (!customer) return;
    setSaving(true);
    setError(null);
    const weight = parseFloat(sizeKg);
    const sizeLabel = isNaN(weight) ? sizeKg : weightKgToSizeTier(weight);
    const { data, error: err } = await addPet({
      customer_id: customer.id, name, species, breed, size_label: sizeLabel,
      age: age ? parseInt(age) : null,
      sex: sex || null,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    setAddingNewPet(false);
    await loadPets();
    if (data) setSelectedIds((prev) => [...prev, data.id]);
  }

  async function handleNewCustomerSubmit(
    owner: { name: string; contact: string; address: string },
    petEntries: NewPetEntry[]
  ) {
    setSaving(true);
    setError(null);
    const savedPets: Pet[] = [];
    for (const entry of petEntries) {
      const weight = parseFloat(entry.sizeKg);
      const sizeLabel = isNaN(weight) ? entry.sizeKg : weightKgToSizeTier(weight);
      const { data, error: err } = await addPet({
        customer_id: null, name: entry.name, species: entry.species, breed: entry.breed, size_label: sizeLabel,
        owner_name: owner.name, owner_contact: owner.contact,
        age: entry.age ? parseInt(entry.age) : null,
        sex: entry.sex || null,
      });
      if (err || !data) {
        setSaving(false);
        setError(`Saved ${savedPets.length} of ${petEntries.length} pets, then failed: ${err}`);
        return;
      }
      savedPets.push(data as Pet);
    }
    setSaving(false);
    onNext(savedPets, owner);
  }

  function handleContinue() {
    const selected = pets.filter((p) => selectedIds.includes(p.id));
    if (selected.length === 0) { setError("Select at least one pet to continue."); return; }
    onNext(selected);
  }

  // New customer: the form IS this step, full stop.
  if (!customer) {
    return <NewCustomerPetForm onBack={onBack} onNext={handleNewCustomerSubmit} />;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-brand-pink text-center">Client Record</h2>
      <p className="mt-1 text-sm text-zinc-500 text-center">Tell us about your furry friend!</p>

      <div className="mt-6 flex items-center justify-between">
        <p className="font-bold text-zinc-800">Your Registered Pets</p>
        <button onClick={() => setAddingNewPet(true)} className="text-sm font-semibold border-2 border-brand-pink text-brand-pink px-4 py-1.5 rounded-full hover:bg-brand-pink hover:text-white transition-colors">
          + Add New Pet
        </button>
      </div>

      {loading ? (
        <p className="mt-10 text-center text-zinc-400">Loading pets…</p>
      ) : pets.length === 0 ? (
        <p className="mt-10 text-center text-zinc-400">No pets on file yet. Add one to continue.</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
          {pets.map((pet) => (
            <WalkInPetCard
              key={pet.id}
              pet={pet}
              selected={selectedIds.includes(pet.id)}
              onToggle={() => toggleSelect(pet.id)}
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
        <button onClick={handleContinue} className="flex-1 bg-brand-pink hover:bg-brand-pink-dark text-white font-semibold py-2.5 rounded-full transition-colors">
          Next
        </button>
      </div>

      {profilePet && <WalkInPetProfileModal pet={profilePet} owner={customer} onClose={() => setProfilePet(null)} />}

      {addingNewPet && (
        <QuickAddPetModal saving={saving} onClose={() => setAddingNewPet(false)} onSave={handleAddNewPetForExistingCustomer} />
      )}
    </div>
  );
}

// Small inline modal for adding a pet to an EXISTING customer's account
// mid-flow — distinct from NewCustomerPetForm, which handles a brand new
// customer's whole owner+pets submission at once.
function QuickAddPetModal({
  saving,
  onClose,
  onSave,
}: {
  saving: boolean;
  onClose: () => void;
  onSave: (name: string, species: "Dog" | "Cat", breed: string, sizeKg: string, age: string, sex: "Male" | "Female" | "") => void;
}) {
  const [name, setName] = useState("");
  const [species, setSpecies] = useState<"Dog" | "Cat">("Dog");
  const [breed, setBreed] = useState("");
  const [sizeKg, setSizeKg] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<"Male" | "Female" | "">("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="bg-brand-pink px-6 py-4"><h3 className="text-white font-bold">Add New Pet</h3></div>
        <div className="px-6 py-5 space-y-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Pet Name" className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
          <select value={species} onChange={(e) => setSpecies(e.target.value as "Dog" | "Cat")} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink">
            <option value="Dog">Dog</option>
            <option value="Cat">Cat</option>
          </select>
          <input value={breed} onChange={(e) => setBreed(e.target.value)} placeholder="Breed" className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
          <input value={sizeKg} onChange={(e) => setSizeKg(e.target.value)} placeholder="KG" className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
          <div className="grid grid-cols-2 gap-3">
            <input type="number" min={0} value={age} onChange={(e) => setAge(e.target.value)} placeholder="Age (optional)" className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
            <select value={sex} onChange={(e) => setSex(e.target.value as "Male" | "Female" | "")} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink">
              <option value="">Sex (optional)</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
          <button
            onClick={() => { if (name.trim() && breed.trim() && sizeKg.trim()) onSave(name.trim(), species, breed.trim(), sizeKg.trim(), age, sex); }}
            disabled={saving}
            className="w-full bg-brand-pink hover:bg-brand-pink-dark disabled:opacity-50 text-white font-semibold py-2.5 rounded-full transition-colors"
          >
            {saving ? "Saving..." : "Add Pet"}
          </button>
        </div>
      </div>
    </div>
  );
}
