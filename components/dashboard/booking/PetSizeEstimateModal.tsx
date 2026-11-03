"use client";

import { useEffect, useMemo, useState } from "react";
import { getActiveSizeGuide, matchPetSize } from "@/lib/utils/pet-size-guide";
import { createClient } from "@/lib/supabase/client";
import type { Pet } from "@/lib/types/appointments";
import type { PetSize } from "@/lib/types/services";

type SizedPet = Pet & { pet_size_id?: string | null; weight_kg?: number | null; size_assessment_source?: string | null };
const recognized = (label: string) => ["small", "medium", "large", "extra large", "2x extra large"].includes(label.trim().toLowerCase()) || /^(?:x{1,5}l|[2-9]xl)$/.test(label.trim().toLowerCase());
export function needsPetSizeEstimate(pet: Pet): boolean {
  return !recognized(pet.size_label ?? "");
}

/** Shared Customer / registered-POS self-service path. Uses editable shop size guides.
 * An estimate is NOT represented as staff verification or a guaranteed kennel fit. */
export default function PetSizeEstimateModal({ pet, onSaved, onCancel }: {
  pet: Pet; onSaved: (pet: Pet) => void; onCancel: () => void;
}) {
  const [guide, setGuide] = useState<PetSize[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<"guide" | "weight">("guide");
  const [selectedId, setSelectedId] = useState("");
  const [weight, setWeight] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmEstimate, setConfirmEstimate] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true); setError(null); setSelectedId("");
    void getActiveSizeGuide(pet.species)
      .then((items) => { if (active) setGuide(items.filter((item) => recognized(item.label))); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load the shop size guide."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [pet.species]);

  const validWeight = weight.trim() !== "" && Number.isFinite(Number(weight)) && Number(weight) > 0;
  const weightMatch = useMemo(() => validWeight ? matchPetSize(Number(weight), guide) : null, [validWeight, weight, guide]);
  const selected = method === "weight" ? guide.find((item) => item.id === weightMatch?.id) : guide.find((item) => item.id === selectedId);
  async function save() {
    if (!selected || !confirmEstimate || saving) return;
    setSaving(true); setError(null);
    try {
      const db = createClient();
      const { data: auth, error: authError } = await db.auth.getUser();
      if (authError || !auth.user) throw new Error("Your session has expired. Sign in again before proceeding.");
      const changes = {
        size_label: selected.label,
        pet_size_id: selected.id,
        weight_kg: method === "weight" ? Number(weight) : null,
        customer_estimated_size: selected.label,
        size_assessment_source: "customer_estimated",
      };
      const { data, error: saveError } = await db.from("pets").update(changes)
        .eq("id", pet.id).eq("customer_id", pet.customer_id ?? "")
        .select("*").maybeSingle();
      if (saveError) throw new Error(saveError.message);
      if (!data) throw new Error("The estimate was not saved. Check that you own this pet record and the SQL migration has been applied.");
      onSaved(data as SizedPet);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save the estimate."); }
    finally { setSaving(false); }
  }

  return <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/60 p-3 sm:p-4">
    <section role="dialog" aria-modal="true" aria-labelledby="pet-size-estimate-title" className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-4 shadow-2xl sm:p-6">
      <h2 id="pet-size-estimate-title" className="text-xl font-bold text-brand-pink">Estimate {pet.name}&apos;s Size</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-600">A size is needed to calculate service prices and safely check kennels. You do not need an exact measurement. Choose the closest category using HappyTails&apos; size guide.</p>
      {loading && <p className="mt-4 text-sm text-zinc-500">Loading current {pet.species.toLowerCase()} size guide…</p>}
      {!loading && guide.length === 0 && <p role="alert" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">The shop size guide is unavailable. Please retry after the guide is configured.</p>}
      {!loading && !!guide.length && <>
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-pink-50 p-1">
          <button type="button" onClick={() => { setMethod("guide"); setConfirmEstimate(false); }} aria-pressed={method === "guide"} className={`rounded-lg px-3 py-2 text-sm font-semibold ${method === "guide" ? "bg-white text-brand-pink shadow-sm" : "text-zinc-600"}`}>Choose a size</button>
          <button type="button" onClick={() => { setMethod("weight"); setConfirmEstimate(false); }} aria-pressed={method === "weight"} className={`rounded-lg px-3 py-2 text-sm font-semibold ${method === "weight" ? "bg-white text-brand-pink shadow-sm" : "text-zinc-600"}`}>Approx. weight</button>
        </div>
        {method === "guide" ? <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2" role="group" aria-label="Estimated pet size">
          {guide.map((item) => <button type="button" key={item.id} aria-pressed={selectedId === item.id} onClick={() => { setSelectedId(item.id); setConfirmEstimate(false); }}
            className={`min-h-20 rounded-xl border-2 px-4 py-3 text-left ${selectedId === item.id ? "border-brand-pink bg-pink-50" : "border-pink-100 bg-white hover:border-pink-300"}`}>
            <span className="block text-sm font-bold">{item.label}</span>
            <span className="mt-1 block text-xs text-zinc-600">{item.weight_range || "Compare your pet with the size guide"}</span>
          </button>)}
        </div> : <label className="mt-4 block text-sm font-semibold text-zinc-700">Approximate weight (kg)
          <input type="number" min="0.01" step="0.01" inputMode="decimal" value={weight} onChange={(e) => { setWeight(e.target.value); setConfirmEstimate(false); }} placeholder="e.g. 8.5"
            className="mt-2 w-full rounded-xl border border-pink-200 p-3 text-sm" />
          <span className="mt-2 block text-xs font-normal text-zinc-500">{!weight.trim() ? "Enter a rough estimate." : weightMatch ? `Suggested shop tier: ${weightMatch.label}` : "No size matches that weight. Check the weight or choose a size instead."}</span>
        </label>}
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">If you are between two categories, choose the larger one. The selected size is <strong>customer-estimated, not staff-verified</strong>. Staff will recheck at arrival; if it changes, kennel availability and pricing must be reviewed before check-in.</p>
        <label className="mt-4 flex items-start gap-2 text-sm text-zinc-700"><input type="checkbox" checked={confirmEstimate} onChange={(e) => setConfirmEstimate(e.target.checked)} className="mt-1 accent-pink-600" />I understand this is an estimate and may change after staff verification.</label>
      </>}
      {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <button type="button" disabled={saving} onClick={onCancel} className="min-h-12 rounded-full border border-pink-200 font-semibold text-brand-pink">Back</button>
        <button type="button" disabled={saving || loading || !selected || !confirmEstimate} onClick={() => void save()} className="min-h-12 rounded-full bg-brand-pink px-3 font-semibold text-white disabled:opacity-40">{saving ? "Saving…" : "Save Estimate"}</button>
      </div>
    </section>
  </div>;
}
