"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AppointmentRow, AppointmentPetDetail } from "@/lib/supabase/appointment-management";
import { previewGroomingVerification, saveGroomingVerification, type VerificationPreview } from "@/lib/supabase/grooming-verification";

export default function OnlineGroomingVerification({ appointment, pet, onSaved }: {
  appointment: AppointmentRow;
  pet: AppointmentPetDetail;
  onSaved: () => Promise<void> | void;
}) {
  const [weight, setWeight] = useState("");
  const [preview, setPreview] = useState<VerificationPreview | null>(null);
  const [approved, setApproved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [booked, setBooked] = useState<{ packageId: string; pricingId: string } | null>(null);
  useEffect(() => {
    let active = true;
    void createClient().from("appointment_pets").select("package_id,package_pricing_id")
      .eq("id",pet.appointmentPetId).single().then(({data})=>{
        if (active && data?.package_id && data?.package_pricing_id) setBooked({packageId:data.package_id,pricingId:data.package_pricing_id});
      });
    return ()=>{active=false};
  }, [pet.appointmentPetId]);
  const serviceType = appointment.service_type;
  if (appointment.is_walk_in || (serviceType !== "dog_grooming" && serviceType !== "cat_grooming")) return null;
  if (appointment.status === "completed" || appointment.status === "cancelled" || appointment.status === "checked_in") return null;

  async function calculate() {
    if (!booked) {setError("The saved package details could not be loaded.");return;}
    setBusy(true); setError(null); setPreview(null); setApproved(false);
    const result = await previewGroomingVerification({
      serviceType, packageId: booked.packageId, oldPricingId: booked.pricingId,
      oldLineAmount: pet.lineAmount, weightKg: Number(weight),
    });
    setPreview(result.preview); setError(result.error); setBusy(false);
  }
  async function confirm() {
    if (!preview || !approved) return;
    setBusy(true); setError(null);
    const result = await saveGroomingVerification({
      appointmentPetId: pet.appointmentPetId, weightKg: preview.weightKg,
      customerApproved: approved, expectedPreviousLineAmount: preview.previousLineAmount,
    });
    if (result.error) { setError(result.error); setBusy(false); return; }
    setSuccess(true); setPreview(null); setBusy(false);
    await onSaved();
  }
  const delta = preview ? preview.newLineAmount - preview.previousLineAmount : 0;
  return <div className="mt-3 rounded-xl border border-pink-200 bg-white p-4">
    <div className="flex items-center justify-between gap-2"><h5 className="text-sm font-bold text-brand-pink">Verify Weight & Final Price</h5><span className="text-[11px] text-zinc-500">Online grooming only</span></div>
    <p className="mt-1 text-xs text-zinc-600">Weigh {pet.name} at the shop. The stored appointment quote is not final until the customer approves the verified price.</p>
    <p className="mt-2 text-xs text-zinc-500">Registered size: <strong>{pet.size_label || "Unclassified"}</strong> · Booked rate: <strong>{pet.packagePricingLabel || "—"}</strong> · Quoted: <strong>₱{pet.lineAmount.toLocaleString()}</strong></p>
    <div className="mt-3 flex flex-wrap items-end gap-2">
      <label className="flex-1 min-w-[135px] text-xs font-semibold text-zinc-700">Measured weight (KG)
        <input type="number" step="0.01" min="0.01" max="200" value={weight} onChange={e=>{setWeight(e.target.value);setPreview(null);setApproved(false);setError(null);setSuccess(false);}} placeholder="e.g. 12.50" className="mt-1 w-full rounded-lg border border-pink-200 px-3 py-2 text-sm focus:border-brand-pink focus:outline-none" />
      </label>
      <button type="button" onClick={calculate} disabled={busy || !weight.trim() || !booked} className="rounded-full border border-brand-pink px-4 py-2 text-xs font-bold text-brand-pink disabled:opacity-40">Calculate Price</button>
    </div>
    {preview && <div className="mt-3 space-y-2 rounded-xl bg-pink-50 p-3 text-sm">
      <div className="flex justify-between"><span>Verified size</span><strong>{preview.sizeLabel}</strong></div>
      <div className="flex justify-between"><span>Original quote</span><strong>₱{preview.previousLineAmount.toLocaleString()}</strong></div>
      <div className="flex justify-between"><span>Revised price (including existing extras)</span><strong>₱{preview.newLineAmount.toLocaleString()}</strong></div>
      <div className="flex justify-between border-t border-pink-200 pt-2"><span>Difference</span><strong>{delta >= 0 ? "+" : "−"}₱{Math.abs(delta).toLocaleString()}</strong></div>
      <label className="flex items-start gap-2 pt-2 text-xs text-zinc-700"><input type="checkbox" checked={approved} onChange={e=>setApproved(e.target.checked)} className="mt-0.5 accent-pink-500" /><span>I have explained the revised final price and received the customer's approval.</span></label>
      <button type="button" disabled={!approved || busy} onClick={confirm} className="w-full rounded-full bg-brand-pink py-2.5 text-sm font-bold text-white disabled:opacity-40">{busy ? "Saving…" : "Confirm Verified Weight & Price"}</button>
    </div>}
    {error && <p role="alert" className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-700">{error}</p>}
    {success && <p role="status" className="mt-2 rounded-lg bg-green-50 p-2 text-xs text-green-700">Verified price saved. Appointment details will refresh.</p>}
  </div>;
}
