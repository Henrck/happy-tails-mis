"use client";
import { useEffect, useMemo, useState } from "react";
import { COMMON_BREEDS } from "@/lib/data/breed-suggestions";
import type { Species, Sex } from "@/lib/types/appointments";
import type { PetSize } from "@/lib/types/services";
import { getActiveSizeGuide, matchPetSize, validatePetInput } from "@/lib/utils/pet-size-guide";

export type CustomerPetForm = { name: string; species: Species; breed: string; weight: string; age: string; sex: Sex | "" };
export const blankCustomerPet: CustomerPetForm = { name: "", species: "Dog", breed: "", weight: "", age: "", sex: "" };

export function useCustomerPetForm(initial = blankCustomerPet) {
  const [form, setForm] = useState<CustomerPetForm>(initial);
  const [sizes, setSizes] = useState<PetSize[]>([]);
  const [guideError, setGuideError] = useState("");
  const [loadingGuide, setLoadingGuide] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    let active = true;
    setLoadingGuide(true);
    setSizes([]);
    setGuideError("");
    getActiveSizeGuide(form.species).then((rows) => {
      if (active) {
        setSizes(rows);
        if (!rows.length) setGuideError(`No active ${form.species.toLowerCase()} size guide is configured in Service Management.`);
      }
    }).catch((err) => { if (active) setGuideError(err instanceof Error ? err.message : "Unable to load size guide."); })
      .finally(() => { if (active) setLoadingGuide(false); });
    return () => { active = false; };
  }, [form.species]);
  const size = useMemo(() => matchPetSize(Number(form.weight), sizes), [form.weight, sizes]);
  function setField<K extends keyof CustomerPetForm>(key: K, value: CustomerPetForm[K]) {
    setForm((old) => ({ ...old, [key]: value }));
    setErrors((old) => { const n = { ...old }; delete n[key]; return n; });
  }
  function validate() {
    const e = validatePetInput(form, size);
    setErrors(e);
    return Object.keys(e).length === 0 && (!form.weight.trim() || (!guideError && !loadingGuide));
  }
  return { form, setForm, setField, size, loadingGuide, guideError, errors, setErrors, validate };
}

export function CustomerPetFields({ state }: { state: ReturnType<typeof useCustomerPetForm> }) {
  const { form, setField, size, guideError, loadingGuide, errors } = state;
  const cls = "mt-1 block w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-pink focus:ring-2 focus:ring-pink-100";
  const title = (text: string, required = true) => <span className="block text-sm font-semibold text-zinc-700">{text} {required ? <span className="text-red-500" aria-hidden="true">*</span> : <span className="text-xs font-normal text-zinc-400">(Optional)</span>}</span>;
  const feedback = (key: string) => errors[key] ? <span role="alert" className="mt-1 block text-xs text-red-600">{errors[key]}</span> : null;
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <label className="sm:col-span-2">{title("Pet Name")}<input className={cls} value={form.name} onChange={(e) => setField("name", e.target.value)} aria-invalid={!!errors.name} maxLength={100} />{feedback("name")}</label>
    <label>{title("Species")}<select className={cls} value={form.species} onChange={(e) => { setField("species", e.target.value as Species); setField("weight", ""); }}><option value="Dog">Dog</option><option value="Cat">Cat</option></select>{feedback("species")}</label>
    <label>{title("Sex")}<select className={cls} value={form.sex} onChange={(e) => setField("sex", e.target.value as Sex | "")} aria-invalid={!!errors.sex}><option value="">Select sex</option><option value="Male">Male</option><option value="Female">Female</option></select>{feedback("sex")}</label>
    <label className="sm:col-span-2">{title("Breed")}<input className={cls} list={`breed-suggestions-${form.species.toLowerCase()}`} placeholder="Search or choose a breed (mixed breeds welcome)" value={form.breed} onChange={(e) => setField("breed", e.target.value)} aria-invalid={!!errors.breed} maxLength={100} /><datalist id={`breed-suggestions-${form.species.toLowerCase()}`}>{COMMON_BREEDS.filter((b) => form.species === "Cat" ? ["Persian", "Siamese", "Sphynx", "British Shorthair", "Puspin"].includes(b) : !["Persian", "Siamese", "Sphynx", "British Shorthair", "Puspin"].includes(b)).concat(form.species === "Cat" ? ["Maine Coon", "Ragdoll", "Bengal", "Scottish Fold", "Russian Blue", "American Shorthair", "Exotic Shorthair", "Mixed Breed"] : ["Aspin", "Corgi", "Maltese", "Yorkshire Terrier", "Jack Russell Terrier", "Border Collie", "Doberman", "Rottweiler", "Mixed Breed"]).map((breed) => <option key={breed} value={breed} />)}</datalist>{feedback("breed")}</label>
    <label>{title("Weight (KG)", false)}<input className={cls} type="number" min="0.01" step="0.01" placeholder="e.g. 7.5" value={form.weight} onChange={(e) => setField("weight", e.target.value)} aria-invalid={!!errors.weight} />{feedback("weight")}</label>
    <label>{title("Age (years)", false)}<input className={cls} type="number" min="0" max="100" step="1" placeholder="e.g. 2" value={form.age} onChange={(e) => setField("age", e.target.value)} aria-invalid={!!errors.age} />{feedback("age")}</label>
    <div className="sm:col-span-2 rounded-xl border border-pink-100 bg-pink-50 p-3 text-sm">
      <span className="font-semibold text-zinc-700">Size Identifier: </span>
      <span className="font-bold text-brand-pink">{!form.weight.trim() ? "To be measured at the shop" : loadingGuide ? "Loading guide…" : size ? size.label : "Not determined"}</span>
      {size && <p className="mt-1 text-xs text-zinc-500">Weight bracket: {size.weight_range} · {form.species === "Cat" ? "HappyTails cat size policy" : "Linked to Service Management"}</p>}
      {form.weight.trim() && guideError && <p role="alert" className="mt-1 text-xs text-red-600">{guideError}</p>}
    </div>
    <p className="sm:col-span-2 text-xs text-zinc-500"><span className="text-red-500">*</span> Required fields. Weight and age may be entered or updated by staff during your visit.</p>
  </div>;
}
