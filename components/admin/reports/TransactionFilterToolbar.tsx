"use client";
import { useState, useEffect } from "react";

export type TransactionFilterState = {
  search: string;
  fromDate: string;
  toDate: string;
  status: "all" | "Completed" | "Ongoing" | "Scheduled" | "Cancelled";
  serviceType: string;
};

const serviceTypes = ["All Types", "Grooming", "Boarding", "Consultation"];

export default function TransactionFilterToolbar({
  filters, onApply, onReset,
}: {
  filters: TransactionFilterState; onApply: (f: TransactionFilterState) => void; onReset: () => void;
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
        <input type="text" placeholder="Search transactions" value={draft.search} onChange={(e) => setDraft({ ...draft, search: e.target.value })} className="w-full rounded-lg border border-[#E8E8E8] bg-[#F8F9FC] pl-9 pr-3 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#FF5F9E]/40" />
      </div>

      <input type="date" value={draft.fromDate} onChange={(e) => setDraft({ ...draft, fromDate: e.target.value })} className="rounded-lg border border-[#E8E8E8] bg-[#F8F9FC] px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#FF5F9E]/40" />
      <span className="text-zinc-300 text-sm">–</span>
      <input type="date" value={draft.toDate} onChange={(e) => setDraft({ ...draft, toDate: e.target.value })} className="rounded-lg border border-[#E8E8E8] bg-[#F8F9FC] px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#FF5F9E]/40" />

      <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as TransactionFilterState["status"] })} className="rounded-lg border border-[#E8E8E8] bg-[#F8F9FC] px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#FF5F9E]/40">
        <option value="all">All Statuses</option>
        <option value="Completed">Completed</option>
        <option value="Ongoing">Ongoing</option>
        <option value="Scheduled">Scheduled</option>
        <option value="Cancelled">Cancelled</option>
      </select>

      <select value={draft.serviceType} onChange={(e) => setDraft({ ...draft, serviceType: e.target.value })} className="rounded-lg border border-[#E8E8E8] bg-[#F8F9FC] px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#FF5F9E]/40">
        {serviceTypes.map((t) => <option key={t} value={t}>{t}</option>)}
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
