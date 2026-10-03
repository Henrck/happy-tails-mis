"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchPackagesFull, fetchPetSizes, fetchAddonsByCategory } from "@/lib/supabase/services";
import { fetchGroomers } from "@/lib/supabase/pet-services";
import type { ServiceType, Package, PackageInclusion, PackagePricing, PetSize, Addon, AddonPrice } from "@/lib/types/services";
import type { Groomer } from "@/lib/types/pet-services";
import type { Pet, DraftPetSelection } from "@/lib/types/appointments";
import type { WalkInServiceChoice } from "./ServiceChoiceStep";

type GroomingChoice = ServiceType | "grooming";

type LookupSet = {
  packages: Package[];
  inclusions: PackageInclusion[];
  pricing: PackagePricing[];
  sizes: PetSize[];
  addons: Addon[];
  addonPrices: AddonPrice[];
};

const emptyLookup: LookupSet = {
  packages: [], inclusions: [], pricing: [], sizes: [], addons: [], addonPrices: [],
};

export default function GroomingSelectionStep({
  serviceType,
  pets,
  selections,
  onChange,
  onBack,
  onNext,
}: {
  serviceType: GroomingChoice;
  pets: Pet[];
  selections: DraftPetSelection[];
  onChange: (selections: DraftPetSelection[]) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [lookupByService, setLookupByService] = useState<Record<ServiceType, LookupSet>>({
    dog_grooming: emptyLookup,
    cat_grooming: emptyLookup,
    boarding: emptyLookup,
  });
  const [groomers, setGroomers] = useState<Groomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePetIdx, setActivePetIdx] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    const services: ServiceType[] = serviceType === "grooming"
      ? ["dog_grooming", "cat_grooming"]
      : [serviceType];

    const [lookupResults, groomerResult] = await Promise.all([
      Promise.all(services.map(async (type) => {
        const [pkgResult, sizeResult, addonResult] = await Promise.all([
          fetchPackagesFull(type),
          fetchPetSizes(type),
          fetchAddonsByCategory("Grooming Add-ons"),
        ]);
        return [type, {
          packages: pkgResult.packages.filter((p) => p.is_active),
          inclusions: pkgResult.inclusions,
          pricing: pkgResult.pricing,
          sizes: sizeResult.sizes.filter((s) => s.is_active),
          addons: addonResult.addons.filter((a) => a.is_active),
          addonPrices: addonResult.prices,
        }] as const;
      })),
      fetchGroomers({ activeOnly: true }),
    ]);

    const next = { ...lookupByService };
    for (const [type, data] of lookupResults) next[type] = data;
    setLookupByService(next);
    setGroomers(groomerResult.groomers);
    setLoading(false);
  }, [serviceType]);

  useEffect(() => { loadData(); }, [loadData]);

  const activePet = pets[activePetIdx];
  const activeService: ServiceType = activePet?.species === "Cat" ? "cat_grooming" : "dog_grooming";
  const data = lookupByService[activeService];

  function updateSelection(patch: Partial<DraftPetSelection>) {
    if (!activePet) return;
    const existing = selections.find((s) => s.pet.id === activePet.id);
    const base: DraftPetSelection = existing ?? {
      pet: activePet,
      packageId: null,
      packagePricingId: null,
      sizeId: null,
      kennelId: null,
      groomerId: null,
      addonIds: [],
      lineAmount: 0,
    };
    const updated = { ...base, ...patch };
    updated.lineAmount = computeLineAmount(updated);
    onChange([...selections.filter((s) => s.pet.id !== activePet.id), updated]);
  }

  function findPricingRow(packageId: string, sizeId: string, sizeLabel?: string) {
    const rows = data.pricing.filter((p) => p.package_id === packageId);
    return rows.find((p) => p.size_id === sizeId || (sizeLabel && p.size_label === sizeLabel))
      ?? rows.find((p) => p.size_id === null);
  }

  function findAddonPriceRow(addonId: string, sizeLabel?: string) {
    const rows = data.addonPrices.filter((p) => p.addon_id === addonId);
    return rows.find((p) => sizeLabel && p.size_label === sizeLabel) ?? rows[0];
  }

  function computeLineAmount(sel: DraftPetSelection): number {
    let total = 0;
    if (sel.packageId && sel.sizeId) {
      const size = data.sizes.find((s) => s.id === sel.sizeId);
      const priceRow = findPricingRow(sel.packageId, sel.sizeId, size?.label);
      if (priceRow) total += priceRow.price;
    }
    for (const addonId of sel.addonIds) {
      const size = data.sizes.find((s) => s.id === sel.sizeId);
      const priceRow = findAddonPriceRow(addonId, size?.label);
      if (priceRow) total += priceRow.price;
    }
    return total;
  }

  function toggleAddon(addonId: string) {
    if (!activePet) return;
    const activeSelection = selections.find((s) => s.pet.id === activePet.id);
    if (!activeSelection) return;
    updateSelection({
      addonIds: activeSelection.addonIds.includes(addonId)
        ? activeSelection.addonIds.filter((id) => id !== addonId)
        : [...activeSelection.addonIds, addonId],
    });
  }

  const allPetsHavePackageAndSize = pets.every((p) => {
    const sel = selections.find((s) => s.pet.id === p.id);
    return Boolean(sel?.packageId && sel?.sizeId);
  });

  if (loading) return <p className="py-16 text-center text-zinc-400">Loading grooming options…</p>;
  if (!activePet) return null;

  const activeSelection = selections.find((s) => s.pet.id === activePet.id);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h2 className="text-center text-2xl font-bold text-brand-pink">
        {serviceType === "grooming" ? "Grooming" : activeService === "dog_grooming" ? "Dog Grooming" : "Cat Grooming"}
      </h2>
      <p className="mt-1 text-center text-sm text-zinc-500">
        Configure grooming for each selected pet. Each pet uses its species-specific grooming packages and prices.
      </p>

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {pets.map((pet, idx) => {
          const configured = Boolean(selections.find((s) => s.pet.id === pet.id)?.packageId);
          return (
            <button key={pet.id} type="button" onClick={() => setActivePetIdx(idx)}
              className={`rounded-full px-4 py-2 text-xs font-semibold border-2 ${
                idx === activePetIdx ? "border-brand-pink bg-brand-pink text-white" : "border-pink-100 bg-white text-zinc-600"
              }`}>
              {pet.species === "Cat" ? "🐈" : "🐕"} {pet.name} {configured ? "✓" : ""}
            </button>
          );
        })}
      </div>

      <div className="mt-6 rounded-2xl border-2 border-pink-100 bg-white p-5">
        <p className="font-bold text-zinc-800">
          {activePet.name} <span className="font-normal text-zinc-400">({activePet.species})</span>
        </p>

        <p className="mt-5 font-bold text-zinc-800">Select Package</p>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {data.packages.map((pkg) => {
            const selected = activeSelection?.packageId === pkg.id;
            return (
              <button key={pkg.id} type="button" onClick={() => updateSelection({ packageId: pkg.id, packagePricingId: null, sizeId: null })}
                className={`rounded-xl border-2 p-3 text-left text-sm ${selected ? "border-brand-pink bg-brand-tint" : "border-pink-100 hover:border-brand-pink"}`}>
                <p className="font-semibold text-zinc-800">{pkg.name}</p>
                {data.inclusions.filter((i) => i.package_id === pkg.id).slice(0, 3).map((i) => (
                  <p key={i.id} className="mt-0.5 text-xs text-zinc-500">• {i.label}</p>
                ))}
              </button>
            );
          })}
        </div>

        {activeSelection?.packageId && (
          <>
            <p className="mt-6 font-bold text-zinc-800">Select Size</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {data.sizes.map((size) => {
                const priceRow = findPricingRow(activeSelection.packageId!, size.id, size.label);
                const selected = activeSelection.sizeId === size.id;
                return (
                  <button key={size.id} type="button" onClick={() => updateSelection({ sizeId: size.id })}
                    className={`rounded-lg border-2 px-3 py-2 text-xs font-semibold ${
                      selected ? "border-brand-pink bg-brand-pink text-white" : "border-pink-200 text-zinc-700 hover:border-brand-pink"
                    }`}>
                    {size.label} {size.weight_range && <span className="font-normal opacity-70">({size.weight_range})</span>}
                    {priceRow && <span className="ml-1.5">₱{priceRow.price}</span>}
                  </button>
                );
              })}
            </div>

            <p className="mt-6 font-bold text-zinc-800">Select Groomer <span className="font-normal text-zinc-400 text-sm">(Optional)</span></p>
            <GroomerPicker groomers={groomers} value={activeSelection?.groomerId ?? null} onChange={(id) => updateSelection({ groomerId: id })} />

            {data.addons.length > 0 && (
              <>
                <p className="mt-6 font-bold text-zinc-800">Add-Ons <span className="font-normal text-zinc-400 text-sm">(Optional)</span></p>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {data.addons.map((addon) => {
                    const size = data.sizes.find((s) => s.id === activeSelection?.sizeId);
                    const priceRow = findAddonPriceRow(addon.id, size?.label);
                    const selected = activeSelection?.addonIds.includes(addon.id);
                    return (
                      <button key={addon.id} type="button" onClick={() => toggleAddon(addon.id)}
                        className={`text-left rounded-xl border-2 px-3 py-2 text-xs ${selected ? "bg-brand-pink border-brand-pink text-white" : "border-pink-100 text-zinc-700 hover:border-pink-200"}`}>
                        <p className="font-semibold">{addon.name}</p>
                        {priceRow && <p className={selected ? "text-white/80" : "text-zinc-400"}>₱{priceRow.price}</p>}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <div className="mt-8 flex gap-3">
        <button type="button" onClick={onBack} className="flex-1 border-2 border-zinc-300 text-zinc-500 font-semibold py-2.5 rounded-full hover:border-zinc-400">Back</button>
        <button type="button" onClick={onNext} disabled={!allPetsHavePackageAndSize}
          className="flex-1 bg-brand-pink hover:bg-brand-pink-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-full">
          Next
        </button>
      </div>
    </div>
  );
}

function GroomerPicker({ groomers, value, onChange }: { groomers: Groomer[]; value: string | null; onChange: (id: string | null) => void }) {
  return (
    <select value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}
      className="mt-2 w-full sm:w-64 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink">
      <option value="">No preference</option>
      {groomers.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
    </select>
  );
}
