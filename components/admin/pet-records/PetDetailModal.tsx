"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CustomerPetFields, useCustomerPetForm, blankCustomerPet, type CustomerPetForm } from "@/components/dashboard/CustomerPetFields";
import type { Pet } from "@/lib/types/appointments";
import PetAvatar from "@/components/dashboard/PetAvatar";
import PetPhotoEditor from "@/components/shared/PetPhotoEditor";
import { normalizePetAge, petAgeLabel } from "@/lib/utils/pet-age";
import PetServiceHistory from "@/components/shared/PetServiceHistory";

type PetWithWeight = Pet & { weight_kg?: number | null; pet_size_id?: string | null; vaccination_status?: CustomerPetForm["vaccination_status"] | null };

export default function PetDetailModal({ pet, ownerName, ownerContact, ownerAddress, onClose, onUpdated }: {
  pet: Pet; ownerName: string | null; ownerContact: string | null; ownerAddress: string | null;
  onClose: () => void; onUpdated: (updated: Pet) => void;
}) {
  const initial = pet as PetWithWeight;
  const fields = useCustomerPetForm({
    ...blankCustomerPet,
    vaccination_status: initial.vaccination_status ?? blankCustomerPet.vaccination_status,
    name: pet.name, species: pet.species, breed: pet.breed,
    weight: initial.weight_kg == null ? "" : String(initial.weight_kg),
    age: petAgeLabel(pet) ?? "", sex: pet.sex ?? "",
  });
  const [displayPet, setDisplayPet] = useState<PetWithWeight>(initial);
  const [editing, setEditing] = useState(false);
  const [photoEditing, setPhotoEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape" && !saving) cancel(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, saving]);

  function cancel() {
    fields.setForm({
      ...blankCustomerPet,
      vaccination_status: displayPet.vaccination_status ?? blankCustomerPet.vaccination_status,
      name: displayPet.name, species: displayPet.species, breed: displayPet.breed,
      weight: displayPet.weight_kg == null ? "" : String(displayPet.weight_kg),
      age: petAgeLabel(displayPet) ?? "", sex: displayPet.sex ?? "",
    });
    fields.setErrors({});
    setError(null);
    setEditing(false);
  }

  async function save() {
    if (saving || !fields.validate()) return;
    const { form, size } = fields;
    // A legacy record without a recorded weight must not lose its existing size
    // just because staff corrected its name, breed, age, or sex.
    const keepLegacySize = !form.weight.trim() && form.species === displayPet.species;
    const changes = {
      name: form.name.trim(), breed: form.breed.trim(), species: form.species,
      vaccination_status: form.vaccination_status,
      ...normalizePetAge(form.age)!,
      sex: form.sex || null,
      weight_kg: form.weight.trim() ? Number(form.weight) : null,
      size_label: size?.label ?? (keepLegacySize ? displayPet.size_label : "Unclassified"),
      pet_size_id: size?.id ?? (keepLegacySize ? displayPet.pet_size_id ?? null : null),
    };
    setSaving(true); setError(null);
    try {
      const { data, error: saveError } = await createClient().from("pets")
        .update(changes).eq("id", displayPet.id).select("*").single();
      if (saveError) throw new Error(saveError.message);
      if (!data) throw new Error("The pet update was not confirmed. Check permissions and retry.");
      const updated = data as PetWithWeight;
      setDisplayPet(updated);
      onUpdated(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save this pet profile.");
    } finally { setSaving(false); }
  }

  function updatePhoto(url: string) {
    const updated = { ...displayPet, photo_url: url };
    setDisplayPet(updated);
    onUpdated(updated);
  }

  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 px-3 py-4" onMouseDown={e => { if (e.target === e.currentTarget && !saving && !photoEditing) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-label={`${displayPet.name} profile and service history`}
      className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-xl">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-pink-100 bg-white px-5 py-4 sm:px-7">
        <div className="flex items-center gap-3">
          <PetAvatar pet={displayPet} size="md" />
          <div><h3 className="text-xl font-bold text-zinc-900">{displayPet.name}</h3><p className="text-xs text-zinc-500">{displayPet.breed} · {displayPet.sex ?? "—"}</p></div>
        </div>
        <button type="button" disabled={saving} onClick={onClose} aria-label="Close pet profile" className="rounded-full p-2 text-zinc-500 hover:bg-pink-50 hover:text-brand-pink">✕</button>
      </div>
      <div className="px-5 py-5 sm:px-7">
        <div className="mb-5 flex flex-wrap items-center gap-4 rounded-2xl border border-pink-100 p-4">
          <PetAvatar pet={displayPet} size="lg" />
          <div className="flex-1"><h4 className="font-semibold text-zinc-800">Profile picture</h4><p className="text-xs text-zinc-500">Use a real photo so staff can identify this pet quickly.</p></div>
          <button type="button" disabled={saving} onClick={()=>setPhotoEditing(true)} className="rounded-full border border-brand-pink px-4 py-2 text-sm font-semibold text-brand-pink">{displayPet.photo_url ? "Change Photo" : "Add Photo"}</button>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <section className="rounded-2xl border border-pink-100 bg-pink-50/30 p-4">
            <h4 className="mb-3 font-bold text-zinc-800">Pet Information</h4>
            {editing ? <div className="space-y-4">
              <CustomerPetFields state={fields}/>
              {!fields.form.weight.trim() && <p className="text-xs text-amber-800">No weight entered. The current estimated size is retained when species is unchanged. Enter a weight to recalculate the size using the active Service Management size guide.</p>}
              {error && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
              <div className="flex gap-2">
                <button type="button" disabled={saving} onClick={cancel} className="flex-1 rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold">Cancel</button>
                <button type="button" disabled={saving || fields.loadingGuide} onClick={() => void save()} className="flex-1 rounded-full bg-brand-pink px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
              </div>
            </div> : <div className="space-y-2">
              <Row label="Species" value={displayPet.species}/><Row label="Breed" value={displayPet.breed}/>
              <Row label="Estimated Size" value={displayPet.size_label}/>
              <Row label="Weight" value={displayPet.weight_kg == null ? "Not recorded" : `${displayPet.weight_kg} kg`}/>
              <Row label="Age" value={petAgeLabel(displayPet)}/><Row label="Sex" value={displayPet.sex}/>
              <button type="button" onClick={() => setEditing(true)} className="mt-3 w-full rounded-full border-2 border-brand-pink py-2 text-sm font-semibold text-brand-pink hover:bg-pink-50">Edit Pet Info</button>
            </div>}
          </section>
          <section className="rounded-2xl border border-pink-100 p-4"><h4 className="mb-3 font-bold text-zinc-800">Owner Information</h4>
            <div className="space-y-2"><Row label="Owner Name" value={ownerName}/><Row label="Contact Number" value={ownerContact}/><Row label="Address" value={ownerAddress}/></div>
          </section>
        </div>
        <PetServiceHistory petId={displayPet.id}/>
      </div>
    </div>
    {photoEditing && <PetPhotoEditor petId={displayPet.id} petName={displayPet.name} onSaved={updatePhoto} onClose={()=>setPhotoEditing(false)}/>}
  </div>;
}
function Row({label,value}:{label:string;value:React.ReactNode}) {return <div className="flex justify-between gap-3 text-sm"><span className="text-zinc-500">{label}</span><span className="text-right font-medium text-zinc-800">{value || "—"}</span></div>}
