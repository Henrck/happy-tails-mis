"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DashboardHeader from "@/components/admin/DashboardHeader";
import { fetchAppointments, type AppointmentRow } from "@/lib/supabase/appointment-management";
import { fetchProducts, fetchAllBatches } from "@/lib/supabase/products";
import { EXPIRY_WARNING_DAYS, expiryDaysLeft, philippinesToday } from "@/lib/utils/inventory-expiration";
import type { AppointmentStatus } from "@/lib/types/appointments";
import type { Product, ProductBatch } from "@/lib/types/products";

type ServiceType = "grooming" | "boarding";
type DashboardEvent = {
  id: string;
  type: ServiceType;
  time: string;
  pet: string;
  owner: string;
  service: string;
  status: AppointmentStatus;
};

const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const timeLabel = (value: string | null) => {
  if (!value) return "Time not set";
  const match = value.match(/(?:T|\s)(\d{1,2}):(\d{2})/) || value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "Time not set";
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return `${String(hour % 12 || 12).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
};

const serviceOf = (appointment: AppointmentRow): ServiceType =>
  appointment.service_type === "boarding" ? "boarding" : "grooming";

const serviceStyles: Record<ServiceType, { pill: string; label: string }> = {
  grooming: { pill: "bg-brand-tint text-brand-pink", label: "Grooming" },
  boarding: { pill: "bg-sky-50 text-sky-700", label: "Boarding" },
};

const statusStyles: Record<AppointmentStatus, string> = {
  pending: "bg-amber-50 text-amber-700",
  confirmed: "bg-blue-50 text-blue-700",
  checked_in: "bg-violet-50 text-violet-700",
  completed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-zinc-100 text-zinc-500",
};

const statusLabel = (status: AppointmentStatus) =>
  status === "checked_in" ? "Checked In" : status.charAt(0).toUpperCase() + status.slice(1);

const formatDate = (value: string) => {
  const date = new Date(`${value}T12:00:00+08:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric" });
};

export default function AdminDashboardPage() {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState(() => {
    const [year, monthNumber] = philippinesToday().split("-").map(Number);
    return new Date(year, monthNumber - 1, 1);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [statusModal, setStatusModal] = useState<AppointmentStatus | null>(null);
  const [inventoryToday, setInventoryToday] = useState(() => philippinesToday());

  const load = useCallback(async () => {
    const [appointmentResult, productResult, batchResult] = await Promise.all([
      fetchAppointments(),
      fetchProducts({ activeOnly: true }),
      fetchAllBatches(),
    ]);

    setAppointments(appointmentResult.rows);
    setProducts(productResult.products);
    setBatches(batchResult.batches);
    setInventoryToday(philippinesToday());
    setError(appointmentResult.error || productResult.error || batchResult.error || null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const refresh = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(refresh);
  }, [load]);

  const activeAppointments = useMemo(
    () => appointments.filter(appointment => appointment.status !== "cancelled"),
    [appointments],
  );

  const todayAppointments = useMemo(
    () => activeAppointments.filter(appointment => appointment.scheduled_date === inventoryToday),
    [activeAppointments, inventoryToday],
  );

  const groomingToday = todayAppointments.filter(appointment => serviceOf(appointment) === "grooming").length;
  const boardingToday = todayAppointments.filter(appointment => serviceOf(appointment) === "boarding").length;

  const statusCounts = useMemo(() => ({
    pending: appointments.filter(appointment => appointment.status === "pending").length,
    confirmed: appointments.filter(appointment => appointment.status === "confirmed").length,
    checked_in: appointments.filter(appointment => appointment.status === "checked_in").length,
    completed: appointments.filter(appointment => appointment.status === "completed").length,
  }), [appointments]);

  const lowStock = useMemo(() => {
    const stockByProduct = new Map<string, number>();
    for (const batch of batches) {
      stockByProduct.set(batch.product_id, (stockByProduct.get(batch.product_id) || 0) + Number(batch.quantity || 0));
    }
    return products
      .map(product => ({
        id: product.id,
        name: product.name,
        remaining: stockByProduct.get(product.id) || 0,
        minimum: Number(product.min_stock || 0),
      }))
      .filter(product => product.remaining <= product.minimum)
      .sort((a, b) => a.remaining - b.remaining)
      .slice(0, 5);
  }, [products, batches]);

  // Keep the dashboard aligned with Inventory's existing expiration warning policy.
  // Only active, sellable batches with remaining stock are included.
  const nearExpiry = useMemo(() => {
    const productNames = new Map(products.map(product => [product.id, product.name]));
    return batches.flatMap(batch => {
      const productName = productNames.get(batch.product_id);
      if (!productName || batch.is_adjustment || Number(batch.quantity) <= 0) return [];
      const daysLeft = expiryDaysLeft(batch.expiration_date, inventoryToday);
      if (daysLeft === null || daysLeft < 0 || daysLeft > EXPIRY_WARNING_DAYS) return [];
      return [{
        id: batch.id,
        productName,
        batchNumber: batch.batch_number,
        expirationDate: batch.expiration_date as string,
        daysLeft,
        quantity: Number(batch.quantity),
      }];
    })
      .sort((a, b) => a.daysLeft - b.daysLeft || a.productName.localeCompare(b.productName))
      .slice(0, 5);
  }, [products, batches, inventoryToday]);

  const events = useMemo(() => {
    const byDate: Record<string, DashboardEvent[]> = {};
    for (const appointment of activeAppointments) {
      const type = serviceOf(appointment);
      const firstPet = appointment.pets[0];
      const event: DashboardEvent = {
        id: appointment.id,
        type,
        time: timeLabel(appointment.scheduled_time || appointment.drop_off_at || appointment.pick_up_at),
        pet: appointment.pets.map(pet => pet.name).filter(Boolean).join(", ") || appointment.owner_name,
        owner: appointment.owner_name,
        service: type === "boarding"
          ? (firstPet?.packagePricingLabel || "Boarding")
          : (firstPet?.packageName || "Grooming"),
        status: appointment.status,
      };
      (byDate[appointment.scheduled_date] ||= []).push(event);
    }
    Object.values(byDate).forEach(dayEvents => dayEvents.sort((a, b) => a.time.localeCompare(b.time)));
    return byDate;
  }, [activeAppointments]);

  const calendarCells = useMemo(() => {
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(month.getFullYear(), month.getMonth(), index - firstDay + 1);
      return {
        key: dateKey(date),
        day: date.getDate(),
        muted: date.getMonth() !== month.getMonth(),
      };
    });
  }, [month]);

  const selectedEvents = selectedDay ? events[selectedDay] || [] : [];
  const selectedStatusAppointments = useMemo(() => {
    if (!statusModal) return [];
    return appointments
      .filter(appointment => appointment.status === statusModal)
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date)
        || (a.scheduled_time || "").localeCompare(b.scheduled_time || ""));
  }, [appointments, statusModal]);

  const dateBadge = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  if (loading) {
    return <div className="py-16 text-center text-sm text-zinc-400">Loading dashboard…</div>;
  }

  const statusCards: { status: Exclude<AppointmentStatus, "cancelled">; label: string; accent: string; marker: string }[] = [
    { status: "pending", label: "Pending", accent: "text-amber-700", marker: "bg-amber-400" },
    { status: "confirmed", label: "Confirmed", accent: "text-blue-700", marker: "bg-blue-500" },
    { status: "checked_in", label: "Checked In", accent: "text-violet-700", marker: "bg-violet-500" },
    { status: "completed", label: "Completed", accent: "text-emerald-700", marker: "bg-emerald-500" },
  ];

  return (
    <div className="flex flex-col gap-5 pb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <DashboardHeader />
        <div className="inline-flex min-h-10 items-center gap-2 self-start rounded-full border border-pink-100 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-brand-pink" />
          {dateBadge}
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-xs text-red-600">
          Some dashboard data could not be loaded: {error}
        </div>
      )}

      {/* Three primary metrics: avoid repeating the same service totals in separate cards. */}
      <section aria-label="Today's key metrics" className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link href="/admin/appointments" className="group flex min-h-[112px] items-center justify-between rounded-2xl border border-pink-100 bg-white p-5 text-left shadow-sm transition hover:border-pink-200 hover:shadow-md">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-tint text-brand-pink">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6"><rect x="3" y="4" width="18" height="17" rx="2.5"/><path d="M8 2.5v4M16 2.5v4M3 9h18" strokeLinecap="round"/></svg>
            </span>
            <span><span className="block text-xs font-medium text-zinc-500">Today's Appointments</span><span className="mt-0.5 block text-3xl font-extrabold text-zinc-900">{todayAppointments.length}</span></span>
          </div>
          <span className="text-xl text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-brand-pink">›</span>
        </Link>

        <div className="flex min-h-[112px] items-center gap-4 rounded-2xl border border-pink-100 bg-white p-5 shadow-sm">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-tint text-brand-pink">
            <svg viewBox="0 0 32 32" fill="currentColor" className="h-6 w-6"><circle cx="9" cy="9" r="4"/><circle cx="23" cy="9" r="4"/><circle cx="6" cy="18" r="3.5"/><circle cx="26" cy="18" r="3.5"/><path d="M16 13c-5 0-8 4-8 8 0 4 3 6 8 6s8-2 8-6c0-4-3-8-8-8Z"/></svg>
          </span>
          <span><span className="block text-xs font-medium text-zinc-500">Grooming Today</span><span className="mt-0.5 block text-3xl font-extrabold text-zinc-900">{groomingToday}</span></span>
        </div>

        <div className="flex min-h-[112px] items-center gap-4 rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-xl font-bold text-sky-600">⌂</span>
          <span><span className="block text-xs font-medium text-zinc-500">Boarding Today</span><span className="mt-0.5 block text-3xl font-extrabold text-zinc-900">{boardingToday}</span></span>
        </div>
      </section>

      {/* Appointment workflow summary is shown once, directly below the KPIs. */}
      <section aria-label="Appointment status summary" className="rounded-2xl border border-pink-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-zinc-900">Appointment Status</h2>
            <p className="mt-0.5 text-xs text-zinc-500">Select a status to review its appointments.</p>
          </div>
          <Link href="/admin/appointments" className="text-xs font-semibold text-brand-pink hover:underline">Manage Appointments</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {statusCards.map(card => (
            <button key={card.status} type="button" onClick={() => setStatusModal(card.status)}
              className="group rounded-xl border border-zinc-100 bg-zinc-50/80 p-4 text-left transition hover:border-pink-200 hover:bg-brand-tint/40">
              <span className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-zinc-500">{card.label}</span>
                <span className={`h-2 w-2 rounded-full ${card.marker}`} />
              </span>
              <span className={`mt-2 block text-2xl font-extrabold ${card.accent}`}>{statusCounts[card.status]}</span>
              <span className="mt-1 block text-[10px] text-zinc-400 group-hover:text-brand-pink">View appointments →</span>
            </button>
          ))}
        </div>
      </section>

      {/* Main content: appointment calendar (8 columns) and inventory alerts (4 columns). */}
      <section aria-label="Appointment calendar and inventory alerts" className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
        <section className="rounded-2xl border border-pink-100 bg-white p-4 shadow-sm sm:p-5 xl:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-zinc-900">Appointment Calendar</h2>
              <p className="mt-0.5 text-xs text-zinc-500">Select any date to review its appointments.</p>
            </div>
            <div className="flex items-center gap-1 rounded-xl border border-zinc-100 bg-zinc-50 p-1">
              <button type="button" aria-label="Previous month" onClick={() => { setMonth(current => new Date(current.getFullYear(), current.getMonth() - 1, 1)); setSelectedDay(null); }} className="h-8 w-8 rounded-lg text-lg text-zinc-500 hover:bg-white hover:text-brand-pink">‹</button>
              <span className="min-w-[132px] text-center text-xs font-bold text-zinc-700">{month.toLocaleDateString("en-PH", { month: "long", year: "numeric" })}</span>
              <button type="button" aria-label="Next month" onClick={() => { setMonth(current => new Date(current.getFullYear(), current.getMonth() + 1, 1)); setSelectedDay(null); }} className="h-8 w-8 rounded-lg text-lg text-zinc-500 hover:bg-white hover:text-brand-pink">›</button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-7 border-b border-zinc-100 text-center">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => <span key={day} className="pb-2 text-[10px] font-semibold text-zinc-400">{day}</span>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1.5">
            {calendarCells.map(cell => {
              const dayEvents = events[cell.key] || [];
              const hasGrooming = dayEvents.some(event => event.type === "grooming");
              const hasBoarding = dayEvents.some(event => event.type === "boarding");
              const selected = selectedDay === cell.key;
              const isToday = cell.key === inventoryToday;
              return (
                <button key={cell.key} type="button" disabled={cell.muted} onClick={() => setSelectedDay(cell.key)}
                  aria-label={`${cell.key}${dayEvents.length ? `, ${dayEvents.length} appointments` : ", no appointments"}`}
                  className={`flex min-h-[54px] flex-col items-center justify-center rounded-xl text-xs transition sm:min-h-[66px] ${
                    cell.muted ? "cursor-default text-zinc-200" : selected ? "bg-brand-tint font-bold text-brand-pink ring-1 ring-pink-200" : "text-zinc-700 hover:bg-zinc-50"
                  } ${isToday && !selected ? "ring-1 ring-inset ring-pink-200" : ""}`}>
                  <span className={isToday && !selected ? "font-extrabold text-brand-pink" : ""}>{cell.day}</span>
                  {(hasGrooming || hasBoarding) && (
                    <span className="mt-1.5 flex items-center justify-center gap-1">
                      {hasGrooming && <i className="h-1.5 w-1.5 rounded-full bg-brand-pink" />}
                      {hasBoarding && <i className="h-1.5 w-1.5 rounded-full bg-sky-400" />}
                    </span>
                  )}
                  {dayEvents.length > 0 && <span className="mt-0.5 text-[9px] text-zinc-400">{dayEvents.length}</span>}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 border-t border-zinc-100 pt-3 text-[10px] text-zinc-500">
            <span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-brand-pink" />Grooming</span>
            <span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-sky-400" />Boarding</span>
            <span><i className="mr-1.5 inline-block h-2 w-2 rounded-full ring-1 ring-pink-300" />Today</span>
          </div>

          {selectedDay && (
            <div className="mt-4 rounded-xl border border-pink-100 bg-brand-tint/40 p-3 sm:p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div><h3 className="text-sm font-bold text-zinc-900">Appointments · {formatDate(selectedDay)}</h3><p className="text-[11px] text-zinc-500">{selectedEvents.length} appointment{selectedEvents.length === 1 ? "" : "s"}</p></div>
                <button type="button" onClick={() => setSelectedDay(null)} className="rounded-full px-3 py-1.5 text-xs font-semibold text-zinc-500 hover:bg-white">Close</button>
              </div>
              {selectedEvents.length ? (
                <div className="space-y-2">
                  {selectedEvents.map(event => (
                    <div key={event.id} className="flex flex-col gap-2 rounded-lg bg-white px-3 py-3 sm:flex-row sm:items-center">
                      <span className="w-20 shrink-0 text-xs font-semibold text-zinc-500">{event.time}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-zinc-800">{event.pet}</p>
                        <p className="mt-0.5 truncate text-[10px] text-zinc-500">Customer: {event.owner} · {event.service}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${serviceStyles[event.type].pill}`}>{serviceStyles[event.type].label}</span>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusStyles[event.status]}`}>{statusLabel(event.status)}</span>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-end pt-1"><Link href="/admin/appointments" className="text-xs font-semibold text-brand-pink hover:underline">Open appointment management →</Link></div>
                </div>
              ) : (
                <p className="rounded-lg bg-white px-3 py-5 text-center text-xs text-zinc-500">No appointments scheduled for this date.</p>
              )}
            </div>
          )}
        </section>

        <div className="flex flex-col gap-5 xl:col-span-4">
          <section className="rounded-2xl border border-pink-100 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div><h2 className="text-base font-bold text-zinc-900">Low Stock</h2><p className="mt-0.5 text-xs text-zinc-500">Products at or below minimum stock.</p></div>
              <Link href="/admin/inventory" className="shrink-0 text-xs font-semibold text-brand-pink hover:underline">Inventory</Link>
            </div>
            <div className="mt-3 space-y-2">
              {lowStock.length ? lowStock.map(product => (
                <div key={product.id} className="flex items-center justify-between gap-3 rounded-xl bg-rose-50/70 px-3 py-2.5">
                  <span className="min-w-0 truncate text-xs font-semibold text-zinc-700">{product.name}</span>
                  <span className="shrink-0 rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-bold text-rose-700">{product.remaining} left</span>
                </div>
              )) : <p className="rounded-xl bg-zinc-50 px-3 py-6 text-center text-xs text-zinc-500">No low-stock products.</p>}
            </div>
          </section>

          <section aria-label="Near-expiry inventory alert" className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div><h2 className="text-base font-bold text-zinc-900">Near Expiry</h2><p className="mt-0.5 text-xs text-zinc-500">In-stock batches expiring within {EXPIRY_WARNING_DAYS} days.</p></div>
              <Link href="/admin/inventory" className="shrink-0 text-xs font-semibold text-brand-pink hover:underline">Inventory</Link>
            </div>
            <div className="mt-3 space-y-2">
              {nearExpiry.length ? nearExpiry.map(batch => (
                <div key={batch.id} className="flex min-w-0 items-center justify-between gap-3 rounded-xl bg-amber-50 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-zinc-800" title={batch.productName}>{batch.productName}</p>
                    <p className="mt-0.5 truncate text-[10px] text-zinc-500">Batch {batch.batchNumber} · {batch.quantity} left</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${batch.daysLeft === 0 ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-800"}`}>
                    {batch.daysLeft === 0 ? "Expires today" : `${batch.daysLeft} day${batch.daysLeft === 1 ? "" : "s"} left`}
                  </span>
                </div>
              )) : <p className="rounded-xl bg-zinc-50 px-3 py-6 text-center text-xs text-zinc-500">No batches near expiry.</p>}
            </div>
          </section>
        </div>
      </section>

      {/* Read-only status drill-down. Actual status changes remain in Appointment Management. */}
      {statusModal && (
        <div role="presentation" onClick={() => setStatusModal(null)} className="fixed inset-0 z-[90] flex items-center justify-center bg-zinc-950/45 p-4 backdrop-blur-[2px]">
          <section role="dialog" aria-modal="true" aria-labelledby="dashboard-status-title" onClick={event => event.stopPropagation()} className="flex max-h-[85dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4">
              <div><p className="text-[10px] font-semibold uppercase tracking-wide text-brand-pink">Appointment Overview</p><h2 id="dashboard-status-title" className="mt-0.5 text-lg font-extrabold text-zinc-900">{statusLabel(statusModal)} Appointments</h2><p className="text-xs text-zinc-500">{selectedStatusAppointments.length} record{selectedStatusAppointments.length === 1 ? "" : "s"}</p></div>
              <button type="button" onClick={() => setStatusModal(null)} aria-label="Close appointment status dialog" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200">×</button>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4 sm:p-5">
              {selectedStatusAppointments.length ? selectedStatusAppointments.map(appointment => {
                const service = serviceOf(appointment);
                const petNames = appointment.pets.map(pet => pet.name).filter(Boolean).join(", ") || appointment.owner_name;
                return (
                  <div key={appointment.id} className="flex flex-col gap-2 rounded-xl border border-zinc-100 bg-zinc-50/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-bold text-zinc-400">{appointment.id.slice(0, 8)}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${serviceStyles[service].pill}`}>{serviceStyles[service].label}</span><span className="text-[10px] text-zinc-500">{formatDate(appointment.scheduled_date)} · {timeLabel(appointment.scheduled_time || appointment.drop_off_at || appointment.pick_up_at)}</span></div>
                      <p className="mt-1 truncate text-sm font-bold text-zinc-800">{petNames}</p>
                      <p className="mt-0.5 truncate text-xs text-zinc-500">Customer: {appointment.owner_name}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[10px] font-semibold text-zinc-600">View in management</span>
                  </div>
                );
              }) : <div className="py-12 text-center"><p className="text-sm font-semibold text-zinc-700">No {statusLabel(statusModal).toLowerCase()} appointments.</p><p className="mt-1 text-xs text-zinc-400">There are currently no records in this status.</p></div>}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-zinc-100 px-5 py-4">
              <button type="button" onClick={() => setStatusModal(null)} className="min-h-10 rounded-full border border-zinc-200 px-4 text-xs font-semibold text-zinc-600 hover:bg-zinc-50">Close</button>
              <Link href="/admin/appointments" onClick={() => setStatusModal(null)} className="inline-flex min-h-10 items-center rounded-full bg-brand-pink px-5 text-xs font-semibold text-white hover:bg-pink-600">Manage Appointments</Link>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
