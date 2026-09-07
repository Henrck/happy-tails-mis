"use client";
import { useState } from "react";
import type { Species } from "@/lib/types/appointments";

export type PetFilterState = {
  search: string;
  species: Species | "all";
  ageSort: "none" | "youngest" | "oldest";
  breed: string;
};

export default function PetFilters({
  filters,
  onChange,
}: {
  filters: PetFilterState;
  onChange: (next: PetFilterState) => void;
}) {
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 relative">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4-4" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          placeholder="Search by pet or owner name"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="w-full rounded-full border border-pink-200 bg-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
        />
      </div>

      <div className="relative">
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
          <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-2xl shadow-xl border border-pink-100 p-5 z-20">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-brand-pink">FILTER</h3>
              <button onClick={() => setPanelOpen(false)} className="text-red-500 hover:text-red-600">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="mt-4">
              <label className="text-xs font-semibold text-zinc-500">TYPE</label>
              <select
                value={filters.species}
                onChange={(e) => onChange({ ...filters, species: e.target.value as PetFilterState["species"] })}
                className="mt-1 w-full rounded-full border-2 border-brand-pink text-zinc-700 text-sm px-3 py-2 focus:outline-none"
              >
                <option value="all">All Types</option>
                <option value="Dog">Dog</option>
                <option value="Cat">Cat</option>
              </select>
            </div>

            <div className="mt-4">
              <label className="text-xs font-semibold text-zinc-500">BREED</label>
              <input
                type="text"
                placeholder="e.g. Shih Tzu"
                value={filters.breed}
                onChange={(e) => onChange({ ...filters, breed: e.target.value })}
                className="mt-1 w-full rounded-full border-2 border-brand-pink text-zinc-700 text-sm px-3 py-2 focus:outline-none"
              />
            </div>

            <div className="mt-4">
              <label className="text-xs font-semibold text-zinc-500">AGE</label>
              <select
                value={filters.ageSort}
                onChange={(e) => onChange({ ...filters, ageSort: e.target.value as PetFilterState["ageSort"] })}
                className="mt-1 w-full rounded-full border-2 border-brand-pink text-zinc-700 text-sm px-3 py-2 focus:outline-none"
              >
                <option value="none">No sorting</option>
                <option value="youngest">Youngest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
