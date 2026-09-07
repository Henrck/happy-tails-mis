"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Addon, AddonPrice } from "@/lib/types/services";

export default function AddOnFormModal({
  categoryId,
  existing,
  existingPrices,
  onClose,
  onSaved,
}: {
  categoryId: string;
  existing?: Addon;
  existingPrices?: AddonPrice[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  const [priceNote, setPriceNote] = useState(existing?.price_note ?? "");
  const [prices, setPrices] = useState<{ size_label: string; price: string }[]>(
    existingPrices?.length ? existingPrices.map((p) => ({ size_label: p.size_label, price: String(p.price) })) : [{ size_label: "Standard", price: "" }]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateRow(i: number, field: "size_label" | "price", val: string) {
    setPrices((prev) => prev.map((p, idx) => (idx === i ? { ...p, [field]: val } : p)));
  }
  function addRow() {
    setPrices((prev) => [...prev, { size_label: "", price: "" }]);
  }
  function removeRow(i: number) {
    setPrices((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();

    let addonId = existing?.id;
    if (existing) {
      const { error: err } = await supabase.from("addons").update({ name, price_note: priceNote || null }).eq("id", existing.id);
      if (err) { setSaving(false); setError(err.message); return; }
      await supabase.from("addon_prices").delete().eq("addon_id", existing.id);
    } else {
      const { data, error: err } = await supabase.from("addons").insert({ category_id: categoryId, name, price_note: priceNote || null, sort_order: 99 }).select().single();
      if (err || !data) { setSaving(false); setError(err?.message ?? "Failed to create add-on"); return; }
      addonId = data.id;
    }

    const cleanPrices = prices.filter((p) => p.size_label.trim() && p.price);
    if (cleanPrices.length > 0) {
      await supabase.from("addon_prices").insert(cleanPrices.map((p) => ({ addon_id: addonId, size_label: p.size_label, price: parseFloat(p.price) || 0 })));
    }

    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="bg-brand-pink px-5 py-3 sticky top-0">
          <h3 className="text-white font-bold text-sm">{existing ? "Edit Add-on" : "Add Add-on"}</h3>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs font-semibold text-zinc-600">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-600">Price Note (optional, use instead of fixed prices)</label>
            <input value={priceNote} onChange={(e) => setPriceNote(e.target.value)} placeholder="e.g. Free for 4+ nights" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-600">Prices by size</label>
            <div className="mt-1 space-y-1.5">
              {prices.map((p, i) => (
                <div key={i} className="flex gap-1.5">
                  <input value={p.size_label} onChange={(e) => updateRow(i, "size_label", e.target.value)} placeholder="e.g. Small-Medium" className="flex-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
                  <input type="number" value={p.price} onChange={(e) => updateRow(i, "price", e.target.value)} placeholder="₱0" className="w-20 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
                  <button onClick={() => removeRow(i)} className="text-red-400 hover:text-red-600 px-1">✕</button>
                </div>
              ))}
            </div>
            <button onClick={addRow} className="mt-1.5 text-xs font-semibold text-brand-pink hover:underline">+ Add size tier</button>
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
