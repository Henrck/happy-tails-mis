"use client";
// Add New Pet modal for the customer dashboard's Pet Information step
// (Book Appointment wizard). Reuses the exact same pet fields as the
// walk-in flow's NewCustomerPetForm (name, species, breed combo, size,
// age, sex) — same underlying `pets` table, same real data shape, just
// adapted for a single pet at a time and a customer who's already
// known (their own account), rather than typing owner details fresh.
//
// Owner information is intentionally NOT collected here — for a
// logged-in customer, "owner info" IS their account (name, contact,
// address), which the pet is linked to via customer_id, not duplicated
// onto the pet row the way it is for accountless walk-ins.
import { useState } from "react";
import { addPet, weightKgToSizeTier } from "@/lib/supabase/appointments";
import { COMMON_BREEDS } from "@/lib/data/breed-suggestions";
import type { Pet, Species, Sex } from "@/lib/types/appointments";

export default function AddPetModal({
  customerId,
  onClose,
  onAdded,
}: {
  customerId: string;
  onClose: () => void;
  onAdded: (pet: Pet) => void;
}) {
  const [name, setName] = useState("");
  const [species, setSpecies] = useState<Species>("Dog");
  const [breed, setBreed] = useState("");
  const [sizeKg, setSizeKg] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<Sex | "">("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim() || !breed.trim() || !sizeKg.trim()) {
      setError("Pet name, breed, and size are required.");
      return;
    }
    setSaving(true);
    setError(null);

    const weight = parseFloat(sizeKg);
    const sizeLabel = isNaN(weight) ? sizeKg.trim() : weightKgToSizeTier(weight);

    const { data, error: err } = await addPet({
      customer_id: customerId,
      name: name.trim(),
      species,
      breed: breed.trim(),
      size_label: sizeLabel,
      age: age ? parseInt(age) : null,
      sex: sex || null,
    });

    setSaving(false);
    if (err || !data) { setError(err?.message ?? "Something went wrong saving your pet."); return; }
    onAdded(data as Pet);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="bg-brand-pink px-6 py-4 flex items-center justify-between sticky top-0">
          <h3 className="text-white font-bold">Add New Pet</h3>
          <button onClick={onClose} aria-label="Close" className="text-white hover:opacity-80">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-6 space-y-4">
          <p className="text-sm text-zinc-500">Tell us about your furry friend!</p>

          <div>
            <label className="text-sm font-semibold text-zinc-700">Pet Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
          </div>

          <div>
            <label className="text-sm font-semibold text-zinc-700">Species</label>
            <div className="mt-1.5 flex gap-3">
              <button
                onClick={() => setSpecies("Dog")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-sm font-semibold transition-colors ${species === "Dog" ? "bg-brand-pink border-brand-pink text-white" : "border-pink-200 text-zinc-600 hover:border-brand-pink"}`}
              >
                🐕 Dog
              </button>
              <button
                onClick={() => setSpecies("Cat")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-sm font-semibold transition-colors ${species === "Cat" ? "bg-brand-pink border-brand-pink text-white" : "border-pink-200 text-zinc-600 hover:border-brand-pink"}`}
              >
                🐈 Cat
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-zinc-700">Breed</label>
            <input
              value={breed}
              onChange={(e) => setBreed(e.target.value)}
              list="customer-breed-options"
              placeholder="Type or select a breed"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
            />
            <datalist id="customer-breed-options">
              {COMMON_BREEDS.map((b) => <option key={b} value={b} />)}
            </datalist>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-zinc-700">Size (KG)</label>
              <input value={sizeKg} onChange={(e) => setSizeKg(e.target.value)} placeholder="e.g. 7" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
            </div>
            <div>
              <label className="text-sm font-semibold text-zinc-700">Age <span className="font-normal text-zinc-400">(Optional)</span></label>
              <input type="number" min={0} value={age} onChange={(e) => setAge(e.target.value)} placeholder="Years" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-zinc-700">Sex <span className="font-normal text-zinc-400">(Optional)</span></label>
            <select value={sex} onChange={(e) => setSex(e.target.value as Sex | "")} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink">
              <option value="">—</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <button
            onClick={handleSave}
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
