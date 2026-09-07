"use client";
// Search + Filter panel, cleaned up from the original version, which
// had three real problems: no indication filters were active once the
// panel closed, no way to clear them except resetting each dropdown by
// hand, and the panel had no backdrop or click-outside handling so it
// could be left open while interacting with the page behind it. Fixed:
// active filters now show as removable chips right under the search
// row, a "Clear all" appears only when something's actually filtered,
// and the panel closes on an outside click like a normal dropdown.
import { useState, useRef, useEffect } from "react";
import type { AppointmentStatus, AppointmentServiceType } from "@/lib/types/appointments";

export type FilterState = {
  search: string;
  status: AppointmentStatus | "all";
  service: AppointmentServiceType | "all";
  scope: "today" | "all";
};

const statusOptions: AppointmentStatus[] = ["pending", "confirmed", "checked_in", "completed", "cancelled"];
const serviceOptions: { value: AppointmentServiceType; label: string }[] = [
  { value: "dog_grooming", label: "Dog Grooming" },
  { value: "cat_grooming", label: "Cat Grooming" },
  { value: "boarding", label: "Boarding" },
  { value: "ala_carte", label: "Ala Carte" },
];

const emptyFilters: Pick<FilterState, "status" | "service"> = { status: "all", service: "all" };

export default function AppointmentFilters({
  filters,
  onChange,
}: {
  filters: FilterState;
  onChange: (next: FilterState) => void;
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!panelOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setPanelOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [panelOpen]);

  const activeCount = (filters.status !== "all" ? 1 : 0) + (filters.service !== "all" ? 1 : 0);

  function clearAll() {
    onChange({ ...filters, ...emptyFilters });
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
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

        <div className="flex rounded-full border border-pink-200 bg-white p-1 shrink-0">
          <button
            onClick={() => onChange({ ...filters, scope: "today" })}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${filters.scope === "today" ? "bg-brand-pink text-white" : "text-zinc-600 hover:text-brand-pink"}`}
          >
            Today
          </button>
          <button
            onClick={() => onChange({ ...filters, scope: "all" })}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${filters.scope === "all" ? "bg-brand-pink text-white" : "text-zinc-600 hover:text-brand-pink"}`}
          >
            All History
          </button>
        </div>

        <div className="relative shrink-0" ref={panelRef}>
          <button
            onClick={() => setPanelOpen((v) => !v)}
            className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors ${
              activeCount > 0 ? "border-brand-pink bg-brand-tint text-brand-pink" : "border-pink-200 bg-white text-zinc-700 hover:border-brand-pink"
            }`}
          >
            Filter
            {activeCount > 0 && (
              <span className="bg-brand-pink text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{activeCount}</span>
            )}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform ${panelOpen ? "rotate-180" : ""}`}>
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {panelOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-pink-100 p-5 z-20">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-brand-pink text-sm tracking-wide">FILTER</h3>
                <button onClick={() => setPanelOpen(false)} aria-label="Close filter panel" className="text-zinc-400 hover:text-zinc-600">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              <div className="mt-4">
                <label className="text-xs font-semibold text-zinc-500">STATUS</label>
                <select
                  value={filters.status}
                  onChange={(e) => onChange({ ...filters, status: e.target.value as FilterState["status"] })}
                  className="mt-1.5 w-full rounded-lg border border-zinc-300 text-zinc-700 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-pink"
                >
                  <option value="all">All Statuses</option>
                  {statusOptions.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                </select>
              </div>

              <div className="mt-4">
                <label className="text-xs font-semibold text-zinc-500">SERVICE</label>
                <select
                  value={filters.service}
                  onChange={(e) => onChange({ ...filters, service: e.target.value as FilterState["service"] })}
                  className="mt-1.5 w-full rounded-lg border border-zinc-300 text-zinc-700 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-pink"
                >
                  <option value="all">All Services</option>
                  {serviceOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              {activeCount > 0 && (
                <button onClick={clearAll} className="mt-4 w-full text-center text-xs font-semibold text-red-500 hover:text-red-600 py-1.5">
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {activeCount > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {filters.status !== "all" && (
            <FilterChip label={`Status: ${filters.status.replace("_", " ")}`} onRemove={() => onChange({ ...filters, status: "all" })} />
          )}
          {filters.service !== "all" && (
            <FilterChip
              label={`Service: ${serviceOptions.find((s) => s.value === filters.service)?.label}`}
              onRemove={() => onChange({ ...filters, service: "all" })}
            />
          )}
          <button onClick={clearAll} className="text-xs font-semibold text-zinc-400 hover:text-red-500 transition-colors">
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="flex items-center gap-1.5 bg-brand-tint text-brand-pink text-xs font-semibold pl-3 pr-2 py-1.5 rounded-full capitalize">
      {label}
      <button onClick={onRemove} aria-label={`Remove ${label} filter`} className="hover:text-brand-pink-dark">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>
      </button>
    </span>
  );
}
