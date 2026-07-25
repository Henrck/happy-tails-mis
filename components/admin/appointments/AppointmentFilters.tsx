"use client";
// Search bar + Filter dropdown panel (matches the reference: a small white
// card with Status and Services selects, closable with the X).
import { useState } from "react";
import type { AppointmentStatus, ServiceType } from "@/lib/data/admin-appointments-mock";

export type FilterState = {
  search: string;
  status: AppointmentStatus | "all";
  service: ServiceType | "all";
};

export default function AppointmentFilters({
  filters,
  onChange,
}: {
  filters: FilterState;
  onChange: (next: FilterState) => void;
}) {
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <div className="relative flex items-center gap-3">
      <div className="flex-1 relative">
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4-4" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          placeholder="Search by pet, owner, or appointment ID"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="w-full rounded-full border border-pink-200 bg-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
        />
      </div>

      <button
        onClick={() => setPanelOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-pink-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:border-brand-pink transition-colors"
      >
        Filter
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {panelOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-pink-100 p-5 z-20">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-brand-pink">FILTER</h3>
            <button onClick={() => setPanelOpen(false)} className="text-red-500 hover:text-red-600">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="mt-4">
            <label className="text-xs font-semibold text-zinc-500">STATUS</label>
            <select
              value={filters.status}
              onChange={(e) => onChange({ ...filters, status: e.target.value as FilterState["status"] })}
              className="mt-1 w-full rounded-full border-2 border-brand-pink text-zinc-700 text-sm px-3 py-2 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div className="mt-4">
            <label className="text-xs font-semibold text-zinc-500">SERVICES</label>
            <select
              value={filters.service}
              onChange={(e) => onChange({ ...filters, service: e.target.value as FilterState["service"] })}
              className="mt-1 w-full rounded-full border-2 border-brand-pink text-zinc-700 text-sm px-3 py-2 focus:outline-none"
            >
              <option value="all">All Services</option>
              <option value="grooming">Grooming</option>
              <option value="boarding">Boarding</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
