"use client";
// Summary + Save — the final step. Matches the two reference images
// (grooming and boarding "Check your Appointment" / "Confirm
// Transaction" screens): owner info, pet info, schedule, services, total
// amount, and the special-requests text already carried from Scheduling.
// "Complete" actually calls createAppointment() for real — this is
// where the whole wizard's draft state finally becomes a real database
// row, for the first time in the whole flow.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAppointment } from "@/lib/supabase/appointments";
import type { WalkInDraft } from "@/lib/types/walk-in-draft";
import { toAppointmentServiceType } from "@/lib/types/walk-in-draft";
import type { Package, PetSize, Addon } from "@/lib/types/services";
import type { Groomer, Kennel } from "@/lib/types/pet-services";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatTime12h(time: string | null): string {
  if (!time) return "—";
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export default function SummaryStep({
  draft,
  packages,
  sizes,
  addons,
  groomers,
  kennels,
  onBack,
  onDone,
}: {
  draft: WalkInDraft;
  packages: Package[];
  sizes: PetSize[];
  addons: Addon[];
  groomers: Groomer[];
  kennels: Kennel[];
  onBack: () => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isBoarding = draft.serviceChoice === "boarding";
  const totalAmount = draft.petSelections.reduce((sum, sel) => sum + sel.lineAmount, 0);

  async function handleComplete() {
    if (!draft.serviceChoice || !draft.scheduledDate) return;
    setSaving(true);
    setError(null);

    const { error: err } = await createAppointment({
      service_type: toAppointmentServiceType(draft.serviceChoice),
      customer_id: draft.customer?.id ?? null,
      owner_name: draft.ownerName,
      owner_contact: draft.ownerContact,
      owner_address: draft.ownerAddress || null,
      scheduled_date: draft.scheduledDate,
      scheduled_time: isBoarding ? null : draft.scheduledTime,
      drop_off_at: isBoarding ? draft.dropOffAt : null,
      pick_up_at: isBoarding ? draft.pickUpAt : null,
      special_requests: draft.specialRequests || null,
      petSelections: draft.petSelections,
    });

    setSaving(false);
    if (err) { setError(err); return; }
    setSaved(true);
  }

  if (saved) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-600"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <h2 className="mt-4 text-xl font-bold text-zinc-800">Booking Complete</h2>
        <p className="mt-1 text-sm text-zinc-500">The appointment has been saved.</p>
        <button onClick={() => router.push("/admin/pos")} className="mt-6 w-full bg-brand-pink hover:bg-brand-pink-dark text-white font-semibold py-2.5 rounded-full transition-colors">
          Back to POS
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-2xl font-bold text-brand-pink text-center">{isBoarding ? "Check your Appointment" : "Confirm Transaction"}</h2>
      <p className="mt-1 text-sm text-zinc-500 text-center">Review your order, agree to terms.</p>

      <div className="mt-5 rounded-2xl border-2 border-pink-100 p-5">
        <h3 className="text-lg font-bold text-brand-pink">Appointment Details</h3>

        <div className="mt-3 pb-3 border-b border-dashed border-pink-200">
          <p className="text-xs font-bold text-brand-pink">Owner Information</p>
          <p className="mt-1 text-sm text-zinc-600">Name: {draft.ownerName || "—"}</p>
          <p className="text-sm text-zinc-600">Contact No: {draft.ownerContact || "—"}</p>
          <p className="text-sm text-zinc-600">Address: {draft.ownerAddress || "—"}</p>
        </div>

        {draft.petSelections.map((sel) => {
          const pkg = packages.find((p) => p.id === sel.packageId);
          const size = sizes.find((s) => s.id === sel.sizeId);
          const groomer = groomers.find((g) => g.id === sel.groomerId);
          const kennel = kennels.find((k) => k.id === sel.kennelId);
          const petAddons = sel.addonIds.map((id) => addons.find((a) => a.id === id)?.name).filter(Boolean);

          return (
            <div key={sel.pet.id} className="py-3 border-b border-dashed border-pink-200 last:border-b-0">
              <p className="text-xs font-bold text-brand-pink">Pet Information</p>
              <p className="mt-1 text-sm text-zinc-600">Name: {sel.pet.name}</p>
              <p className="text-sm text-zinc-600">Breed: {sel.pet.breed}</p>
              <p className="text-sm text-zinc-600">Size: {sel.pet.size_label}</p>

              <p className="mt-2 text-xs font-bold text-brand-pink">Services</p>
              {isBoarding ? (
                <p className="text-sm text-zinc-600">Kennel: {kennel ? `${kennel.size === "small" ? "Small" : "Big"} #${kennel.number}` : "—"}</p>
              ) : (
                <>
                  <p className="text-sm text-zinc-600">Package: {pkg?.name ?? (sel.packageId ? "—" : "Ala Carte")}</p>
                  {size && <p className="text-sm text-zinc-600">Size: {size.label}</p>}
                  {groomer && <p className="text-sm text-zinc-600">Groomer: {groomer.name}</p>}
                </>
              )}
              {petAddons.length > 0 && <p className="text-sm text-zinc-600">Add-ons: {petAddons.join(", ")}</p>}
              <p className="text-sm font-semibold text-zinc-800 mt-1">Line total: ₱{sel.lineAmount.toLocaleString()}</p>
            </div>
          );
        })}

        <div className="pt-3 border-b border-dashed border-pink-200 pb-3">
          <p className="text-xs font-bold text-brand-pink">Schedule Appointment</p>
          {isBoarding ? (
            <>
              <p className="mt-1 text-sm text-zinc-600">Appointment Date: {formatDate(draft.scheduledDate)}</p>
              <p className="text-sm text-zinc-600">Drop Off: {formatDateTime(draft.dropOffAt)}</p>
              <p className="text-sm text-zinc-600">Pick Up: {formatDateTime(draft.pickUpAt)}</p>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm text-zinc-600">Appointment Date: {formatDate(draft.scheduledDate)}</p>
              <p className="text-sm text-zinc-600">Time Slot: {formatTime12h(draft.scheduledTime)}</p>
            </>
          )}
        </div>

        <div className="pt-3">
          <p className="text-lg font-bold text-brand-pink">Total Amount: ₱{totalAmount.toLocaleString()}</p>
        </div>

        {draft.specialRequests && (
          <div className="mt-3 rounded-lg border border-pink-100 px-3 py-2">
            <p className="text-xs font-semibold text-zinc-500">Special Requests / Medical Conditions / Allergies / Feeding Instruction</p>
            <p className="mt-0.5 text-sm text-zinc-700">{draft.specialRequests}</p>
          </div>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="mt-6 flex gap-3">
        <button onClick={onBack} className="flex-1 border-2 border-zinc-300 text-zinc-500 font-semibold py-2.5 rounded-full hover:border-zinc-400 transition-colors">
          Back
        </button>
        <button
          onClick={handleComplete}
          disabled={saving}
          className="flex-1 bg-brand-pink hover:bg-brand-pink-dark disabled:opacity-50 text-white font-semibold py-2.5 rounded-full transition-colors"
        >
          {saving ? "Saving…" : "Complete Appointment"}
        </button>
      </div>
    </div>
  );
}
