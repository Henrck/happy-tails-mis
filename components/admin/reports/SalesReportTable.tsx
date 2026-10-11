"use client";
import { Fragment, useState } from "react";
import type { SalesReportRow } from "@/lib/data/sales-reports-mock";
import SortableHeader, { type SortDirection } from "./SortableHeader";

const columns = [
  { key: "invoiceNumber", label: "Invoice #" },
  { key: "itemName", label: "Items" },
  { key: "quantity", label: "Units" },
  { key: "totalPrice", label: "Total Sale" },
  { key: "cashReceived", label: "Cash Received" },
  { key: "changeGiven", label: "Change Given" },
  { key: "date", label: "Date" },
];

function money(value: number | null) {
  if (value === null) return "—";
  return `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function SalesReportTable({
  rows, sortKey, sortDirection, onSort,
}: {
  rows: SalesReportRow[];
  sortKey: string | null;
  sortDirection: SortDirection;
  onSort: (key: string) => void;
}) {
  const [expanded, setExpanded] = useState<string[]>([]);
  const toggle = (id: string) => setExpanded((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  return (
    <div className="bg-white rounded-2xl border border-[#E8E8E8] shadow-sm overflow-hidden overflow-x-auto">
      <table className="w-full min-w-[1120px] text-sm table-fixed">
        <colgroup>
          {["w-[14%]", "w-[23%]", "w-[8%]", "w-[13%]", "w-[13%]", "w-[13%]", "w-[10%]", "w-[6%]"].map((w, i) => <col key={i} className={w} />)}
        </colgroup>
        <thead>
          <tr className="border-b border-[#E8E8E8]">
            {columns.map((col) => (
              <SortableHeader key={col.key} label={col.label} sortKey={col.key} activeSortKey={sortKey} direction={sortDirection} onSort={onSort} />
            ))}
            <th className="text-left font-semibold text-zinc-500 px-3 py-3">Items</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={8} className="text-center text-zinc-400 py-10">No sales match your filters.</td></tr>
          ) : rows.map((r) => (
            <Fragment key={r.id}>
              <tr className="border-b border-[#F1F1F4] hover:bg-[#F8F9FC] transition-colors">
                <td className="px-4 py-3.5 font-medium text-zinc-700 truncate">{r.invoiceNumber}</td>
                <td className="px-4 py-3.5 text-zinc-700 truncate" title={r.itemName}>{r.itemName}</td>
                <td className="px-4 py-3.5 text-zinc-700 tabular-nums">{r.quantity}</td>
                <td className="px-4 py-3.5 font-semibold text-zinc-800 tabular-nums">{money(r.totalPrice)}</td>
                <td className="px-4 py-3.5 text-zinc-700 tabular-nums">{money(r.cashReceived)}</td>
                <td className="px-4 py-3.5 font-medium text-zinc-700 tabular-nums">{money(r.changeGiven)}</td>
                <td className="px-4 py-3.5 text-zinc-500 truncate">{r.displayDate}</td>
                <td className="px-2 py-3.5"><button type="button" aria-expanded={expanded.includes(r.id)} onClick={() => toggle(r.id)} className="border border-[#E8E8E8] text-zinc-600 text-xs font-semibold px-3 py-1.5 rounded-lg hover:border-[#FF5F9E] hover:text-[#FF5F9E]">{expanded.includes(r.id) ? "Hide" : "View"}</button></td>
              </tr>
              {expanded.includes(r.id) && (
                <tr><td colSpan={8} className="px-5 py-4 bg-zinc-50 border-b border-[#E8E8E8]">
                  <p className="text-xs font-semibold text-zinc-600 mb-2">Invoice {r.invoiceNumber} · {r.paymentMethod} · {r.items.length} product line(s)</p>
                  <table className="text-xs w-full bg-white border border-zinc-200 rounded-lg overflow-hidden">
                    <thead><tr className="bg-zinc-100 text-zinc-600">
                      <th className="text-left p-2">Product</th><th className="text-left p-2">Category</th><th className="text-right p-2">Qty</th><th className="text-right p-2">Unit Price</th><th className="text-right p-2">Line Total</th>
                    </tr></thead>
                    <tbody>{r.items.map((item, idx) => (
                      <tr key={`${idx}-${item.name}`} className="border-t border-zinc-100">
                        <td className="p-2">{item.name}</td><td className="p-2">{item.category}</td><td className="p-2 text-right">{item.quantity}</td><td className="p-2 text-right">{money(item.unitPrice)}</td><td className="p-2 text-right">{money(item.lineTotal)}</td>
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
