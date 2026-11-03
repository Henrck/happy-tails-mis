"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { fetchAddonsByCategory } from "@/lib/supabase/services";
import { normalizeAddonName, chosenAddonNamesByPet } from "@/lib/booking/unique-pet-addons";
import type { BookingLeg } from "@/lib/types/booking-leg";
import type { Addon, AddonPrice } from "@/lib/types/services";
import type { Pet, DraftPetSelection } from "@/lib/types/appointments";

function normalizedSize(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
}
function priceForPet(rows: AddonPrice[], addonId: string, petSize: string): number | null {
  const relevant = rows.filter(row => row.addon_id === addonId);
  const size = normalizedSize(petSize);
  const exact = relevant.find(row => normalizedSize(row.size_label) === size);
  const large = /^(large|extralarge|2xextralarge|xl|2xl|xxl)$/.test(size);
  const preferred = large
    ? relevant.find(row => ["large", "largesize"].includes(normalizedSize(row.size_label)))
    : relevant.find(row => ["smallmedium", "small", "medium"].includes(normalizedSize(row.size_label)));
  const universal = relevant.find(row => ["all", "allsize", "allsizes", "standard", "fixed"].includes(normalizedSize(row.size_label)));
  const value = Number((exact ?? preferred ?? universal)?.price);
  return (exact || preferred || universal) && Number.isFinite(value) && value >= 0 ? value : null;
}

export default function AlaCarteSelectionStep({ pets, selections, completedLegs = [], onChange, onBack, onNext }: {
  pets: Pet[];
  selections: DraftPetSelection[];
  completedLegs?: BookingLeg[];
  onChange: (selections: DraftPetSelection[]) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [addons, setAddons] = useState<Addon[]>([]);
  const [prices, setPrices] = useState<AddonPrice[]>([]);
  const [serviceAddons, setServiceAddons] = useState<Record<string, Addon[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [ala, grooming, boarding] = await Promise.all([
        fetchAddonsByCategory("Ala Carte"), fetchAddonsByCategory("Grooming Add-ons"), fetchAddonsByCategory("Boarding Add-ons"),
      ]);
      const failure = ala.error || grooming.error || boarding.error;
      if (failure) throw new Error(failure);
      setAddons(ala.addons.filter(a => a.is_active));
      setPrices(ala.prices);
      setServiceAddons({ ala_carte: ala.addons, dog_grooming: grooming.addons, cat_grooming: grooming.addons,
        grooming: grooming.addons, boarding: boarding.addons });
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load À La Carte prices.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void loadData(); }, [loadData]);

  const takenByPet = useMemo(() => chosenAddonNamesByPet(completedLegs, serviceAddons), [completedLegs, serviceAddons]);
  const selectionFor = (pet: Pet) => selections.find(s => s.pet.id === pet.id);
  const isTaken = (pet: Pet, addon: Addon) => takenByPet[pet.id]?.has(normalizeAddonName(addon.name)) ?? false;

  function toggleAddon(pet: Pet, addonId: string) {
    const addon = addons.find(item => item.id === addonId);
    if (!addon) return;
    if (isTaken(pet, addon)) {
      setNotice(`${addon.name} is unavailable for ${pet.name} because it is already selected in another service.`);
      return;
    }
    setNotice(null);
    const existing = selectionFor(pet);
    const base: DraftPetSelection = existing ?? { pet, packageId: null, packagePricingId: null, sizeId: null, kennelId: null, groomerId: null, addonIds: [], lineAmount: 0 };
    const addonIds = base.addonIds.includes(addonId) ? base.addonIds.filter(id => id !== addonId) : [...base.addonIds, addonId];
    const amounts = addonIds.map(id => priceForPet(prices, id, pet.size_label));
    if (amounts.some(amount => amount === null)) return;
    const lineAmount = amounts.reduce<number>((total, amount) => total + (amount ?? 0), 0);
    onChange([...selections.filter(s => s.pet.id !== pet.id), { ...base, addonIds, lineAmount }]);
  }
  const ready = pets.length > 0 && pets.every(pet => {
    const selected = selectionFor(pet);
    return !!selected?.addonIds.length && selected.addonIds.every(id => {
      const addon = addons.find(row => row.id === id);
      return !!addon && !isTaken(pet, addon) && priceForPet(prices, id, pet.size_label) !== null;
    });
  });

  if (loading) return <p className="py-16 text-center text-zinc-400">Loading add-ons…</p>;
  return <div className="mx-auto max-w-3xl">
    <h2 className="text-center text-2xl font-bold text-brand-pink">À La Carte</h2>
    <p className="mt-1 text-center text-sm text-zinc-500">Choose individual services for each pet. Services already selected for that pet cannot be charged twice.</p>
    {loadError && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{loadError}. Please retry.</p>}
    {!loadError && addons.length === 0 && <p className="mt-10 text-center text-zinc-400">No À La Carte items available right now.</p>}
    {!loadError && pets.map(pet => {
      const selected = selectionFor(pet);
      return <div key={pet.id} className="mt-6">
        <p className="text-sm font-bold text-zinc-800">{pet.name} <span className="font-normal text-zinc-400">({pet.size_label})</span></p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">{addons.map(addon => {
          const price = priceForPet(prices, addon.id, pet.size_label);
          const taken = isTaken(pet, addon);
          const active = !taken && (selected?.addonIds.includes(addon.id) ?? false);
          const unavailable = taken || price === null;
          return <button type="button" key={addon.id} disabled={unavailable} aria-disabled={unavailable}
            title={taken ? `Already selected for ${pet.name} in Grooming or Boarding` : price === null ? "Price unavailable for this size" : undefined}
            onClick={() => toggleAddon(pet, addon.id)}
            className={`rounded-xl border-2 px-3 py-2.5 text-left text-xs ${unavailable ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-500" : active ? "border-brand-pink bg-brand-pink text-white" : "border-pink-100 text-zinc-700 hover:border-pink-200"}`}>
            <span className="block font-semibold">{addon.name}</span>
            <span className={`mt-1 block ${active ? "text-white/80" : "text-zinc-500"}`}>{taken ? "Unavailable · already selected for this pet" : price === null ? "Price unavailable for this size" : `₱${price.toLocaleString("en-PH")}`}</span>
            {addon.price_note && <span className="mt-1 block italic opacity-75">{addon.price_note}</span>}
          </button>;
        })}</div>
        {selected && selected.addonIds.length > 0 && <p className="mt-2 text-right text-sm font-bold text-brand-pink">Subtotal: ₱{selected.lineAmount.toLocaleString("en-PH")}</p>}
      </div>;
    })}
    <div className="mt-8 flex gap-3">
      <button type="button" onClick={onBack} className="flex-1 rounded-full border-2 border-zinc-300 py-2.5 font-semibold text-zinc-500">Back</button>
      <button type="button" onClick={onNext} disabled={!ready || !!loadError} className="flex-1 rounded-full bg-brand-pink py-2.5 font-semibold text-white disabled:opacity-40">Next</button>
    </div>
    {notice && <div role="alertdialog" aria-modal="true" aria-label="Service unavailable" className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"><h3 className="text-lg font-bold text-amber-800">Service Unavailable</h3><p className="mt-2 text-sm leading-relaxed text-zinc-700">{notice}</p>
        <button type="button" autoFocus onClick={() => setNotice(null)} className="mt-5 w-full rounded-full bg-brand-pink px-4 py-2.5 font-semibold text-white">OK</button></div>
    </div>}
  </div>;
}
