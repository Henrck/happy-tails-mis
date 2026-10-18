"use client";

import { useState } from "react";
import type { SessionStage } from "@/lib/data/grooming-sessions-mock";

export type SessionFilterState = { search: string; status: SessionStage | "all"; groomer: string | "all" };

export default function SessionFilters({ filters, onChange, groomerNames, onBack, onOpenHistory, historyCount }: {
  filters: SessionFilterState;
  onChange: (next: SessionFilterState) => void;
  groomerNames: string[];
  onBack: () => void;
  onOpenHistory: () => void;
  historyCount: number;
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const dirty = filters.search !== "" || filters.status !== "all" || filters.groomer !== "all";
  return <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
    <button type="button" onClick={onBack} aria-label="Back" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-pink-200 bg-white text-zinc-600 hover:border-brand-pink"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M5 12l6-6M5 12l6 6" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
    <div className="relative min-w-0 flex-[1_1_180px]"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4" strokeLinecap="round"/></svg><input type="text" placeholder="Search by pet, owner, or groomer" value={filters.search} onChange={e => onChange({ ...filters, search: e.target.value })} className="w-full min-w-0 rounded-full border border-pink-200 bg-white py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"/></div>
    <div className="relative shrink-0"><button type="button" aria-expanded={panelOpen} aria-controls="grooming-filter-panel" onClick={() => setPanelOpen(v => !v)} className="flex items-center gap-2 rounded-full border border-pink-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:border-brand-pink">Filter{dirty ? " •" : ""}<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
    {panelOpen && <div id="grooming-filter-panel" className="absolute right-0 top-full z-30 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-2xl border border-pink-100 bg-white p-5 shadow-xl"><div className="flex items-center justify-between"><h3 className="font-bold text-brand-pink">FILTER</h3><button type="button" onClick={() => setPanelOpen(false)} aria-label="Close filter" className="p-1 text-red-500">✕</button></div>
      <label className="mt-4 block text-xs font-semibold text-zinc-500">STATUS<select value={filters.status} onChange={e => onChange({ ...filters, status: e.target.value as SessionFilterState["status"] })} className="mt-1 w-full min-w-0 rounded-full border-2 border-brand-pink px-3 py-2 text-sm font-normal text-zinc-700 focus:outline-none"><option value="all">All Statuses</option><option value="scheduled">Scheduled</option><option value="in_progress">In Progress</option><option value="completed">Completed</option></select></label>
      <label className="mt-4 block text-xs font-semibold text-zinc-500">GROOMER<select value={filters.groomer} onChange={e => onChange({ ...filters, groomer: e.target.value })} className="mt-1 w-full min-w-0 rounded-full border-2 border-brand-pink px-3 py-2 text-sm font-normal text-zinc-700 focus:outline-none"><option value="all">All Groomers</option>{groomerNames.map(name => <option key={name} value={name}>{name}</option>)}</select></label>
      <button type="button" disabled={!dirty} onClick={() => { onChange({ search: "", status: "all", groomer: "all" }); setPanelOpen(false); }} className="mt-5 w-full rounded-full border border-brand-pink px-4 py-2 text-sm font-semibold text-brand-pink hover:bg-pink-50 disabled:cursor-not-allowed disabled:opacity-40">Clear Filters</button>
    </div>}
    </div>
    <button type="button" onClick={onOpenHistory} className="ml-auto flex items-center gap-2 rounded-full border border-pink-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:border-brand-pink">History <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-pink text-xs font-bold text-white">{historyCount}</span></button>
  </div>;
}
