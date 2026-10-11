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

const categories = ["All Categories", "Food", "Treats", "Grooming", "Accessories", "Hygiene"];

const exportColumns: ExportColumn<SalesReportRow>[] = [
  { header: "Invoice #", accessor: (r) => r.invoiceNumber },
  { header: "Products", accessor: (r) => r.itemName },
  { header: "Total Units", accessor: (r) => r.quantity },
  { header: "Total Sale (PHP)", accessor: (r) => r.totalPrice },
  { header: "Cash Received (PHP)", accessor: (r) => r.cashReceived ?? "" },
  { header: "Change Given (PHP)", accessor: (r) => r.changeGiven ?? "" },
  { header: "Payment Method", accessor: (r) => r.paymentMethod },
  { header: "Date", accessor: (r) => r.displayDate },
];

export default function SalesFilterToolbar({
  filters, onApply, onReset, rows,
}: {
  filters: SalesFilterState;
  onApply: (f: SalesFilterState) => void;
  onReset: () => void;
  rows: SalesReportRow[];
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
      <input type="text" aria-label="Search invoices or products" placeholder="Search invoice or product" value={draft.search} onChange={(e) => setDraft({ ...draft, search: e.target.value })} className={`${cls} flex-1 min-w-[175px]`} />
      <input type="date" aria-label="From date" value={draft.fromDate} onChange={(e) => setDraft({ ...draft, fromDate: e.target.value })} className={cls} />
      <span className="text-zinc-300 text-sm">–</span>
      <input type="date" aria-label="To date" value={draft.toDate} onChange={(e) => setDraft({ ...draft, toDate: e.target.value })} className={cls} />
      <select aria-label="Product category" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className={cls}>
        {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
      </select>
      <button type="button" onClick={() => onApply(draft)} className="bg-[#FF5F9E] hover:bg-[#e0538c] text-white font-semibold text-sm px-5 py-2 rounded-lg">Apply</button>
      <button type="button" onClick={onReset} className="border border-[#E8E8E8] text-zinc-600 font-medium text-sm px-4 py-2 rounded-lg hover:bg-zinc-50">Reset</button>
      <ExportMenu title="Sales Reports (One Row Per Invoice)" columns={exportColumns} rows={rows} filename="sales-invoice-reports" />
    </div>
  );
}
