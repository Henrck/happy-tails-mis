"use client";
// Simple CSS-based bar chart for "Total Booking" — deliberately not using
// a charting library (recharts, chart.js, etc.) for one 5-bar chart; that
// would be a real dependency to install, maintain, and keep updated for
// something this simple. If reporting grows more complex later (multiple
// chart types, tooltips, exports), that's the point to revisit this
// decision — not now.
import { useState } from "react";
import { monthlyBookingTotals } from "@/lib/data/admin-mock";

const filters = ["Month", "Year"] as const;

export default function BookingChart() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("Month");
  const max = Math.max(...monthlyBookingTotals.map((d) => d.total));

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-pink-100 p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-brand-pink">Total Booking</h3>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as (typeof filters)[number])}
          className="text-xs font-semibold bg-brand-tint text-brand-pink px-3 py-1 rounded-full border-none focus:outline-none focus:ring-2 focus:ring-brand-pink"
        >
          {filters.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>

      <div className="mt-6 flex items-end justify-between gap-3 h-40">
        {monthlyBookingTotals.map((d) => (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500">{d.total}</span>
            <div
              className="w-full bg-cyan-300 rounded-t-md transition-all"
              style={{ height: `${(d.total / max) * 100}%`, minHeight: "8px" }}
            />
            <span className="text-xs text-zinc-400">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
