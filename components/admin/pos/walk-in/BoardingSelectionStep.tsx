"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchPackagesFull, fetchAddonsByCategory } from "@/lib/supabase/services";
import type { Package, PackagePricing, Addon, AddonPrice } from "@/lib/types/services";
import type { Pet, DraftPetSelection } from "@/lib/types/appointments";

const INCLUSIONS = [
  "Check In 8AM to 6:00 PM",
  "Supervision by staff",
  "Air conditioned area",
  "Filtered water provided",
  "Free bath & blow dry (for boarding of at least 4 nights)",
];

type BoardingKennelSize = "small" | "big";

function labelForSize(size: BoardingKennelSize) {
  return size === "small" ? "Small Kennel" : "Big Kennel";
}

function rateSortValue(rate: PackagePricing): number {
  if (rate.is_per_night) return Number.MAX_SAFE_INTEGER;
  if (typeof rate.nights === "number" && rate.nights > 0) return rate.nights;
  const text = `${rate.size_detail ?? ""} ${rate.size_label ?? ""}`.toLowerCase();
  const match = text.match(/(\d+)\s*nights?/);
  if (match) return Number(match[1]);
  return Number.MAX_SAFE_INTEGER - 1;
}

function sortBoardingRates(rates: PackagePricing[]): PackagePricing[] {
  return [...rates].sort((a, b) => {
    const nightsDiff = rateSortValue(a) - rateSortValue(b);
    if (nightsDiff !== 0) return nightsDiff;
    if (a.is_per_night !== b.is_per_night) return a.is_per_night ? 1 : -1;
    return a.price - b.price;
  });
}

function isSevenDaysOrMore(rate: PackagePricing) {
  const label = `${rate.size_label ?? ""} ${rate.size_detail ?? ""}`.toLowerCase();
  return rate.is_per_night || label.includes("7") || label.includes("week");
}

function packageMatchesKennelSize(pkg: Package | undefined, size: BoardingKennelSize) {
  if (!pkg) return false;
  const name = pkg.name.toLowerCase();
  return name.includes(size === "small" ? "small" : "big");
}

export default function BoardingSelectionStep({
  pets,
  selections,
  onChange,
  scheduledDate: _scheduledDate,
  onBack,
  onNext,
  alreadyGroomedPetIds,
}: {
  pets: Pet[];
  selections: DraftPetSelection[];
  onChange: (selections: DraftPetSelection[]) => void;
  scheduledDate: string | null;
  onBack: () => void;
  onNext: () => void;
  alreadyGroomedPetIds?: string[];
}) {
  const [packages, setPackages] = useState<Package[]>([]);
  const [pricing, setPricing] = useState<PackagePricing[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [addonPrices, setAddonPrices] = useState<AddonPrice[]>([]);
  const [loading, setLoading] = useState(true);
  // IMPORTANT: this is per pet, not per kennel size. Two pets in the
  // same kennel category can legitimately choose different durations/rates.
  const [durationRateId, setDurationRateId] = useState<Record<string, string | null>>({});
  const [customNights, setCustomNights] = useState<Record<string, number>>({});

  function getNights(petId: string) {
    return Math.max(7, Number(customNights[petId] || 7));
  }

  const loadData = useCallback(async () => {
    setLoading(true);
    const [pkgResult, addonResult] = await Promise.all([
      fetchPackagesFull("boarding"),
      fetchAddonsByCategory("Boarding Add-ons"),
    ]);
    setPackages(pkgResult.packages);
    setPricing(pkgResult.pricing);
    setAddons(addonResult.addons.filter((a) => a.is_active));
    setAddonPrices(addonResult.prices);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Restore each pet's own saved rate when returning to this step.
  useEffect(() => {
    if (!pricing.length) return;
    setDurationRateId((previous) => {
      const next = { ...previous };
      for (const selection of selections) {
        if (selection.packagePricingId) next[selection.pet.id] = selection.packagePricingId;
      }
      return next;
    });
  }, [pricing, selections]);

  function selectionFor(pet: Pet) {
    return selections.find((s) => s.pet.id === pet.id);
  }

  function addonTotalFor(selection: DraftPetSelection | undefined) {
    return selection?.addonIds.reduce(
      (sum, id) => sum + (addonPrices.find((p) => p.addon_id === id)?.price ?? 0),
      0
    ) ?? 0;
  }

  function lineAmountFor(rate: PackagePricing, petId: string, addonTotal: number) {
    const base = rate.is_per_night ? rate.price * getNights(petId) : rate.price;
    return base + addonTotal;
  }

  function updateSelection(pet: Pet, patch: Partial<DraftPetSelection>) {
    const existing = selectionFor(pet);
    const base: DraftPetSelection = existing ?? {
      pet,
      packageId: null,
      packagePricingId: null,
      sizeId: null,
      kennelId: null,
      groomerId: null,
      addonIds: [],
      lineAmount: 0,
    };
    onChange([
      ...selections.filter((s) => s.pet.id !== pet.id),
      { ...base, ...patch },
    ]);
  }

  function selectKennelSize(pet: Pet, size: BoardingKennelSize) {
    const current = selectionFor(pet);
    const currentRate = current?.packagePricingId
      ? pricing.find((rate) => rate.id === current.packagePricingId)
      : null;
    const selectedRate = currentRate && packageMatchesKennelSize(
      packages.find((pkg) => pkg.id === currentRate.package_id), size
    ) ? currentRate : null;
    const selectedPackage = packages.find((pkg) => packageMatchesKennelSize(pkg, size));

    setDurationRateId((prev) => ({ ...prev, [pet.id]: selectedRate?.id ?? null }));
    updateSelection(pet, {
      kennelId: null,
      boardingKennelSize: size,
      packageId: selectedRate?.package_id ?? selectedPackage?.id ?? null,
      packagePricingId: selectedRate?.id ?? null,
      lineAmount: selectedRate
        ? lineAmountFor(selectedRate, pet.id, addonTotalFor(current))
        : addonTotalFor(current),
    });
  }

  function pricingFor(size: BoardingKennelSize) {
    const pkg = packages.find((p) => packageMatchesKennelSize(p, size));
    if (!pkg) return [];
    return sortBoardingRates(pricing.filter((p) => p.package_id === pkg.id));
  }

  function selectRate(pet: Pet, size: BoardingKennelSize, rate: PackagePricing) {
    setDurationRateId((prev) => ({ ...prev, [pet.id]: rate.id }));
    const current = selectionFor(pet);
    updateSelection(pet, {
      kennelId: null,
      boardingKennelSize: size,
      packageId: rate.package_id,
      packagePricingId: rate.id,
      lineAmount: lineAmountFor(rate, pet.id, addonTotalFor(current)),
    });
  }

  function setNights(pet: Pet, value: string) {
    const nights = Math.max(7, Number(value) || 7);
    setCustomNights((prev) => ({ ...prev, [pet.id]: nights }));
    const current = selectionFor(pet);
    const rateId = current?.packagePricingId ?? durationRateId[pet.id];
    const rate = rateId ? pricing.find((p) => p.id === rateId) : null;
    if (rate) {
      updateSelection(pet, {
        kennelId: null,
        packageId: rate.package_id,
        packagePricingId: rate.id,
        boardingNights: nights,
        lineAmount: lineAmountFor(rate, pet.id, addonTotalFor(current)),
      });
    }
  }

  function toggleAddon(pet: Pet, addonId: string) {
    const sel = selectionFor(pet);
    if (!sel) return;
    const addonIds = sel.addonIds.includes(addonId)
      ? sel.addonIds.filter((id) => id !== addonId)
      : [...sel.addonIds, addonId];
    const rateId = sel.packagePricingId ?? durationRateId[pet.id];
    const rate = rateId ? pricing.find((p) => p.id === rateId) : null;
    const addonTotal = addonIds.reduce(
      (sum, id) => sum + (addonPrices.find((p) => p.addon_id === id)?.price ?? 0), 0
    );
    updateSelection(pet, {
      addonIds,
      lineAmount: rate ? lineAmountFor(rate, pet.id, addonTotal) : addonTotal,
    });
  }

  function computeTotals() {
    onChange(selections.map((sel) => {
      const rateId = sel.packagePricingId ?? durationRateId[sel.pet.id];
      const rate = rateId ? pricing.find((p) => p.id === rateId) : null;
      if (!rate) {
        return { ...sel, kennelId: null, packagePricingId: null, lineAmount: addonTotalFor(sel) };
      }
      return {
        ...sel,
        kennelId: null,
        packageId: rate.package_id,
        packagePricingId: rate.id,
        lineAmount: lineAmountFor(rate, sel.pet.id, addonTotalFor(sel)),
      };
    }));
  }

  const allPetsHaveKennelSize = pets.every((pet) => !!selectionFor(pet)?.boardingKennelSize);
  const allRatesChosen = pets.every((pet) => {
    const sel = selectionFor(pet);
    return !!sel?.boardingKennelSize && !!(sel.packagePricingId ?? durationRateId[pet.id]);
  });

  if (loading) return <p className="py-16 text-center text-zinc-400">Loading boarding options…</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="text-center text-2xl font-bold text-brand-pink">Pet Hotel / Boarding</h2>
      <p className="mt-1 text-center text-sm text-zinc-500">Choose the kennel size for each pet, then select the boarding duration.</p>

      <div className="mt-5 rounded-2xl border-2 border-pink-100 p-4">
        <p className="text-sm font-bold text-brand-pink">🏠 Pet Hotel Inclusions</p>
        <ul className="mt-2 space-y-1">
          {INCLUSIONS.map((inc) => (
            <li key={inc} className="flex items-center gap-1.5 text-xs text-zinc-600">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="shrink-0 text-brand-pink">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {inc}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 rounded-xl bg-sky-50 px-4 py-3 text-xs text-sky-700">
        <strong>Kennel assignment:</strong> Choose Small or Big here. Staff assigns the exact kennel number at check-in. Multiple pets can share one kennel only when their saved size combination fits the kennel capacity.
      </div>

      <p className="mt-6 font-bold text-zinc-800">Kennel Size</p>
      <div className="mt-2 space-y-3">
        {pets.map((pet) => {
          const sel = selectionFor(pet);
          const selectedSize = sel?.boardingKennelSize;
          return (
            <div key={pet.id} className="rounded-xl border border-pink-100 bg-white p-4">
              <p className="text-sm font-semibold text-zinc-800">
                {pet.name}<span className="font-normal text-zinc-400"> ({pet.size_label})</span>
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(["small", "big"] as BoardingKennelSize[]).map((size) => {
                  const active = selectedSize === size;
                  return (
                    <button key={size} type="button" onClick={() => selectKennelSize(pet, size)} className={[
                      "rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-colors",
                      active ? "border-brand-pink bg-brand-pink text-white" : "border-pink-200 bg-white text-zinc-700 hover:border-brand-pink hover:bg-pink-50",
                    ].join(" ")}>{labelForSize(size)}</button>
                  );
                })}
              </div>

              {selectedSize && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-zinc-500">{labelForSize(selectedSize)} duration</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {pricingFor(selectedSize).map((rate) => {
                      const active = (sel?.packagePricingId ?? durationRateId[pet.id]) === rate.id;
                      return (
                        <button key={rate.id} type="button" onClick={() => selectRate(pet, selectedSize, rate)} className={[
                          "rounded-lg border-2 px-3 py-2 text-xs font-semibold transition-colors",
                          active ? "border-brand-pink bg-brand-pink text-white" : "border-pink-200 text-zinc-700 hover:border-brand-pink",
                        ].join(" ")}>{rate.size_detail ?? rate.size_label} — ₱{rate.price.toLocaleString()}{rate.is_per_night ? " / night" : ""}</button>
                      );
                    })}
                  </div>

                  {((sel?.packagePricingId ?? durationRateId[pet.id]) && pricingFor(selectedSize).some((rate) =>
                    rate.id === (sel?.packagePricingId ?? durationRateId[pet.id]) && isSevenDaysOrMore(rate)
                  )) && (
                    <div className="mt-3 rounded-xl bg-pink-50 p-3">
                      <label htmlFor={`boarding-nights-${pet.id}`} className="block text-xs font-semibold text-zinc-700">Number of nights</label>
                      <div className="mt-2 flex items-center gap-2">
                        <input id={`boarding-nights-${pet.id}`} type="number" min={7} step={1} value={getNights(pet.id)} onChange={(event) => setNights(pet, event.target.value)} className="w-28 rounded-lg border border-pink-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 outline-none focus:border-brand-pink focus:ring-2 focus:ring-pink-100" />
                        <span className="text-xs text-zinc-500">nights × ₱{(pricing.find((rate) => rate.id === (sel?.packagePricingId ?? durationRateId[pet.id]))?.price ?? 550).toLocaleString()} per night</span>
                      </div>
                      <p className="mt-1 text-[11px] text-zinc-400">{getNights(pet.id)} nights = ₱{((pricing.find((rate) => rate.id === (sel?.packagePricingId ?? durationRateId[pet.id]))?.price ?? 550) * getNights(pet.id)).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {addons.length > 0 && allPetsHaveKennelSize && (
        <>
          <p className="mt-6 font-bold text-zinc-800">Add-Ons <span className="text-sm font-normal text-zinc-400">(Optional)</span></p>
          {pets.map((pet) => {
            const sel = selectionFor(pet);
            const alreadyGroomed = alreadyGroomedPetIds?.includes(pet.id);
            const petAddons = alreadyGroomed ? addons.filter((a) => !a.name.toLowerCase().includes("groom")) : addons;
            return (
              <div key={pet.id} className="mt-2">
                <p className="text-xs font-semibold text-zinc-500">{pet.name}</p>
                {alreadyGroomed && addons.length !== petAddons.length && <p className="text-[11px] text-zinc-400">Already availed grooming in this booking.</p>}
                <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {petAddons.map((addon) => {
                    const priceRow = addonPrices.find((p) => p.addon_id === addon.id);
                    const selected = sel?.addonIds.includes(addon.id);
                    return (
                      <button key={addon.id} type="button" onClick={() => toggleAddon(pet, addon.id)} className={[
                        "rounded-xl border-2 px-3 py-2 text-left text-xs transition-colors",
                        selected ? "border-brand-pink bg-brand-pink text-white" : "border-pink-100 text-zinc-700 hover:border-pink-200",
                      ].join(" ")}>
                        <p className="font-semibold">{addon.name}</p>
                        {priceRow && <p className={selected ? "text-white/80" : "text-zinc-400"}>+₱{priceRow.price}</p>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </>
      )}

      <div className="mt-8 flex gap-3">
        <button type="button" onClick={onBack} className="flex-1 rounded-full border-2 border-zinc-300 py-2.5 font-semibold text-zinc-500 transition-colors hover:border-zinc-400">Back</button>
        <button type="button" onClick={() => { computeTotals(); onNext(); }} disabled={!allPetsHaveKennelSize || !allRatesChosen} className="flex-1 rounded-full bg-brand-pink py-2.5 font-semibold text-white transition-colors hover:bg-brand-pink-dark disabled:cursor-not-allowed disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}
