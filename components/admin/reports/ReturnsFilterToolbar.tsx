"use client";
import { useState } from "react";
import type { ReturnReportRow } from "@/lib/types/reports";
import ExportMenu from "@/components/admin/reports/ExportMenu";
import { dateBounds, formatAmount, type ExportColumn, type ReportSummaryItem } from "@/lib/utils/report-export";

export type ReturnsFilterState = {
  search: string;
  fromDate: string;
  toDate: string;
  reason: "all" | "Damaged" | "Expired" | "Other";
};

const exportColumns: ExportColumn<ReturnReportRow>[] = [
  { header: "Return #", accessor: (r) => r.returnNumber, nowrap: true },
  { header: "Invoice #", accessor: (r) => r.invoiceNumber, nowrap: true },
  { header: "Items Replaced", accessor: (r) => r.itemName },
  { header: "Units", accessor: (r) => r.units, format: "number", total: (rows) => rows.reduce((sum, r) => sum + r.units, 0) },
  { header: "Value (PHP)", accessor: (r) => r.value, format: "currency", total: (rows) => rows.reduce((sum, r) => sum + r.value, 0) },
  { header: "Reason", accessor: (r) => r.reason, nowrap: true },
  { header: "Note", accessor: (r) => r.note ?? "" },
  { header: "Processed By", accessor: (r) => r.staff },
  { header: "Purchased", accessor: (r) => r.purchaseDate, nowrap: true },
  { header: "Returned", accessor: (r) => r.displayDate, nowrap: true },
];

export function returnsSummary(rows: ReturnReportRow[]): ReportSummaryItem[] {
  const count = (reason: ReturnReportRow["reason"]) => rows.filter((r) => r.reason === reason).length;
  return [
    { label: "Total returns", value: String(rows.length) },
    { label: "Units replaced", value: rows.reduce((sum, r) => sum + r.units, 0).toLocaleString("en-US") },
    { label: "Value of replacements", value: `PHP ${formatAmount(rows.reduce((sum, r) => sum + r.value, 0))}` },
    { label: "Damaged / Expired / Other", value: `${count("Damaged")} / ${count("Expired")} / ${count("Other")}` },
  ];
}

export default function ReturnsFilterToolbar({
  filters, onApply, onReset, rows,
}: {
  filters: ReturnsFilterState;
  onApply: (f: ReturnsFilterState) => void;
  onReset: () => void;
  rows: ReturnReportRow[];
}) {
  const [draft, setDraft] = useState(filters);
  const [prevFilters, setPrevFilters] = useState(filters);
  if (filters !== prevFilters) {
    setPrevFilters(filters);
    setDraft(filters);
  }
  const cls = "rounded-lg border border-[#E8E8E8] bg-[#F8F9FC] px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#FF5F9E]/40";
  return (
    <div className="bg-white rounded-2xl border border-[#E8E8E8] shadow-sm px-4 py-3 flex flex-wrap items-center gap-2.5">
      <input type="text" aria-label="Search returns" placeholder="Search return #, invoice #, product or staff" value={draft.search} onChange={(e) => setDraft({ ...draft, search: e.target.value })} className={`${cls} flex-1 min-w-[175px]`} />
      <input type="date" aria-label="From date" value={draft.fromDate} onChange={(e) => setDraft({ ...draft, fromDate: e.target.value })} className={cls} />
      <span className="text-zinc-300 text-sm">–</span>
      <input type="date" aria-label="To date" value={draft.toDate} onChange={(e) => setDraft({ ...draft, toDate: e.target.value })} className={cls} />
      <select aria-label="Return reason" value={draft.reason} onChange={(e) => setDraft({ ...draft, reason: e.target.value as ReturnsFilterState["reason"] })} className={cls}>
        <option value="all">All Reasons</option>
        <option value="Damaged">Damaged</option>
        <option value="Expired">Expired</option>
        <option value="Other">Other</option>
      </select>
      <button type="button" onClick={() => onApply(draft)} className="bg-[#FF5F9E] hover:bg-[#e0538c] text-white font-semibold text-sm px-5 py-2 rounded-lg">Apply</button>
      <button type="button" onClick={onReset} className="border border-[#E8E8E8] text-zinc-600 font-medium text-sm px-4 py-2 rounded-lg hover:bg-zinc-50">Reset</button>
      <ExportMenu title="Returns Reports (Replacements)" columns={exportColumns} rows={rows} filename="returns-reports"
        period={{ kind: "range", from: filters.fromDate || dateBounds(rows, r => r.date).from, to: filters.toDate || dateBounds(rows, r => r.date).to }}
        summary={returnsSummary} />
    </div>
  );
}
