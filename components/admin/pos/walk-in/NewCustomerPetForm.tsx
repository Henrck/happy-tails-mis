"use client";
// Pet Information step for walk-ins WITHOUT an account: owner info +
// one-or-more pets. This form does not create an account. The existing wizard
// owns persistence; these checks prevent invalid data entering that workflow.
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

// PH local mobile numbers: exactly 11 digits, beginning with 09.
const PHONE_PATTERN = /^09\d{9}$/;
function phoneError(value: string): string | null {
  if (!value) return "Contact number is required.";
  if (!/^\d+$/.test(value)) return "Use numbers only for the contact number.";
  if (value.length !== 11) return "Enter exactly 11 digits (09XXXXXXXXX).";
  if (!PHONE_PATTERN.test(value)) return "Mobile number must start with 09.";
  return null;
}
function petError(pet: NewPetEntry, index: number): string | null {
  const label = `Pet ${index + 1}`;
  if (!pet.name.trim()) return `${label}: Enter the pet's name.`;
  if (!pet.breed.trim()) return `${label}: Enter or select a breed.`;
  if (!pet.sizeKg.trim()) return `${label}: Enter the pet's weight in kilograms.`;
  const weight = Number(pet.sizeKg);
  if (!Number.isFinite(weight) || weight <= 0 || weight > 200) return `${label}: Weight must be greater than 0 and no more than 200 kg.`;
  if (pet.age.trim()) {
    const age = Number(pet.age);
    if (!Number.isInteger(age) || age < 0 || age > 50) return `${label}: Enter a whole-number age from 0 to 50, or leave it blank.`;
  }
  return null;
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
  const [phoneTouched, setPhoneTouched] = useState(false);
  const contactError = phoneTouched ? phoneError(ownerContact) : null;

  function updatePet(index: number, patch: Partial<NewPetEntry>) {
    setError(null);
    setPets((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  function addPetRow() {
    setError(null);
    setPets((prev) => [...prev, emptyPet()]);
  }

  function removePetRow(index: number) {
    setError(null);
    setPets((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  function handleNext() {
    if (!ownerName.trim()) {
      setError("Owner name is required.");
      return;
    }
    if (ownerName.trim().length < 2 || ownerName.trim().length > 100) {
      setError("Owner name must contain 2 to 100 characters.");
      return;
    }
    const invalidPhone = phoneError(ownerContact);
    if (invalidPhone) {
      setPhoneTouched(true);
      setError(invalidPhone);
      return;
    }
    if (ownerAddress.trim().length > 300) {
      setError("Address must not exceed 300 characters.");
      return;
    }
    for (const [index, pet] of pets.entries()) {
      const invalidPet = petError(pet, index);
      if (invalidPet) {
        setError(invalidPet);
        return;
      }
    }
    setError(null);
    onNext(
      { name: ownerName.trim(), contact: ownerContact, address: ownerAddress.trim() },
      pets.map((p) => ({ ...p, name: p.name.trim(), breed: p.breed.trim(), sizeKg: p.sizeKg.trim(), age: p.age.trim() }))
    );
  }

  const controlClass = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink";

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-brand-pink text-center">Pet &amp; Owner Information</h2>
      <p className="mt-1 text-sm text-zinc-500 text-center">Tell us about the customer and their pet(s).</p>

      {/* The form scrolls internally, leaving the wizard's Back/Next actions reachable. */}
      <div className="mt-6 max-h-[60vh] overflow-y-auto pr-1 space-y-6">
        <div className="bg-white rounded-2xl border border-pink-100 p-5">
          <p className="font-bold text-zinc-800 mb-3">Owner Information</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="walk-in-owner-name" className="text-sm font-semibold text-zinc-700">Owner Name <span className="text-red-500">*</span></label>
              <input id="walk-in-owner-name" autoComplete="name" maxLength={100} value={ownerName} onChange={(e) => { setOwnerName(e.target.value); setError(null); }} className={controlClass} />
            </div>
            <div>
              <label htmlFor="walk-in-owner-phone" className="text-sm font-semibold text-zinc-700">Contact Number <span className="text-red-500">*</span></label>
              <input
                id="walk-in-owner-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={11}
                pattern="09[0-9]{9}"
                placeholder="09XXXXXXXXX"
                value={ownerContact}
                onChange={(e) => {
                  // Prevent letters, punctuation, whitespace, and excess digits,
                  // including pasted content. Keep the initial zero intact.
                  setOwnerContact(e.target.value.replace(/\D/g, "").slice(0, 11));
                  setError(null);
                }}
                onBlur={() => setPhoneTouched(true)}
                aria-invalid={Boolean(contactError)}
                aria-describedby="walk-in-phone-help"
                className={`${controlClass} ${contactError ? "border-red-400 focus:ring-red-400" : ""}`}
              />
              <p id="walk-in-phone-help" className={`mt-1 text-xs ${contactError ? "text-red-600" : "text-zinc-500"}`}>
                {contactError ?? "11 digits only, starting with 09. Letters and symbols are not accepted."}
              </p>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="walk-in-owner-address" className="text-sm font-semibold text-zinc-700">Address</label>
              <input id="walk-in-owner-address" maxLength={300} value={ownerAddress} onChange={(e) => { setOwnerAddress(e.target.value); setError(null); }} className={controlClass} />
            </div>
          </div>
        </div>

        {pets.map((pet, i) => (
          <div key={i} className="bg-white rounded-2xl border border-pink-100 p-5 relative">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-zinc-800">Pet {i + 1} Information</p>
              {pets.length > 1 && (
                <button type="button" onClick={() => removePetRow(i)} className="text-xs font-semibold text-red-500 hover:underline">Remove</button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-zinc-700">Pet Name <span className="text-red-500">*</span></label>
                <input maxLength={100} value={pet.name} onChange={(e) => updatePet(i, { name: e.target.value })} className={controlClass} />
              </div>
              <div>
                <label className="text-sm font-semibold text-zinc-700">Species</label>
                <select value={pet.species} onChange={(e) => updatePet(i, { species: e.target.value as "Dog" | "Cat" })} className={controlClass}>
                  <option value="Dog">Dog</option>
                  <option value="Cat">Cat</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-zinc-700">Breed <span className="text-red-500">*</span></label>
                <input
                  value={pet.breed}
                  onChange={(e) => updatePet(i, { breed: e.target.value })}
                  list={`breed-options-${i}`}
                  maxLength={100}
                  placeholder="Type or select a breed"
                  className={controlClass}
                />
                <datalist id={`breed-options-${i}`}>
                  {COMMON_BREEDS.map((b) => <option key={b} value={b} />)}
                </datalist>
              </div>
              <div>
                <label className="text-sm font-semibold text-zinc-700">Weight (kg) <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={pet.sizeKg}
                  onChange={(e) => updatePet(i, { sizeKg: e.target.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1").slice(0, 8) })}
                  placeholder="e.g. 5.5"
                  className={controlClass}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-zinc-700">Age <span className="font-normal text-zinc-400">(Optional)</span></label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  step={1}
                  value={pet.age}
                  onChange={(e) => updatePet(i, { age: e.target.value })}
                  placeholder="Years"
                  className={controlClass}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-zinc-700">Sex <span className="font-normal text-zinc-400">(Optional)</span></label>
                <select
                  value={pet.sex}
                  onChange={(e) => updatePet(i, { sex: e.target.value as "Male" | "Female" | "" })}
                  className={controlClass}
                >
                  <option value="">—</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>
          </div>
        ))}

        <button type="button" onClick={addPetRow} className="w-full border-2 border-dashed border-pink-200 text-brand-pink font-semibold text-sm py-2.5 rounded-xl hover:border-brand-pink transition-colors">
          + Add Another Pet
        </button>
      </div>

      {error && <p role="alert" className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="mt-6 flex gap-3">
        <button type="button" onClick={onBack} className="flex-1 border-2 border-zinc-300 text-zinc-500 font-semibold py-2.5 rounded-full hover:border-zinc-400 transition-colors">
          Back
        </button>
        <button type="button" onClick={handleNext} className="flex-1 bg-brand-pink hover:bg-brand-pink-dark text-white font-semibold py-2.5 rounded-full transition-colors">
          Next
        </button>
      </div>
    </div>
  );
}
