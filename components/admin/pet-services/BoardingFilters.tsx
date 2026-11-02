"use client";
import { useState } from "react";

export type BoardingFilterState = { search: string;status: "all" | "occupied" | "available" | "in_progress" | "checked_in" | "booked" | "checked_out" };
export default function BoardingFilters({ filters, onChange, onBack, onOpenHistory, historyCount }: {
  filters: BoardingFilterState;
  onChange: (next: BoardingFilterState) => void;
  onBack: () => void;
  onOpenHistory: () => void;
  historyCount: number;
}) {
  const [open, setOpen] = useState(false);
  const dirty = !!filters.search || filters.status !== "all";
  return <div className="flex w-full min-w-0 flex-wrap items-center gap-3">
    <button type="button" onClick={onBack} aria-label="Back" className="rounded-full border border-pink-200 bg-white px-3 py-2 text-sm">←</button>
    <input type="search" placeholder="Search pet, owner, or kennel" value={filters.search}
      onChange={(e) => onChange({ ...filters, search: e.target.value })}
      className="min-w-0 flex-[1_1_180px] rounded-full border border-pink-200 bg-white px-4 py-2 text-sm"/>
    <div className="relative"><button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="rounded-full border border-pink-200 bg-white px-4 py-2 text-sm">Filter{dirty ? " •" : ""}</button>
      {open && <div className="absolute right-0 top-full z-30 mt-2 w-64 rounded-2xl border border-pink-100 bg-white p-4 shadow-xl">
        <label className="text-xs font-semibold text-zinc-600">KENNEL OCCUPANCY<select value={filters.status}
          onChange={(e) => onChange({ ...filters, status: e.target.value as BoardingFilterState["status"] })}
          className="mt-2 w-full rounded-xl border border-pink-200 p-2 text-sm">
          <option value="all">All Kennels</option><option value="occupied">Pets Checked In</option><option value="available">Not Physically Occupied</option>
        </select></label>
        <button type="button" onClick={() => { onChange({ search: "", status: "all" });setOpen(false); }} className="mt-4 w-full rounded-full border border-brand-pink py-2 text-sm font-semibold text-brand-pink">Clear Filter</button>
      </div>}
    </div>
    <button type="button" onClick={onOpenHistory} className="ml-auto rounded-full border border-pink-200 bg-white px-4 py-2 text-sm font-semibold">Recent Checkouts <span className="text-brand-pink">({historyCount})</span></button>
  </div>;
}
