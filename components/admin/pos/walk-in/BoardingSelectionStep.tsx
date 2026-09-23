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
  // Pets that already have a completed grooming leg earlier in this
  // same multi-service booking — a "Full Grooming" boarding add-on
  // would just be double-booking a service they've already gotten, so
  // it's hidden for those pets specifically (other pets in the same
  // boarding leg who weren't groomed still see it normally).
  alreadyGroomedPetIds?: string[];
}) {
  const [packages, setPackages] = useState<Package[]>([]);
  const [pricing, setPricing] = useState<PackagePricing[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [addonPrices, setAddonPrices] = useState<AddonPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [durationRateId, setDurationRateId] = useState<
    Record<BoardingKennelSize, string | null>
  >({ small: null, big: null });
  const [customNights, setCustomNights] = useState<Record<string, number>>({});

  function isSevenDaysOrMore(rate: PackagePricing) {
    const label = `${rate.size_label ?? ""} ${rate.size_detail ?? ""}`.toLowerCase();
    return label.includes("7") || label.includes("week");
  }

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

  // Restore selected duration/rate when returning to this step.
  useEffect(() => {
    const restored: Record<BoardingKennelSize, string | null> = {
      small: null,
      big: null,
    };

    for (const selection of selections) {
      if (!selection.packagePricingId) continue;

      const rate = pricing.find((p) => p.id === selection.packagePricingId);
      if (!rate) continue;

      const pkg = packages.find((p) => p.id === rate.package_id);
      if (!pkg) continue;

      const lower = pkg.name.toLowerCase();
      if (lower.includes("small")) restored.small = rate.id;
      if (lower.includes("big")) restored.big = rate.id;
    }

    // selections is updated by computeTotals(), so this effect can run again
    // even when the restored rate IDs have not actually changed. Do not call
    // setState with a new object unless the values are different; otherwise
    // React can enter a render -> effect -> setState loop.
    setDurationRateId((previous) => {
      if (
        previous.small === restored.small &&
        previous.big === restored.big
      ) {
        return previous;
      }
      return restored;
    });
  }, [selections, pricing, packages]);

  function selectionFor(pet: Pet) {
    return selections.find((s) => s.pet.id === pet.id);
  }

  function updateSelection(
    pet: Pet,
    patch: Partial<DraftPetSelection>
  ) {
    const existing = selectionFor(pet);

    const base: DraftPetSelection =
      existing ?? {
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

  function selectKennelSize(
    pet: Pet,
    size: BoardingKennelSize
  ) {
    const current = selectionFor(pet);

    // A real kennel number is deliberately NOT selected here.
    // The appointment module assigns the actual kennel at check-in.
    const selectedRateId = durationRateId[size];
    const selectedPackage = packages.find((pkg) =>
      pkg.name.toLowerCase().includes(size === "small" ? "small" : "big")
    );

    updateSelection(pet, {
      kennelId: null,
      boardingKennelSize: size,
      packageId: selectedPackage?.id ?? null,
      packagePricingId: selectedRateId,
    });

    if (selectedRateId) {
      const rate = pricing.find((p) => p.id === selectedRateId);
      if (rate) {
        const addonsTotal =
          current?.addonIds.reduce(
            (sum, id) =>
              sum +
              (addonPrices.find((p) => p.addon_id === id)?.price ?? 0),
            0
          ) ?? 0;

        updateSelection(pet, {
          kennelId: null,
          boardingKennelSize: size,
          packageId: selectedPackage?.id ?? null,
          packagePricingId: selectedRateId,
          lineAmount:
            (rate.is_per_night && isSevenDaysOrMore(rate)
              ? rate.price * getNights(pet.id)
              : rate.price) + addonsTotal,
        });
      }
    }
  }

  function pricingFor(size: BoardingKennelSize) {
    const pkg = packages.find((p) =>
      p.name.toLowerCase().includes(size === "small" ? "small" : "big")
    );

    if (!pkg) return [];
    return pricing.filter((p) => p.package_id === pkg.id);
  }

  function computeTotals() {
    const updated = selections.map((sel) => {
      const size = sel.boardingKennelSize;
      const rateId = size ? durationRateId[size] : null;
      const rate = pricing.find((p) => p.id === rateId);

      if (!rate) {
        return {
          ...sel,
          kennelId: null,
          packagePricingId: null,
          lineAmount: sel.addonIds.reduce(
            (sum, id) =>
              sum +
              (addonPrices.find((p) => p.addon_id === id)?.price ?? 0),
            0
          ),
        };
      }

      const addonsTotal = sel.addonIds.reduce(
        (sum, id) =>
          sum +
          (addonPrices.find((p) => p.addon_id === id)?.price ?? 0),
        0
      );

      return {
        ...sel,
        kennelId: null,
        packageId: rate.package_id,
        packagePricingId: rate.id,
        lineAmount:
  (rate.is_per_night && isSevenDaysOrMore(rate)
    ? rate.price * getNights(sel.pet.id)
    : rate.price) + addonsTotal,
      };
    });

    onChange(updated);
  }

  useEffect(() => {
    if (pricing.length > 0) {
      computeTotals();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationRateId, customNights, pricing.length, addonPrices.length]);

  function selectRate(
    pet: Pet,
    size: BoardingKennelSize,
    rate: PackagePricing
  ) {
    setDurationRateId((prev) => ({ ...prev, [size]: rate.id }));

    const sel = selectionFor(pet);
    const addonsTotal =
      sel?.addonIds.reduce(
        (sum, id) =>
          sum +
          (addonPrices.find((p) => p.addon_id === id)?.price ?? 0),
        0
      ) ?? 0;

    updateSelection(pet, {
      kennelId: null,
      boardingKennelSize: size,
      packageId: rate.package_id,
      packagePricingId: rate.id,
      lineAmount: rate.price + addonsTotal,
    });
  }

  function toggleAddon(pet: Pet, addonId: string) {
    const sel = selectionFor(pet);
    if (!sel) return;

    const addonIds = sel.addonIds.includes(addonId)
      ? sel.addonIds.filter((id) => id !== addonId)
      : [...sel.addonIds, addonId];

    updateSelection(pet, { addonIds });
  }

  const allPetsHaveKennelSize = pets.every(
    (pet) => selectionFor(pet)?.boardingKennelSize
  );

  const allRatesChosen = pets.every((pet) => {
    const size = selectionFor(pet)?.boardingKennelSize;
    return !!size && !!durationRateId[size];
  });

  if (loading) {
    return (
      <p className="py-16 text-center text-zinc-400">
        Loading boarding options…
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="text-center text-2xl font-bold text-brand-pink">
        Pet Hotel / Boarding
      </h2>
      <p className="mt-1 text-center text-sm text-zinc-500">
        Choose the kennel size for each pet, then select the boarding duration.
      </p>

      <div className="mt-5 rounded-2xl border-2 border-pink-100 p-4">
        <p className="text-sm font-bold text-brand-pink">
          🏠 Pet Hotel Inclusions
        </p>
        <ul className="mt-2 space-y-1">
          {INCLUSIONS.map((inc) => (
            <li
              key={inc}
              className="flex items-center gap-1.5 text-xs text-zinc-600"
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="shrink-0 text-brand-pink"
              >
                <path
                  d="M5 13l4 4L19 7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {inc}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 rounded-xl bg-sky-50 px-4 py-3 text-xs text-sky-700">
        <strong>Kennel assignment:</strong> You only need to choose a Small or
        Big kennel here. The specific kennel number will be assigned by staff
        in the Appointment module when your pet checks in.
      </div>

      <p className="mt-6 font-bold text-zinc-800">
        Kennel Size
      </p>

      <div className="mt-2 space-y-3">
        {pets.map((pet) => {
          const sel = selectionFor(pet);
          const selectedSize = sel?.boardingKennelSize;

          return (
            <div
              key={pet.id}
              className="rounded-xl border border-pink-100 bg-white p-4"
            >
              <p className="text-sm font-semibold text-zinc-800">
                {pet.name}
                <span className="font-normal text-zinc-400">
                  {" "}
                  ({pet.size_label})
                </span>
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {(["small", "big"] as BoardingKennelSize[]).map((size) => {
                  const active = selectedSize === size;

                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => selectKennelSize(pet, size)}
                      className={[
                        "rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-colors",
                        active
                          ? "border-brand-pink bg-brand-pink text-white"
                          : "border-pink-200 bg-white text-zinc-700 hover:border-brand-pink hover:bg-pink-50",
                      ].join(" ")}
                    >
                      {labelForSize(size)}
                    </button>
                  );
                })}
              </div>

              {selectedSize && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-zinc-500">
                    {labelForSize(selectedSize)} duration
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {pricingFor(selectedSize).map((rate) => {
                      const active = durationRateId[selectedSize] === rate.id;

                      return (
                        <button
                          key={rate.id}
                          type="button"
                          onClick={() => selectRate(pet, selectedSize, rate)}
                          className={[
                            "rounded-lg border-2 px-3 py-2 text-xs font-semibold transition-colors",
                            active
                              ? "border-brand-pink bg-brand-pink text-white"
                              : "border-pink-200 text-zinc-700 hover:border-brand-pink",
                          ].join(" ")}
                        >
                          {rate.size_detail ?? rate.size_label} — ₱
                          {rate.price.toLocaleString()}
                          {rate.is_per_night ? " / night" : ""}
                        </button>
                      );
                    })}
                  </div>

                  {durationRateId[selectedSize] &&
                    pricingFor(selectedSize).some(
                      (rate) =>
                        rate.id === durationRateId[selectedSize] &&
                        isSevenDaysOrMore(rate)
                    ) && (
                      <div className="mt-3 rounded-xl bg-pink-50 p-3">
                        <label
                          htmlFor={`boarding-nights-${pet.id}`}
                          className="block text-xs font-semibold text-zinc-700"
                        >
                          Number of nights
                        </label>
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            id={`boarding-nights-${pet.id}`}
                            type="number"
                            min={7}
                            step={1}
                            value={getNights(pet.id)}
                            onChange={(event) => {
                              const nights = Math.max(
                                7,
                                Number(event.target.value) || 7
                              );
                              setCustomNights((prev) => ({
                                ...prev,
                                [pet.id]: nights,
                              }));

                              const current = selectionFor(pet);
                              const selectedRate = pricing.find(
                                (rate) =>
                                  rate.id === durationRateId[selectedSize]
                              );

                              if (selectedRate) {
                                const addonsTotal =
                                  current?.addonIds.reduce(
                                    (sum, id) =>
                                      sum +
                                      (addonPrices.find(
                                        (p) => p.addon_id === id
                                      )?.price ?? 0),
                                    0
                                  ) ?? 0;

                                updateSelection(pet, {
                                  kennelId: null,
                                  boardingKennelSize: selectedSize,
                                  packagePricingId: selectedRate.id,
                                  lineAmount:
                                    selectedRate.price * nights +
                                    addonsTotal,
                                });
                              }
                            }}
                            className="w-28 rounded-lg border border-pink-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 outline-none focus:border-brand-pink focus:ring-2 focus:ring-pink-100"
                          />
                          <span className="text-xs text-zinc-500">
                            nights × ₱{selectedSize
                              ? (
                                  pricing.find(
                                    (rate) =>
                                      rate.id === durationRateId[selectedSize]
                                  )?.price ?? 550
                                ).toLocaleString()
                              : "550"}
                            {" "}per night
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-zinc-400">
                          7 nights = ₱{(
                            (pricing.find(
                              (rate) =>
                                rate.id === durationRateId[selectedSize]
                            )?.price ?? 550) * getNights(pet.id)
                          ).toLocaleString()}
                        </p>
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
          <p className="mt-6 font-bold text-zinc-800">
            Add-Ons{" "}
            <span className="text-sm font-normal text-zinc-400">
              (Optional)
            </span>
          </p>

          {pets.map((pet) => {
            const sel = selectionFor(pet);
            const alreadyGroomed = alreadyGroomedPetIds?.includes(pet.id);
            const petAddons = alreadyGroomed
              ? addons.filter((a) => !a.name.toLowerCase().includes("groom"))
              : addons;

            return (
              <div key={pet.id} className="mt-2">
                <p className="text-xs font-semibold text-zinc-500">
                  {pet.name}
                </p>
                {alreadyGroomed && addons.length !== petAddons.length && (
                  <p className="text-[11px] text-zinc-400">Already availed grooming in this booking.</p>
                )}

                <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {petAddons.map((addon) => {
                    const priceRow = addonPrices.find(
                      (p) => p.addon_id === addon.id
                    );
                    const selected = sel?.addonIds.includes(addon.id);

                    return (
                      <button
                        key={addon.id}
                        type="button"
                        onClick={() => toggleAddon(pet, addon.id)}
                        className={[
                          "rounded-xl border-2 px-3 py-2 text-left text-xs transition-colors",
                          selected
                            ? "border-brand-pink bg-brand-pink text-white"
                            : "border-pink-100 text-zinc-700 hover:border-pink-200",
                        ].join(" ")}
                      >
                        <p className="font-semibold">{addon.name}</p>
                        {priceRow && (
                          <p
                            className={
                              selected
                                ? "text-white/80"
                                : "text-zinc-400"
                            }
                          >
                            +₱{priceRow.price}
                          </p>
                        )}
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
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-full border-2 border-zinc-300 py-2.5 font-semibold text-zinc-500 transition-colors hover:border-zinc-400"
        >
          Back
        </button>

        <button
          type="button"
          onClick={() => {
            computeTotals();
            onNext();
          }}
          disabled={!allPetsHaveKennelSize || !allRatesChosen}
          className="flex-1 rounded-full bg-brand-pink py-2.5 font-semibold text-white transition-colors hover:bg-brand-pink-dark disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
