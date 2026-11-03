"use client";

import { useRef, useState } from "react";
import { createAppointmentsAtomic, type CreateAppointmentInput } from "@/lib/supabase/appointments";
import { checkBookingClosedDate } from "@/lib/supabase/booking-closures";
import { isGrooming, verifyGroomingLegPlans, type ScheduledGroomingSelection } from "@/lib/supabase/grooming-booking";
import type { Customer } from "@/lib/types/users";
import type { BookingLeg } from "@/lib/types/booking-leg";
import type { AppointmentServiceType, DraftPetSelection } from "@/lib/types/appointments";
import type { Package, PetSize, Addon } from "@/lib/types/services";
import type { Groomer } from "@/lib/types/pet-services";

type Props = {
  customer: Customer | null;
  owner: { name: string; contact: string; address: string };
  legs: BookingLeg[];
  packagesByService: Record<string, Package[]>;
  sizesByService: Record<string, PetSize[]>;
  addonsByService: Record<string, Addon[]>;
  groomers: Groomer[];
  onBack: () => void;
  onEditLeg: (id: string) => void;
  onDone: () => void;
};
const labels: Record<string, string> = { grooming: "Grooming", dog_grooming: "Dog Grooming", cat_grooming: "Cat Grooming", boarding: "Boarding", ala_carte: "À La Carte" };
const prettyTime = (time?: string | null) => {
  if (!time || !/^\d{2}:\d{2}/.test(time)) return "—";
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

export default function WalkInMultiServiceSummary({
  customer, owner, legs, packagesByService, sizesByService, addonsByService, groomers,
  onBack, onEditLeg, onDone,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [approved, setApproved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const hasGrooming = legs.some(l => isGrooming(l.serviceChoice));
  const total = legs.reduce((sum, leg) => sum + leg.petSelections.reduce((n, s) => n + Number(s.lineAmount || 0), 0), 0);

  function makeInput(leg: BookingLeg, service: AppointmentServiceType, pets: DraftPetSelection[], start: string | null): CreateAppointmentInput {
    return {
      service_type: service, is_walk_in: true, customer_id: customer?.id ?? null,
      owner_name: owner.name, owner_contact: owner.contact, owner_address: owner.address || null,
      scheduled_date: leg.scheduledDate ?? "", scheduled_time: start,
      drop_off_at: null, pick_up_at: null,
      special_requests: leg.specialRequests || null, petSelections: pets,
    };
  }

  async function save() {
    if (lock.current || saving || saved || (hasGrooming && !approved)) return;
    setError(null);
    if (!owner.name.trim() || !owner.contact.trim() || !legs.length) {
      setError("Owner information and services are required."); return;
    }
    const writes: CreateAppointmentInput[] = [];
    for (const leg of legs) {
      if (!leg.petSelections.length) { setError(`Select pets for ${labels[leg.serviceChoice]}.`); return; }
      if (leg.petSelections.some(s => !Number.isFinite(Number(s.lineAmount)) || Number(s.lineAmount) < 0)) {
        setError("An amount is invalid. Edit the affected service."); return;
      }
      if (leg.serviceChoice === "boarding") {
        for (const s of leg.petSelections) {
          if (!s.boardingScheduledDate || !s.boardingDropOffAt || !s.boardingPickUpAt) {
            setError(`Complete boarding dates for ${s.pet.name}.`); return;
          }
          writes.push({ ...makeInput(leg, "boarding", [s], null),
            scheduled_date: s.boardingScheduledDate, drop_off_at: s.boardingDropOffAt, pick_up_at: s.boardingPickUpAt });
        }
      } else if (isGrooming(leg.serviceChoice)) {
        if (!leg.scheduledDate || !leg.scheduledTime) { setError("Select a grooming date and time."); return; }
        for (const s of leg.petSelections as ScheduledGroomingSelection[]) {
          if (!s.groomerId || !s.groomingScheduledTime || !s.packagePricingId) {
            setError(`Groomer reservation missing for ${s.pet.name}. Edit the schedule.`); return;
          }
          writes.push(makeInput(leg, s.pet.species === "Cat" ? "cat_grooming" : "dog_grooming", [s], s.groomingScheduledTime));
        }
      } else {
        if (!leg.scheduledDate) { setError("Select an À La Carte date."); return; }
        for (const selection of leg.petSelections) {
          const s = selection as DraftPetSelection & { alaCarteScheduledTime?: string | null };
          if (!s.addonIds?.length || Number(s.lineAmount) <= 0 || !s.groomerId || !s.alaCarteScheduledTime) {
            setError(`Choose À La Carte items, start time, and groomer for ${s.pet.name}.`); return;
          }
          // One appointment per pet: the groomer may return for another pet
          // after finishing this one, but never at overlapping times.
          writes.push(makeInput(leg, "ala_carte", [s], s.alaCarteScheduledTime));
        }
      }
    }
    lock.current = true; setSaving(true);
    try {
      for (const day of new Set(writes.map(w => w.scheduled_date))) {
        const closed = await checkBookingClosedDate(day);
        if (closed.error || closed.closed) {
          setError(closed.error || `${day} is closed (${closed.name || "Holiday / closure"}).`);
          lock.current = false; return;
        }
      }
      const problem = await verifyGroomingLegPlans(legs);
      if (problem) { setError(problem); lock.current = false; return; }
      const result = await createAppointmentsAtomic(writes);
      if (result.error) { setError(`Walk-in booking could not be saved: ${result.error}`); lock.current = false; return; }
      if (result.appointments.length !== writes.length) {
        throw new Error("Unconfirmed appointment result. Check the appointment table before retrying.");
      }
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unconfirmed booking result. Check the appointment table before retrying.");
    } finally { setSaving(false); }
  }

  if (saved) return <section className="mx-auto max-w-xl py-10 text-center">
    <h2 className="text-2xl font-bold text-emerald-700">Walk-in Booking Complete</h2>
    <p className="mt-2 text-zinc-600">All appointments were recorded together. Each pet has an individual groomer reservation and start time.</p>
    <p className="mt-3 font-semibold text-brand-pink">Total recorded: ₱{total.toLocaleString()}</p>
    <button type="button" onClick={onDone} className="mt-5 rounded-full bg-brand-pink px-6 py-3 font-semibold text-white">Return to POS</button>
  </section>;

  return <div className="mx-auto w-full max-w-3xl">
    <h2 className="text-center text-2xl font-extrabold text-brand-pink">Walk-in Booking Summary</h2>
    <p className="mt-1 text-center text-sm text-zinc-500">Review each pet, groomer, appointment time and total before saving.</p>
    <div className="mt-5 space-y-4">{legs.map(leg => <section key={leg.id} className="rounded-2xl border-2 border-pink-100 bg-white p-5">
      <div className="flex justify-between gap-3"><h3 className="font-bold text-brand-pink">{labels[leg.serviceChoice]}</h3>
        <button type="button" onClick={() => onEditLeg(leg.id)} className="text-sm font-semibold text-brand-pink underline">Edit</button></div>
      {leg.petSelections.map(s => {
        const service = leg.serviceChoice === "grooming" ? (s.pet.species === "Cat" ? "cat_grooming" : "dog_grooming") : leg.serviceChoice;
        const pkg = packagesByService[service]?.find(p => p.id === s.packageId);
        const size = sizesByService[service]?.find(p => p.id === s.sizeId);
        const groomer = groomers.find(g => g.id === s.groomerId);
        const addons = (s.addonIds ?? []).map(id => addonsByService[service]?.find(a => a.id === id)?.name).filter(Boolean).join(", ");
        const alaTime = (s as DraftPetSelection & { alaCarteScheduledTime?: string | null }).alaCarteScheduledTime;
        return <div key={s.pet.id} className="mt-3 border-t border-dashed border-pink-100 pt-3 text-sm text-zinc-700">
          <strong>{s.pet.name}</strong> <span className="text-zinc-400">({s.pet.breed})</span>
          {pkg && <p>Package: {pkg.name}</p>}{size && <p>Size: {size.label}</p>}
          {isGrooming(leg.serviceChoice) && <p>Groomer: {groomer?.name ?? "Assigned"} · Start: {prettyTime((s as ScheduledGroomingSelection).groomingScheduledTime)}</p>}
          {leg.serviceChoice === "ala_carte" && <p>Groomer: {groomer?.name ?? "—"} · Start: {prettyTime(alaTime)}</p>}
          {leg.serviceChoice === "boarding" && <><p>Kennel: {s.boardingKennelSize}</p><p>Drop-off: {s.boardingDropOffAt ?? "—"}</p><p>Pick-up: {s.boardingPickUpAt ?? "—"}</p></>}
          {addons && <p>Add-ons: {addons}</p>}<p className="font-semibold">₱{Number(s.lineAmount).toLocaleString()}</p>
        </div>;
      })}
      {leg.serviceChoice !== "boarding" && <p className="mt-3 text-sm text-zinc-600">Date: {leg.scheduledDate ?? "—"}
        {leg.serviceChoice !== "ala_carte" ? ` · ${prettyTime(leg.scheduledTime)}` : ""}</p>}
      {leg.specialRequests && <p className="mt-2 text-sm text-zinc-600">Notes: {leg.specialRequests}</p>}
      <p className="mt-3 text-right font-bold text-brand-pink">Subtotal: ₱{leg.petSelections.reduce((n, s) => n + Number(s.lineAmount || 0), 0).toLocaleString()}</p>
    </section>)}</div>
    <div className="mt-5 flex justify-between rounded-2xl bg-pink-100 px-5 py-4 font-bold"><span>{hasGrooming ? "Estimated Total" : "Grand Total"}</span><span className="text-brand-pink">₱{total.toLocaleString()}</span></div>
    {hasGrooming && <label className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
      <input type="checkbox" checked={approved} onChange={e => setApproved(e.target.checked)} className="mt-1" />
      <span>I have explained that grooming prices are estimates until verified against the actual pet weight, and the owner must approve any adjustment.</span>
    </label>}
    {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    <div className="mt-6 grid grid-cols-2 gap-3"><button type="button" onClick={onBack} className="rounded-full border border-zinc-300 py-3 font-semibold">Back</button>
      <button type="button" onClick={() => void save()} disabled={saving || !legs.length || (hasGrooming && !approved)} className="rounded-full bg-brand-pink py-3 font-bold text-white disabled:opacity-40">{saving ? "Saving…" : "Complete Walk-in Booking"}</button></div>
  </div>;
}
