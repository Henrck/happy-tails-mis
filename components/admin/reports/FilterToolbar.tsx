"use client";
import { useState } from "react";
import type { ReportStatus, ServiceCategory, AppointmentSource, ServiceReport } from "@/lib/data/service-reports-mock";
import ExportMenu from "@/components/admin/reports/ExportMenu";
import type { ExportColumn } from "@/lib/utils/report-export";

export type FilterState = {
  search: string;
  reportType: "All Types" | ServiceCategory;
  source: "all" | AppointmentSource;
  fromDate: string;
  toDate: string;
  status: ReportStatus | "all";
};

const exportColumns: ExportColumn<ServiceReport>[] = [
  { header: "Service ID", accessor: (r) => r.id },
  { header: "Appointment ID", accessor: (r) => r.appointmentId },
  { header: "Pet", accessor: (r) => r.pet },
  { header: "Owner", accessor: (r) => r.owner },
  { header: "Category", accessor: (r) => r.category },
  { header: "Service", accessor: (r) => r.service },
  { header: "Source", accessor: (r) => r.source },
  { header: "Service Charge (PHP)", accessor: (r) => r.amount },
  { header: "Date", accessor: (r) => r.displayDate },
  { header: "Status", accessor: (r) => r.status },
];

export default function FilterToolbar({
  filters, onApply, onReset, rows,
}: {
  filters: FilterState;
  onApply: (f: FilterState) => void;
  onReset: () => void;
  rows: ServiceReport[];
}) {
  const [draft, setDraft] = useState(filters);
  const [prevFilters, setPrevFilters] = useState(filters);
  if (filters !== prevFilters) {
    setPrevFilters(filters);
    setDraft(filters);
  }

  const inputCls = "rounded-lg border border-[#E8E8E8] bg-[#F8F9FC] px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#FF5F9E]/40";
  return (
    <div className="bg-white rounded-2xl border border-[#E8E8E8] shadow-sm px-4 py-3 flex flex-wrap items-center gap-2.5">
      <input type="text" aria-label="Search service reports" placeholder="Search ID, pet, or owner" value={draft.search} onChange={(e) => setDraft({ ...draft, search: e.target.value })} className={`${inputCls} flex-1 min-w-[175px]`} />
      <select aria-label="Service category" value={draft.reportType} onChange={(e) => setDraft({ ...draft, reportType: e.target.value as FilterState["reportType"] })} className={inputCls}>
        <option value="All Types">All Service Types</option>
        <option value="Grooming">Grooming</option>
        <option value="Boarding">Boarding</option>
        <option value="Ala Carte">Ala Carte</option>
      </select>
      <select aria-label="Appointment source" value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value as FilterState["source"] })} className={inputCls}>
        <option value="all">All Sources</option>
        <option value="Walk-in">Walk-in</option>
        <option value="Online">Online Appointment</option>
      </select>
      <input type="date" aria-label="From date" value={draft.fromDate} onChange={(e) => setDraft({ ...draft, fromDate: e.target.value })} className={inputCls} />
      <span className="text-zinc-300 text-sm">–</span>
      <input type="date" aria-label="To date" value={draft.toDate} onChange={(e) => setDraft({ ...draft, toDate: e.target.value })} className={inputCls} />
      <select aria-label="Status" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as FilterState["status"] })} className={inputCls}>
        <option value="all">All Statuses</option>
        <option value="Completed">Completed</option>
        <option value="Ongoing">Ongoing</option>
        <option value="Scheduled">Scheduled</option>
        <option value="Cancelled">Cancelled</option>
      </select>
      <button type="button" onClick={() => onApply(draft)} className="bg-[#FF5F9E] hover:bg-[#e0538c] text-white font-semibold text-sm px-5 py-2 rounded-lg">Apply</button>
      <button type="button" onClick={onReset} className="border border-[#E8E8E8] text-zinc-600 font-medium text-sm px-4 py-2 rounded-lg hover:bg-zinc-50">Reset</button>
      <ExportMenu title="Service Reports" columns={exportColumns} rows={rows} filename="service-reports" />
    </div>
  );
}
