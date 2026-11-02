"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Package, PackageInclusion, PackagePricing, PetSize, ServiceType } from "@/lib/types/services";

type PriceDraft = { rate_id: string | null; size_id: string | null; size_label: string; price: string; is_per_night: boolean; days: string };
const durationLabel = (days: number) => `${days} ${days === 1 ? "Day" : "Days"} & ${days - 1} ${days - 1 === 1 ? "Night" : "Nights"}`;

function initialDays(rate: PackagePricing) {
  if (rate.is_per_night) return "";
  if (rate.nights != null && rate.nights > 0) return String(rate.nights + 1);
  const label = `${rate.size_label} ${rate.size_detail ?? ""}`;
  const nights = label.match(/(\d+)\s*nights?/i);
  if (nights) return String(Number(nights[1]) + 1);
  return label.match(/(\d+)\s*days?/i)?.[1] ?? "";
}
const blankBoardingRate = (): PriceDraft => ({ rate_id: null, size_id: null, size_label: "", price: "", is_per_night: false, days: "" });

/** Normalize legacy size labels, including "2X Extra Large" and "2 Extra Large". */
const normalize = (value: string) => value.trim().toLowerCase()
  .replace(/\b(?:two|2)\s*(?:x|times)?\s*extra\s*large\b/g, "2extralarge")
  .replace(/[^a-z0-9]+/g, "");
function groomingDrafts(sizes: PetSize[], old: PackagePricing[]): PriceDraft[] {
  const active = sizes.filter(s => s.is_active);
  const consumed = new Set<string>();
  const rows: PriceDraft[] = active.map(size => {
    const candidates = old.filter(rate => !consumed.has(rate.id) &&
      (rate.size_id === size.id || normalize(rate.size_label) === normalize(size.label)));
    // Prefer an existing rate tied to the active size, then a legacy-labelled rate.
    // Never create an empty "2X Extra Large" tier when "2 Extra Large" exists.
    const found = candidates.find(rate => rate.size_id === size.id) ?? candidates[0];
    if (found) consumed.add(found.id);
    return { rate_id: found?.id ?? null, size_id: size.id, size_label: size.label,
      price: found ? String(found.price) : "", is_per_night: false, days: "" };
  });
  // Keep genuinely different legacy rates visible. Equivalent duplicates are
  // retained in the DB, but not displayed as an extra input row.
  const activeKeys = new Set(active.map(s => normalize(s.label)));
  for (const oldRate of old) if (!consumed.has(oldRate.id) && !activeKeys.has(normalize(oldRate.size_label))) rows.push({
    rate_id: oldRate.id, size_id: oldRate.size_id, size_label: oldRate.size_label,
    price: String(oldRate.price), is_per_night: false, days: "",
  });
  return rows;
}

export default function PackageFormModal({ serviceType, sizes, existing, existingInclusions, existingPricing, onClose, onSaved }: {
  serviceType: ServiceType;
  sizes: PetSize[];
  existing?: Package;
  existingInclusions?: PackageInclusion[];
  existingPricing?: PackagePricing[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const boarding = serviceType === "boarding";
  const [name, setName] = useState(existing?.name ?? "");
  const [inclusions, setInclusions] = useState<string[]>(existingInclusions?.map(i => i.label) ?? [""]);
  const [prices, setPrices] = useState<PriceDraft[]>(() => boarding
    ? existingPricing?.length ? existingPricing.map(p => ({ rate_id: p.id, size_id: null, size_label: p.size_label,
        price: String(p.price), is_per_night: p.is_per_night, days: initialDays(p) })) : [blankBoardingRate()]
    : groomingDrafts(sizes, existingPricing ?? []));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const patch = (index: number, update: Partial<PriceDraft>) => setPrices(prev => prev.map((p, i) => i === index ? { ...p, ...update } : p));

  async function save() {
    if (saving) return;
    setError(null);
    if (!name.trim()) { setError("Enter a package name."); return; }
    const clean = prices.filter(p => p.rate_id || p.price.trim() || (boarding && (p.days.trim() || p.is_per_night)));
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

    const payload = {
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
    };

    setSaving(true);
    try {
      const db = createClient();
      if (existing) {
        const originalInclusions = (existingInclusions ?? []).map(item => item.label.trim()).filter(Boolean);
        if (name.trim() !== existing.name ||
          JSON.stringify(payload.p_inclusions) !== JSON.stringify(originalInclusions)) {
          throw new Error("This save edits pricing only. Keep the package name and inclusions unchanged.");
        }
        const existingIds = new Set((existingPricing ?? []).map(rate => rate.id));
        const supplied = prices.filter(row => row.rate_id || row.price.trim());
        // Hidden equivalent legacy rows still belong to the package. Send their
        // unchanged amounts to satisfy the SQL completeness guard without
        // exposing a duplicate or altering historical pricing references.
        const visibleIds = new Set(supplied.map(row => row.rate_id).filter(Boolean));
        const hidden = (existingPricing ?? []).filter(rate => !visibleIds.has(rate.id)).map(rate => ({
          rate_id: rate.id, size_id: rate.size_id, size_label: rate.size_label,
          price: String(rate.price), is_per_night: rate.is_per_night, days: initialDays(rate),
        }));
        if ([...visibleIds].some(id => id && !existingIds.has(id))) {
          throw new Error("The package rates have changed. Refresh Service Management and retry.");
        }
        const changes = [...supplied, ...hidden].map(row => {
          if (!row.price.trim() || !Number.isFinite(Number(row.price)) || Number(row.price) < 0) {
            throw new Error(`Enter a valid price for ${row.size_label}.`);
          }
          return { rate_id: row.rate_id, size_id: row.size_id, size_label: row.size_label,
            price: Number(row.price), is_per_night: row.is_per_night,
            nights: boarding && !row.is_per_night ? Number(row.days) - 1 : null };
        });
        const { error: priceError } = await db.rpc("happytails_edit_package_prices_and_missing_tiers_v2", {
          p_package_id: existing.id, p_rates: changes,
        });
        if (priceError) throw new Error(priceError.message);
      } else {
        const { error: failure } = await db.rpc("happytails_save_service_package_v2", payload);
        if (failure) throw new Error(failure.message);
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the package. Please retry.");
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
          {existing && <p className="mt-1 text-xs text-zinc-500">Update this package directly without creating duplicates. Existing booked totals stay recorded. You can also add a price for a missing size.</p>}
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
