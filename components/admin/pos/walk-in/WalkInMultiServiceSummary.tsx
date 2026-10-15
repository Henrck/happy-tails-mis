"use client";

import { useRef, useState } from "react";
import { createAppointmentsAtomic, type CreateAppointmentInput } from "@/lib/supabase/appointments";
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

export default function WalkInMultiServiceSummary({ customer, owner, legs, packagesByService, sizesByService, addonsByService, groomers, onBack, onEditLeg, onDone }: Props) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const total = legs.reduce((sum, leg) => sum + leg.petSelections.reduce((n, p) => n + p.lineAmount, 0), 0);
  const grooming = legs.some(l => ["grooming", "dog_grooming", "cat_grooming"].includes(l.serviceChoice));

  function input(service: AppointmentServiceType, selections: DraftPetSelection[], leg: BookingLeg): CreateAppointmentInput {
    return {
      service_type: service,
      is_walk_in: true,
      customer_id: customer?.id ?? null,
      owner_name: owner.name,
      owner_contact: owner.contact,
      owner_address: owner.address || null,
      scheduled_date: leg.scheduledDate ?? "",
      scheduled_time: service === "boarding" ? null : leg.scheduledTime,
      drop_off_at: service === "boarding" ? leg.dropOffAt : null,
      pick_up_at: service === "boarding" ? leg.pickUpAt : null,
      special_requests: leg.specialRequests || null,
      petSelections: selections,
    };
  }

  async function save() {
    if (lock.current || saved) return;
    setError(null);
    if (!legs.length || !owner.name.trim() || !owner.contact.trim()) {
      setError("Owner details and at least one service are required."); return;
    }
    const writes: CreateAppointmentInput[] = [];
    for (const leg of legs) {
      if (!leg.petSelections.length) { setError(`No pets selected for ${labels[leg.serviceChoice]}.`); return; }
      if (leg.serviceChoice === "boarding") {
        for (const sel of leg.petSelections) {
          if (!sel.boardingScheduledDate || !sel.boardingDropOffAt || !sel.boardingPickUpAt) {
            setError(`Complete the boarding schedule for ${sel.pet.name} first.`); return;
          }
          writes.push({ ...input("boarding", [sel], leg), scheduled_date: sel.boardingScheduledDate,
            drop_off_at: sel.boardingDropOffAt, pick_up_at: sel.boardingPickUpAt });
        }
      } else {
        if (!leg.scheduledDate || !leg.scheduledTime) {
          setError(`Select a date and time for ${labels[leg.serviceChoice]}.`); return;
        }
        if (leg.serviceChoice === "grooming") {
          const dogs = leg.petSelections.filter(s => s.pet.species === "Dog");
          const cats = leg.petSelections.filter(s => s.pet.species === "Cat");
          if (dogs.length) writes.push(input("dog_grooming", dogs, leg));
          if (cats.length) writes.push(input("cat_grooming", cats, leg));
        } else writes.push(input(leg.serviceChoice, leg.petSelections, leg));
      }
    }
    if (!writes.length) { setError("No appointments are ready to save."); return; }
    lock.current = true; setSaving(true);
    try {
      const result = await createAppointmentsAtomic(writes);
      if (result.error) { setError(`Walk-in booking could not be saved: ${result.error}`); lock.current = false; return; }
      if (result.appointments.length !== writes.length) throw new Error("Unexpected number of saved appointments. Verify appointments before retrying.");
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected booking error. Check appointments before retrying.");
      // Keep submission locked for indeterminate outcomes to prevent duplicate charges/appointments.
    } finally { setSaving(false); }
  }

  if (saved) return <div className="mx-auto max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">
    <div className="text-5xl text-emerald-600">✓</div>
    <h2 className="mt-4 text-2xl font-bold text-zinc-800">Walk-in Booking Complete</h2>
    <p className="mt-2 text-sm text-zinc-600">All selected services were recorded together as walk-in appointments.</p>
    <p className="mt-2 text-sm font-semibold text-brand-pink">Total recorded: ₱{total.toLocaleString()}</p>
    <button type="button" onClick={onDone} className="mt-6 w-full rounded-full bg-brand-pink px-5 py-3 font-semibold text-white">Back to POS</button>
  </div>;

  return <div className="mx-auto max-w-3xl">
    <h2 className="text-center text-2xl font-extrabold text-brand-pink">Walk-in Booking Summary</h2>
    <p className="mt-1 text-center text-sm text-zinc-500">Confirm all services in one transaction. Each pet's boarding reservation is saved separately.</p>
    <section className="mt-6 rounded-2xl border border-pink-100 bg-white p-5">
      <h3 className="font-bold text-zinc-800">Owner</h3>
      <p className="mt-1 text-sm text-zinc-600">{owner.name} · {owner.contact}</p>
      {owner.address && <p className="text-sm text-zinc-500">{owner.address}</p>}
      <p className="mt-2 text-xs font-semibold text-brand-pink">{customer ? "Registered customer" : "Guest walk-in"}</p>
    </section>
    {legs.map(leg => <section key={leg.id} className="mt-4 rounded-2xl border border-pink-100 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold text-brand-pink">{labels[leg.serviceChoice]}</h3>
        <button type="button" className="text-sm font-semibold text-brand-pink underline" onClick={() => onEditLeg(leg.id)}>Edit service</button>
      </div>
      {leg.petSelections.map(sel => {
        const kind = leg.serviceChoice === "grooming" ? (sel.pet.species === "Cat" ? "cat_grooming" : "dog_grooming") : leg.serviceChoice;
        const pkg = packagesByService[kind]?.find(p => p.id === sel.packageId);
        const size = sizesByService[kind]?.find(s => s.id === sel.sizeId);
        const names = sel.addonIds.map(id => addonsByService[kind]?.find(a => a.id === id)?.name).filter(Boolean);
        const groomer = groomers.find(g => g.id === sel.groomerId);
        return <div key={sel.pet.id} className="mt-3 border-t border-dashed border-pink-100 pt-3 text-sm">
          <div className="flex items-start justify-between gap-3"><p className="font-semibold text-zinc-800">{sel.pet.name} <span className="font-normal text-zinc-500">({sel.pet.species})</span></p><p className="font-bold text-zinc-800">₱{sel.lineAmount.toLocaleString()}</p></div>
          {pkg && <p className="text-zinc-600">Package: {pkg.name}</p>}
          {size && <p className="text-zinc-600">Size: {size.label}</p>}
          {groomer && <p className="text-zinc-600">Groomer: {groomer.name}</p>}
          {names.length > 0 && <p className="text-zinc-600">Add-ons: {names.join(", ")}</p>}
          {kind === "boarding" && <p className="text-zinc-600">Boarding: {sel.boardingDropOffAt ? new Date(sel.boardingDropOffAt).toLocaleString() : "—"} → {sel.boardingPickUpAt ? new Date(sel.boardingPickUpAt).toLocaleString() : "—"}</p>}
        </div>;
      })}
      {leg.serviceChoice !== "boarding" && <p className="mt-3 text-sm text-zinc-600">Schedule: {leg.scheduledDate ?? "—"} · {leg.scheduledTime ?? "—"}</p>}
      {leg.specialRequests && <p className="mt-2 text-sm text-zinc-600">Notes: {leg.specialRequests}</p>}
      <p className="mt-3 text-right font-bold text-brand-pink">Subtotal: ₱{leg.petSelections.reduce((n,s) => n + s.lineAmount, 0).toLocaleString()}</p>
    </section>)}
    <div className="mt-5 flex justify-between rounded-2xl bg-pink-100 px-5 py-4 font-bold text-zinc-800"><span>{grooming ? "Estimated Total" : "Grand Total"}</span><span className="text-brand-pink">₱{total.toLocaleString()}</span></div>
    {grooming && <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Grooming amounts are estimates until staff verify the pet's actual weight and size and confirm any price adjustment before service.</p>}
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="mt-6 grid grid-cols-2 gap-3"><button type="button" disabled={saving} onClick={onBack} className="rounded-full border-2 border-pink-200 bg-white py-3 font-semibold text-brand-pink disabled:opacity-50">Back</button>
      <button type="button" disabled={saving || !legs.length} onClick={save} className="rounded-full bg-brand-pink py-3 font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Complete Walk-in Booking"}</button></div>
  </div>;
}
