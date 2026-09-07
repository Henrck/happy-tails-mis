"use client";
// Combined Summary for a multi-service booking — shows every completed
// leg (Dog Grooming, Cat Grooming, Boarding, whatever was set up) as
// its own section, with one grand total. "Complete Appointment" calls
// createAppointment() once PER LEG — each leg becomes its own real
// appointments row, since that's what the schema already represents
// (one appointment = one service = one schedule), and a multi-service
// booking is genuinely N separate appointments that just happen to
// have been set up together in one session.
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
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
function formatTime12h(time: string | null): string {
  if (!time) return "—";
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

const serviceLabels: Record<string, string> = {
  dog_grooming: "Dog Grooming",
  cat_grooming: "Cat Grooming",
  boarding: "Boarding",
  ala_carte: "Ala Carte",
};

export default function MultiServiceSummaryStep({
  customer,
  legs,
  packagesByService,
  sizesByService,
  addonsByService,
  groomers,
  kennels,
  onBack,
  onEditLeg,
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

  const grandTotal = legs.reduce(
    (sum, leg) => sum + leg.petSelections.reduce((legSum, sel) => legSum + sel.lineAmount, 0),
    0
  );

  async function handleComplete() {
    setSaving(true);
    setError(null);

    for (let i = 0; i < legs.length; i++) {
      const leg = legs[i];
      const isBoarding = leg.serviceChoice === "boarding";

      const { error: err } = await createAppointment({
        service_type: toAppointmentServiceType(leg.serviceChoice),
        customer_id: customer.id,
        owner_name: customer.full_name,
        owner_contact: customer.phone_number ?? "",
        owner_address: customer.address ?? null,
        scheduled_date: leg.scheduledDate ?? "",
        scheduled_time: isBoarding ? null : leg.scheduledTime,
        drop_off_at: isBoarding ? leg.dropOffAt : null,
        pick_up_at: isBoarding ? leg.pickUpAt : null,
        special_requests: leg.specialRequests || null,
        petSelections: leg.petSelections,
      });

      if (err) {
        setSaving(false);
        // Some legs may have already saved successfully before this one
        // failed — say so plainly rather than implying nothing happened,
        // since partial success is the real state of the world here.
        setError(
          savedCount > 0
            ? `Saved ${savedCount} of ${legs.length} services, then this one failed: ${err}. Please contact us about the remaining service(s).`
            : `Failed to save: ${err}`
        );
        return;
      }
      setSavedCount(i + 1);
    }

    setSaving(false);
    setSaved(true);
  }

  if (saved) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-600"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <h2 className="mt-4 text-xl font-bold text-zinc-800">Booking Complete</h2>
        <p className="mt-1 text-sm text-zinc-500">
          {legs.length > 1 ? `All ${legs.length} services have been booked.` : "Your appointment has been booked."}
        </p>
        <button onClick={() => router.push("/account")} className="mt-6 w-full bg-brand-pink hover:bg-brand-pink-dark text-white font-semibold py-2.5 rounded-full transition-colors">
          Back to My Pets
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-brand-pink text-center">Booking Summary</h2>
      <p className="mt-1 text-sm text-zinc-500 text-center">Review everything before confirming.</p>

      <div className="mt-5 space-y-4">
        {legs.map((leg) => {
          const isBoarding = leg.serviceChoice === "boarding";
          const packages = packagesByService[leg.serviceChoice] ?? [];
          const sizes = sizesByService[leg.serviceChoice] ?? [];
          const addons = addonsByService[leg.serviceChoice] ?? [];
          const legTotal = leg.petSelections.reduce((sum, sel) => sum + sel.lineAmount, 0);

          return (
            <div key={leg.id} className="rounded-2xl border-2 border-pink-100 p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-brand-pink">{serviceLabels[leg.serviceChoice]}</h3>
                <button onClick={() => onEditLeg(leg.id)} className="text-xs font-semibold text-brand-pink hover:underline">
                  Edit
                </button>
              </div>

              {leg.petSelections.map((sel) => {
                const pkg = packages.find((p) => p.id === sel.packageId);
                const size = sizes.find((s) => s.id === sel.sizeId);
                const groomer = groomers.find((g) => g.id === sel.groomerId);
                const kennel = kennels.find((k) => k.id === sel.kennelId);
                const petAddons = sel.addonIds.map((id) => addons.find((a) => a.id === id)?.name).filter(Boolean);

                return (
                  <div key={sel.pet.id} className="mt-3 pt-3 border-t border-dashed border-pink-100">
                    <p className="text-sm font-semibold text-zinc-800">{sel.pet.name} <span className="font-normal text-zinc-400">({sel.pet.breed})</span></p>
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
                    <p className="text-sm font-semibold text-zinc-800">₱{sel.lineAmount.toLocaleString()}</p>
                  </div>
                );
              })}

              <div className="mt-3 pt-3 border-t border-dashed border-pink-100 text-sm text-zinc-600">
                {isBoarding ? (
                  <>
                    <p>Drop Off: {formatDateTime(leg.dropOffAt)}</p>
                    <p>Pick Up: {formatDateTime(leg.pickUpAt)}</p>
                  </>
                ) : (
                  <>
                    <p>Date: {formatDate(leg.scheduledDate)}</p>
                    <p>Time: {formatTime12h(leg.scheduledTime)}</p>
                  </>
                )}
                {leg.specialRequests && <p className="mt-1">Notes: {leg.specialRequests}</p>}
              </div>

              <p className="mt-2 text-right font-bold text-brand-pink">Subtotal: ₱{legTotal.toLocaleString()}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-5 rounded-2xl bg-brand-tint px-5 py-4 flex items-center justify-between">
        <span className="font-bold text-zinc-800">Grand Total</span>
        <span className="text-xl font-bold text-brand-pink">₱{grandTotal.toLocaleString()}</span>
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
          {saving ? `Saving ${savedCount}/${legs.length}…` : "Complete Appointment"}
        </button>
      </div>
    </div>
  );
}
