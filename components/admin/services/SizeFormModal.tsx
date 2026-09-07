"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PetSize, ServiceType } from "@/lib/types/services";

export default function SizeFormModal({
  serviceType,
  existing,
  onClose,
  onSaved,
}: {
  serviceType: ServiceType;
  existing?: PetSize;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [label, setLabel] = useState(existing?.label ?? "");
  const [weightRange, setWeightRange] = useState(existing?.weight_range ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!label.trim() || !weightRange.trim()) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();

    const { error: err } = existing
      ? await supabase.from("pet_sizes").update({ label, weight_range: weightRange }).eq("id", existing.id)
      : await supabase.from("pet_sizes").insert({ service_type: serviceType, label, weight_range: weightRange, sort_order: 99 });

    setSaving(false);
    if (err) { setError(err.message); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="w-full max-w-xs bg-white rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="bg-brand-pink px-5 py-3">
          <h3 className="text-white font-bold text-sm">{existing ? "Edit Size" : "Add Size"}</h3>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs font-semibold text-zinc-600">Size Label</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Small" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-600">Weight Range</label>
            <input value={weightRange} onChange={(e) => setWeightRange(e.target.value)} placeholder="e.g. Below 5 kg" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2 pt-1">
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
