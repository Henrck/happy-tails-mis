"use client";
import { useState, type FormEvent } from "react";
import YoungPetGroomingNotice from "@/components/shared/YoungPetGroomingNotice";
import PetPhotoPicker from "@/components/shared/PetPhotoPicker";
import { insertCustomerPet } from "@/lib/utils/pet-size-guide";
import { normalizePetAge } from "@/lib/utils/pet-age";
import { uploadPetPhoto, type PetPhotoDraft } from "@/lib/utils/pet-photo-upload";
import { createClient } from "@/lib/supabase/client";
import { hasValidCustomerPhone } from "@/lib/utils/customer-phone";
import type { Pet } from "@/lib/types/appointments";
import { CustomerPetFields, useCustomerPetForm, blankCustomerPet } from "@/components/dashboard/CustomerPetFields";
export default function AddPetModal({ customerId, onClose, onAdded }: { customerId: string; onClose: () => void; onAdded: (pet: Pet) => void }) {
  const [showGroomingNotice, setShowGroomingNotice] = useState(true);
  const state = useCustomerPetForm(blankCustomerPet, { requireAge: true });
  const [photo, setPhoto] = useState<PetPhotoDraft | null>(null);
  // Set when the pet was created but its photo upload failed.
  const [savedPet, setSavedPet] = useState<Pet | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function attachPhotoAndFinish(pet: Pet) {
    if (photo) {
      try { pet = { ...pet, photo_url: await uploadPetPhoto(pet.id, photo.blob) }; }
      catch (caught) {
        setSavedPet(pet);
        setError(`${pet.name} was added, but the photo could not be uploaded: ${caught instanceof Error ? caught.message : "Unknown error"}`);
        return;
      }
    }
    onAdded(pet);
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving || savedPet || !state.validate()) return;
    setSaving(true); setError("");
    try {
      const { data: contact, error: contactError } = await createClient().from("customers").select("phone_number").eq("id", customerId).maybeSingle();
      if (contactError || !hasValidCustomerPhone(contact?.phone_number)) throw new Error("Add a valid phone number in My Account before registering a pet.");
      const { form, size } = state;
      const age = normalizePetAge(form.age);
      if (!age) throw new Error("Enter a valid pet age.");
      const { data, error: saveError } = await insertCustomerPet({
        customer_id: customerId, name: form.name.trim(), species: form.species,
        breed: form.breed.trim(), size_label: size?.label ?? "Unclassified", weight_kg: form.weight.trim() ? Number(form.weight) : null,
        pet_size_id: size?.id ?? null, ...age, sex: form.sex || null,
        vaccination_status: form.vaccination_status,
      });
      if (saveError || !data) throw new Error(saveError?.message ?? "Unable to add pet.");
      await attachPhotoAndFinish(data as Pet);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to add pet."); }
    finally { setSaving(false); }
  }
  async function retryPhoto() {
    if (!savedPet || saving) return;
    setSaving(true); setError("");
    try { await attachPhotoAndFinish(savedPet); } finally { setSaving(false); }
  }
  // Once the pet exists, closing must still hand it back to the booking flow.
  const close = () => { if (savedPet) onAdded(savedPet); else onClose(); };
  if (showGroomingNotice) return <YoungPetGroomingNotice onCancel={onClose} onContinue={() => setShowGroomingNotice(false)} />;
  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4" onMouseDown={e => { if (e.target === e.currentTarget && !saving) close(); }}>
    <form noValidate onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="new-pet-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl">
      <div className="sticky top-0 z-10 flex items-center justify-between bg-brand-pink px-6 py-4 text-white"><h2 id="new-pet-title" className="text-lg font-bold">Add New Pet</h2><button type="button" disabled={saving} onClick={close} aria-label="Close">✕</button></div>
      <div className="space-y-5 p-6">
        {!savedPet && <><PetPhotoPicker value={photo} onChange={setPhoto} petName={state.form.name} disabled={saving}/><CustomerPetFields state={state}/></>}
        {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
        {savedPet
          ? <div className="flex justify-end gap-2"><button type="button" disabled={saving} onClick={() => onAdded(savedPet)} className="rounded-full border px-5 py-2.5 text-sm">Skip Photo</button><button type="button" disabled={saving} onClick={() => void retryPhoto()} className="rounded-full bg-brand-pink px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Uploading…" : "Retry Upload"}</button></div>
          : <div className="flex justify-end gap-2"><button type="button" disabled={saving} onClick={onClose} className="rounded-full border px-5 py-2.5 text-sm">Cancel</button><button disabled={saving || (!!state.form.weight.trim() ? false : state.loadingGuide || !!state.guideError)} type="submit" className="rounded-full bg-brand-pink px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Add Pet"}</button></div>}
      </div>
    </form>
  </div>;
}
