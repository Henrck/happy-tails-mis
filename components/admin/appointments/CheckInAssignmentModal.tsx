"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AppointmentRow } from "@/lib/supabase/appointment-management";
import type { Kennel } from "@/lib/types/pet-services";
import { kennelDisplayName } from "@/lib/types/pet-services";
import { checkInAppointment, fetchAvailableKennels, fetchGroomingSessions } from "@/lib/supabase/service-sessions";

type GroomerOption = { id: string; name: string };
type AvailabilityRow = { appointment_pet_id: string; groomer_id: string; groomer_name: string };

export default function CheckInAssignmentModal({ appointment, onClose, onSuccess }: {
  appointment: AppointmentRow; onClose: () => void; onSuccess: () => void;
}) {
  const boarding = appointment.service_type === "boarding";
  const [kennels, setKennels] = useState<Kennel[]>([]);
  const [reserved, setReserved] = useState<Record<string,string>>({});
  const [available, setAvailable] = useState<Record<string, GroomerOption[]>>({});
  const [busyGroomers, setBusyGroomers] = useState<Set<string>>(new Set());
  const [chosen, setChosen] = useState<Record<string, string>>(() => Object.fromEntries(
    appointment.pets.filter(p => !boarding && !!p.groomerId).map(p => [p.appointmentPetId, p.groomerId as string])
  ));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    if (boarding) {
      const db = createClient();
      const [availableRows, bookedRows, activeRows] = await Promise.all([
        fetchAvailableKennels(),
        db.from("appointment_pets").select("id,kennel_id").eq("appointment_id", appointment.id),
        db.from("kennels").select("*").eq("is_active", true).order("number"),
      ]);
      if (availableRows.error || bookedRows.error || activeRows.error) {
        setError(availableRows.error ?? bookedRows.error?.message ?? activeRows.error?.message ?? "Unable to load kennels.");
        setKennels([]);
      } else {
        const map = Object.fromEntries((bookedRows.data ?? []).filter(r => !!r.kennel_id).map(r => [r.id, r.kennel_id as string]));
        setReserved(map);
        setChosen(prev => ({ ...prev, ...map }));
        setKennels(((activeRows.data ?? []) as Kennel[]).filter(k => !!Object.values(map).includes(k.id) || availableRows.kennels.some(a => a.id === k.id)));
      }
    } else {
      const [{ data, error: failure }, active] = await Promise.all([
        createClient().rpc("happytails_checkin_groomer_options", { p_appointment_id: appointment.id }),
        fetchGroomingSessions(),
      ]);
      setBusyGroomers(new Set(active.sessions.filter(s => s.appointmentId !== appointment.id).map(s => s.groomerId)));
      if (failure || active.error) {
        setAvailable({}); setError(`Could not verify groomer availability: ${failure?.message ?? active.error}`);
      } else {
        const next: Record<string, GroomerOption[]> = {};
        for (const row of (data ?? []) as AvailabilityRow[]) {
          (next[row.appointment_pet_id] ??= []).push({ id: row.groomer_id, name: row.groomer_name });
        }
        setAvailable(next);
      }
    }
    setLoading(false);
  }, [appointment.id, boarding]);
  useEffect(() => { void load(); }, [load]);
  const hasDuplicateGroomer = !boarding && new Set(Object.values(chosen).filter(Boolean)).size !== Object.values(chosen).filter(Boolean).length;
  const complete = appointment.pets.length > 0 && appointment.pets.every(p => {
    const selected = chosen[p.appointmentPetId];
    return Boolean(selected && (boarding
      ? kennels.some(k => k.id === selected && k.is_active !== false && (!p.requestedKennelSize || k.size === p.requestedKennelSize)) && (!reserved[p.appointmentPetId] || reserved[p.appointmentPetId] === selected)
      : (available[p.appointmentPetId] ?? []).some(g => g.id === selected)));
  }) && !hasDuplicateGroomer;
  const reservedCount = useMemo(() => appointment.pets.filter(p => !boarding && !!p.groomerId).length, [appointment.pets, boarding]);
  async function save() {
    if (loading || saving || !complete) { setError("Review the available assignment for every pet before checking in."); return; }
    setSaving(true); setError(null);
    try {
      if (boarding) {
        const result = await checkInAppointment(appointment.id, appointment.pets.map(p => ({
          appointmentPetId: p.appointmentPetId, resourceId: chosen[p.appointmentPetId], resourceType: "kennel" as const,
        })));
        if (result.error) { setError(result.error); return; }
      } else {
        const { error: failure } = await createClient().rpc("happytails_checkin_grooming_v2", {
          p_appointment_id: appointment.id,
          p_assignments: appointment.pets.map(p => ({ appointment_pet_id: p.appointmentPetId, groomer_id: chosen[p.appointmentPetId] })),
        });
        if (failure) { setError(`${failure.message} Refresh availability and review the assignment.`); await load(); return; }
      }
      onSuccess();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to complete check-in."); }
    finally { setSaving(false); }
  }
  return <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-black/60 p-3 sm:p-5" onClick={() => { if (!saving) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-label={boarding ? "Assign kennels" : "Confirm booked groomers"}
      onClick={e => e.stopPropagation()} className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-brand-tint shadow-2xl">
      <div className="flex shrink-0 items-center justify-between gap-3 bg-brand-pink px-5 py-4 text-white">
        <div><h3 className="font-bold">{boarding ? "Assign Kennels" : "Confirm Groomer Assignments"}</h3>
          <p className="mt-1 text-xs text-white/85">{boarding ? "Existing booked kennels are preselected; no new selection is needed." : `${reservedCount} booked groomer${reservedCount === 1 ? "" : "s"} preselected. Only eligible groomers are listed.`}</p></div>
        <button type="button" disabled={saving} onClick={onClose} aria-label="Close" className="text-2xl">×</button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="mb-4 flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-xs text-zinc-600">
          <span>{boarding ? `Active kennels: ${kennels.length} · Confirm existing reservations` : `${appointment.scheduled_date} · ${appointment.scheduled_time?.slice(0,5) ?? "No time"}`}</span>
          <button type="button" disabled={loading || saving} onClick={() => void load()} className="font-semibold text-brand-pink disabled:opacity-50">Refresh availability</button>
        </div>
        {loading ? <p className="py-8 text-center text-zinc-400">Checking reservations…</p> :
          <div className="space-y-3">{appointment.pets.map(p => {
            const current = chosen[p.appointmentPetId] ?? "";
            const bookedGroomerSelected = !boarding && p.groomerId === current && !!current;
            const options = boarding
              ? kennels.filter(k => (!p.requestedKennelSize || k.size === p.requestedKennelSize) && (reserved[p.appointmentPetId] ? k.id === reserved[p.appointmentPetId] : true))
                  .map(k => ({ id: k.id, name: `${kennelDisplayName(k)} · ${k.size === "small" ? "Small" : "Big"} #${k.number}` }))
              : (available[p.appointmentPetId] ?? []);
            const usable = options.filter(o => boarding || o.id === current || !Object.entries(chosen).some(([petId,id]) => petId !== p.appointmentPetId && id === o.id));
            const bookedGroomerBusy = !boarding && !!p.groomerId && busyGroomers.has(p.groomerId);
            const reservationMissing = !boarding && !!p.groomerId && !options.some(o => o.id === p.groomerId);
            return <div key={p.appointmentPetId} className="rounded-2xl border border-pink-100 bg-white p-4">
              <div className="mb-2 flex items-start justify-between gap-2"><div><strong>{p.name}</strong><p className="text-xs text-zinc-500">{p.breed} · {p.size_label}</p></div>
                {bookedGroomerSelected && !reservationMissing && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">Booked groomer</span>}</div>
              {bookedGroomerBusy && <p role="status" className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">Reminder: {p.groomerName ?? "The booked groomer"} is currently in a grooming session. Choose an available groomer or check in later.</p>}
              {boarding && reserved[p.appointmentPetId] && <p className="mb-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">Reserved kennel confirmed automatically. No reassignment needed.</p>}
              <select disabled={boarding && !!reserved[p.appointmentPetId]} value={usable.some(g => g.id === current) ? current : ""} onChange={e => setChosen(prev => ({ ...prev, [p.appointmentPetId]: e.target.value }))} className="w-full rounded-xl border border-pink-200 px-3 py-3 text-sm">
                <option value="">Select {boarding ? "active kennel" : "available groomer"}</option>
                {usable.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
              </select>
              {reservationMissing && !bookedGroomerBusy && <p className="mt-2 text-xs text-amber-700">The booked groomer is unavailable. Select an available replacement.</p>}
              {!boarding && !options.length && <p className="mt-2 text-xs text-amber-700">No groomer is available for this pet.</p>}
              {boarding && !p.requestedKennelSize && <p className="mt-2 text-xs text-red-600">This booking has no recorded kennel size.</p>}
            </div>;
          })}</div>}
        {hasDuplicateGroomer && <p role="alert" className="mt-3 text-xs text-red-700">A groomer cannot be assigned to two pets at the same time.</p>}
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}
        <div className="mt-5 flex gap-3"><button type="button" disabled={saving} onClick={onClose} className="flex-1 rounded-full border border-zinc-300 py-3">Cancel</button>
          <button type="button" disabled={saving || loading || !complete} onClick={() => void save()} className="flex-1 rounded-full bg-brand-pink py-3 font-semibold text-white disabled:opacity-40">{saving ? "Checking…" : "Check In & Start"}</button></div>
      </div>
    </div>
  </div>;
}
