"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchAppointmentsByCustomer, subscribeToAppointments, type AppointmentRow } from "@/lib/supabase/appointment-management";
import type { AppointmentStatus, AppointmentServiceType } from "@/lib/types/appointments";
import CustomerAppointmentDetailModal from "@/components/dashboard/CustomerAppointmentDetailModal";

const PAGE_SIZE = 10;

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-sky-100 text-sky-700",
  checked_in: "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
};

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: "Pending", confirmed: "Confirmed", checked_in: "Checked In",
  completed: "Completed", cancelled: "Cancelled",
};

const SERVICE_LABELS: Record<AppointmentServiceType, string> = {
  dog_grooming: "Dog Grooming", cat_grooming: "Cat Grooming",
  boarding: "Boarding", ala_carte: "Ala Carte",
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
  const [page, setPage] = useState(1);
  const [viewingId, setViewingId] = useState<string | null>(null);

  const loadAppointments = useCallback(async (id: string) => {
    const { rows } = await fetchAppointmentsByCustomer(id);
    const sorted = [...rows].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    setAppointments(sorted);
  }, []);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      await loadAppointments(user.id);
      setLoading(false);
    }
    void init();
  }, [loadAppointments]);

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = subscribeToAppointments(() => { void loadAppointments(userId); });
    return unsubscribe;
  }, [userId, loadAppointments]);

  const filtered = useMemo(() => {
    if (filter === "all") return appointments;
    if (filter === "upcoming") return appointments.filter((a) => a.status === "pending" || a.status === "confirmed" || a.status === "checked_in");
    if (filter === "completed") return appointments.filter((a) => a.status === "completed");
    return appointments.filter((a) => a.status === "cancelled");
  }, [appointments, filter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "upcoming", label: "Upcoming" },
    { key: "completed", label: "Completed" },
    { key: "cancelled", label: "Cancelled" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-800">Appointments</h1>
      <div className="mt-4 flex gap-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => { setFilter(tab.key); setPage(1); }}
            aria-pressed={filter === tab.key}
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
            {filter === "all" ? "You don't have any appointments yet." : `No ${filter} appointments.`}
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-col gap-3">
            {visible.map((appt) => (
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
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-brand-pink">₱{appt.total_amount.toFixed(2)}</span>
                    <button
                      type="button"
                      onClick={() => setViewingId(appt.id)}
                      className="rounded-full border-2 border-brand-pink px-4 py-1 text-xs font-semibold text-brand-pink transition-colors hover:bg-brand-pink hover:text-white"
                    >
                      View
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {pageCount > 1 && (
            <nav aria-label="Appointments pages" className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-pink-100 bg-white px-4 py-3">
              <p className="text-xs text-zinc-500">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} appointments
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}
                  className="rounded-full border border-pink-200 px-3 py-1.5 text-xs font-semibold text-brand-pink hover:bg-pink-50 disabled:cursor-not-allowed disabled:opacity-40">
                  Previous
                </button>
                {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
                  <button key={number} type="button" onClick={() => setPage(number)} aria-label={`Page ${number}`} aria-current={currentPage === number ? "page" : undefined}
                    className={`min-w-8 rounded-full px-2.5 py-1.5 text-xs font-semibold ${currentPage === number ? "bg-brand-pink text-white" : "border border-pink-200 text-brand-pink hover:bg-pink-50"}`}>
                    {number}
                  </button>
                ))}
                <button type="button" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}
                  className="rounded-full border border-pink-200 px-3 py-1.5 text-xs font-semibold text-brand-pink hover:bg-pink-50 disabled:cursor-not-allowed disabled:opacity-40">
                  Next
                </button>
              </div>
            </nav>
          )}
        </>
      )}

      {viewingId && <CustomerAppointmentDetailModal appointmentId={viewingId} onClose={() => setViewingId(null)} onCancelled={() => { if (userId) void loadAppointments(userId); }} />}
    </div>
  );
}
