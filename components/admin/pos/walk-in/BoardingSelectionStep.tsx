"use client";
// Boarding Selection: inclusions reminder, kennel assignment per pet
// (with real capacity checking so 2 small dogs can share, but a large
// dog can't be crammed in with anyone), duration/rate per kennel size in
// use, then boarding add-ons.
import { useState, useEffect, useCallback } from "react";
import { fetchPackagesFull, fetchAddonsByCategory } from "@/lib/supabase/services";
import { fetchKennels } from "@/lib/supabase/pet-services";
import { canFitInKennel, fetchKennelOccupants } from "@/lib/supabase/appointments";
import type { Package, PackagePricing, Addon, AddonPrice } from "@/lib/types/services";
import type { Kennel } from "@/lib/types/pet-services";
import type { Pet, DraftPetSelection } from "@/lib/types/appointments";

const INCLUSIONS = [
  "Check In 8AM to 6:00 PM",
  "Supervision by staff",
  "Air conditioned area",
  "Filtered water provided",
  "Free bath & blow dry (for boarding of at least 4 nights)",
];

export default function BoardingSelectionStep({
  pets,
  selections,
  onChange,
  scheduledDate,
  onBack,
  onNext,
}: {
  pets: Pet[];
  selections: DraftPetSelection[];
  onChange: (selections: DraftPetSelection[]) => void;
  scheduledDate: string | null;
  onBack: () => void;
  onNext: () => void;
}) {
  const [kennels, setKennels] = useState<Kennel[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [pricing, setPricing] = useState<PackagePricing[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [addonPrices, setAddonPrices] = useState<AddonPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [kennelError, setKennelError] = useState<string | null>(null);
  const [durationRateId, setDurationRateId] = useState<Record<"small" | "big", string | null>>({ small: null, big: null });

  const loadData = useCallback(async () => {
    setLoading(true);
    const [kennelResult, pkgResult, addonResult] = await Promise.all([
      fetchKennels(),
      fetchPackagesFull("boarding"),
      fetchAddonsByCategory("Boarding Add-ons"),
    ]);
    setKennels(kennelResult.kennels);
    setPackages(pkgResult.packages);
    setPricing(pkgResult.pricing);
    setAddons(addonResult.addons.filter((a) => a.is_active));
    setAddonPrices(addonResult.prices);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function selectionFor(pet: Pet) {
    return selections.find((s) => s.pet.id === pet.id);
  }

  function updateSelection(pet: Pet, patch: Partial<DraftPetSelection>) {
    const existing = selectionFor(pet);
    const base: DraftPetSelection = existing ?? { pet, packageId: null, packagePricingId: null, sizeId: null, kennelId: null, groomerId: null, addonIds: [], lineAmount: 0 };
    onChange([...selections.filter((s) => s.pet.id !== pet.id), { ...base, ...patch }]);
  }

  // A kennel can hold more than one pet from THIS booking (the whole
  // point of the sharing rule) — so "who's assigned to kennel X" is
  // computed live from the other pets in this same draft, not just
  // real DB occupancy (which only matters for pets NOT in this booking).
  async function tryAssignKennel(pet: Pet, kennel: Kennel) {
    setKennelError(null);
    const petsAlreadyInThisKennel = selections
      .filter((s) => s.kennelId === kennel.id && s.pet.id !== pet.id)
      .map((s) => ({ size_label: s.pet.size_label }));

    let existingOccupants = petsAlreadyInThisKennel;
    if (scheduledDate) {
      const { occupants } = await fetchKennelOccupants(kennel.id, scheduledDate);
      existingOccupants = [...existingOccupants, ...occupants];
    }

    const result = canFitInKennel(kennel.size, existingOccupants, pet.size_label);
    if (!result.fits) {
      setKennelError(`${pet.name} can't be assigned to Kennel ${kennel.number}: ${result.reason}`);
      return;
    }
    updateSelection(pet, { kennelId: kennel.id });
  }

  const kennelSizesInUse = Array.from(
    new Set(selections.filter((s) => s.kennelId).map((s) => kennels.find((k) => k.id === s.kennelId)?.size).filter(Boolean))
  ) as ("small" | "big")[];

  // REAL BUG FIXED: this used to filter by checking if size_label
  // contained the word "small"/"big" — but size_label actually holds
  // the DURATION text ("1 Night", "3 Days & 2 Nights", etc.), never the
  // kennel size. Kennel size is distinguished by which PACKAGE the
  // pricing row belongs to (a real "Small Kennel" package and a real
  // "Big Kennel" package, confirmed directly against the live data),
  // not by anything in size_label. That's why duration/rate never
  // showed for either kennel size, in either the walk-in or customer
  // flow — both used this same component, and the filter could never
  // have matched anything, regardless of which kennel was picked.
  function pricingFor(size: "small" | "big"): PackagePricing[] {
    const pkg = packages.find((p) => p.name.toLowerCase().includes(size === "small" ? "small" : "big"));
    if (!pkg) return [];
    return pricing.filter((p) => p.package_id === pkg.id);
  }

  function computeTotals() {
    const updated = selections.map((sel) => {
      let total = 0;
      const kennel = kennels.find((k) => k.id === sel.kennelId);
      const rateId = kennel ? durationRateId[kennel.size] : null;
      const rate = pricing.find((p) => p.id === rateId);
      if (rate) total += rate.price;
      for (const addonId of sel.addonIds) {
        const priceRow = addonPrices.find((p) => p.addon_id === addonId);
        if (priceRow) total += priceRow.price;
      }
      // REAL BUG FIXED: this used to store rateId into packageId,
      // which has a real foreign key to packages.id — a
      // package_pricing.id saved there violated that constraint the
      // moment a real boarding booking tried to save
      // (appointment_pets_package_id_fkey). Now uses the real
      // packagePricingId field added for exactly this (034), and
      // packageId stays correctly null for boarding, same as it
      // already is for Ala Carte.
      return { ...sel, packagePricingId: rateId, lineAmount: total };
    });
    onChange(updated);
  }

  useEffect(() => { computeTotals(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [durationRateId]);

  function toggleAddon(pet: Pet, addonId: string) {
    const sel = selectionFor(pet);
    if (!sel) return;
    const addonIds = sel.addonIds.includes(addonId) ? sel.addonIds.filter((id) => id !== addonId) : [...sel.addonIds, addonId];
    updateSelection(pet, { addonIds });
  }

  const allPetsHaveKennel = pets.every((p) => selectionFor(p)?.kennelId);
  const allRatesChosen = kennelSizesInUse.every((size) => durationRateId[size]);

  if (loading) return <p className="text-center text-zinc-400 py-16">Loading kennels…</p>;

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-brand-pink text-center">Pet Hotel / Boarding</h2>
      <p className="mt-1 text-sm text-zinc-500 text-center">Select a kennel for each pet, then choose duration and rate.</p>

      <div className="mt-5 rounded-2xl border-2 border-pink-100 p-4">
        <p className="font-bold text-brand-pink text-sm">🏠 Pet Hotel Inclusions</p>
        <ul className="mt-2 space-y-1">
          {INCLUSIONS.map((inc) => (
            <li key={inc} className="flex items-center gap-1.5 text-xs text-zinc-600">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-brand-pink shrink-0"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {inc}
            </li>
          ))}
        </ul>
      </div>

      {kennelError && <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{kennelError}</p>}

      <p className="mt-6 font-bold text-zinc-800">Assign Kennels</p>
      <div className="mt-2 space-y-3">
        {pets.map((pet) => {
          const sel = selectionFor(pet);
          const assignedKennel = kennels.find((k) => k.id === sel?.kennelId);
          return (
            <div key={pet.id} className="bg-white rounded-xl border border-pink-100 p-3">
              <p className="text-sm font-semibold text-zinc-800">{pet.name} <span className="font-normal text-zinc-400">({pet.size_label})</span></p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {kennels.map((k) => (
                  <button
                    key={k.id}
                    onClick={() => tryAssignKennel(pet, k)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border-2 transition-colors ${
                      sel?.kennelId === k.id ? "bg-brand-pink border-brand-pink text-white" : "border-pink-200 text-zinc-600 hover:border-brand-pink"
                    }`}
                  >
                    {k.size === "small" ? "Small" : "Big"} #{k.number}
                  </button>
                ))}
              </div>
              {assignedKennel && <p className="mt-1.5 text-xs text-emerald-600">Assigned: {assignedKennel.size === "small" ? "Small" : "Big"} Kennel #{assignedKennel.number}</p>}
            </div>
          );
        })}
      </div>

      {kennelSizesInUse.length > 0 && (
        <>
          <p className="mt-6 font-bold text-zinc-800">Duration & Rate</p>
          <div className="mt-2 space-y-3">
            {kennelSizesInUse.map((size) => (
              <div key={size}>
                <p className="text-sm font-semibold text-zinc-600">{size === "small" ? "Small Kennel" : "Big Kennel"} rate</p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {pricingFor(size).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setDurationRateId((prev) => ({ ...prev, [size]: p.id }))}
                      className={`px-4 py-2 rounded-lg border-2 text-xs font-semibold transition-colors ${
                        durationRateId[size] === p.id ? "bg-brand-pink border-brand-pink text-white" : "border-pink-200 text-zinc-700 hover:border-brand-pink"
                      }`}
                    >
                      {p.size_detail ?? p.size_label} — ₱{p.price.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {addons.length > 0 && allPetsHaveKennel && (
        <>
          <p className="mt-6 font-bold text-zinc-800">Add-Ons <span className="font-normal text-zinc-400 text-sm">(Optional)</span></p>
          {pets.map((pet) => {
            const sel = selectionFor(pet);
            return (
              <div key={pet.id} className="mt-2">
                <p className="text-xs font-semibold text-zinc-500">{pet.name}</p>
                <div className="mt-1 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {addons.map((addon) => {
                    const priceRow = addonPrices.find((p) => p.addon_id === addon.id);
                    const selected = sel?.addonIds.includes(addon.id);
                    return (
                      <button
                        key={addon.id}
                        onClick={() => toggleAddon(pet, addon.id)}
                        className={`text-left rounded-xl border-2 px-3 py-2 text-xs transition-colors ${selected ? "bg-brand-pink border-brand-pink text-white" : "border-pink-100 text-zinc-700 hover:border-pink-200"}`}
                      >
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
        <button onClick={onBack} className="flex-1 border-2 border-zinc-300 text-zinc-500 font-semibold py-2.5 rounded-full hover:border-zinc-400 transition-colors">
          Back
        </button>
        <button
          onClick={() => { computeTotals(); onNext(); }}
          disabled={!allPetsHaveKennel || !allRatesChosen}
          className="flex-1 bg-brand-pink hover:bg-brand-pink-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-full transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}
