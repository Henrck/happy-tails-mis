"use client";
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[calc(100vw-1rem)] sm:max-w-lg md:max-w-5xl md:h-[min(760px,90vh)] bg-white rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-pink-100 flex items-center justify-between shrink-0 bg-white">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-brand-pink">Service Session</p>
            <h3 className="text-base sm:text-lg font-bold text-zinc-800 truncate">Service Session Details</h3>
          </div>
          <button
            onClick={onClose}
            className="ml-3 shrink-0 w-9 h-9 rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700 flex items-center justify-center text-xl leading-none transition-colors"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="px-4 sm:px-6 py-4 sm:py-6 overflow-y-auto overscroll-contain md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-1">
          {loading && <p className="text-center text-sm text-zinc-400 py-10 md:col-span-2">Loading…</p>}
          {!loading && error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg md:col-span-2">{error}</p>}

          {!loading && !error && row && pet && (
            <>
              <div className="space-y-5 md:space-y-6">
                <section>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Pet Information</h4>
                  <div className="mt-2 rounded-2xl bg-pink-50/70 border border-pink-100 p-4">
                    <p className="font-semibold text-zinc-800">{pet.name}</p>
                    <p className="text-sm text-zinc-500 mt-1">{pet.breed} &middot; {pet.size_label}</p>
                  </div>
                </section>

                <section>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Owner Information</h4>
                  <div className="mt-2 rounded-2xl bg-zinc-50 border border-zinc-100 p-4 space-y-1">
                    <p className="text-sm font-medium text-zinc-700">{row.owner_name}</p>
                    <p className="text-sm text-zinc-500">{row.owner_contact}</p>
                    {row.owner_address && <p className="text-sm text-zinc-500 break-words">{row.owner_address}</p>}
                  </div>
                </section>

                <section>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Service Information</h4>
                  <div className="mt-2 rounded-2xl bg-zinc-50 border border-zinc-100 p-4">
                    <p className="text-sm font-medium text-zinc-700">{pet.packageName ?? "—"}</p>
                    {pet.packagePricingLabel && <p className="text-sm text-zinc-500 mt-1">{pet.packagePricingLabel}</p>}
                    {pet.addonNames.length > 0 && (
                      <p className="text-sm text-zinc-500 mt-2 break-words">Add-ons: {pet.addonNames.join(", ")}</p>
                    )}
                  </div>
                </section>

                <section>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    {pet.kennelLabel ? "Kennel" : "Groomer"}
                  </h4>
                  <div className="mt-2 rounded-2xl bg-zinc-50 border border-zinc-100 p-4">
                    <p className="text-sm text-zinc-700">{pet.kennelLabel ?? pet.groomerName ?? "Unassigned"}</p>
                  </div>
                </section>
              </div>

              <div className="mt-5 md:mt-0 space-y-5 md:space-y-6">
                <section>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Service Schedule</h4>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-zinc-50 border border-zinc-100 p-4 min-w-0">
                      <h5 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                        {row.drop_off_at ? "Drop-off" : "Scheduled"}
                      </h5>
                      <p className="mt-1 text-sm text-zinc-700 break-words">
                        {row.drop_off_at
                          ? new Date(row.drop_off_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
                          : `${row.scheduled_date}${row.scheduled_time ? ` · ${row.scheduled_time}` : ""}`}
                      </p>
                    </div>
                    {row.pick_up_at && (
                      <div className="rounded-2xl bg-zinc-50 border border-zinc-100 p-4 min-w-0">
                        <h5 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Pick-up</h5>
                        <p className="mt-1 text-sm text-zinc-700 break-words">
                          {new Date(row.pick_up_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                      </div>
                    )}
                  </div>
                </section>

                {row.special_requests && (
                  <section>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Special Requests & Instructions</h4>
                    <div className="mt-2 rounded-2xl bg-brand-tint border border-pink-100 p-4">
                      <p className="text-sm text-zinc-700 whitespace-pre-wrap break-words">{row.special_requests}</p>
                    </div>
                  </section>
                )}

                <section className="rounded-2xl bg-pink-50 border border-pink-100 p-4 flex justify-between items-center gap-4">
                  <span className="text-sm font-semibold text-zinc-500">Appointment Total</span>
                  <span className="text-lg sm:text-xl font-bold text-brand-pink whitespace-nowrap">₱{row.total_amount.toFixed(2)}</span>
                </section>
              </div>
            </>
          )}
        </div>

        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-pink-100 shrink-0 bg-white">
          <button
            onClick={onClose}
            className="w-full bg-brand-pink hover:bg-brand-pink-dark text-white font-semibold py-2.5 sm:py-3 rounded-full transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
