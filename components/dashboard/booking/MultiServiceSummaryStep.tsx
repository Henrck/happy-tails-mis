"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createAppointmentsAtomic, type CreateAppointmentInput } from "@/lib/supabase/appointments";
import { toAppointmentServiceType } from "@/lib/types/walk-in-draft";
import type { BookingLeg } from "@/lib/types/booking-leg";
import type { AppointmentServiceType, DraftPetSelection } from "@/lib/types/appointments";
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
  grooming: "Grooming", dog_grooming: "Dog Grooming", cat_grooming: "Cat Grooming", boarding: "Boarding", ala_carte: "Ala Carte",
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
  const [acknowledgedWeightPolicy, setAcknowledgedWeightPolicy] = useState(false);
  const submitLock = useRef(false);

  const hasGrooming = legs.some((leg) =>
    leg.serviceChoice === "grooming" || leg.serviceChoice === "dog_grooming" || leg.serviceChoice === "cat_grooming"
  );
  const grandTotal = legs.reduce((sum, leg) => sum + leg.petSelections.reduce((n, s) => n + s.lineAmount, 0), 0);
  const saveUnits = legs.reduce((n, leg) => {
    if (leg.serviceChoice === "boarding") return n + leg.petSelections.length;
    if (leg.serviceChoice === "grooming" || leg.serviceChoice === "dog_grooming" || leg.serviceChoice === "cat_grooming") return n + leg.petSelections.length;
    return n + 1;
  }, 0);

  async function handleComplete() {
    if (submitLock.current || saved || (hasGrooming && !acknowledgedWeightPolicy)) return;
    submitLock.current = true;
    setSaving(true);
    setError(null);

    const writes: CreateAppointmentInput[] = [];
    for (const leg of legs) {
      if (leg.serviceChoice !== "boarding") {
        const groups: Array<{ serviceType: AppointmentServiceType; selections: DraftPetSelection[] }> = [];
        if (leg.serviceChoice === "grooming" || leg.serviceChoice === "dog_grooming" || leg.serviceChoice === "cat_grooming") {
          // Each online grooming pet receives an independent start time and capacity reservation.
          for (const sel of leg.petSelections) groups.push({
            serviceType: sel.pet.species === "Cat" ? "cat_grooming" : "dog_grooming",
            selections: [sel],
          });
        } else {
          groups.push({ serviceType: toAppointmentServiceType(leg.serviceChoice), selections: leg.petSelections });
        }
        if (!groups.length || !leg.scheduledDate) {
          setError("A selected service has no pets or schedule. Please edit the booking.");
          setSaving(false);
          submitLock.current = false;
          return;
        }
        for (const group of groups) {
          const isGroomingGroup = group.serviceType === "dog_grooming" || group.serviceType === "cat_grooming";
          const start = isGroomingGroup
            ? (group.selections[0] as DraftPetSelection & { groomingScheduledTime?: string }).groomingScheduledTime
            : leg.scheduledTime;
          if (isGroomingGroup && (!start || !/^\d{2}:\d{2}$/.test(start))) {
            setError(`A grooming time is missing for ${group.selections[0].pet.name}. Please edit the schedule.`);
            setSaving(false); submitLock.current = false; return;
          }
          writes.push({
            service_type: group.serviceType,
            is_walk_in: false,
            customer_id: customer.id,
            owner_name: customer.full_name,
            owner_contact: customer.phone_number ?? "",
            owner_address: customer.address ?? null,
            scheduled_date: leg.scheduledDate,
            scheduled_time: start ?? null,
            drop_off_at: null,
            pick_up_at: null,
            special_requests: leg.specialRequests || null,
            petSelections: group.selections,
          });
        }
        continue;
      }
      for (const sel of leg.petSelections) {
        if (!sel.boardingScheduledDate || !sel.boardingDropOffAt || !sel.boardingPickUpAt) {
          setError(`A boarding schedule is missing for ${sel.pet.name}. Please edit the boarding schedule before confirming.`);
          setSaving(false);
          submitLock.current = false;
          return;
        }
        writes.push({
          service_type: "boarding",
          is_walk_in: false,
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
      }
    }

    try {
      // Recheck the exact times the customer reviewed. The planning RPC can
      // propose later starts, but checkout must NEVER accept those silently.
      for (const leg of legs) {
        if (!leg.scheduledDate || !["grooming", "dog_grooming", "cat_grooming"].includes(leg.serviceChoice)) continue;
        const expected = leg.petSelections.map(sel => (sel as DraftPetSelection & { groomingScheduledTime?: string }).groomingScheduledTime);
        if (!leg.scheduledTime || expected.some(value => !value)) {
          setError("A grooming start time is missing. Please edit the schedule before confirming.");
          submitLock.current = false; return;
        }
        const { data, error: planningError } = await createClient().rpc("happytails_grooming_plan", {
          p_date: leg.scheduledDate,
          p_pricing_ids: leg.petSelections.map(sel => sel.packagePricingId as string),
          p_preferred_start: leg.scheduledTime,
          p_groomer_ids: leg.petSelections.map(sel => sel.groomerId),
        });
        if (planningError) {
          setError(`Could not verify your grooming times: ${planningError.message}. Please edit the schedule.`);
          submitLock.current = false; return;
        }
        const refreshed = data as Array<{time: string}>;
        if (!Array.isArray(refreshed) || refreshed.length !== expected.length ||
            refreshed.some((item, i) => item.time !== expected[i])) {
          setError("One or more grooming times are no longer available. Your booking has NOT been submitted or rescheduled. Please click Edit on the grooming service, select available times, and review again.");
          submitLock.current = false; return;
        }
      }
      const { appointments, error: err } = await createAppointmentsAtomic(writes);
      if (err) {
        setError(`The booking was not completed: ${err}`);
        submitLock.current = false;
        return;
      }
      if (appointments.length !== writes.length) throw new Error("Unexpected booking confirmation count.");
      setSaved(true);
    } catch (unexpected) {
      setError(unexpected instanceof Error ? unexpected.message : "Unexpected booking error. Check existing appointments before trying again.");
      submitLock.current = false;
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <div className="mx-auto w-full max-w-md py-8 text-center sm:py-16">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-600"><path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <h2 className="mt-4 text-xl font-bold text-zinc-800">Booking Complete</h2>
        <p className="mt-1 text-sm text-zinc-500">Your appointments have been booked with each boarding pet scheduled independently.</p>
        {hasGrooming && <p className="mt-3 rounded-xl border border-pink-100 bg-pink-50 p-3 text-sm text-zinc-700">Reminder: Your pet will be weighed at the shop. Staff will verify the size and confirm any final grooming price adjustment with you.</p>}
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
          const legTotal = leg.petSelections.reduce((sum, sel) => sum + sel.lineAmount, 0);
          return (
            <section key={leg.id} className="w-full rounded-2xl border-2 border-pink-100 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-bold text-brand-pink sm:text-lg">{serviceLabels[leg.serviceChoice]}</h3>
                <button onClick={() => onEditLeg(leg.id)} className="shrink-0 text-xs font-semibold text-brand-pink hover:underline sm:text-sm">Edit</button>
              </div>
              {leg.petSelections.map((sel) => {
                const lookupKey = leg.serviceChoice === "grooming"
                  ? sel.pet.species === "Cat" ? "cat_grooming" : "dog_grooming"
                  : leg.serviceChoice;
                const packages = packagesByService[lookupKey] ?? [];
                const sizes = sizesByService[lookupKey] ?? [];
                const addons = addonsByService[lookupKey] ?? [];
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
                        <p className="text-sm text-zinc-600">Drop Off: {formatDateTime(sel.boardingDropOffAt ?? null)}</p>
                        <p className="text-sm text-zinc-600">Pick Up: {formatDateTime(sel.boardingPickUpAt ?? null)}</p>
                        <p className="mt-1 text-xs font-semibold text-brand-pink">Independent boarding schedule</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-zinc-600">Package: {pkg?.name ?? (sel.packageId ? "—" : "Ala Carte")}</p>
                        {size && <p className="text-sm text-zinc-600">Size: {size.label}</p>}
                        {groomer && <p className="text-sm text-zinc-600">Groomer: {groomer.name}</p>}
                        {(leg.serviceChoice === "grooming" || leg.serviceChoice === "dog_grooming" || leg.serviceChoice === "cat_grooming") &&
                          <p className="text-sm text-zinc-600">Start: {formatTime12h((sel as DraftPetSelection & { groomingScheduledTime?: string }).groomingScheduledTime ?? null)}</p>}
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
                  {leg.serviceChoice === "ala_carte" && <p>Time: {formatTime12h(leg.scheduledTime)}</p>}
                </div>
              )}
              {leg.specialRequests && <p className="mt-2 text-sm text-zinc-600">Notes: {leg.specialRequests}</p>}
              <p className="mt-2 text-right text-sm font-bold text-brand-pink">Subtotal: ₱{legTotal.toLocaleString()}</p>
            </section>
          );
        })}
      </div>

      <div className="mt-5 flex items-center justify-between rounded-2xl bg-brand-tint px-5 py-4">
        <span className="text-base font-bold text-zinc-800">{hasGrooming ? "Estimated Total" : "Grand Total"}</span>
        <span className="text-xl font-bold text-brand-pink">₱{grandTotal.toLocaleString()}</span>
      </div>

      {hasGrooming && (
        <section aria-labelledby="grooming-price-notice-title" className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M12 3 2.5 20h19L12 3Z" strokeLinejoin="round" /><path d="M12 9v5m0 3h.01" strokeLinecap="round" /></svg>
            </span>
            <div>
              <h3 id="grooming-price-notice-title" className="font-bold text-zinc-800">Important: Pet Size & Grooming Price Verification</h3>
              <p className="mt-1 text-sm leading-6 text-zinc-700">
                Your pet will be weighed at the HappyTails shop to verify its actual size before grooming. The price shown here is an <strong>estimate</strong> based on the selected size and package. If the verified size differs, the grooming price may increase or decrease. Staff will explain and confirm the final price with you before the service begins.
              </p>
            </div>
          </div>
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-white px-3 py-3 text-sm text-zinc-800">
            <input type="checkbox" checked={acknowledgedWeightPolicy} onChange={(event) => setAcknowledgedWeightPolicy(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-pink-500" />
            <span>I understand that my pet will be weighed at the shop and that the final grooming price may change after size verification.</span>
          </label>
        </section>
      )}

      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <button type="button" onClick={onBack} className="min-h-12 rounded-full border-2 border-zinc-300 px-6 py-3 text-sm font-semibold text-zinc-500 hover:border-zinc-400">Back</button>
        <button type="button" onClick={handleComplete} disabled={saving || (hasGrooming && !acknowledgedWeightPolicy)} className="min-h-12 rounded-full bg-brand-pink px-6 py-3 text-sm font-semibold text-white hover:bg-brand-pink-dark disabled:cursor-not-allowed disabled:opacity-50">{saving ? `Saving all ${saveUnits} appointment(s)…` : "Complete Appointment"}</button>
      </div>
    </div>
  );
}
