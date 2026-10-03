"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAppointment } from "@/lib/supabase/appointments";
import { toAppointmentServiceType } from "@/lib/types/walk-in-draft";
import type { BookingLeg } from "@/lib/types/booking-leg";
import type { Customer } from "@/lib/types/users";
import type { Package, PetSize, Addon } from "@/lib/types/services";
import type { Groomer, Kennel } from "@/lib/types/pet-services";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}
function formatTime12h(time: string | null): string {
  if (!time) return "—";
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

const serviceLabels: Record<string, string> = {
  dog_grooming: "Dog Grooming", cat_grooming: "Cat Grooming", boarding: "Boarding", ala_carte: "Ala Carte",
};

export default function MultiServiceSummaryStep({
  customer, legs, packagesByService, sizesByService, addonsByService, groomers,
  onBack, onEditLeg,
}: {
  customer: Customer;
  legs: BookingLeg[];
  packagesByService: Record<string, Package[]>;
  sizesByService: Record<string, PetSize[]>;
  addonsByService: Record<string, Addon[]>;
  groomers: Groomer[];
  kennels: Kennel[];
  onBack: () => void;
  onEditLeg: (legId: string) => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  const grandTotal = legs.reduce((sum, leg) => sum + leg.petSelections.reduce((n, s) => n + s.lineAmount, 0), 0);
  const saveUnits = legs.reduce((n, leg) => n + (leg.serviceChoice === "boarding" ? leg.petSelections.length : 1), 0);

  async function handleComplete() {
    setSaving(true);
    setError(null);
    let completed = 0;

    for (const leg of legs) {
      const isBoarding = leg.serviceChoice === "boarding";

      if (!isBoarding) {
        const { error: err } = await createAppointment({
          service_type: toAppointmentServiceType(leg.serviceChoice),
          customer_id: customer.id,
          owner_name: customer.full_name,
          owner_contact: customer.phone_number ?? "",
          owner_address: customer.address ?? null,
          scheduled_date: leg.scheduledDate ?? "",
          scheduled_time: leg.scheduledTime,
          drop_off_at: null,
          pick_up_at: null,
          special_requests: leg.specialRequests || null,
          petSelections: leg.petSelections,
        });
        if (err) {
          setSaving(false);
          setError(completed ? `Saved ${completed} of ${saveUnits} appointment(s), then this one failed: ${err}` : `Failed to save: ${err}`);
          return;
        }
        completed += 1;
        setSavedCount(completed);
        continue;
      }

      // Boarding is intentionally saved one appointment per pet. This gives
      // every kennel occupant an independent date/drop-off/pick-up schedule,
      // which is required when pets use different kennel sizes or durations.
      for (const sel of leg.petSelections) {
        if (!sel.boardingScheduledDate || !sel.boardingDropOffAt || !sel.boardingPickUpAt) {
          setSaving(false);
          setError(`A boarding schedule is missing for ${sel.pet.name}. Please edit the boarding schedule before confirming.`);
          return;
        }

        const { error: err } = await createAppointment({
          service_type: "boarding",
          customer_id: customer.id,
          owner_name: customer.full_name,
          owner_contact: customer.phone_number ?? "",
          owner_address: customer.address ?? null,
          scheduled_date: sel.boardingScheduledDate,
          scheduled_time: null,
          drop_off_at: sel.boardingDropOffAt,
          pick_up_at: sel.boardingPickUpAt,
          special_requests: leg.specialRequests || null,
          petSelections: [sel],
        });

        if (err) {
          setSaving(false);
          setError(completed ? `Saved ${completed} of ${saveUnits} appointment(s), then this boarding appointment failed: ${err}` : `Failed to save boarding appointment: ${err}`);
          return;
        }
        completed += 1;
        setSavedCount(completed);
      }
    }

    setSaving(false);
    setSaved(true);
  }

  if (saved) {
    return (
      <div className="mx-auto w-full max-w-md py-8 text-center sm:py-16">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-600"><path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <h2 className="mt-4 text-xl font-bold text-zinc-800">Booking Complete</h2>
        <p className="mt-1 text-sm text-zinc-500">Your appointments have been booked with each boarding pet scheduled independently.</p>
        <button onClick={() => router.push("/account")} className="mt-6 w-full rounded-full bg-brand-pink px-5 py-3 text-sm font-semibold text-white hover:bg-brand-pink-dark">Back to My Pets</button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="text-center">
        <h2 className="text-2xl font-extrabold tracking-tight text-brand-pink sm:text-[28px]">Booking Summary</h2>
        <p className="mt-1 text-sm text-zinc-500">Review everything before confirming.</p>
      </div>

      <div className="mt-5 space-y-4">
        {legs.map((leg) => {
          const isBoarding = leg.serviceChoice === "boarding";
          const packages = packagesByService[leg.serviceChoice] ?? [];
          const sizes = sizesByService[leg.serviceChoice] ?? [];
          const addons = addonsByService[leg.serviceChoice] ?? [];
          const legTotal = leg.petSelections.reduce((sum, sel) => sum + sel.lineAmount, 0);

          return (
            <section key={leg.id} className="w-full rounded-2xl border-2 border-pink-100 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-bold text-brand-pink sm:text-lg">{serviceLabels[leg.serviceChoice]}</h3>
                <button onClick={() => onEditLeg(leg.id)} className="shrink-0 text-xs font-semibold text-brand-pink hover:underline sm:text-sm">Edit</button>
              </div>

              {leg.petSelections.map((sel) => {
                const pkg = packages.find((p) => p.id === sel.packageId);
                const size = sizes.find((s) => s.id === sel.sizeId);
                const groomer = groomers.find((g) => g.id === sel.groomerId);
                const petAddons = sel.addonIds.map((id) => addons.find((a) => a.id === id)?.name).filter(Boolean);

                return (
                  <div key={sel.pet.id} className="mt-3 border-t border-dashed border-pink-100 pt-3">
                    <p className="text-sm font-semibold text-zinc-800">{sel.pet.name} <span className="font-normal text-zinc-400">({sel.pet.breed})</span></p>
                    {isBoarding ? (
                      <>
                        <p className="text-sm text-zinc-600">Kennel Size: {sel.boardingKennelSize === "small" ? "Small" : "Big"}</p>
                        <p className="text-sm text-zinc-600">Drop Off: {formatDateTime(sel.boardingDropOffAt)}</p>
                        <p className="text-sm text-zinc-600">Pick Up: {formatDateTime(sel.boardingPickUpAt)}</p>
                        <p className="mt-1 text-xs font-semibold text-brand-pink">Independent boarding schedule</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-zinc-600">Package: {pkg?.name ?? (sel.packageId ? "—" : "Ala Carte")}</p>
                        {size && <p className="text-sm text-zinc-600">Size: {size.label}</p>}
                        {groomer && <p className="text-sm text-zinc-600">Groomer: {groomer.name}</p>}
                      </>
                    )}
                    {petAddons.length > 0 && <p className="text-sm text-zinc-600">Add-ons: {petAddons.join(", ")}</p>}
                    <p className="mt-0.5 text-sm font-semibold text-zinc-800">₱{sel.lineAmount.toLocaleString()}</p>
                  </div>
                );
              })}

              {!isBoarding && (
                <div className="mt-3 border-t border-dashed border-pink-100 pt-3 text-sm text-zinc-600">
                  <p>Date: {formatDate(leg.scheduledDate)}</p>
                  <p>Time: {formatTime12h(leg.scheduledTime)}</p>
                </div>
              )}
              {leg.specialRequests && <p className="mt-2 text-sm text-zinc-600">Notes: {leg.specialRequests}</p>}
              <p className="mt-2 text-right text-sm font-bold text-brand-pink">Subtotal: ₱{legTotal.toLocaleString()}</p>
            </section>
          );
        })}
      </div>

      <div className="mt-5 flex items-center justify-between rounded-2xl bg-brand-tint px-5 py-4">
        <span className="text-base font-bold text-zinc-800">Grand Total</span>
        <span className="text-xl font-bold text-brand-pink">₱{grandTotal.toLocaleString()}</span>
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button onClick={onBack} className="min-h-12 rounded-full border-2 border-zinc-300 px-6 py-3 text-sm font-semibold text-zinc-500 hover:border-zinc-400">Back</button>
        <button onClick={handleComplete} disabled={saving} className="min-h-12 rounded-full bg-brand-pink px-6 py-3 text-sm font-semibold text-white hover:bg-brand-pink-dark disabled:opacity-50">{saving ? `Saving ${savedCount}/${saveUnits}…` : "Complete Appointment"}</button>
      </div>
    </div>
  );
}
