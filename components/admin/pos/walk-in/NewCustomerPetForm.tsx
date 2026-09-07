"use client";
// Pet Information step for walk-ins WITHOUT an account: owner info +
// one-or-more pets, all saved for real to the pets table (customer_id
// left null — this person has no account, matching how the schema
// deliberately allows that). Scrolls internally so the form stays
// usable on shorter screens without pushing the wizard's Back/Next bar
// off-screen.
import { useState } from "react";
import { COMMON_BREEDS } from "@/lib/data/breed-suggestions";

export type NewPetEntry = {
  name: string;
  species: "Dog" | "Cat";
  breed: string;
  sizeKg: string;
  age: string;
  sex: "Male" | "Female" | "";
};

function emptyPet(): NewPetEntry {
  return { name: "", species: "Dog", breed: "", sizeKg: "", age: "", sex: "" };
}

export default function NewCustomerPetForm({
  onBack,
  onNext,
}: {
  onBack: () => void;
  onNext: (owner: { name: string; contact: string; address: string }, pets: NewPetEntry[]) => void;
}) {
  const [ownerName, setOwnerName] = useState("");
  const [ownerContact, setOwnerContact] = useState("");
  const [ownerAddress, setOwnerAddress] = useState("");
  const [pets, setPets] = useState<NewPetEntry[]>([emptyPet()]);
  const [error, setError] = useState<string | null>(null);

  function updatePet(index: number, patch: Partial<NewPetEntry>) {
    setPets((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  function addPetRow() {
    setPets((prev) => [...prev, emptyPet()]);
  }

  function removePetRow(index: number) {
    setPets((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  function handleNext() {
    if (!ownerName.trim() || !ownerContact.trim()) {
      setError("Owner name and contact number are required.");
      return;
    }
    for (const p of pets) {
      if (!p.name.trim() || !p.breed.trim() || !p.sizeKg.trim()) {
        setError("Every pet needs a name, breed, and size before continuing.");
        return;
      }
    }
    setError(null);
    onNext({ name: ownerName.trim(), contact: ownerContact.trim(), address: ownerAddress.trim() }, pets);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-brand-pink text-center">Pet & Owner Information</h2>
      <p className="mt-1 text-sm text-zinc-500 text-center">Tell us about the customer and their pet(s).</p>

      {/* Internal scroll: the form body scrolls, the Back/Next bar stays put */}
      <div className="mt-6 max-h-[60vh] overflow-y-auto pr-1 space-y-6">
        <div className="bg-white rounded-2xl border border-pink-100 p-5">
          <p className="font-bold text-zinc-800 mb-3">Owner Information</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-zinc-700">Owner Name</label>
              <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
            </div>
            <div>
              <label className="text-sm font-semibold text-zinc-700">Contact Number</label>
              <input value={ownerContact} onChange={(e) => setOwnerContact(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-semibold text-zinc-700">Address</label>
              <input value={ownerAddress} onChange={(e) => setOwnerAddress(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
            </div>
          </div>
        </div>

        {pets.map((pet, i) => (
          <div key={i} className="bg-white rounded-2xl border border-pink-100 p-5 relative">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-zinc-800">Pet {i + 1} Information</p>
              {pets.length > 1 && (
                <button onClick={() => removePetRow(i)} className="text-xs font-semibold text-red-500 hover:underline">Remove</button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-zinc-700">Pet Name</label>
                <input value={pet.name} onChange={(e) => updatePet(i, { name: e.target.value })} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
              </div>
              <div>
                <label className="text-sm font-semibold text-zinc-700">Species</label>
                <select value={pet.species} onChange={(e) => updatePet(i, { species: e.target.value as "Dog" | "Cat" })} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink">
                  <option value="Dog">Dog</option>
                  <option value="Cat">Cat</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-zinc-700">Breed</label>
                <input
                  value={pet.breed}
                  onChange={(e) => updatePet(i, { breed: e.target.value })}
                  list={`breed-options-${i}`}
                  placeholder="Type or select a breed"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
                />
                <datalist id={`breed-options-${i}`}>
                  {COMMON_BREEDS.map((b) => <option key={b} value={b} />)}
                </datalist>
              </div>
              <div>
                <label className="text-sm font-semibold text-zinc-700">Size</label>
                <input
                  value={pet.sizeKg}
                  onChange={(e) => updatePet(i, { sizeKg: e.target.value })}
                  placeholder="KG"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-zinc-700">Age <span className="font-normal text-zinc-400">(Optional)</span></label>
                <input
                  type="number"
                  min={0}
                  value={pet.age}
                  onChange={(e) => updatePet(i, { age: e.target.value })}
                  placeholder="Years"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-zinc-700">Sex <span className="font-normal text-zinc-400">(Optional)</span></label>
                <select
                  value={pet.sex}
                  onChange={(e) => updatePet(i, { sex: e.target.value as "Male" | "Female" | "" })}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
                >
                  <option value="">—</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>
          </div>
        ))}

        <button onClick={addPetRow} className="w-full border-2 border-dashed border-pink-200 text-brand-pink font-semibold text-sm py-2.5 rounded-xl hover:border-brand-pink transition-colors">
          + Add Another Pet
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="mt-6 flex gap-3">
        <button onClick={onBack} className="flex-1 border-2 border-zinc-300 text-zinc-500 font-semibold py-2.5 rounded-full hover:border-zinc-400 transition-colors">
          Back
        </button>
        <button onClick={handleNext} className="flex-1 bg-brand-pink hover:bg-brand-pink-dark text-white font-semibold py-2.5 rounded-full transition-colors">
          Next
        </button>
      </div>
    </div>
  );
}
