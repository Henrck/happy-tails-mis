"use client";

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

  // Was: return the FIRST row found for this package, where any row
  // with size_id === null matched regardless of which size was
  // actually selected. If a package had both a flat-rate row and real
  // per-size rows, whichever sorted first from the query decided the
  // price for every size — this is why every size could show the same
  // fixed price rather than its own. Now: always prefer an exact
  // size-specific match; only fall back to a flat-rate row if no
  // size-specific row exists for this package at all.
  function findPricingRow(
    packageId: string,
    sizeId: string,
    sizeLabel: string | undefined
  ): PackagePricing | undefined {
    const rowsForPackage = pricing.filter((p) => p.package_id === packageId);
    return (
      rowsForPackage.find((p) => p.size_id === sizeId || (sizeLabel && p.size_label === sizeLabel)) ??
      rowsForPackage.find((p) => p.size_id === null)
    );
  }

  // Same tiering for add-on prices: prefer a row matching this size
  // exactly, but fall back to any row for that add-on rather than
  // silently showing nothing when the size label doesn't match exactly
  // (e.g. admin-entered label casing/spacing not lining up with the
  // pet size label).
  function findAddonPriceRow(addonId: string, sizeLabel: string | undefined): AddonPrice | undefined {
    const rowsForAddon = addonPrices.filter((p) => p.addon_id === addonId);
    return (
      rowsForAddon.find((p) => sizeLabel && p.size_label === sizeLabel) ??
      rowsForAddon[0]
    );
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
      const priceRow = findAddonPriceRow(addonId, size?.label);
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

  if (loading) {
    return <p className="text-center text-zinc-400 py-16">Loading packages…</p>;
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h2 className="text-2xl font-bold text-brand-pink text-center">
        Select Package
      </h2>

      {pets.length > 1 && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {pets.map((pet, i) => {
            const done = selections.find((s) => s.pet.id === pet.id)?.packageId;

            return (
              <button
                key={pet.id}
                type="button"
                onClick={() => setActivePetIdx(i)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold border-2 transition-colors ${
                  activePetIdx === i
                    ? "bg-brand-pink border-brand-pink text-white"
                    : done
                      ? "border-emerald-300 text-emerald-600"
                      : "border-pink-200 text-zinc-600"
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
          <p className="mt-4 text-sm text-zinc-500 text-center">
            Choosing for{" "}
            <span className="font-semibold text-zinc-700">{activePet.name}</span>
          </p>

          {/* Normalized package cards:
              - every card stretches to the same height
              - header always starts at the same vertical position
              - header has a fixed/minimum height
              - inclusion area fills the remaining height
              This prevents one package from appearing lower/shorter than
              the others when package content differs. */}
          <div className="mt-6 grid grid-cols-1 items-stretch gap-4 sm:grid-cols-3">
            {packages.map((pkg) => {
              const isSelected = activeSelection?.packageId === pkg.id;
              const pkgInclusions = inclusions.filter(
                (i) => i.package_id === pkg.id
              );

              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => updateSelection({ packageId: pkg.id })}
                  aria-pressed={isSelected}
                  className={[
                    "group flex h-full min-h-[158px] flex-col overflow-hidden rounded-2xl",
                    "border-2 text-left transition-all duration-200",
                    isSelected
                      ? "border-brand-pink shadow-[0_4px_14px_rgba(236,72,153,0.14)]"
                      : "border-pink-100 hover:border-pink-200 hover:shadow-[0_3px_10px_rgba(236,72,153,0.08)]",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "flex min-h-[50px] items-center px-4 py-3",
                      isSelected
                        ? "bg-brand-pink"
                        : "bg-gradient-to-r from-brand-pink to-brand-pink-dark",
                    ].join(" ")}
                  >
                    <h3 className="text-sm font-bold leading-tight text-white">
                      {pkg.name}
                    </h3>
                  </div>

                  <div className="flex flex-1 bg-white px-4 py-3.5">
                    <ul className="w-full space-y-2">
                      {pkgInclusions.map((inc) => (
                        <li
                          key={inc.id}
                          className="flex items-start gap-2 text-xs leading-4 text-zinc-600"
                        >
                          <svg
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            className="mt-0.5 shrink-0 text-brand-pink"
                            aria-hidden="true"
                          >
                            <path
                              d="M5 13l4 4L19 7"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <span>{inc.label}</span>
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
              const priceRow = activeSelection?.packageId
                ? findPricingRow(activeSelection.packageId, size.id, size.label)
                : null;

              return (
                <button
                  key={size.id}
                  type="button"
                  onClick={() => updateSelection({ sizeId: size.id })}
                  className={`px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-colors ${
                    activeSelection?.sizeId === size.id
                      ? "bg-brand-pink border-brand-pink text-white"
                      : "border-pink-200 text-zinc-700 hover:border-brand-pink"
                  }`}
                >
                  {size.label}{" "}
                  {size.weight_range && (
                    <span className="opacity-70 font-normal">
                      ({size.weight_range})
                    </span>
                  )}
                  {priceRow && <span className="ml-1.5">₱{priceRow.price}</span>}
                </button>
              );
            })}
          </div>

          <p className="mt-6 font-bold text-zinc-800">
            Select Groomer{" "}
            <span className="font-normal text-zinc-400 text-sm">
              (Optional)
            </span>
          </p>

          <GroomerPicker
            groomers={groomers}
            value={activeSelection?.groomerId ?? null}
            onChange={(id) => updateSelection({ groomerId: id })}
          />

          {addons.length > 0 && (
            <>
              <p className="mt-6 font-bold text-zinc-800">
                Add-Ons{" "}
                <span className="font-normal text-zinc-400 text-sm">
                  (Optional)
                </span>
              </p>

              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {addons.map((addon) => {
                  const size = sizes.find(
                    (s) => s.id === activeSelection?.sizeId
                  );
                  const priceRow = findAddonPriceRow(addon.id, size?.label);
                  const selected = activeSelection?.addonIds.includes(addon.id);

                  return (
                    <button
                      key={addon.id}
                      type="button"
                      onClick={() => toggleAddon(addon.id)}
                      className={`text-left rounded-xl border-2 px-3 py-2 text-xs transition-colors ${
                        selected
                          ? "bg-brand-pink border-brand-pink text-white"
                          : "border-pink-100 text-zinc-700 hover:border-pink-200"
                      }`}
                    >
                      <p className="font-semibold">{addon.name}</p>
                      {priceRow && (
                        <p
                          className={
                            selected ? "text-white/80" : "text-zinc-400"
                          }
                        >
                          ₱{priceRow.price}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 border-2 border-zinc-300 text-zinc-500 font-semibold py-2.5 rounded-full hover:border-zinc-400 transition-colors"
        >
          Back
        </button>

        <button
          type="button"
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

function GroomerPicker({
  groomers,
  value,
  onChange,
}: {
  groomers: Groomer[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className="mt-2 w-full sm:w-64 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
    >
      <option value="">No preference</option>
      {groomers.map((g) => (
        <option key={g.id} value={g.id}>
          {g.name}
        </option>
      ))}
    </select>
  );
}
