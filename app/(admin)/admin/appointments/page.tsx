"use client";
// Admin Appointments page: stats, search + filter, table, detail modal,
// pagination. Fully interactive on mock data for now — Confirm/Cancel
// actions update local state only; wiring to Supabase happens once the
// appointments table exists.
import { useState, useMemo } from "react";
import AppointmentStats from "@/components/admin/appointments/AppointmentStats";
import AppointmentFilters, { type FilterState } from "@/components/admin/appointments/AppointmentFilters";
import AppointmentsTable from "@/components/admin/appointments/AppointmentsTable";
import AppointmentDetailModal from "@/components/admin/appointments/AppointmentDetailModal";
import Pagination from "@/components/admin/Pagination";
import { appointments as initialAppointments, type Appointment } from "@/lib/data/admin-appointments-mock";

const PAGE_SIZE = 5;

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState(initialAppointments);
  const [filters, setFilters] = useState<FilterState>({ search: "", status: "all", service: "all" });
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Appointment | null>(null);

  const filtered = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return appointments.filter((a) => {
      const matchesSearch =
        !search ||
        a.petName.toLowerCase().includes(search) ||
        a.ownerName.toLowerCase().includes(search) ||
        a.id.toLowerCase().includes(search);
      const matchesStatus = filters.status === "all" || a.status === filters.status;
      const matchesService = filters.service === "all" || a.serviceType === filters.service;
      return matchesSearch && matchesStatus && matchesService;
    });
  }, [appointments, filters]);

  const visible = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  function handleFilterChange(next: FilterState) {
    setFilters(next);
    setPage(0);
  }

  function updateStatus(id: string, status: Appointment["status"]) {
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    setSelected((prev) => (prev && prev.id === id ? { ...prev, status } : prev));
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-brand-pink">Appointments</h1>

      <div className="mt-6">
        <AppointmentStats />
      </div>

      <div className="mt-6">
        <AppointmentFilters filters={filters} onChange={handleFilterChange} />
      </div>

      <div className="mt-4">
        <AppointmentsTable rows={visible} onView={setSelected} />
      </div>

      <div className="mt-4">
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          totalItems={filtered.length}
          onPageChange={setPage}
        />
      </div>

      {selected && (
        <AppointmentDetailModal
          appointment={selected}
          onClose={() => setSelected(null)}
          onConfirm={(id) => updateStatus(id, "Confirmed")}
          onCancel={(id) => updateStatus(id, "Cancelled")}
        />
      )}
    </div>
  );
}
