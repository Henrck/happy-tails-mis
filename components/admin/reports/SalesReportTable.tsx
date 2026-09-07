import type { SalesReportRow } from "@/lib/data/sales-reports-mock";
import SortableHeader, { type SortDirection } from "./SortableHeader";

const columns = [
  { key: "invoiceNumber", label: "Invoice #" },
  { key: "itemName", label: "Item Name" },
  { key: "quantity", label: "Quantity" },
  { key: "unitPrice", label: "Unit Price" },
  { key: "totalPrice", label: "Total Price" },
  { key: "date", label: "Date" },
];

const COLUMN_WIDTHS = ["w-[16%]", "w-[28%]", "w-[13%]", "w-[15%]", "w-[15%]", "w-[13%]"];

export default function SalesReportTable({
  rows, sortKey, sortDirection, onSort,
}: {
  rows: SalesReportRow[]; sortKey: string | null; sortDirection: SortDirection; onSort: (key: string) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E8E8E8] shadow-sm overflow-hidden overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm table-fixed">
        <colgroup>
          {COLUMN_WIDTHS.map((w, i) => <col key={i} className={w} />)}
        </colgroup>
        <thead>
          <tr className="border-b border-[#E8E8E8]">
            {columns.map((col) => (
              <SortableHeader key={col.key} label={col.label} sortKey={col.key} activeSortKey={sortKey} direction={sortDirection} onSort={onSort} />
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={6} className="text-center text-zinc-400 py-10">No sales match your filters.</td></tr>
          ) : (
            rows.map((r) => (
              <tr key={r.invoiceNumber} className="border-b border-[#F1F1F4] last:border-none hover:bg-[#F8F9FC] transition-colors">
                <td className="px-5 py-3.5 font-medium text-zinc-700 truncate">{r.invoiceNumber}</td>
                <td className="px-5 py-3.5 text-zinc-700 truncate" title={r.itemName}>{r.itemName}</td>
                <td className="px-5 py-3.5 text-zinc-700 truncate">{r.quantity}</td>
                <td className="px-5 py-3.5 text-zinc-700 truncate">₱{r.unitPrice.toLocaleString()}</td>
                <td className="px-5 py-3.5 font-semibold text-zinc-800 truncate">₱{(r.quantity * r.unitPrice).toLocaleString()}</td>
                <td className="px-5 py-3.5 text-zinc-500 truncate">{r.displayDate}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
