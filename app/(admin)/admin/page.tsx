// Superadmin dashboard v3 — real-data dashboard refinement.
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DashboardHeader from "@/components/admin/DashboardHeader";
import { createClient } from "@/lib/supabase/client";
import { fetchAppointments, type AppointmentRow } from "@/lib/supabase/appointment-management";
import { fetchProducts, fetchAllBatches } from "@/lib/supabase/products";

const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const timeLabel = (v: string | null) => {
  if (!v) return "—";
  const [h, m] = v.split(":").map(Number);
  if (Number.isNaN(h)) return v;
  return `${String(h % 12 || 12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

const money = (n: number) =>
  `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

type EventType = "grooming" | "boarding" | "walkin" | "other";

const eventDot: Record<EventType, string> = {
  grooming: "bg-brand-pink",
  boarding: "bg-sky-400",
  walkin: "bg-amber-400",
  other: "bg-violet-400",
};

export default function AdminDashboardPage() {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [period, setPeriod] = useState<"Week" | "Month" | "Year">("Week");

  const load = useCallback(async () => {
    setLoading(true);
    const [a, p, b] = await Promise.all([
      fetchAppointments(),
      fetchProducts({ activeOnly: true }),
      fetchAllBatches(),
    ]);

    setAppointments(a.rows);
    setProducts(p.products);
    setBatches(b.batches);
    setError(a.error || p.error || b.error || null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const today = dateKey(new Date());
  const active = useMemo(
    () => appointments.filter((a) => a.status !== "cancelled"),
    [appointments]
  );
  const todayRows = active.filter((a) => a.scheduled_date === today);
  const pending = appointments.filter((a) => a.status === "pending").length;

  // Appointment revenue is intentionally calculated from real appointment
  // records. POS sales are kept separate in the POS/report modules and are
  // not fabricated here.
  const todayRevenue = todayRows
    .filter((a) => a.status === "completed")
    .reduce((sum, a) => sum + Number(a.total_amount || 0), 0);

  const monthPrefix = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
  const monthRevenue = active
    .filter((a) => a.status === "completed" && a.scheduled_date.startsWith(monthPrefix))
    .reduce((sum, a) => sum + Number(a.total_amount || 0), 0);

  const lowStock = useMemo(() => {
    const stock = new Map<string, number>();

    for (const batch of batches) {
      stock.set(
        batch.product_id,
        (stock.get(batch.product_id) || 0) + Number(batch.quantity || 0)
      );
    }

    return products
      .map((p) => ({
        id: p.id,
        name: p.name,
        remaining: stock.get(p.id) || 0,
        min: Number(p.min_stock || 0),
      }))
      .filter((p) => p.remaining <= p.min)
      .sort((a, b) => a.remaining - b.remaining)
      .slice(0, 5);
  }, [products, batches]);

  const events = useMemo(() => {
    const map: Record<
      string,
      { type: EventType; time: string; pet: string; service: string }[]
    > = {};

    for (const appointment of active) {
      const pet = appointment.pets[0];
      const type: EventType = appointment.is_walk_in
        ? "walkin"
        : appointment.service_type === "boarding"
          ? "boarding"
          : appointment.service_type === "ala_carte"
            ? "other"
            : "grooming";

      const list = (map[appointment.scheduled_date] ||= []);
      list.push({
        type,
        time: timeLabel(
          appointment.scheduled_time ||
            appointment.drop_off_at ||
            appointment.pick_up_at
        ),
        pet: pet?.name || appointment.owner_name,
        service:
          appointment.service_type === "boarding"
            ? pet?.packagePricingLabel || "Boarding"
            : pet?.packageName ||
              (appointment.is_walk_in ? "Walk-in Grooming" : "Grooming"),
      });
    }

    for (const list of Object.values(map)) {
      list.sort((a, b) => a.time.localeCompare(b.time));
    }

    return map;
  }, [active]);

  const schedule = useMemo(
    () =>
      todayRows
        .map((a) => ({
          id: a.id,
          time: timeLabel(a.scheduled_time || a.drop_off_at || a.pick_up_at),
          pet: a.pets.map((p) => p.name).join(", ") || a.owner_name,
          title: a.is_walk_in
            ? "Grooming Walk-in"
            : a.service_type === "boarding"
              ? a.pick_up_at
                ? "Boarding Pickup"
                : "Boarding Check-in"
              : "Grooming Appointment",
          service: a.service_type === "boarding" ? "Boarding" : "Grooming",
          status: a.status,
        }))
        .sort((a, b) => a.time.localeCompare(b.time))
        .slice(0, 8),
    [todayRows]
  );

  const activity = useMemo(() => {
    return appointments
      .slice()
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 6)
      .map((a) => ({
        id: a.id,
        date: new Date(a.created_at),
        title: `${a.service_type === "boarding" ? "Boarding" : "Grooming"} appointment ${a.status}: ${a.pets.map((p) => p.name).join(", ") || a.owner_name}`,
        category: a.is_walk_in ? "Walk-in" : "Website Booking",
      }));
  }, [appointments]);

  const chart = useMemo(() => {
    if (period === "Week") {
      const start = new Date();
      start.setDate(start.getDate() - start.getDay());

      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return {
          label: d.toLocaleDateString("en-US", { weekday: "short" }),
          total: active.filter((a) => a.scheduled_date === dateKey(d)).length,
        };
      });
    }

    if (period === "Month") {
      const now = new Date();

      return Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
        const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

        return {
          label: d.toLocaleDateString("en-US", { month: "short" }),
          total: active.filter((a) => a.scheduled_date.startsWith(prefix)).length,
        };
      });
    }

    const year = new Date().getFullYear();

    return Array.from({ length: 5 }, (_, i) => {
      const y = year - 4 + i;
      return {
        label: String(y),
        total: active.filter((a) => a.scheduled_date.startsWith(`${y}-`)).length,
      };
    });
  }, [active, period]);

  const maxChart = Math.max(1, ...chart.map((x) => x.total));

  const calendarCells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const cells: { key: string; day: number; muted: boolean }[] = [];

    for (let i = first.getDay() - 1; i >= 0; i--) {
      const d = new Date(month.getFullYear(), month.getMonth(), -i);
      cells.push({ key: dateKey(d), day: d.getDate(), muted: true });
    }

    for (let d = 1; d <= days; d++) {
      const current = new Date(month.getFullYear(), month.getMonth(), d);
      cells.push({ key: dateKey(current), day: d, muted: false });
    }

    while (cells.length < 42) {
      const d = new Date(
        month.getFullYear(),
        month.getMonth() + 1,
        cells.length - days - first.getDay() + 1
      );
      cells.push({ key: dateKey(d), day: d.getDate(), muted: true });
    }

    return cells;
  }, [month]);

  if (loading) {
    return <div className="py-16 text-center text-sm text-zinc-400">Loading dashboard…</div>;
  }

  return (
    <div className="flex flex-col gap-4 pb-4">
      <DashboardHeader />

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-xs text-red-600">
          Some dashboard data could not be loaded: {error}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Link href="/admin/appointments" className="group">
          <div className="flex h-[88px] items-center gap-3 rounded-2xl border border-pink-100 bg-white px-4 shadow-sm transition hover:border-pink-200 hover:shadow-md">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-tint text-brand-pink">
              <span className="text-lg">□</span>
            </div>
            <div>
              <p className="text-xl font-bold text-zinc-900">{todayRows.length}</p>
              <p className="text-xs text-zinc-500">Today&apos;s Appointments</p>
            </div>
            <span className="ml-auto text-xl text-zinc-300 group-hover:text-brand-pink">›</span>
          </div>
        </Link>

        <div className="flex h-[88px] items-center gap-3 rounded-2xl border border-pink-100 bg-white px-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-tint font-bold text-brand-pink">
            ₱
          </div>
          <div>
            <p className="text-xl font-bold text-zinc-900">{money(monthRevenue)}</p>
            <p className="text-xs text-zinc-500">This Month&apos;s Service Revenue</p>
          </div>
        </div>

        <Link href="/admin/appointments" className="group">
          <div className="flex h-[88px] items-center gap-3 rounded-2xl border border-pink-100 bg-white px-4 shadow-sm transition hover:border-pink-200 hover:shadow-md">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-tint font-bold text-brand-pink">
              ✓
            </div>
            <div>
              <p className="text-xl font-bold text-zinc-900">{pending}</p>
              <p className="text-xs text-zinc-500">Pending Appointments</p>
            </div>
            <span className="ml-auto text-xl text-zinc-300 group-hover:text-brand-pink">›</span>
          </div>
        </Link>
      </div>

      {/* Calendar + service summary */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-pink-100 bg-white p-4 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-brand-pink">Appointment Calendar</h3>
              <p className="text-[11px] text-zinc-400">Select a date with appointments to view its schedule</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                className="px-2 text-lg text-zinc-400 hover:text-brand-pink"
              >
                ‹
              </button>
              <b className="min-w-[125px] text-center text-sm">
                {month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </b>
              <button
                onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                className="px-2 text-lg text-zinc-400 hover:text-brand-pink"
              >
                ›
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-7 text-center">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <span key={d} className="py-1 text-[10px] font-semibold text-zinc-400">
                {d}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((cell) => {
              const dayEvents = events[cell.key] || [];
              const selected = cell.key === selectedDay;

              return (
                <button
                  key={cell.key}
                  disabled={cell.muted || dayEvents.length === 0}
                  onClick={() => setSelectedDay(cell.key)}
                  className={`min-h-[45px] rounded-lg text-xs transition ${
                    cell.muted
                      ? "text-zinc-200"
                      : selected
                        ? "bg-brand-tint font-semibold text-brand-pink"
                        : "text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  {cell.day}
                  {dayEvents.length > 0 && (
                    <span
                      className={`mx-auto mt-1 block h-1.5 w-1.5 rounded-full ${eventDot[dayEvents[0].type]}`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap justify-center gap-4 border-t border-pink-50 pt-3 text-[10px] text-zinc-500">
            {([
              ["grooming", "Grooming"],
              ["boarding", "Boarding"],
              ["walkin", "Walk-in"],
              ["other", "Other"],
            ] as [EventType, string][]).map(([type, label]) => (
              <span key={type}>
                <i className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${eventDot[type]}`} />
                {label}
              </span>
            ))}
          </div>

          {selectedDay && events[selectedDay] && (
            <div className="mt-3 rounded-xl bg-zinc-50 p-3">
              <div className="mb-2 flex justify-between">
                <b className="text-xs">Schedule · {selectedDay}</b>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="text-[11px] text-zinc-400 hover:text-zinc-600"
                >
                  Close
                </button>
              </div>

              {events[selectedDay].map((event, index) => (
                <div
                  key={`${event.pet}-${index}`}
                  className="flex items-center gap-2 border-t border-white py-1.5 text-xs"
                >
                  <span className={`h-2 w-2 rounded-full ${eventDot[event.type]}`} />
                  <span className="w-[65px] text-zinc-500">{event.time}</span>
                  <b>{event.pet}</b>
                  <span className="ml-auto text-zinc-500">{event.service}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-pink-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-brand-pink">Today&apos;s Services</h3>
              <span className="text-[10px] text-zinc-400">{todayRows.length} total</span>
            </div>

            <div className="mt-2 divide-y divide-pink-50">
              {[
                [
                  "Grooming",
                  todayRows.filter((a) => a.service_type !== "boarding" && !a.is_walk_in).length,
                  todayRows.filter((a) => a.service_type !== "boarding" && a.is_walk_in).length,
                ],
                [
                  "Boarding",
                  todayRows.filter((a) => a.service_type === "boarding" && !a.is_walk_in).length,
                  todayRows.filter((a) => a.service_type === "boarding" && a.is_walk_in).length,
                ],
              ].map(([label, scheduled, walkIns]) => (
                <div key={String(label)} className="flex items-center justify-between py-3">
                  <div>
                    <b className="text-sm text-zinc-800">{label}</b>
                    <p className="text-[10px] text-zinc-400">
                      {scheduled} scheduled · {walkIns} walk-in
                    </p>
                  </div>
                  <span className="rounded-full bg-brand-tint px-2.5 py-1 text-[10px] font-bold text-brand-pink">
                    {Number(scheduled) + Number(walkIns)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-pink-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-brand-pink">Low Stock Alerts</h3>
              <Link href="/admin/inventory" className="text-[11px] font-semibold text-brand-pink">
                View Inventory
              </Link>
            </div>

            <div className="mt-3 space-y-2">
              {lowStock.length ? (
                lowStock.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 text-xs">
                    <span className="truncate">{item.name}</span>
                    <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[10px] text-red-500">
                      {item.remaining} left
                    </span>
                  </div>
                ))
              ) : (
                <p className="py-3 text-center text-xs text-zinc-400">No low-stock products.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Schedule + activity */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-pink-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-brand-pink">Today&apos;s Schedule</h3>
            <Link href="/admin/appointments" className="text-[11px] font-semibold text-brand-pink">
              View All
            </Link>
          </div>

          <div className="mt-2">
            {schedule.length ? (
              schedule.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 rounded-xl px-2 py-2 hover:bg-zinc-50"
                >
                  <span className="w-[68px] text-[11px] font-semibold text-zinc-500">
                    {item.time}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs">
                      {item.title} — {item.pet}
                    </p>
                    <p className="text-[10px] capitalize text-zinc-400">
                      {item.status.replace("_", " ")}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] ${
                      item.service === "Grooming"
                        ? "bg-brand-tint text-brand-pink"
                        : "bg-sky-50 text-sky-600"
                    }`}
                  >
                    {item.service}
                  </span>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-xs text-zinc-400">
                No appointments scheduled today.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-pink-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-brand-pink">Recent Activity</h3>
            <button onClick={() => void load()} className="text-[11px] font-semibold text-brand-pink">
              Refresh
            </button>
          </div>

          <div className="mt-2">
            {activity.length ? (
              activity.map((item) => (
                <div key={item.id} className="flex items-center gap-2.5 rounded-xl px-2 py-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-tint text-brand-pink">
                    •
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs">{item.title}</p>
                    <p className="text-[10px] text-zinc-400">
                      {item.date.toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span className="rounded-full bg-zinc-50 px-2 py-0.5 text-[10px] text-zinc-500">
                    {item.category}
                  </span>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-xs text-zinc-400">No recent activity.</p>
            )}
          </div>
        </div>
      </div>

      {/* Real booking chart */}
      <div className="rounded-2xl border border-pink-100 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-brand-pink">Bookings Overview</h3>
            <p className="text-[10px] text-zinc-400">
              {period === "Week"
                ? "Daily bookings"
                : period === "Month"
                  ? "Monthly bookings"
                  : "Yearly bookings"}
            </p>
          </div>

          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as typeof period)}
            className="rounded-full bg-brand-tint px-3 py-1.5 text-xs font-semibold text-brand-pink outline-none"
          >
            <option value="Week">This Week</option>
            <option value="Month">Last 6 Months</option>
            <option value="Year">Last 5 Years</option>
          </select>
        </div>

        <div className="mt-4 flex h-36 items-end gap-2">
          {chart.map((item) => (
            <div
              key={item.label}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
            >
              <span className="text-[10px] font-semibold text-zinc-500">{item.total}</span>
              <div
                className="w-full max-w-[58px] rounded-t-md bg-brand-pink transition-all"
                style={{ height: `${Math.max(6, (item.total / maxChart) * 100)}%` }}
              />
              <span className="text-[10px] text-zinc-400">{item.label}</span>
            </div>
          ))}
        </div>

        <div className="mt-3 flex justify-between border-t border-pink-50 pt-3 text-[10px] text-zinc-400">
          <span>
            Selected month service revenue:{" "}
            <b className="text-zinc-600">{money(monthRevenue)}</b>
          </span>
          <span>{active.length} active bookings</span>
        </div>

        <div className="mt-1 text-[10px] text-zinc-400">
          Today&apos;s completed service revenue: <b className="text-zinc-600">{money(todayRevenue)}</b>
        </div>
      </div>
    </div>
  );
}
