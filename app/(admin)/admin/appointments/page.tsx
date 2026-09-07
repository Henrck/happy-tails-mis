"use client";
// Admin Appointments page — real version, replacing admin-appointments-mock.
// Rows now represent one whole appointment (possibly multi-pet), and the
// whole page is wired to Supabase Realtime: any insert/update/delete on
// appointments or appointment_pets triggers a refetch automatically, so
// a walk-in booked in another tab shows up here with no refresh needed.
//
// "Today" is the default scope per the agreed priority — full history
// stays one click away via the Today/All History toggle in the filters.
import { useState, useEffect, useCallback, useRef } from "react";
import { fetchAppointments, updateAppointmentStatus, subscribeToAppointments, type AppointmentRow } from "@/lib/supabase/appointment-management";
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

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({ search: "", status: "all", service: "all", scope: "today" });
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<AppointmentRow | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [liveUpdate, setLiveUpdate] = useState(false);
  const liveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadAppointments = useCallback(async () => {
    const { rows, error } = await fetchAppointments();
    if (error) { setLoadError(error); return; }
    setLoadError(null);
    setAppointments(rows);
  }, []);

  useEffect(() => {
    setLoading(true);
    loadAppointments().finally(() => setLoading(false));
  }, [loadAppointments]);

  // Real-time: any change to appointments/appointment_pets refetches the
  // full list and bumps refreshKey (which also tells AppointmentStats to
  // refetch). The unsubscribe function IS called on unmount — leaving
  // this out would mean the subscription keeps running in the
  // background after navigating away, which leaks a connection every
  // time this page is visited.
  useEffect(() => {
    const unsubscribe = subscribeToAppointments(() => {
      loadAppointments();
      setRefreshKey((k) => k + 1);
      // Brief "Live update" indicator so staff can see the page actually
      // reacted to something, not just silently refresh.
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
    const matchesStatus = filters.status === "all" || a.status === filters.status;
    const matchesService = filters.service === "all" || a.service_type === filters.service;
    const matchesScope = filters.scope === "all" || isToday(a.scheduled_date);
    return matchesSearch && matchesStatus && matchesService && matchesScope;
  });

  const visible = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  function handleFilterChange(next: FilterState) {
    setFilters(next);
    setPage(0);
  }

  async function handleUpdateStatus(id: string, status: AppointmentStatus): Promise<string | null> {
    const { error } = await updateAppointmentStatus(id, status);
    if (error) return error.message;
    // Only update local state after a CONFIRMED success — the realtime
    // subscription will also pick up this same change and refresh the
    // table, but updating here too keeps the open modal in sync
    // immediately rather than waiting on the subscription round trip.
    setSelected((prev) => (prev && prev.id === id ? { ...prev, status } : prev));
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

      {loadError && <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{loadError}</p>}

      <div className="mt-4">
        {loading ? (
          <p className="text-center text-zinc-400 py-10">Loading appointments…</p>
        ) : (
          <AppointmentsTable rows={visible} onView={setSelected} />
        )}
      </div>

      <div className="mt-4">
        <Pagination page={page} pageSize={PAGE_SIZE} totalItems={filtered.length} onPageChange={setPage} />
      </div>

      {selected && (
        <AppointmentDetailModal appointment={selected} onClose={() => setSelected(null)} onUpdateStatus={handleUpdateStatus} />
      )}
    </div>
  );
}
