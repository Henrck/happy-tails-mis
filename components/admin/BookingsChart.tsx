"use client";
import { useState } from "react";
import { bookingsByWeek, bookingsByMonth, bookingsByYear } from "@/lib/data/admin-mock";

type Period = "Week" | "Month" | "Year";
const datasets: Record<Period, { label: string; total: number }[]> = {
  Week: bookingsByWeek, Month: bookingsByMonth, Year: bookingsByYear,
};

export default function BookingsChart() {
  const [period, setPeriod] = useState<Period>("Week");
  const data = datasets[period];
  const max = Math.max(...data.map((d) => d.total));

  return (
    <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-brand-pink text-sm">Bookings Overview</h3>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
          className="text-xs font-semibold bg-brand-tint text-brand-pink px-3 py-1 rounded-full border-none focus:outline-none focus:ring-2 focus:ring-brand-pink"
        >
          <option value="Week">This Week</option>
          <option value="Month">This Year (by month)</option>
          <option value="Year">All Time (by year)</option>
        </select>
      </div>

      <div className="mt-4 flex items-end justify-between gap-2 h-32">
        {data.map((d) => (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-1.5">
            <span className="text-[10px] font-semibold text-zinc-500">{d.total}</span>
            <div className="w-full bg-brand-pink rounded-t-md transition-all" style={{ height: `${(d.total / max) * 100}%`, minHeight: "6px" }} />
            <span className="text-[10px] text-zinc-400 whitespace-nowrap">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
