"use client";
import { useState } from "react";
import type { BoardingStage } from "@/lib/data/boarding-kennels-mock";

export type BoardingFilterState = {
  search: string;
  status: BoardingStage | "all";
};

export default function BoardingFilters({
  filters,
  onChange,
  onBack,
  onOpenHistory,
  historyCount,
}: {
  filters: BoardingFilterState;
  onChange: (next: BoardingFilterState) => void;
  onBack: () => void;
  onOpenHistory: () => void;
  historyCount: number;
}) {
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={onBack}
        aria-label="Back"
        className="w-9 h-9 rounded-full bg-white border border-pink-200 flex items-center justify-center text-zinc-600 hover:border-brand-pink transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M19 12H5M5 12l6-6M5 12l6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="flex-1 min-w-[180px] relative">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4-4" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          placeholder="Search by pet, owner, or kennel"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="w-full rounded-full border border-pink-200 bg-white pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
        />
      </div>

      <div className="relative">
        <button
          onClick={() => setPanelOpen((v) => !v)}
          className="flex items-center gap-2 rounded-full border border-pink-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:border-brand-pink transition-colors"
        >
          Filter
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {panelOpen && (
          <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-pink-100 p-5 z-20">
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
                onChange={(e) => onChange({ ...filters, status: e.target.value as BoardingFilterState["status"] })}
                className="mt-1 w-full rounded-full border-2 border-brand-pink text-zinc-700 text-sm px-3 py-2 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="booked">Scheduled</option>
                <option value="checked_in">Check in</option>
                <option value="checked_out">Check out</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={onOpenHistory}
        className="flex items-center gap-2 rounded-full border border-pink-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:border-brand-pink transition-colors ml-auto"
      >
        History
        <span className="bg-brand-pink text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
          {historyCount}
        </span>
      </button>
    </div>
  );
}
