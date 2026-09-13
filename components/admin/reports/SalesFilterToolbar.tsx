"use client";
import { useState } from "react";
import type { SalesReportRow } from "@/lib/data/sales-reports-mock";
import ExportMenu from "@/components/admin/reports/ExportMenu";
import type { ExportColumn } from "@/lib/utils/report-export";

export type SalesFilterState = {
  search: string;
  fromDate: string;
  toDate: string;
  category: string;
};

type SalesExportRow = SalesReportRow & { totalPrice: number };

const categories = ["All Categories", "Food", "Treats", "Grooming", "Accessories"];

const exportColumns: ExportColumn<SalesExportRow>[] = [
  { header: "Invoice #", accessor: (r) => r.invoiceNumber },
  { header: "Item", accessor: (r) => r.itemName },
  { header: "Category", accessor: (r) => r.category },
  { header: "Quantity", accessor: (r) => r.quantity },
  { header: "Unit Price", accessor: (r) => r.unitPrice },
  { header: "Total", accessor: (r) => r.totalPrice },
  { header: "Date", accessor: (r) => r.displayDate },
];

export default function SalesFilterToolbar({
  filters, onApply, onReset, rows,
}: {
  filters: SalesFilterState; onApply: (f: SalesFilterState) => void; onReset: () => void;
  rows: SalesExportRow[];
}) {
  const [draft, setDraft] = useState(filters);
  const [prevFilters, setPrevFilters] = useState(filters);
  if (filters !== prevFilters) {
    setPrevFilters(filters);
    setDraft(filters);
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E8E8E8] shadow-sm px-4 py-3 flex flex-wrap items-center gap-2.5">
      <div className="relative flex-1 min-w-[180px]">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
          <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" strokeLinecap="round" />
        </svg>
        <input type="text" placeholder="Search sales" value={draft.search} onChange={(e) => setDraft({ ...draft, search: e.target.value })} className="w-full rounded-lg border border-[#E8E8E8] bg-[#F8F9FC] pl-9 pr-3 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#FF5F9E]/40" />
      </div>

      <input type="date" value={draft.fromDate} onChange={(e) => setDraft({ ...draft, fromDate: e.target.value })} className="rounded-lg border border-[#E8E8E8] bg-[#F8F9FC] px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#FF5F9E]/40" />
      <span className="text-zinc-300 text-sm">–</span>
      <input type="date" value={draft.toDate} onChange={(e) => setDraft({ ...draft, toDate: e.target.value })} className="rounded-lg border border-[#E8E8E8] bg-[#F8F9FC] px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#FF5F9E]/40" />

      <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className="rounded-lg border border-[#E8E8E8] bg-[#F8F9FC] px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#FF5F9E]/40">
        {categories.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>

      <button type="button" onClick={() => onApply(draft)} className="bg-[#FF5F9E] hover:bg-[#e0538c] text-white font-semibold text-sm px-5 py-2 rounded-lg transition-colors">Apply</button>
      <button type="button" onClick={onReset} className="border border-[#E8E8E8] text-zinc-600 font-medium text-sm px-4 py-2 rounded-lg hover:bg-zinc-50 transition-colors">Reset</button>

      <ExportMenu title="Sales Reports" columns={exportColumns} rows={rows} filename="sales-reports" />
    </div>
  );
}
