"use client";
import { useState, type FormEvent } from "react";
import { insertCustomerPet } from "@/lib/utils/pet-size-guide";
import type { Pet } from "@/lib/types/appointments";
import { CustomerPetFields, useCustomerPetForm } from "@/components/dashboard/CustomerPetFields";
export default function AddPetModal({ customerId, onClose, onAdded }: { customerId: string; onClose: () => void; onAdded: (pet: Pet) => void }) {
  const state = useCustomerPetForm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving || !state.validate() || !state.size) return;
    setSaving(true); setError("");
    const { form, size } = state;
    const { data, error: saveError } = await insertCustomerPet({
      customer_id: customerId, name: form.name.trim(), species: form.species,
      breed: form.breed.trim(), size_label: size.label, weight_kg: Number(form.weight),
      pet_size_id: size.id, age: Number(form.age), sex: form.sex || null,
    });
    setSaving(false);
    if (saveError || !data) { setError(saveError?.message ?? "Unable to add pet."); return; }
    onAdded(data as Pet);
  }
  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}>
    <form noValidate onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="new-pet-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl">
      <div className="sticky top-0 flex items-center justify-between bg-brand-pink px-6 py-4 text-white"><h2 id="new-pet-title" className="text-lg font-bold">Add New Pet</h2><button type="button" disabled={saving} onClick={onClose} aria-label="Close">✕</button></div>
      <div className="space-y-5 p-6"><CustomerPetFields state={state}/>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2"><button type="button" disabled={saving} onClick={onClose} className="rounded-full border px-5 py-2.5 text-sm">Cancel</button><button disabled={saving || state.loadingGuide || !!state.guideError} type="submit" className="rounded-full bg-brand-pink px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Add Pet"}</button></div>
      </div>
    </form>
  </div>;
}
