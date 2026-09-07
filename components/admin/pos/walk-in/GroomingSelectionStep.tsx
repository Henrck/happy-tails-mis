"use client";
// Grooming Selection (Dog or Cat) — per pet: pick a Package, its Size,
// an optional Groomer, and Add-ons. Reuses the exact package-card visual
// from Service Management, but clickable/highlightable here since the
// customer is choosing, not the admin editing.
import { useState, useEffect, useCallback } from "react";
import { fetchPackagesFull, fetchPetSizes, fetchAddonsByCategory } from "@/lib/supabase/services";
import { fetchGroomers } from "@/lib/supabase/pet-services";
import type { ServiceType, Package, PackageInclusion, PackagePricing, PetSize, Addon, AddonPrice } from "@/lib/types/services";
import type { Groomer } from "@/lib/types/pet-services";
import type { Pet, DraftPetSelection } from "@/lib/types/appointments";

export default function GroomingSelectionStep({
  serviceType,
  pets,
  selections,
  onChange,
  onBack,
  onNext,
}: {
  serviceType: ServiceType;
  pets: Pet[];
  selections: DraftPetSelection[];
  onChange: (selections: DraftPetSelection[]) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [packages, setPackages] = useState<Package[]>([]);
  const [inclusions, setInclusions] = useState<PackageInclusion[]>([]);
  const [pricing, setPricing] = useState<PackagePricing[]>([]);
  const [sizes, setSizes] = useState<PetSize[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [addonPrices, setAddonPrices] = useState<AddonPrice[]>([]);
  const [groomers, setGroomers] = useState<Groomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePetIdx, setActivePetIdx] = useState(0);

  const addonCategoryName = serviceType === "boarding" ? "Boarding Add-ons" : "Grooming Add-ons";

  const loadData = useCallback(async () => {
    setLoading(true);
    const [pkgResult, sizeResult, addonResult, groomerResult] = await Promise.all([
      fetchPackagesFull(serviceType),
      fetchPetSizes(serviceType),
      fetchAddonsByCategory(addonCategoryName),
      fetchGroomers({ activeOnly: true }),
    ]);
    setPackages(pkgResult.packages.filter((p) => p.is_active));
    setInclusions(pkgResult.inclusions);
    setPricing(pkgResult.pricing);
    setSizes(sizeResult.sizes.filter((s) => s.is_active));
    setAddons(addonResult.addons.filter((a) => a.is_active));
    setAddonPrices(addonResult.prices);
    setGroomers(groomerResult.groomers);
    setLoading(false);
  }, [serviceType, addonCategoryName]);

  useEffect(() => { loadData(); }, [loadData]);

  const activePet = pets[activePetIdx];
  const activeSelection = selections.find((s) => s.pet.id === activePet?.id);

  function updateSelection(patch: Partial<DraftPetSelection>) {
    if (!activePet) return;
    const existing = selections.find((s) => s.pet.id === activePet.id);
    const base: DraftPetSelection = existing ?? { pet: activePet, packageId: null, packagePricingId: null, sizeId: null, kennelId: null, groomerId: null, addonIds: [], lineAmount: 0 };
    const updated = { ...base, ...patch };
    updated.lineAmount = computeLineAmount(updated);
    onChange([...selections.filter((s) => s.pet.id !== activePet.id), updated]);
  }

  // A package's pricing can be either size-dependent (size_id set to a
  // real pet_sizes row — e.g. Cat Grooming's "Bath & Dry" comes in
  // Small/Large variants) or flat/size-independent (size_id is null,
  // size_label is a placeholder like "Standard" — e.g. Cat Grooming's
  // "Premium"/"Basic" packages cost the same no matter the cat's size).
  // The real bug: for a flat-priced package, neither side of the old
  // match condition could succeed once a customer picked an actual
  // size — p.size_id (null) never equals a real size id, and
  // p.size_label ("Standard") never equals the picked size's label
  // ("Large", "Small", etc.) — so the price silently came back ₱0
  // even though a valid package and size were both selected. Fixed:
  // a package pricing row with size_id === null is now treated as
  // matching ANY selected size, since the price genuinely doesn't
  // depend on it.
  function findPricingRow(packageId: string, sizeId: string, sizeLabel: string | undefined): PackagePricing | undefined {
    return pricing.find((p) => {
      if (p.package_id !== packageId) return false;
      if (p.size_id === null) return true; // flat-priced package — size-independent, always matches
      return p.size_id === sizeId || p.size_label === sizeLabel;
    });
  }

  function computeLineAmount(sel: DraftPetSelection): number {
    let total = 0;
    if (sel.packageId && sel.sizeId) {
      const size = sizes.find((s) => s.id === sel.sizeId);
      const priceRow = findPricingRow(sel.packageId, sel.sizeId, size?.label);
      if (priceRow) total += priceRow.price;
    }
    for (const addonId of sel.addonIds) {
      const size = sizes.find((s) => s.id === sel.sizeId);
      const priceRow = addonPrices.find((p) => p.addon_id === addonId && p.size_label === size?.label);
      if (priceRow) total += priceRow.price;
    }
    return total;
  }

  function toggleAddon(addonId: string) {
    if (!activeSelection) return;
    const addonIds = activeSelection.addonIds.includes(addonId)
      ? activeSelection.addonIds.filter((id) => id !== addonId)
      : [...activeSelection.addonIds, addonId];
    updateSelection({ addonIds });
  }

  const allPetsHavePackageAndSize = pets.every((p) => {
    const sel = selections.find((s) => s.pet.id === p.id);
    return sel?.packageId && sel?.sizeId;
  });

  if (loading) return <p className="text-center text-zinc-400 py-16">Loading packages…</p>;

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-brand-pink text-center">Select Package</h2>

      {pets.length > 1 && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {pets.map((pet, i) => {
            const done = selections.find((s) => s.pet.id === pet.id)?.packageId;
            return (
              <button
                key={pet.id}
                onClick={() => setActivePetIdx(i)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold border-2 transition-colors ${
                  activePetIdx === i ? "bg-brand-pink border-brand-pink text-white" : done ? "border-emerald-300 text-emerald-600" : "border-pink-200 text-zinc-600"
                }`}
              >
                {pet.name}{done ? " ✓" : ""}
              </button>
            );
          })}
        </div>
      )}

      {activePet && (
        <>
          <p className="mt-4 text-sm text-zinc-500 text-center">Choosing for <span className="font-semibold text-zinc-700">{activePet.name}</span></p>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {packages.map((pkg) => {
              const isSelected = activeSelection?.packageId === pkg.id;
              const pkgInclusions = inclusions.filter((i) => i.package_id === pkg.id);
              return (
                <button
                  key={pkg.id}
                  onClick={() => updateSelection({ packageId: pkg.id })}
                  className={`text-left rounded-2xl overflow-hidden border-2 transition-colors ${isSelected ? "border-brand-pink" : "border-pink-100 hover:border-pink-200"}`}
                >
                  <div className={`px-4 py-2.5 ${isSelected ? "bg-brand-pink" : "bg-gradient-to-r from-brand-pink to-brand-pink-dark"}`}>
                    <h3 className="text-white font-bold text-sm">{pkg.name}</h3>
                  </div>
                  <div className="bg-white px-4 py-3">
                    <ul className="space-y-1">
                      {pkgInclusions.map((inc) => (
                        <li key={inc.id} className="flex items-center gap-1.5 text-xs text-zinc-600">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-brand-pink shrink-0"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          {inc.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                </button>
              );
            })}
          </div>

          <p className="mt-6 font-bold text-zinc-800">Select Size</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {sizes.map((size) => {
              const priceRow = activeSelection?.packageId ? findPricingRow(activeSelection.packageId, size.id, size.label) : null;
              return (
                <button
                  key={size.id}
                  onClick={() => updateSelection({ sizeId: size.id })}
                  className={`px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-colors ${activeSelection?.sizeId === size.id ? "bg-brand-pink border-brand-pink text-white" : "border-pink-200 text-zinc-700 hover:border-brand-pink"}`}
                >
                  {size.label} {size.weight_range && <span className="opacity-70 font-normal">({size.weight_range})</span>}
                  {priceRow && <span className="ml-1.5">₱{priceRow.price}</span>}
                </button>
              );
            })}
          </div>

          <p className="mt-6 font-bold text-zinc-800">Select Groomer <span className="font-normal text-zinc-400 text-sm">(Optional)</span></p>
          <GroomerPicker groomers={groomers} value={activeSelection?.groomerId ?? null} onChange={(id) => updateSelection({ groomerId: id })} />

          {addons.length > 0 && (
            <>
              <p className="mt-6 font-bold text-zinc-800">Add-Ons <span className="font-normal text-zinc-400 text-sm">(Optional)</span></p>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {addons.map((addon) => {
                  const size = sizes.find((s) => s.id === activeSelection?.sizeId);
                  const priceRow = addonPrices.find((p) => p.addon_id === addon.id && p.size_label === size?.label);
                  const selected = activeSelection?.addonIds.includes(addon.id);
                  return (
                    <button
                      key={addon.id}
                      onClick={() => toggleAddon(addon.id)}
                      className={`text-left rounded-xl border-2 px-3 py-2 text-xs transition-colors ${selected ? "bg-brand-pink border-brand-pink text-white" : "border-pink-100 text-zinc-700 hover:border-pink-200"}`}
                    >
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

      <div className="mt-8 flex gap-3">
        <button onClick={onBack} className="flex-1 border-2 border-zinc-300 text-zinc-500 font-semibold py-2.5 rounded-full hover:border-zinc-400 transition-colors">
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!allPetsHavePackageAndSize}
          className="flex-1 bg-brand-pink hover:bg-brand-pink-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-full transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function GroomerPicker({ groomers, value, onChange }: { groomers: Groomer[]; value: string | null; onChange: (id: string | null) => void }) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className="mt-2 w-full sm:w-64 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
    >
      <option value="">No preference</option>
      {groomers.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
    </select>
  );
}
