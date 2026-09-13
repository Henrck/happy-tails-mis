"use client";
// Admin Appointments page — real version.
// Rows represent one whole appointment (possibly multi-pet).
// The page is wired to Supabase Realtime so appointment changes are
// reflected without manually refreshing the page.
import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchAppointments,
  updateAppointmentStatus,
  subscribeToAppointments,
  type AppointmentRow,
} from "@/lib/supabase/appointment-management";
import type { AppointmentStatus } from "@/lib/types/appointments";
import AppointmentStats from "@/components/admin/appointments/AppointmentStats";
import AppointmentFilters, { type FilterState } from "@/components/admin/appointments/AppointmentFilters";
import AppointmentsTable from "@/components/admin/appointments/AppointmentsTable";
import AppointmentDetailModal from "@/components/admin/appointments/AppointmentDetailModal";
import Pagination from "@/components/admin/Pagination";

const PAGE_SIZE = 5;

function isToday(dateStr: string) {
  return dateStr === new Date().toISOString().split("T")[0];
}

// Sort priority:
// 1. Pending appointments always come first.
// 2. Within the same status priority, newest appointments are first
//    using created_at.
// This means staff immediately see bookings that still need attention,
// while the newest activity is also surfaced first.
function sortAppointments(rows: AppointmentRow[]) {
  return [...rows].sort((a, b) => {
    const aPending = a.status === "pending" ? 0 : 1;
    const bPending = b.status === "pending" ? 0 : 1;

    if (aPending !== bPending) {
      return aPending - bPending;
    }

    const aCreated = new Date(a.created_at).getTime();
    const bCreated = new Date(b.created_at).getTime();

    return bCreated - aCreated;
  });
}

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    status: "all",
    service: "all",
    scope: "today",
  });
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<AppointmentRow | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [liveUpdate, setLiveUpdate] = useState(false);
  const liveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadAppointments = useCallback(async () => {
    const { rows, error } = await fetchAppointments();
    if (error) {
      setLoadError(error);
      return;
    }

    setLoadError(null);
    setAppointments(rows);
  }, []);

  useEffect(() => {
    setLoading(true);
    loadAppointments().finally(() => setLoading(false));
  }, [loadAppointments]);

  useEffect(() => {
    const unsubscribe = subscribeToAppointments(() => {
      loadAppointments();
      setRefreshKey((k) => k + 1);
      setLiveUpdate(true);

      if (liveTimeout.current) clearTimeout(liveTimeout.current);
      liveTimeout.current = setTimeout(() => setLiveUpdate(false), 2000);
    });

    return () => {
      unsubscribe();
      if (liveTimeout.current) clearTimeout(liveTimeout.current);
    };
  }, [loadAppointments]);

  const filtered = appointments.filter((a) => {
    const search = filters.search.trim().toLowerCase();

    const matchesSearch =
      !search ||
      a.owner_name.toLowerCase().includes(search) ||
      a.id.toLowerCase().includes(search) ||
      a.pets.some((p) => p.name.toLowerCase().includes(search));

    const matchesStatus =
      filters.status === "all" || a.status === filters.status;

    const matchesService =
      filters.service === "all" || a.service_type === filters.service;

    const matchesScope =
      filters.scope === "all" || isToday(a.scheduled_date);

    return matchesSearch && matchesStatus && matchesService && matchesScope;
  });

  // Apply the priority order BEFORE pagination so pending appointments
  // stay at the top even when there are more than one page of results.
  const sortedFiltered = sortAppointments(filtered);

  const visible = sortedFiltered.slice(
    page * PAGE_SIZE,
    page * PAGE_SIZE + PAGE_SIZE
  );

  function handleFilterChange(next: FilterState) {
    setFilters(next);
    setPage(0);
  }

  async function handleUpdateStatus(
    id: string,
    status: AppointmentStatus
  ): Promise<string | null> {
    const { error } = await updateAppointmentStatus(id, status);

    if (error) return error.message;

    setSelected((prev) =>
      prev && prev.id === id ? { ...prev, status } : prev
    );

    return null;
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold text-brand-pink">Appointments</h1>

        {liveUpdate && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live update
          </span>
        )}
      </div>

      <div className="mt-6">
        <AppointmentStats refreshKey={refreshKey} />
      </div>

      <div className="mt-6">
        <AppointmentFilters filters={filters} onChange={handleFilterChange} />
      </div>

      {loadError && (
        <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {loadError}
        </p>
      )}

      <div className="mt-4">
        {loading ? (
          <p className="text-center text-zinc-400 py-10">
            Loading appointments…
          </p>
        ) : (
          <AppointmentsTable rows={visible} onView={setSelected} />
        )}
      </div>

      <div className="mt-4">
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          totalItems={sortedFiltered.length}
          onPageChange={setPage}
        />
      </div>

      {selected && (
        <AppointmentDetailModal
          appointment={selected}
          onClose={() => setSelected(null)}
          onUpdateStatus={handleUpdateStatus}
        />
      )}
    </div>
  );
}
