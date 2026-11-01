"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Package, PackageInclusion, PackagePricing, PetSize, ServiceType } from "@/lib/types/services";

type PriceDraft = { size_id: string | null; size_label: string; price: string; is_per_night: boolean; days: string };
const durationLabel = (days: number) => `${days} ${days === 1 ? "Day" : "Days"} & ${days - 1} ${days - 1 === 1 ? "Night" : "Nights"}`;
function initialDays(rate: PackagePricing) {
  if (rate.is_per_night) return "";
  if (rate.nights != null && rate.nights > 0) return String(rate.nights + 1);
  const label = `${rate.size_label} ${rate.size_detail ?? ""}`;
  const nights = label.match(/(\d+)\s*nights?/i);
  if (nights) return String(Number(nights[1]) + 1);
  return label.match(/(\d+)\s*days?/i)?.[1] ?? "";
}
const blankBoardingRate = (): PriceDraft => ({ size_id: null, size_label: "", price: "", is_per_night: false, days: "" });

export default function PackageFormModal({ serviceType, sizes, existing, existingInclusions, existingPricing, onClose, onSaved }: {
  serviceType: ServiceType; sizes: PetSize[]; existing?: Package;
  existingInclusions?: PackageInclusion[]; existingPricing?: PackagePricing[];
  onClose: () => void; onSaved: () => void;
}) {
  const boarding = serviceType === "boarding";
  const [name, setName] = useState(existing?.name ?? "");
  const [inclusions, setInclusions] = useState<string[]>(existingInclusions?.map(i => i.label) ?? [""]);
  const [prices, setPrices] = useState<PriceDraft[]>(() => boarding
    ? existingPricing?.length ? existingPricing.map(p => ({ size_id: null, size_label: p.size_label, price: String(p.price),
        is_per_night: p.is_per_night, days: initialDays(p) })) : [blankBoardingRate()]
    : sizes.filter(s => s.is_active).map(s => {
        const rate = existingPricing?.find(p => p.size_id === s.id || p.size_label.toLowerCase() === s.label.toLowerCase());
        return { size_id: s.id, size_label: s.label, price: rate ? String(rate.price) : "", is_per_night: false, days: "" };
      }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const patch = (index: number, update: Partial<PriceDraft>) => setPrices(prev => prev.map((p, i) => i === index ? { ...p, ...update } : p));

  async function save() {
    if (saving) return;
    setError(null);
    if (!name.trim()) { setError("Enter a package name."); return; }
    const clean = prices.filter(p => p.price.trim() || p.days.trim() || (boarding ? p.is_per_night : p.size_label.trim()));
    if (!clean.length) { setError("Add at least one rate."); return; }
    for (const p of clean) {
      if (!p.price.trim() || !Number.isFinite(Number(p.price)) || Number(p.price) < 0) {
        setError("Every rate needs a nonnegative numeric price."); return;
      }
      if (boarding && !p.is_per_night) {
        const days = Number(p.days);
        if (!/^\d+$/.test(p.days) || !Number.isSafeInteger(days) || days < 2) {
          setError("Enter a whole number of at least two days for fixed boarding rates."); return;
        }
      } else if (!boarding && !p.size_label.trim()) {
        setError("Every grooming rate requires a size."); return;
      }
    }
    if (boarding) {
      if (clean.filter(p => p.is_per_night).length > 1) { setError("Only one open-ended per-night rate is allowed."); return; }
      const days = clean.filter(p => !p.is_per_night).map(p => Number(p.days));
      if (new Set(days).size !== days.length) { setError("Each fixed boarding duration must have a unique day count."); return; }
    }
    setSaving(true);
    try {
      // One Supabase RPC = one PostgreSQL transaction. All writes roll back
      // together if any inclusion/rate fails. Referenced historical rates
      // cannot be overwritten or deleted.
      const { error: failure } = await createClient().rpc("happytails_save_service_package_v2", {
        p_package_id: existing?.id ?? null,
        p_service_type: serviceType,
        p_name: name.trim(),
        p_inclusions: boarding ? [] : inclusions.map(s => s.trim()).filter(Boolean),
        p_rates: clean.map(p => ({
          size_id: p.size_id,
          size_label: boarding ? (p.is_per_night ? (p.size_label || "7 Days Up") : durationLabel(Number(p.days))) : p.size_label.trim(),
          price: Number(p.price), is_per_night: p.is_per_night,
          nights: boarding && !p.is_per_night ? Number(p.days) - 1 : null,
        })),
      });
      if (failure) throw new Error(failure.message);
      onSaved();
    } catch (e) {
      setError(`${e instanceof Error ? e.message : "Could not save the package."} No partial package changes were saved. If this package has booking history, use Add Package to create a new rate version.`);
    } finally { setSaving(false); }
  }
  return <div role="dialog" aria-modal="true" aria-label={existing ? "Edit package" : "Add package"}
    className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
    <div className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
      <div className="shrink-0 bg-brand-pink px-6 py-4 font-bold text-white">{existing ? "Edit" : "Add"} {boarding ? "Boarding " : ""}Package</div>
      <div className="space-y-5 overflow-y-auto p-6">
        <label className="block text-sm font-semibold text-zinc-700">Package name
          <input value={name} onChange={e => setName(e.target.value)} placeholder={boarding ? "Small Kennel" : "e.g. Diamond"}
            className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-3 text-sm" />
        </label>
        {!boarding && <div>
          <h3 className="text-sm font-semibold text-zinc-700">Inclusions</h3>
          <div className="mt-2 space-y-2">{inclusions.map((item, i) => <div key={i} className="flex gap-2">
            <input value={item} onChange={e => setInclusions(v => v.map((x, j) => j === i ? e.target.value : x))}
              placeholder="Bath & Dry" className="min-w-0 flex-1 rounded-xl border border-zinc-300 px-3 py-2 text-sm" />
            <button type="button" onClick={() => setInclusions(v => v.filter((_, j) => j !== i))}
              aria-label="Remove inclusion" className="px-2 text-rose-500">✕</button>
          </div>)}</div>
          <button type="button" onClick={() => setInclusions(v => [...v, ""])} className="mt-2 text-sm font-semibold text-brand-pink">+ Add inclusion</button>
        </div>}
        <div>
          <h3 className="text-sm font-semibold text-zinc-700">{boarding ? "Boarding duration and pricing" : "Pricing by pet size"}</h3>
          {boarding && <p className="mt-1 text-xs text-zinc-500">Enter total days; nights are calculated automatically. Four days = three nights.</p>}
          {!boarding && existing && <p className="mt-1 text-xs text-zinc-500">Packages referenced by past or future appointments are protected. Create a new package for revised prices rather than replacing historic rate IDs.</p>}
          <div className="mt-3 space-y-3">{prices.map((p, i) => {
            const days = Number(p.days);
            const validDays = /^\d+$/.test(p.days) && Number.isSafeInteger(days) && days >= 2;
            return <div key={i} className="rounded-xl border border-pink-100 p-3">
              <div className="flex flex-wrap items-center gap-2">
                {boarding ? p.is_per_night ? <span className="min-w-36 flex-1 text-sm font-medium text-zinc-700">7+ nights · per night</span> :
                  <label className="min-w-36 flex-1 text-xs font-medium text-zinc-600">Days
                    <input aria-label="Boarding days" type="number" min="2" step="1" inputMode="numeric" placeholder="e.g. 4"
                      value={p.days} onChange={e => patch(i, { days: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
                  </label> : <span className="min-w-28 flex-1 text-sm text-zinc-700">{p.size_label}</span>}
                {boarding && !p.is_per_night && <div className="min-w-28 flex-1 rounded-lg bg-pink-50 px-3 py-2 text-xs">
                  <strong className="block">{validDays ? `${days - 1} Nights` : "— Nights"}</strong>
                  <span className="text-zinc-500">{validDays ? durationLabel(days) : "Automatic duration"}</span>
                </div>}
                <label className="w-28 text-xs font-medium text-zinc-600">Price (₱)
                  <input aria-label="Price" type="number" min="0" step="0.01" placeholder="₱" value={p.price}
                    onChange={e => patch(i, { price: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
                </label>
                {boarding && <button type="button" aria-label="Remove duration" onClick={() => setPrices(v => v.filter((_, j) => j !== i))} className="px-1 text-rose-500">✕</button>}
              </div>
              {boarding && <label className="mt-3 flex items-center gap-2 text-xs text-zinc-600">
                <input type="checkbox" checked={p.is_per_night}
                  onChange={e => patch(i, { is_per_night: e.target.checked, days: e.target.checked ? "" : p.days })} />
                Open-ended per-night rate (7+ nights)
              </label>}
            </div>;
          })}</div>
          {boarding ? <button type="button" onClick={() => setPrices(v => [...v, blankBoardingRate()])}
            className="mt-3 text-sm font-semibold text-brand-pink">+ Add duration tier</button> :
            <p className="mt-2 text-xs text-zinc-500">Price tiers are drawn from the active Size Guide.</p>}
        </div>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>}
      </div>
      <div className="grid shrink-0 grid-cols-2 gap-3 border-t border-zinc-100 bg-white p-5">
        <button type="button" disabled={saving} onClick={onClose} className="rounded-full border-2 border-zinc-300 py-3 font-semibold text-zinc-600">Cancel</button>
        <button type="button" disabled={saving} onClick={() => void save()} className="rounded-full bg-brand-pink py-3 font-semibold text-white disabled:opacity-40">{saving ? "Saving…" : "Save"}</button>
      </div>
    </div>
  </div>;
}
