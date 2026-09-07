"use client";
import { useState, useEffect } from "react";

export type InventoryFilterState = {
  search: string;
  category: string;
  expiration: "all" | "expiring_soon" | "no_expiration";
  status: "all" | "In Stock" | "Low Stock" | "Out of Stock";
  unit: string;
};

const categories = ["All Categories", "Food", "Grooming", "Accessories", "Hygiene"];
const units = ["All Units", "Kilo", "Liters", "Piece"];

export default function InventoryFilterToolbar({
  filters,
  onApply,
  onReset,
}: {
  filters: InventoryFilterState;
  onApply: (f: InventoryFilterState) => void;
  onReset: () => void;
}) {
  const [draft, setDraft] = useState(filters);
  const [exportOpen, setExportOpen] = useState(false);
  useEffect(() => setDraft(filters), [filters]);

  return (
    <div className="bg-white rounded-2xl border border-[#E8E8E8] shadow-sm px-4 py-3 flex flex-wrap items-center gap-2.5">
      <div className="relative flex-1 min-w-[180px]">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
          <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" strokeLinecap="round" />
        </svg>
        <input type="text" placeholder="Search inventory" value={draft.search} onChange={(e) => setDraft({ ...draft, search: e.target.value })} className="w-full rounded-lg border border-[#E8E8E8] bg-[#F8F9FC] pl-9 pr-3 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#FF5F9E]/40" />
      </div>

      <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className="rounded-lg border border-[#E8E8E8] bg-[#F8F9FC] px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#FF5F9E]/40">
        {categories.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>

      <select value={draft.expiration} onChange={(e) => setDraft({ ...draft, expiration: e.target.value as InventoryFilterState["expiration"] })} className="rounded-lg border border-[#E8E8E8] bg-[#F8F9FC] px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#FF5F9E]/40">
        <option value="all">All Expirations</option>
        <option value="expiring_soon">Expiring Soon</option>
        <option value="no_expiration">No Expiration</option>
      </select>

      <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as InventoryFilterState["status"] })} className="rounded-lg border border-[#E8E8E8] bg-[#F8F9FC] px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#FF5F9E]/40">
        <option value="all">All Statuses</option>
        <option value="In Stock">In Stock</option>
        <option value="Low Stock">Low Stock</option>
        <option value="Out of Stock">Out of Stock</option>
      </select>

      <select value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} className="rounded-lg border border-[#E8E8E8] bg-[#F8F9FC] px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#FF5F9E]/40">
        {units.map((u) => <option key={u} value={u}>{u}</option>)}
      </select>

      <button type="button" onClick={() => onApply(draft)} className="bg-[#FF5F9E] hover:bg-[#e0538c] text-white font-semibold text-sm px-5 py-2 rounded-lg transition-colors">Apply</button>
      <button type="button" onClick={onReset} className="border border-[#E8E8E8] text-zinc-600 font-medium text-sm px-4 py-2 rounded-lg hover:bg-zinc-50 transition-colors">Reset</button>

      <div className="relative ml-auto">
        <button type="button" onClick={() => setExportOpen((v) => !v)} className="flex items-center gap-1.5 border border-[#E8E8E8] text-zinc-600 font-medium text-sm px-4 py-2 rounded-lg hover:bg-zinc-50 transition-colors">
          Export
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        {exportOpen && (
          <div className="absolute right-0 top-full mt-1.5 w-36 bg-white rounded-lg shadow-lg border border-[#E8E8E8] py-1.5 z-20">
            {["PDF", "Excel", "CSV", "Print"].map((opt) => (
              <button type="button" key={opt} onClick={() => setExportOpen(false)} className="w-full text-left px-4 py-2 text-sm text-zinc-600 hover:bg-[#F8F9FC] transition-colors">{opt}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
