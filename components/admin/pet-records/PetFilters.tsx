"use client";

import { useState } from "react";
import type { Species } from "@/lib/types/appointments";

export type PetFilterState = {
  search: string;
  species: Species | "all";
  ageSort: "none" | "youngest" | "oldest";
  breed: string;
};

const defaultFilters: PetFilterState = { search: "", species: "all", ageSort: "none", breed: "" };

export default function PetFilters({ filters, onChange }: { filters: PetFilterState; onChange: (next: PetFilterState) => void }) {
  const [panelOpen, setPanelOpen] = useState(false);
  const dirty = filters.search !== "" || filters.species !== "all" || filters.breed !== "" || filters.ageSort !== "none";
  return (
    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
      <div className="relative min-w-0 flex-1">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4" strokeLinecap="round"/></svg>
        <input type="text" placeholder="Search by pet or owner name" value={filters.search} onChange={e => onChange({ ...filters, search: e.target.value })} className="w-full min-w-0 rounded-full border border-pink-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"/>
      </div>
      <div className="relative shrink-0">
        <button type="button" aria-expanded={panelOpen} aria-controls="pet-filter-panel" onClick={() => setPanelOpen(v => !v)} className="flex items-center gap-2 rounded-full border border-pink-200 bg-white px-3 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:border-brand-pink sm:px-4">Filter{dirty ? " •" : ""}<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
        {panelOpen && <div id="pet-filter-panel" className="absolute right-0 top-full z-30 mt-2 w-60 max-w-[calc(100vw-2rem)] rounded-2xl border border-pink-100 bg-white p-4 shadow-xl sm:p-5">
          <div className="flex items-center justify-between"><h3 className="font-bold text-brand-pink">FILTER</h3><button type="button" aria-label="Close filter" onClick={() => setPanelOpen(false)} className="p-1 text-red-500 hover:text-red-600">✕</button></div>
          <label className="mt-4 block text-xs font-semibold text-zinc-500">TYPE<select value={filters.species} onChange={e => onChange({ ...filters, species: e.target.value as PetFilterState["species"] })} className="mt-1 w-full min-w-0 rounded-full border-2 border-brand-pink px-3 py-2 text-sm font-normal text-zinc-700 focus:outline-none"><option value="all">All Types</option><option value="Dog">Dog</option><option value="Cat">Cat</option></select></label>
          <label className="mt-4 block text-xs font-semibold text-zinc-500">BREED<input type="text" placeholder="e.g. Shih Tzu" value={filters.breed} onChange={e => onChange({ ...filters, breed: e.target.value })} className="mt-1 w-full min-w-0 rounded-full border-2 border-brand-pink px-3 py-2 text-sm font-normal text-zinc-700 focus:outline-none"/></label>
          <label className="mt-4 block text-xs font-semibold text-zinc-500">AGE<select value={filters.ageSort} onChange={e => onChange({ ...filters, ageSort: e.target.value as PetFilterState["ageSort"] })} className="mt-1 w-full min-w-0 rounded-full border-2 border-brand-pink px-3 py-2 text-sm font-normal text-zinc-700 focus:outline-none"><option value="none">No sorting</option><option value="youngest">Youngest first</option><option value="oldest">Oldest first</option></select></label>
          <button type="button" onClick={() => { onChange({ ...defaultFilters }); setPanelOpen(false); }} disabled={!dirty} className="mt-5 w-full rounded-full border border-brand-pink px-4 py-2 text-sm font-semibold text-brand-pink hover:bg-pink-50 disabled:cursor-not-allowed disabled:opacity-40">Clear Filters</button>
        </div>}
      </div>
    </div>
  );
}
