"use client";
// Opened by the "View" button on Appointment History. Reuses
// fetchAppointmentDetail (already built for the admin session-details
// view) rather than a second query shape. Breaks the appointment down
// pet-by-pet — package, add-ons, groomer/kennel, and its own status —
// since a single appointment can cover more than one pet, and (per
// 045_appointment_pets_status.sql) each pet can now finish
// independently, e.g. one boarding pet completing before another.
import { useEffect, useState } from "react";
import { fetchAppointmentDetail, type AppointmentRow } from "@/lib/supabase/appointment-management";
import type { AppointmentStatus, AppointmentServiceType } from "@/lib/types/appointments";

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-sky-100 text-sky-700",
  checked_in: "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
};

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  checked_in: "Checked In",
  completed: "Completed",
  cancelled: "Cancelled",
};

const SERVICE_LABELS: Record<AppointmentServiceType, string> = {
  dog_grooming: "Dog Grooming",
  cat_grooming: "Cat Grooming",
  boarding: "Boarding",
  ala_carte: "Ala Carte",
};

export default function CustomerAppointmentDetailModal({
  appointmentId,
  onClose,
}: {
  appointmentId: string;
  onClose: () => void;
}) {
  const [row, setRow] = useState<AppointmentRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { row, error } = await fetchAppointmentDetail(appointmentId);
      if (cancelled) return;
      setRow(row);
      setError(error);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [appointmentId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white rounded-3xl overflow-hidden max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-pink-100 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-bold text-zinc-800">Appointment Details</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 text-xl leading-none" aria-label="Close">
            &times;
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto space-y-5">
          {loading && <p className="text-center text-sm text-zinc-400 py-6">Loading…</p>}
          {!loading && error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

          {!loading && !error && row && (
            <>
              <section className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-zinc-800">{SERVICE_LABELS[row.service_type]}</p>
                  <p className="text-sm text-zinc-500">
                    {row.drop_off_at
                      ? new Date(row.drop_off_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
                      : `${new Date(row.scheduled_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}${row.scheduled_time ? ` · ${row.scheduled_time}` : ""}`}
                  </p>
                  {row.pick_up_at && (
                    <p className="text-xs text-zinc-400">
                      Pick-up: {new Date(row.pick_up_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  )}
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[row.status]}`}>
                  {STATUS_LABELS[row.status]}
                </span>
              </section>

              {/* Each pet gets its own block — this is the "breakdown" so a
                  multi-pet appointment doesn't read as one flat line. */}
              <section className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  {row.pets.length} {row.pets.length === 1 ? "Pet" : "Pets"}
                </h4>
                {row.pets.map((pet) => (
                  <div key={pet.appointmentPetId} className="rounded-2xl border border-pink-100 bg-brand-tint/40 p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm text-zinc-800">{pet.name}</p>
                        <p className="text-xs text-zinc-500">{pet.breed} &middot; {pet.size_label}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[pet.status]}`}>
                        {STATUS_LABELS[pet.status]}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-zinc-600 space-y-0.5">
                      {pet.packageName && <p>Service: {pet.packageName}{pet.packagePricingLabel ? ` (${pet.packagePricingLabel})` : ""}</p>}
                      {pet.kennelLabel && <p>Kennel: {pet.kennelLabel}</p>}
                      {pet.groomerName && <p>Groomer: {pet.groomerName}</p>}
                      {pet.addonNames.length > 0 && <p>Add-ons: {pet.addonNames.join(", ")}</p>}
                    </div>
                    <p className="mt-2 text-sm font-semibold text-brand-pink">₱{pet.lineAmount.toFixed(2)}</p>
                  </div>
                ))}
              </section>

              {row.special_requests && (
                <section>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Special Requests</h4>
                  <p className="mt-1 text-sm text-zinc-700">{row.special_requests}</p>
                </section>
              )}

              <section className="pt-3 border-t border-pink-100 flex justify-between items-center">
                <span className="text-sm font-semibold text-zinc-500">Total Amount</span>
                <span className="text-lg font-bold text-brand-pink">₱{row.total_amount.toFixed(2)}</span>
              </section>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-pink-100 shrink-0">
          <button
            onClick={onClose}
            className="w-full bg-brand-pink hover:bg-brand-pink-dark text-white font-semibold py-2.5 rounded-full transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
