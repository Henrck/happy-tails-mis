"use client";
// Ala Carte Selection: the real, separate "Ala Carte" add-on category
// from Service Management — a flat list, no package/size/groomer
// involved. Confirmed this is its own category, not a filtered view of
// Grooming/Boarding add-ons.
import { useState, useEffect, useCallback } from "react";
import { fetchAddonsByCategory } from "@/lib/supabase/services";
import type { Addon, AddonPrice } from "@/lib/types/services";
import type { Pet, DraftPetSelection } from "@/lib/types/appointments";

export default function AlaCarteSelectionStep({
  pets,
  selections,
  onChange,
  onBack,
  onNext,
}: {
  pets: Pet[];
  selections: DraftPetSelection[];
  onChange: (selections: DraftPetSelection[]) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [addons, setAddons] = useState<Addon[]>([]);
  const [prices, setPrices] = useState<AddonPrice[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { addons: data, prices: priceData } = await fetchAddonsByCategory("Ala Carte");
    setAddons(data.filter((a) => a.is_active));
    setPrices(priceData);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function selectionFor(pet: Pet) {
    return selections.find((s) => s.pet.id === pet.id);
  }

  function toggleAddon(pet: Pet, addonId: string) {
    const existing = selectionFor(pet);
    const base: DraftPetSelection = existing ?? { pet, packageId: null, packagePricingId: null, sizeId: null, kennelId: null, groomerId: null, addonIds: [], lineAmount: 0 };
    const addonIds = base.addonIds.includes(addonId) ? base.addonIds.filter((id) => id !== addonId) : [...base.addonIds, addonId];

    const size = pet.size_label;
    let total = 0;
    for (const id of addonIds) {
      const priceRow = prices.find((p) => p.addon_id === id && p.size_label.toLowerCase() === size.toLowerCase());
      total += priceRow?.price ?? prices.find((p) => p.addon_id === id)?.price ?? 0;
    }

    const updated = { ...base, addonIds, lineAmount: total };
    onChange([...selections.filter((s) => s.pet.id !== pet.id), updated]);
  }

  const allPetsHaveAtLeastOneAddon = pets.every((p) => (selectionFor(p)?.addonIds.length ?? 0) > 0);

  if (loading) return <p className="text-center text-zinc-400 py-16">Loading add-ons…</p>;

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-brand-pink text-center">Ala Carte</h2>
      <p className="mt-1 text-sm text-zinc-500 text-center">Choose individual services for each pet.</p>

      {addons.length === 0 ? (
        <p className="mt-10 text-center text-zinc-400">No Ala Carte items available right now.</p>
      ) : (
        pets.map((pet) => {
          const sel = selectionFor(pet);
          return (
            <div key={pet.id} className="mt-6">
              <p className="font-bold text-zinc-800">{pet.name} <span className="font-normal text-zinc-400 text-sm">({pet.size_label})</span></p>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {addons.map((addon) => {
                  const priceRow = prices.find((p) => p.addon_id === addon.id && p.size_label.toLowerCase() === pet.size_label.toLowerCase())
                    ?? prices.find((p) => p.addon_id === addon.id);
                  const selected = sel?.addonIds.includes(addon.id);
                  return (
                    <button
                      key={addon.id}
                      onClick={() => toggleAddon(pet, addon.id)}
                      className={`text-left rounded-xl border-2 px-3 py-2.5 text-xs transition-colors ${selected ? "bg-brand-pink border-brand-pink text-white" : "border-pink-100 text-zinc-700 hover:border-pink-200"}`}
                    >
                      <p className="font-semibold">{addon.name}</p>
                      {addon.price_note ? (
                        <p className={selected ? "text-white/80 italic" : "text-zinc-400 italic"}>{addon.price_note}</p>
                      ) : priceRow ? (
                        <p className={selected ? "text-white/80" : "text-zinc-400"}>₱{priceRow.price}</p>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      <div className="mt-8 flex gap-3">
        <button onClick={onBack} className="flex-1 border-2 border-zinc-300 text-zinc-500 font-semibold py-2.5 rounded-full hover:border-zinc-400 transition-colors">
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!allPetsHaveAtLeastOneAddon}
          className="flex-1 bg-brand-pink hover:bg-brand-pink-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-full transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}
