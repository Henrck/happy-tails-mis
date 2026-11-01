"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createAppointmentsAtomic, type CreateAppointmentInput } from "@/lib/supabase/appointments";
import { isGrooming, verifyGroomingLegPlans, type ScheduledGroomingSelection } from "@/lib/supabase/grooming-booking";
import { toAppointmentServiceType } from "@/lib/types/walk-in-draft";
import type { BookingLeg } from "@/lib/types/booking-leg";
import type { Customer } from "@/lib/types/users";
import type { AppointmentServiceType, DraftPetSelection } from "@/lib/types/appointments";
import type { Package, PetSize, Addon } from "@/lib/types/services";
import type { Groomer, Kennel } from "@/lib/types/pet-services";

const labels: Record<string, string> = { grooming: "Grooming", dog_grooming: "Dog Grooming", cat_grooming: "Cat Grooming", boarding: "Boarding", ala_carte: "À La Carte" };
const prettyTime = (time?: string | null) => { if (!time || !/^\d{2}:\d{2}/.test(time)) return "—"; const [h, m] = time.split(":").map(Number); return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`; };
const selectionsOf = (leg: BookingLeg) => (leg.petSelections ?? []).filter((s): s is DraftPetSelection => !!s?.pet?.id);

export default function MultiServiceSummaryStep({ customer, legs, packagesByService, sizesByService, addonsByService, groomers, onBack, onEditLeg }: {
  customer: Customer; legs: BookingLeg[];
  packagesByService: Record<string, Package[]>; sizesByService: Record<string, PetSize[]>;
  addonsByService: Record<string, Addon[]>; groomers: Groomer[]; kennels: Kennel[];
  onBack: () => void; onEditLeg: (legId: string) => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ack, setAck] = useState(false);
  const lock = useRef(false);
  const hasGrooming = legs.some(l => isGrooming(l.serviceChoice));
  const total = legs.reduce((sum, leg) => sum + selectionsOf(leg).reduce((n, s) => n + Number(s.lineAmount || 0), 0), 0);
  const makeInput = (leg: BookingLeg, service: AppointmentServiceType, selection: DraftPetSelection[], start: string | null): CreateAppointmentInput => ({
    service_type: service, is_walk_in: false, customer_id: customer.id, owner_name: customer.full_name,
    owner_contact: customer.phone_number ?? "", owner_address: customer.address ?? null,
    scheduled_date: leg.scheduledDate ?? "", scheduled_time: start,
    drop_off_at: null, pick_up_at: null, special_requests: leg.specialRequests || null, petSelections: selection,
  });
  async function submit() {
    if (lock.current || saving || saved || (hasGrooming && !ack)) return;
    setError(null);
    if (!legs.length || legs.some(l => !selectionsOf(l).length)) { setError("Select a service for at least one pet."); return; }
    const writes: CreateAppointmentInput[] = [];
    for (const leg of legs) {
      for (const selection of selectionsOf(leg)) {
        if (!Number.isFinite(Number(selection.lineAmount)) || Number(selection.lineAmount) < 0) { setError("A pet has an invalid service price. Edit the service."); return; }
      }
      if (leg.serviceChoice === "boarding") {
        for (const s of selectionsOf(leg)) {
          if (!s.boardingScheduledDate || !s.boardingDropOffAt || !s.boardingPickUpAt) { setError(`Complete the boarding dates for ${s.pet.name}.`); return; }
          writes.push({ ...makeInput(leg, "boarding", [s], null), scheduled_date: s.boardingScheduledDate,
            drop_off_at: s.boardingDropOffAt, pick_up_at: s.boardingPickUpAt });
        }
      } else if (isGrooming(leg.serviceChoice)) {
        if (!leg.scheduledDate || !leg.scheduledTime) { setError("Edit the grooming schedule first."); return; }
        for (const s of selectionsOf(leg) as ScheduledGroomingSelection[]) {
          if (!s.groomingScheduledTime || !s.groomerId || !s.packagePricingId) { setError(`Complete grooming scheduling for ${s.pet.name}.`); return; }
          writes.push(makeInput(leg, s.pet.species === "Cat" ? "cat_grooming" : "dog_grooming", [s], s.groomingScheduledTime));
        }
      } else {
        if (!leg.scheduledDate || !leg.scheduledTime) { setError("Choose a date and time for À La Carte."); return; }
        if (selectionsOf(leg).some(s => !s.addonIds?.length || Number(s.lineAmount) <= 0)) { setError("À La Carte service pricing is missing. Edit and select a priced service for each pet."); return; }
        writes.push(makeInput(leg, toAppointmentServiceType(leg.serviceChoice), selectionsOf(leg), leg.scheduledTime));
      }
    }
    lock.current = true; setSaving(true);
    try {
      const problem = await verifyGroomingLegPlans(legs);
      if (problem) { setError(problem); lock.current = false; return; }
      const result = await createAppointmentsAtomic(writes);
      if (result.error) { setError(`Booking not completed: ${result.error}`); lock.current = false; return; }
      if (result.appointments.length !== writes.length) throw new Error("Unexpected booking confirmation. Check existing appointments before retrying.");
      setSaved(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Unexpected booking result. Check appointments before retrying."); }
    finally { setSaving(false); }
  }
  if (saved) return <div className="mx-auto max-w-md py-12 text-center">
    <h2 className="text-2xl font-extrabold text-emerald-700">Booking Complete</h2>
    <p className="mt-2 text-sm text-zinc-600">Your appointments were saved together. Each grooming pet has a reserved groomer and start time.</p>
    {hasGrooming && <p className="mt-3 rounded-xl bg-pink-50 p-3 text-sm">Final grooming charges are subject to staff weight verification and customer approval.</p>}
    <button type="button" onClick={() => router.push("/account")} className="mt-5 rounded-full bg-brand-pink px-6 py-3 font-semibold text-white">Back to My Pets</button>
  </div>;
  return <div className="mx-auto w-full max-w-3xl">
    <h2 className="text-center text-2xl font-extrabold text-brand-pink">Booking Summary</h2>
    <p className="mt-1 text-center text-sm text-zinc-500">Review your pets, services, groomers, and appointment dates.</p>
    <div className="mt-5 space-y-4">{legs.map(leg => {
      const amount = selectionsOf(leg).reduce((sum, s) => sum + Number(s.lineAmount || 0), 0);
      return <section key={leg.id} className="rounded-2xl border-2 border-pink-100 p-5">
        <div className="flex items-center justify-between"><h3 className="font-bold text-brand-pink">{labels[leg.serviceChoice]}</h3>
          <button type="button" onClick={() => onEditLeg(leg.id)} className="text-sm font-semibold text-brand-pink underline">Edit</button></div>
        {selectionsOf(leg).map(s => {
          const key = leg.serviceChoice === "grooming" ? (s.pet.species === "Cat" ? "cat_grooming" : "dog_grooming") : leg.serviceChoice;
          const pkg = packagesByService[key]?.find(p => p.id === s.packageId);
          const size = sizesByService[key]?.find(p => p.id === s.sizeId);
          const groomer = groomers.find(g => g.id === s.groomerId);
          const addonNames = (s.addonIds ?? []).map(id => addonsByService[key]?.find(a => a.id === id)?.name).filter(Boolean).join(", ");
          const start = (s as ScheduledGroomingSelection).groomingScheduledTime;
          return <div key={s.pet.id} className="mt-3 border-t border-dashed border-pink-100 pt-3 text-sm text-zinc-700">
            <p className="font-bold text-zinc-900">{s.pet.name} <span className="font-normal text-zinc-500">({s.pet.breed})</span></p>
            {leg.serviceChoice === "boarding" ? <><p>Kennel: {s.boardingKennelSize ?? "—"}</p><p>Drop-off: {s.boardingDropOffAt ?? "—"}</p><p>Pick-up: {s.boardingPickUpAt ?? "—"}</p></> :
              <><p>Package: {pkg?.name ?? (s.packageId ? "—" : "À La Carte")}</p>{size && <p>Size: {size.label}</p>}
                {isGrooming(leg.serviceChoice) && <p>Start: {prettyTime(start)} · Groomer: {groomer?.name ?? "Assigned at booking"}</p>}</>}
            {addonNames && <p>Add-ons: {addonNames}</p>}<p className="mt-1 font-semibold">₱{Number(s.lineAmount).toLocaleString()}</p>
          </div>;
        })}
        {leg.serviceChoice !== "boarding" && <p className="mt-2 text-sm text-zinc-600">Date: {leg.scheduledDate ?? "—"}{leg.serviceChoice === "ala_carte" ? ` · Time: ${prettyTime(leg.scheduledTime)}` : ""}</p>}
        {!!leg.specialRequests && <p className="mt-2 text-sm text-zinc-600">Notes: {leg.specialRequests}</p>}
        <p className="mt-3 text-right font-bold text-brand-pink">Subtotal: ₱{amount.toLocaleString()}</p>
      </section>;
    })}</div>
    <div className="mt-5 flex justify-between rounded-2xl bg-brand-tint px-5 py-4 font-bold"><span>{hasGrooming ? "Estimated Total" : "Grand Total"}</span><span className="text-xl text-brand-pink">₱{total.toLocaleString()}</span></div>
    {hasGrooming && <label className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-zinc-700">
      <input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)} className="mt-1" />
      <span><strong>Grooming price policy:</strong> I understand that my pet will be weighed at the shop and the final rate may change after staff verification and my approval.</span>
    </label>}
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="mt-6 grid grid-cols-2 gap-3"><button type="button" onClick={onBack} className="rounded-full border-2 border-zinc-300 py-3 font-semibold">Back</button>
      <button type="button" onClick={() => void submit()} disabled={saving || (hasGrooming && !ack)} className="rounded-full bg-brand-pink py-3 font-bold text-white disabled:opacity-40">{saving ? "Saving…" : "Complete Appointment"}</button></div>
  </div>;
}
