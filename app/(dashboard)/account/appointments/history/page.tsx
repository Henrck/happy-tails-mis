"use client";
// Appointment History — was a static placeholder. Reuses the exact same
// rich-join query the admin's Appointment Management already uses
// (fetchAppointmentsRaw in appointment-management.ts), just scoped to
// this one customer via fetchAppointmentsByCustomer, so pet/package/
// kennel/add-on details are already there instead of needing a second
// query shape built from scratch. Same client-fetch + Realtime pattern
// as My Pets and Notifications for consistency.
import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchAppointmentsByCustomer, subscribeToAppointments, type AppointmentRow } from "@/lib/supabase/appointment-management";
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

type FilterTab = "all" | "upcoming" | "completed" | "cancelled";

function displayDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AppointmentHistoryPage() {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");

  const loadAppointments = useCallback(async (id: string) => {
    const { rows } = await fetchAppointmentsByCustomer(id);
    setAppointments(rows);
  }, []);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Layout already guarantees a logged-in user with a real
      // customers row exists before this page can be reached — this is
      // just defensive, not the real auth gate.
      if (!user) { setLoading(false); return; }

      setUserId(user.id);
      await loadAppointments(user.id);
      setLoading(false);
    }
    init();
  }, [loadAppointments]);

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = subscribeToAppointments(() => loadAppointments(userId));
    return unsubscribe;
  }, [userId, loadAppointments]);

  const filtered = useMemo(() => {
    if (filter === "all") return appointments;
    if (filter === "upcoming") return appointments.filter((a) => a.status === "pending" || a.status === "confirmed" || a.status === "checked_in");
    if (filter === "completed") return appointments.filter((a) => a.status === "completed");
    return appointments.filter((a) => a.status === "cancelled");
  }, [appointments, filter]);

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "upcoming", label: "Upcoming" },
    { key: "completed", label: "Completed" },
    { key: "cancelled", label: "Cancelled" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-800">Appointment History</h1>

      <div className="mt-4 flex gap-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              filter === tab.key ? "bg-brand-pink text-white" : "border border-brand-pink text-brand-pink hover:bg-brand-tint"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-zinc-400">Loading your appointments…</p>
      ) : filtered.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-pink-100 bg-brand-tint px-6 py-10 text-center">
          <p className="text-sm text-zinc-500">
            {filter === "all"
              ? "You don't have any appointments yet."
              : `No ${filter} appointments.`}
          </p>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {filtered.map((appt) => (
            <div key={appt.id} className="rounded-2xl border border-pink-100 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-zinc-800">{SERVICE_LABELS[appt.service_type]}</p>
                  <p className="text-sm text-zinc-500">
                    {displayDate(appt.scheduled_date)}
                    {appt.scheduled_time ? ` · ${appt.scheduled_time}` : ""}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[appt.status]}`}>
                  {STATUS_LABELS[appt.status]}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {appt.pets.map((pet) => (
                  <span key={pet.id} className="rounded-full bg-brand-tint px-3 py-1 text-xs font-medium text-zinc-600">
                    {pet.name}
                    {pet.packageName ? ` · ${pet.packageName}` : ""}
                    {pet.kennelLabel ? ` · ${pet.kennelLabel}` : ""}
                  </span>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-pink-50 pt-3">
                <span className="text-xs text-zinc-400">
                  {appt.pets.length} {appt.pets.length === 1 ? "pet" : "pets"}
                </span>
                <span className="font-bold text-brand-pink">₱{appt.total_amount.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
