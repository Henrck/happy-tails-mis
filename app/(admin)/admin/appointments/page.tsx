"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { fetchAppointments, updateAppointmentStatus, subscribeToAppointments, type AppointmentRow } from "@/lib/supabase/appointment-management";
import type { AppointmentStatus } from "@/lib/types/appointments";
import AppointmentStats from "@/components/admin/appointments/AppointmentStats";
import AppointmentFilters, { type FilterState } from "@/components/admin/appointments/AppointmentFilters";
import AppointmentsTable from "@/components/admin/appointments/AppointmentsTable";
import AppointmentDetailModal from "@/components/admin/appointments/AppointmentDetailModal";
import Pagination from "@/components/admin/Pagination";

const PAGE_SIZE = 10;

// Sort the ENTIRE filtered list before pagination. Every status is ranked so
// cancelled/completed entries cannot displace work that still needs attention.
const STATUS_PRIORITY: Record<AppointmentStatus, number> = {
  pending: 0,
  confirmed: 1,
  checked_in: 2,
  cancelled: 3,
  completed: 4,
};

function compareAppointments(a: AppointmentRow, b: AppointmentRow): number {
  const priority = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
  if (priority !== 0) return priority;

  // Within the same status, show the newest appointment first.
  // ISO timestamps can be sorted directly without timezone conversions.
  const createdDifference = b.created_at.localeCompare(a.created_at);
  if (createdDifference !== 0) return createdDifference;
  const dateDifference = b.scheduled_date.localeCompare(a.scheduled_date);
  if (dateDifference !== 0) return dateDifference;
  const timeDifference = (b.scheduled_time ?? "").localeCompare(a.scheduled_time ?? "");
  if (timeDifference !== 0) return timeDifference;
  return a.id.localeCompare(b.id);
}

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({ search: "", status: "all", service: "all", scope: "today" });
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<AppointmentRow | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [live, setLive] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const r = await fetchAppointments();
    if (r.error) { setLoadError(r.error); return; }
    setLoadError(null);
    setAppointments(r.rows);
    setSelected((x) => x ? r.rows.find((y) => y.id === x.id) ?? x : null);
  }, []);

  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, [load]);
  useEffect(() => {
    const off = subscribeToAppointments(() => {
      void load();
      setRefreshKey((x) => x + 1);
      setLive(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setLive(false), 2000);
    });
    return () => { off(); if (timer.current) clearTimeout(timer.current); };
  }, [load]);

  const filtered = appointments.filter((a) => {
    const q = filters.search.trim().toLowerCase();
    return (!q || a.owner_name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q) || a.pets.some((p) => p.name.toLowerCase().includes(q)))
      && (filters.status === "all" || a.status === filters.status)
      && (filters.service === "all" || a.service_type === filters.service)
      && (filters.scope === "all" || a.scheduled_date === new Date().toISOString().split("T")[0]);
  }).sort(compareAppointments);

  const maxPage = Math.max(0, Math.ceil(filtered.length / PAGE_SIZE) - 1);
  const safePage = Math.min(page, maxPage);
  const visible = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  async function status(id: string, nextStatus: AppointmentStatus) {
    const r = await updateAppointmentStatus(id, nextStatus);
    if (r.error) return r.error.message;
    setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status: nextStatus } : a));
    setSelected((x) => x && x.id === id ? { ...x, status: nextStatus } : x);
    setPage(0);
    void load();
    return null;
  }

  return <div>
    <div className="flex items-center gap-3">
      <h1 className="text-3xl font-bold text-brand-pink">Appointments</h1>
      {live && <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">● Live update</span>}
    </div>
    <div className="mt-6"><AppointmentStats refreshKey={refreshKey} /></div>
    <div className="mt-6"><AppointmentFilters filters={filters} onChange={(x) => { setFilters(x); setPage(0); }} /></div>
    {loadError && <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{loadError}</p>}
    <div className="mt-4">{loading ? <p className="text-center text-zinc-400 py-10">Loading appointments…</p> : <AppointmentsTable rows={visible} onView={setSelected} />}</div>
    <div className="mt-4"><Pagination page={safePage} pageSize={PAGE_SIZE} totalItems={filtered.length} onPageChange={setPage} /></div>
    {selected && <AppointmentDetailModal appointment={selected} onClose={() => setSelected(null)} onUpdateStatus={status} onRefresh={load} />}
  </div>;
}
