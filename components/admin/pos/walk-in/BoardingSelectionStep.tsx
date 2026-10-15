"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchPackagesFull, fetchAddonsByCategory } from "@/lib/supabase/services";
import type { Package, PackagePricing, Addon, AddonPrice } from "@/lib/types/services";
import type { Pet, DraftPetSelection } from "@/lib/types/appointments";

const INCLUSIONS = ["Check In 8AM to 6:00 PM", "Supervision by staff", "Air conditioned area", "Filtered water provided", "Free bath & blow dry (for boarding of at least 4 nights)"];
type BoardingKennelSize = "small" | "big";
function labelForSize(size: BoardingKennelSize) { return size === "small" ? "Small Kennel" : "Big Kennel"; }
function rateSortValue(rate: PackagePricing): number {
  if (rate.is_per_night) return Number.MAX_SAFE_INTEGER;
  if (typeof rate.nights === "number" && rate.nights > 0) return rate.nights;
  const text = `${rate.size_detail ?? ""} ${rate.size_label ?? ""}`.toLowerCase();
  const match = text.match(/(\d+)\s*nights?/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER - 1;
}
function sortBoardingRates(rates: PackagePricing[]): PackagePricing[] {
  return [...rates].sort((a, b) => rateSortValue(a) - rateSortValue(b) || Number(a.is_per_night) - Number(b.is_per_night) || a.price - b.price);
}
function isSevenDaysOrMore(rate: PackagePricing) {
  const label = `${rate.size_label ?? ""} ${rate.size_detail ?? ""}`.toLowerCase();
  return rate.is_per_night || label.includes("7") || label.includes("week");
}
function packageMatchesKennelSize(pkg: Package | undefined, size: BoardingKennelSize) {
  return !!pkg && pkg.name.toLowerCase().includes(size === "small" ? "small" : "big");
}
const validNights = (text: string): number | null => {
  if (!/^\d+$/.test(text)) return null;
  const value = Number(text);
  return Number.isSafeInteger(value) && value >= 7 ? value : null;
};

export default function BoardingSelectionStep({ pets, selections, onChange, scheduledDate: _scheduledDate, onBack, onNext, alreadyGroomedPetIds }: {
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
  const [durationRateId, setDurationRateId] = useState<Record<string, string | null>>({});
  // Keep the raw string so clearing the number is possible; never replace an empty value with 7 during typing.
  const [customNights, setCustomNights] = useState<Record<string, string>>({});
  const [touchedNights, setTouchedNights] = useState<Record<string, boolean>>({});
  const getNights = (petId: string) => validNights(customNights[petId] ?? "");

  const loadData = useCallback(async () => {
    setLoading(true);
    const [pkgResult, addonResult] = await Promise.all([fetchPackagesFull("boarding"), fetchAddonsByCategory("Boarding Add-ons")]);
    setPackages(pkgResult.packages);
    setPricing(pkgResult.pricing);
    setAddons(addonResult.addons.filter((a) => a.is_active));
    setAddonPrices(addonResult.prices);
    setLoading(false);
  }, []);
  useEffect(() => { void loadData(); }, [loadData]);
  useEffect(() => {
    if (!pricing.length) return;
    setDurationRateId((previous) => {
      const next = { ...previous };
      for (const selection of selections) if (selection.packagePricingId) next[selection.pet.id] = selection.packagePricingId;
      return next;
    });
    setCustomNights((previous) => {
      const next = { ...previous };
      for (const selection of selections) {
        if (next[selection.pet.id] === undefined && typeof selection.boardingNights === "number" && selection.boardingNights >= 7) next[selection.pet.id] = String(selection.boardingNights);
      }
      return next;
    });
  }, [pricing, selections]);

  function selectionFor(pet: Pet) { return selections.find((s) => s.pet.id === pet.id); }
  function addonTotalFor(sel: DraftPetSelection | undefined) {
    return sel?.addonIds.reduce((sum, id) => sum + (addonPrices.find((p) => p.addon_id === id)?.price ?? 0), 0) ?? 0;
  }
  function lineAmountFor(rate: PackagePricing, petId: string, addonTotal: number) {
    return (rate.is_per_night ? rate.price * (getNights(petId) ?? 0) : rate.price) + addonTotal;
  }
  function updateSelection(pet: Pet, patch: Partial<DraftPetSelection>) {
    const base: DraftPetSelection = selectionFor(pet) ?? { pet, packageId: null, packagePricingId: null, sizeId: null, kennelId: null, groomerId: null, addonIds: [], lineAmount: 0 };
    onChange([...selections.filter((s) => s.pet.id !== pet.id), { ...base, ...patch }]);
  }
  function pricingFor(size: BoardingKennelSize) {
    const pkg = packages.find((p) => packageMatchesKennelSize(p, size));
    return pkg ? sortBoardingRates(pricing.filter((p) => p.package_id === pkg.id)) : [];
  }
  function selectKennelSize(pet: Pet, size: BoardingKennelSize) {
    const current = selectionFor(pet);
    const currentRate = current?.packagePricingId ? pricing.find((r) => r.id === current.packagePricingId) : null;
    const selectedRate = currentRate && packageMatchesKennelSize(packages.find((p) => p.id === currentRate.package_id), size) ? currentRate : null;
    const pkg = packages.find((p) => packageMatchesKennelSize(p, size));
    setDurationRateId((prev) => ({ ...prev, [pet.id]: selectedRate?.id ?? null }));
    updateSelection(pet, { kennelId: null, boardingKennelSize: size, packageId: selectedRate?.package_id ?? pkg?.id ?? null,
      packagePricingId: selectedRate?.id ?? null, boardingNights: selectedRate && isSevenDaysOrMore(selectedRate) ? getNights(pet.id) : selectedRate?.nights ?? null,
      lineAmount: selectedRate ? lineAmountFor(selectedRate, pet.id, addonTotalFor(current)) : addonTotalFor(current) });
  }
  function selectRate(pet: Pet, size: BoardingKennelSize, rate: PackagePricing) {
    setDurationRateId((prev) => ({ ...prev, [pet.id]: rate.id }));
    const current = selectionFor(pet);
    const custom = isSevenDaysOrMore(rate);
    updateSelection(pet, { kennelId: null, boardingKennelSize: size, packageId: rate.package_id, packagePricingId: rate.id,
      boardingNights: custom ? getNights(pet.id) : rate.nights ?? null,
      lineAmount: custom && getNights(pet.id) === null ? addonTotalFor(current) : lineAmountFor(rate, pet.id, addonTotalFor(current)) });
  }
  function setNights(pet: Pet, value: string) {
    // Never force a minimum onChange: an empty string is an expected editing state.
    if (value !== "" && !/^\d+$/.test(value)) return;
    setCustomNights((prev) => ({ ...prev, [pet.id]: value }));
    setTouchedNights((prev) => ({ ...prev, [pet.id]: true }));
    const current = selectionFor(pet);
    const rateId = current?.packagePricingId ?? durationRateId[pet.id];
    const rate = rateId ? pricing.find((p) => p.id === rateId) : null;
    if (rate) {
      const nights = validNights(value);
      updateSelection(pet, { kennelId: null, packageId: rate.package_id, packagePricingId: rate.id, boardingNights: nights,
        lineAmount: (rate.is_per_night ? rate.price * (nights ?? 0) : rate.price) + addonTotalFor(current) });
    }
  }
  function toggleAddon(pet: Pet, addonId: string) {
    const sel = selectionFor(pet);
    if (!sel) return;
    const addonIds = sel.addonIds.includes(addonId) ? sel.addonIds.filter((id) => id !== addonId) : [...sel.addonIds, addonId];
    const rateId = sel.packagePricingId ?? durationRateId[pet.id];
    const rate = rateId ? pricing.find((p) => p.id === rateId) : null;
    const addonTotal = addonIds.reduce((sum, id) => sum + (addonPrices.find((p) => p.addon_id === id)?.price ?? 0), 0);
    updateSelection(pet, { addonIds, lineAmount: rate ? lineAmountFor(rate, pet.id, addonTotal) : addonTotal });
  }
  function computeTotals() {
    onChange(selections.map((sel) => {
      const rateId = sel.packagePricingId ?? durationRateId[sel.pet.id];
      const rate = rateId ? pricing.find((p) => p.id === rateId) : null;
      if (!rate) return { ...sel, kennelId: null, packagePricingId: null, lineAmount: addonTotalFor(sel) };
      return { ...sel, kennelId: null, packageId: rate.package_id, packagePricingId: rate.id,
        boardingNights: isSevenDaysOrMore(rate) ? getNights(sel.pet.id) : rate.nights ?? null,
        lineAmount: lineAmountFor(rate, sel.pet.id, addonTotalFor(sel)) };
    }));
  }
  const allPetsHaveKennelSize = pets.every((pet) => !!selectionFor(pet)?.boardingKennelSize);
  const allRatesChosen = pets.every((pet) => {
    const sel = selectionFor(pet);
    const rateId = sel?.packagePricingId ?? durationRateId[pet.id];
    const rate = rateId ? pricing.find((p) => p.id === rateId) : null;
    return !!sel?.boardingKennelSize && !!rate && (!isSevenDaysOrMore(rate) || getNights(pet.id) !== null);
  });
  if (loading) return <p className="py-16 text-center text-zinc-400">Loading boarding options…</p>;
  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="text-center text-2xl font-bold text-brand-pink">Pet Hotel / Boarding</h2>
      <p className="mt-1 text-center text-sm text-zinc-500">Choose the kennel size for each pet, then select the boarding duration.</p>
      <div className="mt-5 rounded-2xl border-2 border-pink-100 p-4">
        <p className="text-sm font-bold text-brand-pink">Pet Hotel Inclusions</p>
        <ul className="mt-2 space-y-1">{INCLUSIONS.map((inc) => <li key={inc} className="text-xs text-zinc-600">✓ {inc}</li>)}</ul>
      </div>
      <div className="mt-5 rounded-xl bg-sky-50 px-4 py-3 text-xs text-sky-700"><strong>Kennel assignment:</strong> Choose Small or Big here. Staff assigns the exact kennel number at check-in. Multiple pets can share one kennel only when their saved size combination fits the kennel capacity.</div>
      <p className="mt-6 font-bold text-zinc-800">Kennel Size</p>
      <div className="mt-2 space-y-3">
        {pets.map((pet) => {
          const sel = selectionFor(pet);
          const selectedSize = sel?.boardingKennelSize;
          const selectedRateId = sel?.packagePricingId ?? durationRateId[pet.id];
          const selectedRate = pricing.find((rate) => rate.id === selectedRateId);
          return <div key={pet.id} className="rounded-xl border border-pink-100 bg-white p-4">
            <p className="text-sm font-semibold text-zinc-800">{pet.name}<span className="font-normal text-zinc-400"> ({pet.size_label})</span></p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(["small", "big"] as BoardingKennelSize[]).map((size) => <button key={size} type="button" onClick={() => selectKennelSize(pet, size)} className={["rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-colors", selectedSize === size ? "border-brand-pink bg-brand-pink text-white" : "border-pink-200 bg-white text-zinc-700 hover:border-brand-pink hover:bg-pink-50"].join(" ")}>{labelForSize(size)}</button>)}
            </div>
            {selectedSize && <div className="mt-4">
              <p className="text-xs font-semibold text-zinc-500">{labelForSize(selectedSize)} duration</p>
              <div className="mt-2 flex flex-wrap gap-2">{pricingFor(selectedSize).map((rate) => <button key={rate.id} type="button" onClick={() => selectRate(pet, selectedSize, rate)} className={["rounded-lg border-2 px-3 py-2 text-xs font-semibold transition-colors", selectedRateId === rate.id ? "border-brand-pink bg-brand-pink text-white" : "border-pink-200 text-zinc-700 hover:border-brand-pink"].join(" ")}>{rate.size_detail ?? rate.size_label} — ₱{rate.price.toLocaleString()}{rate.is_per_night ? " / night" : ""}</button>)}</div>
              {selectedRate && isSevenDaysOrMore(selectedRate) && <div className="mt-3 rounded-xl bg-pink-50 p-3">
                <label htmlFor={`boarding-nights-${pet.id}`} className="block text-xs font-semibold text-zinc-700">Number of nights (7 or more)</label>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input id={`boarding-nights-${pet.id}`} type="number" min={7} step={1} inputMode="numeric" placeholder="Enter nights" value={customNights[pet.id] ?? ""} onChange={(event) => setNights(pet, event.target.value)} aria-invalid={touchedNights[pet.id] && getNights(pet.id) === null} className="w-36 rounded-lg border border-pink-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 outline-none focus:border-brand-pink focus:ring-2 focus:ring-pink-100" />
                  <span className="text-xs text-zinc-500">₱{selectedRate.price.toLocaleString()} per night</span>
                </div>
                {touchedNights[pet.id] && getNights(pet.id) === null && <p role="alert" className="mt-1 text-xs text-red-600">Enter a whole number of at least 7 nights.</p>}
                {getNights(pet.id) !== null && <p className="mt-1 text-xs text-zinc-500">{getNights(pet.id)} nights = ₱{(selectedRate.price * (getNights(pet.id) ?? 0)).toLocaleString()}</p>}
              </div>}
            </div>}
          </div>;
        })}
      </div>
      {addons.length > 0 && allPetsHaveKennelSize && <>
        <p className="mt-6 font-bold text-zinc-800">Add-Ons <span className="text-sm font-normal text-zinc-400">(Optional)</span></p>
        {pets.map((pet) => {
          const sel = selectionFor(pet);
          const alreadyGroomed = alreadyGroomedPetIds?.includes(pet.id);
          const petAddons = alreadyGroomed ? addons.filter((a) => !a.name.toLowerCase().includes("groom")) : addons;
          return <div key={pet.id} className="mt-2">
            <p className="text-xs font-semibold text-zinc-500">{pet.name}</p>
            {alreadyGroomed && addons.length !== petAddons.length && <p className="text-[11px] text-zinc-400">Already availed grooming in this booking.</p>}
            <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-3">{petAddons.map((addon) => {
              const priceRow = addonPrices.find((p) => p.addon_id === addon.id);
              const selected = sel?.addonIds.includes(addon.id);
              return <button key={addon.id} type="button" onClick={() => toggleAddon(pet, addon.id)} className={["rounded-xl border-2 px-3 py-2 text-left text-xs transition-colors", selected ? "border-brand-pink bg-brand-pink text-white" : "border-pink-100 text-zinc-700 hover:border-pink-200"].join(" ")}>
                <p className="font-semibold">{addon.name}</p>{priceRow && <p className={selected ? "text-white/80" : "text-zinc-400"}>+₱{priceRow.price}</p>}
              </button>;
            })}</div>
          </div>;
        })}
      </>}
      <div className="mt-8 flex gap-3">
        <button type="button" onClick={onBack} className="flex-1 rounded-full border-2 border-zinc-300 py-2.5 font-semibold text-zinc-500 transition-colors hover:border-zinc-400">Back</button>
        <button type="button" onClick={() => { computeTotals(); onNext(); }} disabled={!allPetsHaveKennelSize || !allRatesChosen} className="flex-1 rounded-full bg-brand-pink py-2.5 font-semibold text-white transition-colors hover:bg-brand-pink-dark disabled:cursor-not-allowed disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}
