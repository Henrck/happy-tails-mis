"use client";
import { Fragment, useState } from "react";
import type { ReturnReportRow } from "@/lib/types/reports";
import SortableHeader, { type SortDirection } from "./SortableHeader";

const columns = [
  { key: "returnNumber", label: "Return #" },
  { key: "invoiceNumber", label: "Invoice #" },
  { key: "itemName", label: "Items Replaced" },
  { key: "units", label: "Units" },
  { key: "value", label: "Value" },
  { key: "reason", label: "Reason" },
  { key: "date", label: "Returned" },
];

const REASON_STYLE: Record<ReturnReportRow["reason"], string> = {
  Damaged: "bg-red-50 text-red-600",
  Expired: "bg-amber-50 text-amber-700",
  Other: "bg-zinc-100 text-zinc-600",
};

const money = (value: number) => `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Totals for the filtered returns, shown above the table. */
export function ReturnsStats({ rows }: { rows: ReturnReportRow[] }) {
  const cards = [
    { label: "Total Returns", value: rows.length.toLocaleString("en-US"), icon: "↩️" },
    { label: "Units Replaced", value: rows.reduce((sum, r) => sum + r.units, 0).toLocaleString("en-US"), icon: "📦" },
    { label: "Damaged", value: rows.filter((r) => r.reason === "Damaged").length.toLocaleString("en-US"), icon: "💔" },
    { label: "Expired", value: rows.filter((r) => r.reason === "Expired").length.toLocaleString("en-US"), icon: "⏳" },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="bg-white rounded-2xl border border-[#E8E8E8] shadow-sm px-5 py-4 flex items-center gap-3">
          <span className="text-2xl" aria-hidden="true">{c.icon}</span>
          <div>
            <p className="text-xl font-bold text-zinc-900">{c.value}</p>
            <p className="text-xs text-zinc-500">{c.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ReturnsReportTable({
  rows, sortKey, sortDirection, onSort,
}: {
  rows: ReturnReportRow[];
  sortKey: string | null;
  sortDirection: SortDirection;
  onSort: (key: string) => void;
}) {
  const [expanded, setExpanded] = useState<string[]>([]);
  const toggle = (id: string) => setExpanded((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  return (
    <div className="bg-white rounded-2xl border border-[#E8E8E8] shadow-sm overflow-hidden overflow-x-auto">
      <table className="w-full min-w-[1040px] text-sm table-fixed">
        <colgroup>
          {["w-[12%]", "w-[11%]", "w-[29%]", "w-[7%]", "w-[11%]", "w-[10%]", "w-[12%]", "w-[8%]"].map((w, i) => <col key={i} className={w} />)}
        </colgroup>
        <thead>
          <tr className="border-b border-[#E8E8E8]">
            {columns.map((col) => (
              <SortableHeader key={col.key} label={col.label} sortKey={col.key} activeSortKey={sortKey} direction={sortDirection} onSort={onSort} />
            ))}
            <th className="text-left font-semibold text-zinc-500 px-3 py-3">Details</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={8} className="text-center text-zinc-400 py-10">No returns match your filters.</td></tr>
          ) : rows.map((r) => (
            <Fragment key={r.id}>
              <tr className="border-b border-[#F1F1F4] hover:bg-[#F8F9FC] transition-colors">
                <td className="px-4 py-3.5 font-medium text-zinc-700 truncate">{r.returnNumber}</td>
                <td className="px-4 py-3.5 text-zinc-700 truncate">{r.invoiceNumber}</td>
                <td className="px-4 py-3.5 text-zinc-700 truncate" title={r.itemName}>{r.itemName}</td>
                <td className="px-4 py-3.5 text-zinc-700 tabular-nums">{r.units}</td>
                <td className="px-4 py-3.5 font-semibold text-zinc-800 tabular-nums">{money(r.value)}</td>
                <td className="px-4 py-3.5"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${REASON_STYLE[r.reason]}`}>{r.reason}</span></td>
                <td className="px-4 py-3.5 text-zinc-500 truncate">{r.displayDate}{r.lateOverride && <span className="ml-1.5 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700" title="Accepted after 7 days by a Super Admin">LATE</span>}</td>
                <td className="px-2 py-3.5"><button type="button" aria-expanded={expanded.includes(r.id)} onClick={() => toggle(r.id)} className="border border-[#E8E8E8] text-zinc-600 text-xs font-semibold px-3 py-1.5 rounded-lg hover:border-[#FF5F9E] hover:text-[#FF5F9E]">{expanded.includes(r.id) ? "Hide" : "View"}</button></td>
              </tr>
              {expanded.includes(r.id) && (
                <tr><td colSpan={8} className="px-5 py-4 bg-zinc-50 border-b border-[#E8E8E8]">
                  <div className="grid gap-x-6 gap-y-1 text-xs text-zinc-600 sm:grid-cols-2 lg:grid-cols-4">
                    <p><span className="text-zinc-400">Processed by:</span> <strong className="text-zinc-700">{r.staff}</strong></p>
                    <p><span className="text-zinc-400">Purchased:</span> <strong className="text-zinc-700">{r.purchaseDate}</strong></p>
                    <p><span className="text-zinc-400">Returned:</span> <strong className="text-zinc-700">{new Date(r.createdAt).toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" })}</strong></p>
                    <p><span className="text-zinc-400">Settled as:</span> <strong className="text-zinc-700">Replacement (no refund)</strong></p>
                  </div>
                  {r.note && <p className="mt-2 text-xs text-zinc-600"><span className="text-zinc-400">Note:</span> {r.note}</p>}
                  {r.lateOverride && <p className="mt-1 text-xs font-semibold text-amber-700">Accepted after the 7-day return period by a Super Admin.</p>}
                  <table className="mt-3 text-xs w-full bg-white border border-zinc-200 rounded-lg overflow-hidden">
                    <thead><tr className="bg-zinc-100 text-zinc-600">
                      <th className="text-left p-2">Product</th><th className="text-left p-2">Category</th><th className="text-right p-2">Qty Replaced</th><th className="text-right p-2">Unit Price</th><th className="text-right p-2">Value</th>
                    </tr></thead>
                    <tbody>{r.items.map((item, idx) => (
                      <tr key={`${idx}-${item.name}`} className="border-t border-zinc-100">
                        <td className="p-2">{item.name}</td><td className="p-2">{item.category}</td><td className="p-2 text-right">{item.quantity}</td><td className="p-2 text-right">{money(item.unitPrice)}</td><td className="p-2 text-right">{money(item.quantity * item.unitPrice)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </td></tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
