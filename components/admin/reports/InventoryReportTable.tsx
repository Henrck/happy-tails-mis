import type { InventoryReportRow, InventoryReportStatus } from "@/lib/data/inventory-reports-mock";
import SortableHeader, { type SortDirection } from "./SortableHeader";

// NOTE (unrelated to this width fix, flagging since I noticed it while
// in here): this table's data still comes from
// lib/data/inventory-reports-mock, a separate mock from the real
// Inventory module — not the same data ProductsTable/StocksTable now
// use. Not fixing that now, just not hiding it either.
const statusStyles: Record<InventoryReportStatus, string> = {
  "In Stock": "bg-emerald-50 text-emerald-600",
  "Low Stock": "bg-amber-50 text-amber-600",
  "Out of Stock": "bg-red-50 text-red-500",
};

const columns = [
  { key: "id", label: "ID" },
  { key: "itemName", label: "Item Name" },
  { key: "category", label: "Category" },
  { key: "stock", label: "Stock" },
  { key: "unit", label: "Unit" },
  { key: "price", label: "Price" },
  { key: "status", label: "Status" },
];

const COLUMN_WIDTHS = ["w-[10%]", "w-[24%]", "w-[15%]", "w-[11%]", "w-[11%]", "w-[13%]", "w-[16%]"];

export default function InventoryReportTable({
  rows, sortKey, sortDirection, onSort,
}: {
  rows: InventoryReportRow[]; sortKey: string | null; sortDirection: SortDirection; onSort: (key: string) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E8E8E8] shadow-sm overflow-hidden overflow-x-auto">
      <table className="w-full min-w-[800px] text-sm table-fixed">
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
            <tr><td colSpan={7} className="text-center text-zinc-400 py-10">No inventory items match your filters.</td></tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id} className="border-b border-[#F1F1F4] last:border-none hover:bg-[#F8F9FC] transition-colors">
                <td className="px-5 py-3.5 font-medium text-zinc-700 truncate">{r.id}</td>
                <td className="px-5 py-3.5 text-zinc-700 truncate" title={r.itemName}>{r.itemName}</td>
                <td className="px-5 py-3.5 text-zinc-700 truncate">{r.category}</td>
                <td className="px-5 py-3.5 text-zinc-700 truncate">{r.stock}</td>
                <td className="px-5 py-3.5 text-zinc-500 truncate">{r.unit}</td>
                <td className="px-5 py-3.5 text-zinc-700 truncate">₱{r.price.toLocaleString()}</td>
                <td className="px-5 py-3.5"><span className={`inline-block max-w-full truncate text-xs font-semibold px-3 py-1 rounded-full ${statusStyles[r.status]}`}>{r.status}</span></td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
