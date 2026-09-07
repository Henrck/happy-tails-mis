"use client";
// Add/Edit package: name + dynamic inclusions list + pricing. For
// dog/cat grooming, pricing rows are driven by the service's active
// pet_sizes (so pricing always stays in sync with the shared Size
// Guide). For boarding, pricing rows are free-text duration labels
// since there's no shared "size" concept there.
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Package, PackageInclusion, PackagePricing, PetSize, ServiceType } from "@/lib/types/services";

type PriceDraft = { size_id: string | null; size_label: string; price: string; is_per_night: boolean };

export default function PackageFormModal({
  serviceType,
  sizes,
  existing,
  existingInclusions,
  existingPricing,
  onClose,
  onSaved,
}: {
  serviceType: ServiceType;
  sizes: PetSize[];
  existing?: Package;
  existingInclusions?: PackageInclusion[];
  existingPricing?: PackagePricing[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  const [inclusions, setInclusions] = useState<string[]>(existingInclusions?.map((i) => i.label) ?? [""]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSizeBased = serviceType !== "boarding";

  const [prices, setPrices] = useState<PriceDraft[]>(() => {
    if (isSizeBased) {
      return sizes
        .filter((s) => s.is_active)
        .map((s) => {
          const found = existingPricing?.find((p) => p.size_id === s.id);
          return { size_id: s.id, size_label: s.label, price: found ? String(found.price) : "", is_per_night: false };
        });
    }
    return existingPricing?.length
      ? existingPricing.map((p) => ({ size_id: null, size_label: p.size_label, price: String(p.price), is_per_night: p.is_per_night }))
      : [{ size_id: null, size_label: "", price: "", is_per_night: false }];
  });

  function updateInclusion(i: number, val: string) {
    setInclusions((prev) => prev.map((v, idx) => (idx === i ? val : v)));
  }
  function addInclusion() {
    setInclusions((prev) => [...prev, ""]);
  }
  function removeInclusion(i: number) {
    setInclusions((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updatePrice(i: number, field: keyof PriceDraft, val: string | boolean) {
    setPrices((prev) => prev.map((p, idx) => (idx === i ? { ...p, [field]: val } : p)));
  }
  function addDurationRow() {
    setPrices((prev) => [...prev, { size_id: null, size_label: "", price: "", is_per_night: false }]);
  }
  function removeDurationRow(i: number) {
    setPrices((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();

    let packageId = existing?.id;

    if (existing) {
      const { error: err } = await supabase.from("packages").update({ name }).eq("id", existing.id);
      if (err) { setSaving(false); setError(err.message); return; }
      // Simplest correct approach for edits: replace inclusions/pricing
      // wholesale rather than diffing row-by-row.
      await supabase.from("package_inclusions").delete().eq("package_id", existing.id);
      await supabase.from("package_pricing").delete().eq("package_id", existing.id);
    } else {
      const { data, error: err } = await supabase.from("packages").insert({ service_type: serviceType, name, sort_order: 99 }).select().single();
      if (err || !data) { setSaving(false); setError(err?.message ?? "Failed to create package"); return; }
      packageId = data.id;
    }

    const cleanInclusions = inclusions.filter((i) => i.trim());
    if (cleanInclusions.length > 0) {
      await supabase.from("package_inclusions").insert(
        cleanInclusions.map((label, i) => ({ package_id: packageId, label, sort_order: i }))
      );
    }

    const cleanPrices = prices.filter((p) => p.size_label.trim() && p.price);
    if (cleanPrices.length > 0) {
      await supabase.from("package_pricing").insert(
        cleanPrices.map((p) => ({
          package_id: packageId,
          size_id: p.size_id,
          size_label: p.size_label,
          price: parseFloat(p.price) || 0,
          is_per_night: p.is_per_night,
        }))
      );
    }

    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="bg-brand-pink px-5 py-3 sticky top-0">
          <h3 className="text-white font-bold text-sm">{existing ? "Edit Package" : "Add Package"}</h3>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-zinc-600">Package Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Diamond" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-600">Inclusions</label>
            <div className="mt-1 space-y-1.5">
              {inclusions.map((inc, i) => (
                <div key={i} className="flex gap-1.5">
                  <input value={inc} onChange={(e) => updateInclusion(i, e.target.value)} placeholder="e.g. Bath & Dry" className="flex-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
                  <button onClick={() => removeInclusion(i)} className="text-red-400 hover:text-red-600 px-1">✕</button>
                </div>
              ))}
            </div>
            <button onClick={addInclusion} className="mt-1.5 text-xs font-semibold text-brand-pink hover:underline">+ Add inclusion</button>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-600">Pricing</label>
            <div className="mt-1 space-y-1.5">
              {prices.map((p, i) => (
                <div key={i} className="flex gap-1.5 items-center">
                  {isSizeBased ? (
                    <span className="flex-1 text-sm text-zinc-700 px-1">{p.size_label}</span>
                  ) : (
                    <input value={p.size_label} onChange={(e) => updatePrice(i, "size_label", e.target.value)} placeholder="e.g. 1 Night" className="flex-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
                  )}
                  <input type="number" value={p.price} onChange={(e) => updatePrice(i, "price", e.target.value)} placeholder="₱0" className="w-24 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
                  {!isSizeBased && <button onClick={() => removeDurationRow(i)} className="text-red-400 hover:text-red-600 px-1">✕</button>}
                </div>
              ))}
            </div>
            {!isSizeBased && (
              <button onClick={addDurationRow} className="mt-1.5 text-xs font-semibold text-brand-pink hover:underline">+ Add duration tier</button>
            )}
            {isSizeBased && (
              <p className="mt-1.5 text-[11px] text-zinc-400">
                Rows come from the active Size Guide — add/edit sizes there, not here.
              </p>
            )}
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 border-2 border-zinc-300 text-zinc-500 font-semibold text-sm py-2 rounded-full hover:border-zinc-400 transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 bg-brand-pink hover:bg-brand-pink-dark disabled:opacity-50 text-white font-semibold text-sm py-2 rounded-full transition-colors">
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
