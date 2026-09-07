"use client";
// Real version — onUpdate now calls updatePet() for real instead of just
// mutating local state. Owner info section shows either the matched
// Customer (Registered tab) or the pet's own owner_name/owner_contact
// (Walk-in Only tab) — same "resolved owner info passed in" pattern as
// PetCard, so this modal doesn't need to know which tab it came from.
import { useState } from "react";
import { updatePet } from "@/lib/supabase/appointments";
import type { Pet, Species, Sex } from "@/lib/types/appointments";
import SpeciesIcon from "./SpeciesIcon";

export default function PetDetailModal({
  pet,
  ownerName,
  ownerContact,
  ownerAddress,
  onClose,
  onUpdated,
}: {
  pet: Pet;
  ownerName: string | null;
  ownerContact: string | null;
  ownerAddress: string | null;
  onClose: () => void;
  onUpdated: (updated: Pet) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(pet.name);
  const [breed, setBreed] = useState(pet.breed);
  const [species, setSpecies] = useState<Species>(pet.species);
  const [age, setAge] = useState(pet.age != null ? String(pet.age) : "");
  const [sex, setSex] = useState<Sex | "">(pet.sex ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    const { error: err } = await updatePet(pet.id, {
      name, breed, species,
      size_label: pet.size_label,
      age: age ? parseInt(age) : null,
      sex: sex || null,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    onUpdated({ ...pet, name, breed, species, age: age ? parseInt(age) : null, sex: (sex || null) as Sex | null });
    setEditing(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 pt-5 pb-4 relative">
          <button onClick={onClose} aria-label="Close" className="absolute top-4 right-4 text-zinc-400 hover:text-red-500 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>

          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-brand-tint flex items-center justify-center">
              <SpeciesIcon species={pet.species} className="w-8 h-8 text-brand-pink" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-zinc-900">{pet.name}</h3>
              <p className="text-sm text-zinc-500">{pet.breed} · {pet.sex ?? "—"}</p>
            </div>
          </div>
        </div>

        <div className="border-t border-pink-100" />

        <div className="px-6 py-5 space-y-4">
          {editing ? (
            <>
              <Field label="Pet Name"><input value={name} onChange={(e) => setName(e.target.value)} className="input" /></Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Breed"><input value={breed} onChange={(e) => setBreed(e.target.value)} className="input" /></Field>
                <Field label="Age"><input type="number" min={0} value={age} onChange={(e) => setAge(e.target.value)} className="input" /></Field>
                <Field label="Sex">
                  <select value={sex} onChange={(e) => setSex(e.target.value as Sex | "")} className="input">
                    <option value="">—</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </Field>
              </div>
              <Field label="Species">
                <select value={species} onChange={(e) => setSpecies(e.target.value as Species)} className="input">
                  <option value="Dog">Dog</option>
                  <option value="Cat">Cat</option>
                </select>
              </Field>
              <p className="text-xs text-zinc-400">
                Owner details are edited from the Owner panel (or the
                customer's account directly), not here.
              </p>
              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <div className="flex gap-3">
                <button onClick={() => setEditing(false)} className="flex-1 border-2 border-zinc-300 text-zinc-500 font-semibold text-sm py-2 rounded-full hover:border-zinc-400 transition-colors">
                  Cancel
                </button>
                <button onClick={save} disabled={saving} className="flex-1 bg-brand-pink hover:bg-brand-pink-dark disabled:opacity-50 text-white font-semibold text-sm py-2 rounded-full transition-colors">
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </>
          ) : (
            <>
              <Row label="Breed" value={pet.breed} />
              <Row label="Size" value={pet.size_label} />
              <Row label="Age" value={pet.age != null ? `${pet.age} yrs` : null} />
              <Row label="Sex" value={pet.sex} />
              <div className="border-t border-pink-100 my-2" />
              <Row label="Owner Name" value={ownerName} />
              <Row label="Contact Number" value={ownerContact} />
              <Row label="Address" value={ownerAddress} />

              <button
                onClick={() => setEditing(true)}
                className="mt-2 w-full border-2 border-brand-pink text-brand-pink font-semibold text-sm py-2 rounded-full hover:bg-brand-pink hover:text-white transition-colors"
              >
                Edit Pet Info
              </button>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid #e4e4e7;
          background: #eafaff;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-zinc-500">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="font-medium text-zinc-800 text-right">{value || "—"}</span>
    </div>
  );
}
