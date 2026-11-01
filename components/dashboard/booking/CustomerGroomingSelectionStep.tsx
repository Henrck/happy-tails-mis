"use client";

import { useEffect, useState } from "react";
import { fetchPackagesFull, fetchPetSizes, fetchAddonsByCategory } from "@/lib/supabase/services";
import { groomingAddonPrice } from "@/lib/booking/boarding-promotions";
import { catGroomingSizeGuide, CAT_SMALL_MAX_KG } from "@/lib/utils/pet-size-guide";
import type { ServiceType, Package, PackageInclusion, PackagePricing, PetSize, Addon, AddonPrice } from "@/lib/types/services";
import type { Pet, DraftPetSelection } from "@/lib/types/appointments";

type GroomingChoice = ServiceType | "grooming";
type Lookups = { packages: Package[]; inclusions: PackageInclusion[]; pricing: PackagePricing[]; sizes: PetSize[]; addons: Addon[]; addonPrices: AddonPrice[] };
const empty: Lookups = { packages: [], inclusions: [], pricing: [], sizes: [], addons: [], addonPrices: [] };
type PetWithSize = Pet & { pet_size_id?: string | null; weight_kg?: number | null };
const normalize = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/^size/, "");
function minimumSizeIndex(pet: Pet, sizes: PetSize[]) {
  const saved = pet as PetWithSize;
  if (pet.species === "Cat" && saved.weight_kg != null && Number(saved.weight_kg) > 0) {
    const category = Number(saved.weight_kg) <= CAT_SMALL_MAX_KG ? "small" : "large";
    return sizes.findIndex(s => s.label.trim().toLowerCase() === category);
  }
  if (saved.pet_size_id) { const i = sizes.findIndex(s => s.id === saved.pet_size_id); if (i >= 0) return i; }
  const label = normalize(pet.size_label ?? "");
  if (!label || ["unknown", "unclassified", "notset", "na"].includes(label)) return -1;
  const direct = sizes.findIndex(s => normalize(s.label) === label);
  if (direct >= 0) return direct;
  return sizes.findIndex(s => label.startsWith(normalize(s.label)) || normalize(s.label).startsWith(label)) < 0
    ? -2 : sizes.findIndex(s => label.startsWith(normalize(s.label)) || normalize(s.label).startsWith(label));
}

export default function CustomerGroomingSelectionStep({ serviceType, pets, selections, onChange, onBack, onNext }: {
  serviceType: GroomingChoice; pets: Pet[]; selections: DraftPetSelection[];
  onChange: (items: DraftPetSelection[]) => void; onBack: () => void; onNext: () => void;
}) {
  const [lookups, setLookups] = useState<Record<ServiceType, Lookups>>({ dog_grooming: empty, cat_grooming: empty, boarding: empty });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePetIdx, setActivePetIdx] = useState(0);
  useEffect(() => {
    let valid = true;
    setLoading(true); setError(null);
    const services: ServiceType[] = serviceType === "grooming" ? ["dog_grooming", "cat_grooming"] : [serviceType];
    void Promise.all(services.map(async type => {
      const [p, sz, a] = await Promise.all([fetchPackagesFull(type), fetchPetSizes(type), fetchAddonsByCategory("Grooming Add-ons")]);
      if (p.error || sz.error || a.error) throw new Error(p.error ?? sz.error ?? a.error ?? "Unable to load grooming services");
      const sizes = sz.sizes.filter(s => s.is_active);
      return [type, { packages: p.packages.filter(row => row.is_active), inclusions: p.inclusions, pricing: p.pricing,
        sizes: type === "cat_grooming" ? catGroomingSizeGuide(sizes) : sizes,
        addons: a.addons.filter(row => row.is_active), addonPrices: a.prices }] as const;
    })).then(rows => { if (valid) setLookups(previous => ({ ...previous, ...Object.fromEntries(rows) })); })
      .catch(e => { if (valid) setError(e instanceof Error ? e.message : "Unable to load grooming packages"); })
      .finally(() => { if (valid) setLoading(false); });
    return () => { valid = false; };
  }, [serviceType]);

  const pet = pets[activePetIdx];
  const data = lookups[pet?.species === "Cat" ? "cat_grooming" : "dog_grooming"];
  const selected = selections.find(s => s.pet.id === pet?.id);
  const minimum = pet ? minimumSizeIndex(pet, data.sizes) : -1;
  function rateFor(packageId: string, size: PetSize, lookup = data) {
    const rows = lookup.pricing.filter(row => row.package_id === packageId);
    return rows.find(row => row.size_id === size.id || normalize(row.size_label) === normalize(size.label)) ?? rows.find(row => row.size_id === null);
  }
  function addonRate(addonId: string, sizeLabel?: string, lookup = data) {
    return groomingAddonPrice(lookup.addonPrices.filter(row => row.addon_id === addonId), sizeLabel);
  }
  function update(patch: Partial<DraftPetSelection>) {
    if (!pet) return;
    const base = selected ?? { pet, packageId: null, packagePricingId: null, sizeId: null, kennelId: null, groomerId: null, addonIds: [], lineAmount: 0 };
    const draft: DraftPetSelection = { ...base, ...patch };
    if (draft.sizeId) {
      const idx = data.sizes.findIndex(size => size.id === draft.sizeId);
      if (minimum === -2 || idx < 0 || idx < minimum) return;
    }
    const size = data.sizes.find(s => s.id === draft.sizeId);
    const rate = draft.packageId && size ? rateFor(draft.packageId, size) : null;
    const addons = draft.addonIds.map(id => addonRate(id, size?.label));
    draft.lineAmount = (rate?.price ?? 0) + addons.reduce((sum, row) => sum + (row?.price ?? 0), 0);
    // Groomer is chosen only after date and time have been selected.
    draft.groomerId = null;
    onChange([...selections.filter(s => s.pet.id !== pet.id), draft]);
  }
  function configured(item: Pet) {
    const s = selections.find(row => row.pet.id === item.id);
    const lookup = lookups[item.species === "Cat" ? "cat_grooming" : "dog_grooming"];
    const min = minimumSizeIndex(item, lookup.sizes);
    const idx = lookup.sizes.findIndex(size => size.id === s?.sizeId);
    return !!s?.packageId && idx >= 0 && min !== -2 && idx >= min &&
      !!lookup.pricing.find(rate => rate.id === s.packagePricingId && rate.package_id === s.packageId) &&
      (s.addonIds ?? []).every(id => !!groomingAddonPrice(lookup.addonPrices.filter(a => a.addon_id === id), lookup.sizes[idx]?.label));
  }
  const ready = pets.length > 0 && pets.every(configured);
  function next() {
    if (!pet || !configured(pet)) return;
    if (ready) { onNext(); return; }
    const idx = Array.from({ length: pets.length - 1 }, (_, offset) => (activePetIdx + offset + 1) % pets.length)
      .find(i => !configured(pets[i]));
    if (idx !== undefined) setActivePetIdx(idx);
  }
  if (loading) return <p className="py-16 text-center text-zinc-400">Loading grooming options…</p>;
  if (error) return <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}<button type="button" onClick={onBack} className="ml-3 font-semibold underline">Back</button></div>;
  if (!pet) return null;
  return <div className="mx-auto w-full max-w-3xl">
    <h2 className="text-center text-2xl font-bold text-brand-pink">{serviceType === "grooming" ? "Grooming" : pet.species === "Cat" ? "Cat Grooming" : "Dog Grooming"}</h2>
    <p className="mt-1 text-center text-sm text-zinc-500">Choose the package, size and add-ons. You will select an available groomer after choosing a date and start time.</p>
    <div className="mt-5 flex flex-wrap justify-center gap-2">{pets.map((p, i) => <button type="button" key={p.id} onClick={() => setActivePetIdx(i)}
      className={`rounded-full border-2 px-4 py-2 text-xs font-semibold ${i === activePetIdx ? "border-brand-pink bg-brand-pink text-white" : "border-pink-100 bg-white text-zinc-600"}`}>
      {p.species === "Cat" ? "🐈" : "🐕"} {p.name} {configured(p) ? "✓" : ""}</button>)}</div>
    <div className="mt-6 rounded-2xl border-2 border-pink-100 bg-white p-5">
      <p className="font-bold text-zinc-800">{pet.name} <span className="font-normal text-zinc-400">({pet.species})</span></p>
      <p className="mt-5 font-bold">Select Package</p>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">{data.packages.map(pkg => <button type="button" key={pkg.id}
        onClick={() => update({ packageId: pkg.id, packagePricingId: null, sizeId: null, addonIds: [], groomerId: null })}
        className={`rounded-xl border-2 p-3 text-left text-sm ${selected?.packageId === pkg.id ? "border-brand-pink bg-brand-tint" : "border-pink-100 hover:border-brand-pink"}`}>
        <p className="font-semibold">{pkg.name}</p>{data.inclusions.filter(row => row.package_id === pkg.id).map(row => <p key={row.id} className="text-xs text-zinc-500">• {row.label}</p>)}
      </button>)}</div>
      {selected?.packageId && <>
        <p className="mt-6 font-bold">Select Size</p>
        <p className="mt-1 text-xs text-zinc-500">Registered size: <strong>{pet.size_label || "Unclassified"}</strong>. {minimum === -2 ? "Saved size needs correction by staff." : pet.species === "Cat" ? "Cat grooming uses Small and Large only." : "You may select the registered size or larger."}</p>
        <div className="mt-2 flex flex-wrap gap-2">{data.sizes.map((size, idx) => {
          const price = rateFor(selected.packageId!, size);
          const blocked = minimum === -2 || idx < minimum || !price;
          return <button type="button" key={size.id} disabled={blocked}
            onClick={() => update({ sizeId: size.id, packagePricingId: price?.id ?? null })}
            className={`rounded-lg border-2 px-3 py-2 text-xs font-semibold ${blocked ? "border-zinc-200 bg-zinc-100 text-zinc-400" : selected.sizeId === size.id ? "border-brand-pink bg-brand-pink text-white" : "border-pink-200"}`}>
            {size.label} {size.weight_range && <span className="font-normal">({size.weight_range})</span>} {price && `₱${price.price}`}
          </button>;
        })}</div>
        <p className="mt-6 rounded-xl bg-pink-50 p-3 text-xs text-zinc-600">Groomers are selected in the Schedule step, where the system can hide groomers already booked at your chosen start time.</p>
        {!!data.addons.length && <><p className="mt-6 font-bold">Add-ons (Optional)</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">{data.addons.map(addon => {
            const size = data.sizes.find(s => s.id === selected.sizeId);
            const rate = addonRate(addon.id, size?.label);
            const selectedAddon = selected.addonIds.includes(addon.id);
            return <button type="button" key={addon.id} disabled={!selected.sizeId || (!rate && !selectedAddon)}
              onClick={() => update({ addonIds: selectedAddon ? selected.addonIds.filter(id => id !== addon.id) : [...selected.addonIds, addon.id] })}
              className={`rounded-xl border-2 px-3 py-2 text-left text-xs ${selectedAddon ? "border-brand-pink bg-brand-pink text-white" : "border-pink-100 text-zinc-700"} disabled:opacity-40`}>
              <span className="block font-semibold">{addon.name}</span>{rate && <span>₱{rate.price}</span>}
            </button>;
          })}</div></>}
      </>}
    </div>
    <div className="mt-8 flex gap-3"><button type="button" onClick={onBack} className="flex-1 rounded-full border-2 border-zinc-300 py-2.5 font-semibold text-zinc-500">Back</button>
      <button type="button" onClick={next} disabled={!configured(pet)} className="flex-1 rounded-full bg-brand-pink py-2.5 font-semibold text-white disabled:opacity-40">{ready ? "Next: Schedule" : "Next Pet"}</button></div>
  </div>;
}
