"use client";
// Used by the "View" button added to ongoing sessions on both the
// Grooming and Boarding management pages. The compact session cards on
// those pages only show pet name/breed/owner — this pulls the full
// appointment record (contact info, package, add-ons, price, kennel or
// groomer assignment, special requests) via fetchAppointmentDetail.
import { useEffect, useState } from "react";
import { fetchAppointmentDetail, type AppointmentRow } from "@/lib/supabase/appointment-management";

export default function SessionDetailsModal({
  appointmentId,
  appointmentPetId,
  onClose,
}: {
  appointmentId: string;
  appointmentPetId: string;
  onClose: () => void;
}) {
  const [row, setRow] = useState<AppointmentRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { row, error } = await fetchAppointmentDetail(appointmentId);
      if (cancelled) return;
      setRow(row);
      setError(error);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [appointmentId]);

  const pet = row?.pets.find((p) => p.appointmentPetId === appointmentPetId) ?? row?.pets[0] ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white rounded-3xl overflow-hidden max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-pink-100 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-bold text-zinc-800">Session Details</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 text-xl leading-none" aria-label="Close">
            &times;
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto space-y-4">
          {loading && <p className="text-center text-sm text-zinc-400 py-6">Loading…</p>}
          {!loading && error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

          {!loading && !error && row && pet && (
            <>
              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Pet</h4>
                <p className="mt-1 font-semibold text-zinc-800">{pet.name}</p>
                <p className="text-sm text-zinc-500">
                  {pet.breed} &middot; {pet.size_label}
                </p>
              </section>

              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Owner</h4>
                <p className="mt-1 text-sm text-zinc-700">{row.owner_name}</p>
                <p className="text-sm text-zinc-500">{row.owner_contact}</p>
                {row.owner_address && <p className="text-sm text-zinc-500">{row.owner_address}</p>}
              </section>

              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Service</h4>
                <p className="mt-1 text-sm text-zinc-700">{pet.packageName ?? "—"}</p>
                {pet.packagePricingLabel && <p className="text-sm text-zinc-500">{pet.packagePricingLabel}</p>}
                {pet.addonNames.length > 0 && (
                  <p className="text-sm text-zinc-500 mt-1">Add-ons: {pet.addonNames.join(", ")}</p>
                )}
              </section>

              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  {pet.kennelLabel ? "Kennel" : "Groomer"}
                </h4>
                <p className="mt-1 text-sm text-zinc-700">{pet.kennelLabel ?? pet.groomerName ?? "Unassigned"}</p>
              </section>

              <section className="grid grid-cols-2 gap-3">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    {row.drop_off_at ? "Drop-off" : "Scheduled"}
                  </h4>
                  <p className="mt-1 text-sm text-zinc-700">
                    {row.drop_off_at
                      ? new Date(row.drop_off_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
                      : `${row.scheduled_date}${row.scheduled_time ? ` · ${row.scheduled_time}` : ""}`}
                  </p>
                </div>
                {row.pick_up_at && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Pick-up</h4>
                    <p className="mt-1 text-sm text-zinc-700">
                      {new Date(row.pick_up_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>
                )}
              </section>

              {row.special_requests && (
                <section>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Special Requests</h4>
                  <p className="mt-1 text-sm text-zinc-700">{row.special_requests}</p>
                </section>
              )}

              <section className="pt-2 border-t border-pink-100 flex justify-between items-center">
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
