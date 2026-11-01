"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AppointmentRow } from "@/lib/supabase/appointment-management";
import type { Groomer, Kennel } from "@/lib/types/pet-services";
import { checkInAppointment, fetchAvailableGroomers, fetchAvailableKennels } from "@/lib/supabase/service-sessions";

export default function CheckInAssignmentModal({ appointment, onClose, onSuccess }: {
  appointment: AppointmentRow; onClose: () => void; onSuccess: () => void;
}) {
  const boarding = appointment.service_type === "boarding";
  const [groomers, setGroomers] = useState<Groomer[]>([]);
  const [kennels, setKennels] = useState<Kennel[]>([]);
  const [chosen, setChosen] = useState<Record<string, string>>(() =>
    Object.fromEntries(appointment.pets.filter(p => !!p.groomerId && !boarding).map(p => [p.appointmentPetId, p.groomerId as string])));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let valid = true;
    void (async () => {
      const result = boarding ? await fetchAvailableKennels() : await fetchAvailableGroomers();
      if (!valid) return;
      if ("kennels" in result) setKennels(result.kennels); else setGroomers(result.groomers);
      setError(result.error); setLoading(false);
    })();
    return () => { valid = false; };
  }, [boarding]);

  const kennelOptions = (pet: { requestedKennelSize: "small" | "big" | null }) =>
    pet.requestedKennelSize ? kennels.filter(k => k.size === pet.requestedKennelSize) : [];
  const complete = appointment.pets.length > 0 && appointment.pets.every(p => !!chosen[p.appointmentPetId]);
  async function save() {
    if (!complete || saving) { setError("Assign a resource to every pet before checking in."); return; }
    setSaving(true); setError(null);
    try {
      if (boarding) {
        const response = await checkInAppointment(appointment.id, appointment.pets.map(p => ({
          appointmentPetId: p.appointmentPetId, resourceId: chosen[p.appointmentPetId], resourceType: "kennel" as const,
        })));
        if (response.error) { setError(response.error); return; }
      } else {
        // One RPC transaction checks and saves every groomer assignment and the appointment status.
        const { error: failure } = await createClient().rpc("happytails_checkin_grooming_v2", {
          p_appointment_id: appointment.id,
          p_assignments: appointment.pets.map(p => ({ appointment_pet_id: p.appointmentPetId,
            groomer_id: chosen[p.appointmentPetId] })),
        });
        if (failure) { setError(failure.message); return; }
      }
      onSuccess();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not complete check-in."); }
    finally { setSaving(false); }
  }
  return <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-black/60 p-3 sm:p-5"
    onClick={() => { if (!saving) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-label={boarding ? "Assign kennels for check-in" : "Assign groomers for check-in"}
      onClick={e => e.stopPropagation()} className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-brand-tint shadow-2xl">
      <div className="flex shrink-0 items-center justify-between gap-3 bg-brand-pink px-5 py-4 text-white">
        <div><h3 className="font-bold">{boarding ? "Assign Kennels" : "Confirm Groomer Assignments"}</h3>
          <p className="mt-1 text-xs text-white/80">{boarding ? "Choose an available kennel for each pet." : "Previously reserved groomers are preselected. Changes are validated against other reservations."}</p></div>
        <button type="button" disabled={saving} onClick={onClose} aria-label="Close" className="text-2xl">×</button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {loading ? <p className="py-8 text-center text-zinc-400">Loading availability…</p> : <div className="space-y-3">{appointment.pets.map(p => {
          const options = boarding ? kennelOptions(p).map(k => ({ id: k.id, title: `${k.size} Kennel #${k.number}` })) :
            groomers.map(g => ({ id: g.id, title: g.name }));
          if (!boarding && p.groomerId && !options.some(o => o.id === p.groomerId)) {
            options.unshift({ id: p.groomerId, title: `${p.groomerName ?? "Previously reserved groomer"} (check availability)` });
          }
          return <div key={p.appointmentPetId} className="rounded-2xl border border-pink-100 bg-white p-4">
            <div className="mb-2"><strong>{p.name}</strong><p className="text-xs text-zinc-500">{p.breed} · {p.size_label}</p></div>
            <select value={chosen[p.appointmentPetId] ?? ""} onChange={e => setChosen(v => ({ ...v, [p.appointmentPetId]: e.target.value }))}
              className="w-full rounded-xl border border-pink-200 px-3 py-3 text-sm">
              <option value="">Select {boarding ? "kennel" : "groomer"}</option>
              {options.map(option => <option key={option.id} value={option.id}>{option.title}</option>)}
            </select>
            {boarding && !p.requestedKennelSize && <p className="mt-2 text-xs text-red-600">This booking has no recorded kennel size.</p>}
          </div>;
        })}</div>}
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}
        <div className="mt-5 flex gap-3"><button type="button" disabled={saving} onClick={onClose} className="flex-1 rounded-full border-2 border-zinc-300 py-3">Cancel</button>
          <button type="button" disabled={saving || loading || !complete} onClick={() => void save()} className="flex-1 rounded-full bg-brand-pink py-3 font-semibold text-white disabled:opacity-40">{saving ? "Saving…" : "Check In & Start"}</button></div>
      </div>
    </div>
  </div>;
}
