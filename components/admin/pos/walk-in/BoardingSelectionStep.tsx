"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchPackagesFull, fetchAddonsByCategory } from "@/lib/supabase/services";
import { blockingReason, hasFreeBathDry, isBathDry, boardingBathDryPrice } from "@/lib/booking/boarding-promotions";
import {
  MIN_EXTENDED_BOARDING_NIGHTS,
  MAX_BOARDING_NIGHTS,
  extendedBoardingNightError,
  isExtendedBoardingRate,
  parseExtendedBoardingNights,
} from "@/lib/booking/boarding-duration";
import type { Package, PackagePricing, Addon, AddonPrice } from "@/lib/types/services";
import type { Pet, DraftPetSelection } from "@/lib/types/appointments";

type KennelSize = "small" | "big";

// Large and larger pets cannot use a small kennel; Small and Medium can choose either.
function needsBigKennel(pet: Pet): boolean {
  const normalized = (pet.size_label ?? "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  return /\blarge\b/.test(normalized) || /\b(?:xl|xxl|xxxl)\b/.test(normalized);
}

function fixedNights(rate: PackagePricing): number | null {
  if (isExtendedBoardingRate(rate)) return null;
  if (rate.nights && rate.nights > 0) return rate.nights;
  const match = `${rate.size_detail ?? ""} ${rate.size_label}`.match(/(\d+)\s*nights?/i);
  return match ? Number(match[1]) : null;
}

export default function BoardingSelectionStep({
  pets, selections, onChange, scheduledDate: _scheduledDate, onBack, onNext, alreadyGroomedPetIds = [], combined = false, onPrepared,
}: {
  pets: Pet[];
  selections: DraftPetSelection[];
  onChange: (items: DraftPetSelection[]) => void;
  scheduledDate: string | null;
  onBack: () => void;
  onNext: () => void;
  alreadyGroomedPetIds?: string[];
  combined?: boolean;
  onPrepared?: (pricing: PackagePricing[], valid: boolean) => void;
}) {
  const [packages, setPackages] = useState<Package[]>([]);
  const [pricing, setPricing] = useState<PackagePricing[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [addonPrices, setAddonPrices] = useState<AddonPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Keep the raw value so 0–6, decimals and negative input can show a useful warning.
  const [custom, setCustom] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, a] = await Promise.all([
        fetchPackagesFull("boarding"), fetchAddonsByCategory("Boarding Add-ons"),
      ]);
      if (p.error || a.error) throw new Error(p.error || a.error || "Unable to load service data");
      setPackages(p.packages.filter((pkg) => pkg.is_active));
      setPricing(p.pricing);
      setAddons(a.addons.filter((addon) => addon.is_active));
      setAddonPrices(a.prices);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load boarding rates");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const forPet = (pet: Pet) => selections.find((selection) => selection.pet.id === pet.id);
  const rateFor = (selection?: DraftPetSelection) => pricing.find((rate) => rate.id === selection?.packagePricingId);
  const nightsFor = (selection?: DraftPetSelection) => selection?.boardingNights ??
    (rateFor(selection) ? fixedNights(rateFor(selection)!) : null);

  function addonPrice(id: string, pet: Pet) {
    const addon = addons.find((a) => a.id === id);
    return addon && isBathDry(addon.name)
      ? boardingBathDryPrice(pet.size_label)
      : addonPrices.find((p) => p.addon_id === id)?.price ?? 0;
  }
  function filteredAddons(selection: DraftPetSelection, nights: number | null) {
    return selection.addonIds.filter((id) => {
      const addon = addons.find((a) => a.id === id);
      return addon && !blockingReason(addon.name, nights, alreadyGroomedPetIds.includes(selection.pet.id));
    });
  }
  function computed(selection: DraftPetSelection): DraftPetSelection {
    const rate = rateFor(selection);
    const nights = nightsFor(selection);
    // Never show an incomplete 7+ nights stay as a free/zero-priced booking.
    if (rate && isExtendedBoardingRate(rate) && parseExtendedBoardingNights(nights) === null) {
      return { ...selection, lineAmount: 0 };
    }
    const clean = filteredAddons(selection, nights);
    const base = rate ? (isExtendedBoardingRate(rate) ? rate.price * (nights ?? 0) : rate.price) : 0;
    return {
      ...selection, addonIds: clean,
      lineAmount: base + clean.reduce((n, id) => n + addonPrice(id, selection.pet), 0),
    };
  }
  function update(pet: Pet, patch: Partial<DraftPetSelection>) {
    const base: DraftPetSelection = forPet(pet) ?? {
      pet, packageId: null, packagePricingId: null, sizeId: null,
      kennelId: null, groomerId: null, addonIds: [], lineAmount: 0,
    };
    const stayChanged =
      (patch.boardingKennelSize !== undefined && patch.boardingKennelSize !== base.boardingKennelSize) ||
      (patch.packagePricingId !== undefined && patch.packagePricingId !== base.packagePricingId) ||
      ("boardingNights" in patch && patch.boardingNights !== base.boardingNights);
    const selection = computed({ ...base, ...patch, ...(stayChanged ? {
      boardingScheduledDate: null, boardingDropOffAt: null, boardingPickUpAt: null, kennelId: null,
    } : {}) });
    onChange([...selections.filter((item) => item.pet.id !== pet.id), selection]);
  }
  function chooseSize(pet: Pet, size: KennelSize) {
    if (size === "small" && needsBigKennel(pet)) return;
    const pkg = packages.find((p) => p.name.toLowerCase().includes(size === "small" ? "small" : "big"));
    update(pet, {
      boardingKennelSize: size, packageId: pkg?.id ?? null,
      packagePricingId: null, boardingNights: null, addonIds: [],
    });
  }
  function chooseRate(pet: Pet, rate: PackagePricing) {
    const nights = isExtendedBoardingRate(rate)
      ? parseExtendedBoardingNights(custom[pet.id])
      : fixedNights(rate);
    update(pet, { packageId: rate.package_id, packagePricingId: rate.id, boardingNights: nights });
  }
  function changeNights(pet: Pet, raw: string) {
    setCustom((previous) => ({ ...previous, [pet.id]: raw }));
    // Unacceptable values stay visible for correction but are never saved as a duration.
    update(pet, { boardingNights: parseExtendedBoardingNights(raw) });
  }
  function toggle(pet: Pet, id: string) {
    const selection = forPet(pet);
    const rate = rateFor(selection);
    if (!selection || (rate && isExtendedBoardingRate(rate) && parseExtendedBoardingNights(selection.boardingNights) === null)) return;
    const list = selection.addonIds.includes(id)
      ? selection.addonIds.filter((item) => item !== id)
      : [...selection.addonIds, id];
    update(pet, { addonIds: list });
  }

  const valid = !error && pets.length > 0 && pets.every((pet) => {
    const selection = forPet(pet);
    const rate = rateFor(selection);
    const nights = nightsFor(selection);
    return !!selection?.boardingKennelSize &&
      !(needsBigKennel(pet) && selection.boardingKennelSize === "small") &&
      !!rate && rate.package_id === selection.packageId &&
      typeof nights === "number" && Number.isSafeInteger(nights) && nights > 0 &&
      (!isExtendedBoardingRate(rate) || parseExtendedBoardingNights(nights) !== null);
  });

  // Parent uses this to show/hide live dates on the very same screen.
  useEffect(() => { onPrepared?.(pricing, valid && !loading); }, [onPrepared, pricing, valid, loading]);
  if (loading) return <p className="py-12 text-center text-zinc-500">Loading boarding packages…</p>;
  return <section className="mx-auto max-w-3xl">
    <h2 className="text-center text-2xl font-bold text-brand-pink">Pet Hotel / Boarding</h2>
    <p className="mt-2 text-center text-sm text-zinc-500">Choose kennel size and duration for each pet. Free Bath & Dry applies at 4+ nights.</p>
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="mt-5 rounded-2xl border border-pink-200 bg-pink-50/50 p-4 text-sm text-zinc-700">
      <strong>Boarding includes:</strong> staff supervision, air-conditioned accommodation, drinking water, and complimentary Bath & Dry at 4 or more nights. Only one grooming treatment will be scheduled per pet.
    </div>
    {pets.map((pet) => {
      const selection = forPet(pet);
      const restricted = needsBigKennel(pet);
      const invalidSmall = restricted && selection?.boardingKennelSize === "small";
      const size = invalidSmall ? undefined : selection?.boardingKennelSize;
      const rates = size
        ? packages.filter((p) => p.name.toLowerCase().includes(size === "small" ? "small" : "big"))
          .flatMap((p) => pricing.filter((rate) => rate.package_id === p.id))
          .sort((a, b) => (fixedNights(a) ?? 999) - (fixedNights(b) ?? 999))
        : [];
      const rate = invalidSmall ? undefined : rateFor(selection);
      const nights = invalidSmall ? null : nightsFor(selection);
      const extended = !!rate && isExtendedBoardingRate(rate);
      const rawNights = custom[pet.id] ?? (selection?.boardingNights && selection.boardingNights >= MIN_EXTENDED_BOARDING_NIGHTS ? String(selection.boardingNights) : "");
      const durationError = extended ? extendedBoardingNightError(rawNights) : null;
      const durationReady = !extended || durationError === null;
      const hasGrooming = alreadyGroomedPetIds.includes(pet.id);
      const helpId = `boarding-min-nights-${pet.id}`;
      return <div key={pet.id} className="mt-5 rounded-2xl border border-pink-100 bg-white p-5">
        <h3 className="font-bold text-zinc-800">{pet.name} <span className="text-sm font-normal text-zinc-500">({pet.size_label})</span></h3>
        <p className="mt-4 text-sm font-semibold">Kennel size</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(["small", "big"] as KennelSize[]).map((kind) => <button type="button" key={kind}
            disabled={kind === "small" && restricted} aria-disabled={kind === "small" && restricted}
            onClick={() => chooseSize(pet, kind)}
            className={`rounded-xl border-2 p-3 text-sm font-semibold ${kind === "small" && restricted ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400" : size === kind ? "border-brand-pink bg-brand-pink text-white" : "border-pink-100 text-zinc-700"}`}>
            {kind === "small" ? "Small Kennel" : "Big Kennel"}
            {kind === "small" && restricted && <span className="mt-1 block text-xs">Unavailable for this size</span>}
          </button>)}
        </div>
        {restricted && <p className="mt-2 text-xs text-amber-700">Large and larger pets require a Big Kennel.</p>}
        {invalidSmall && <p role="alert" className="mt-2 text-xs text-red-600">Your previous Small Kennel selection is no longer eligible. Please choose Big Kennel to continue.</p>}
        {size && <>
          <p className="mt-5 text-sm font-semibold">Boarding duration</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {rates.map((option) => <button type="button" key={option.id} onClick={() => chooseRate(pet, option)}
              aria-pressed={rate?.id === option.id}
              className={`rounded-xl border-2 px-3 py-2 text-xs font-semibold ${rate?.id === option.id ? "border-brand-pink bg-brand-pink text-white" : "border-pink-100 text-zinc-700"}`}>
              {option.size_detail || option.size_label} — ₱{option.price.toLocaleString()}{isExtendedBoardingRate(option) ? "/night" : ""}
            </button>)}
          </div>
        </>}
        {extended && <div className="mt-4 rounded-xl border border-pink-100 bg-pink-50/40 p-4">
          <label htmlFor={helpId} className="block text-sm font-semibold text-zinc-800">Number of nights (7 Days & Up)</label>
          <p className="mt-1 text-xs text-zinc-600">Starts at <strong>{MIN_EXTENDED_BOARDING_NIGHTS} nights</strong>. Enter {MIN_EXTENDED_BOARDING_NIGHTS}–{MAX_BOARDING_NIGHTS} to calculate the price.</p>
          <input id={helpId} type="number" inputMode="numeric" min={MIN_EXTENDED_BOARDING_NIGHTS} max={MAX_BOARDING_NIGHTS} step="1"
            placeholder="e.g. 7" value={rawNights} onChange={(event) => changeNights(pet, event.target.value)}
            aria-invalid={!!rawNights && !!durationError} aria-describedby={`${helpId}-message`}
            className={`mt-3 block w-40 rounded-xl border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-pink ${!!rawNights && durationError ? "border-red-400" : "border-pink-200"}`} />
          <p id={`${helpId}-message`} role={rawNights && durationError ? "alert" : "status"}
            className={`mt-2 text-xs font-medium ${durationError && rawNights ? "text-red-700" : durationError ? "text-amber-700" : "text-emerald-700"}`}>
            {durationError ?? `Valid duration: ${nights} nights. Minimum requirement met.`}
          </p>
        </div>}
        {rate && durationReady && nights && <div className="mt-4 rounded-xl bg-pink-50 p-3 text-sm">
          {hasFreeBathDry(nights)
            ? <span className="font-semibold text-emerald-700">✓ Complimentary Bath & Dry included</span>
            : <span className="text-zinc-500">Bath & Dry is optional for stays under 4 nights (Small: ₱500 · Large: ₱600).</span>}
        </div>}
        {rate && <>
          <p className="mt-5 text-sm font-semibold">Optional boarding add-ons</p>
          {!durationReady && <p className="mt-1 text-xs text-amber-700">Enter a valid stay of at least 7 nights to select add-ons.</p>}
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {addons.map((addon) => {
              const reason = blockingReason(addon.name, nights, hasGrooming);
              const selected = selection?.addonIds.includes(addon.id) ?? false;
              return <button type="button" key={addon.id} disabled={!!reason || !durationReady}
                title={!durationReady ? "Enter at least 7 nights first." : reason ?? undefined}
                onClick={() => toggle(pet, addon.id)}
                className={`rounded-xl border-2 p-3 text-left text-xs ${reason || !durationReady ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400" : selected ? "border-brand-pink bg-brand-pink text-white" : "border-pink-100 text-zinc-700"}`}>
                <span className="block font-semibold">{addon.name}</span>
                <span className="mt-1 block">{!durationReady ? "Enter duration first" : reason ? isBathDry(addon.name) ? "Included free" : "Unavailable · Grooming booked" : `+₱${addonPrice(addon.id, pet).toLocaleString()}`}</span>
              </button>;
            })}
          </div>
        </>}
        {selection && !invalidSmall && rate && durationReady
          ? <p className="mt-4 text-right text-sm font-bold text-brand-pink">Subtotal: ₱{computed(selection).lineAmount.toLocaleString()}</p>
          : extended && !durationReady
            ? <p className="mt-4 text-right text-xs font-semibold text-zinc-500">Subtotal calculated after a valid duration is entered.</p>
            : null}
      </div>;
    })}
    {combined ? <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <button type="button" onClick={onBack} className="rounded-full border-2 border-zinc-300 px-6 py-2.5 text-sm font-semibold text-zinc-600">Back to waiver</button>
      <p className="text-xs font-semibold text-zinc-500">{valid ? "Choose an available date and pickup below ↓" : "Complete the kennel and duration above to view dates."}</p>
    </div> : <div className="mt-8 grid grid-cols-2 gap-3">
      <button type="button" onClick={onBack} className="rounded-full border-2 border-zinc-300 py-3 font-semibold text-zinc-600">Back</button>
      <button type="button" disabled={!valid} onClick={() => { if (!valid) return; onChange(selections.map(computed)); onNext(); }}
        className="rounded-full bg-brand-pink py-3 font-semibold text-white disabled:opacity-40">Next</button>
    </div>}
  </section>;
}
