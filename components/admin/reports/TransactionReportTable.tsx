import type { TransactionReportRow, TransactionStatus } from "@/lib/data/transaction-reports-mock";
import SortableHeader, { type SortDirection } from "./SortableHeader";

// NOTE (unrelated to this width fix, flagging since I noticed it while
// in here): this table's data still comes from
// lib/data/transaction-reports-mock — Report Management hasn't been
// rewired to real data yet, matching what's already tracked as a known
// gap. Not fixing that now, just not hiding it either.
const statusStyles: Record<TransactionStatus, string> = {
  Completed: "bg-emerald-50 text-emerald-600",
  Ongoing: "bg-blue-50 text-blue-600",
  Scheduled: "bg-amber-50 text-amber-600",
  Cancelled: "bg-red-50 text-red-500",
};

const columns = [
  { key: "id", label: "ID" },
  { key: "petName", label: "Pet Name" },
  { key: "ownerName", label: "Owner Name" },
  { key: "service", label: "Service" },
  { key: "amount", label: "Amount" },
  { key: "date", label: "Date" },
  { key: "status", label: "Status" },
];

const COLUMN_WIDTHS = ["w-[10%]", "w-[16%]", "w-[18%]", "w-[18%]", "w-[13%]", "w-[13%]", "w-[12%]"];

export default function TransactionReportTable({
  rows, sortKey, sortDirection, onSort,
}: {
  rows: TransactionReportRow[]; sortKey: string | null; sortDirection: SortDirection; onSort: (key: string) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E8E8E8] shadow-sm overflow-hidden overflow-x-auto">
      <table className="w-full min-w-[820px] text-sm table-fixed">
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
            <tr><td colSpan={7} className="text-center text-zinc-400 py-10">No transactions match your filters.</td></tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id} className="border-b border-[#F1F1F4] last:border-none hover:bg-[#F8F9FC] transition-colors">
                <td className="px-5 py-3.5 font-medium text-zinc-700 truncate">{r.id}</td>
                <td className="px-5 py-3.5 text-zinc-700 truncate" title={r.petName}>{r.petName}</td>
                <td className="px-5 py-3.5 text-zinc-700 truncate" title={r.ownerName}>{r.ownerName}</td>
                <td className="px-5 py-3.5 text-zinc-700 truncate">{r.service}</td>
                <td className="px-5 py-3.5 text-zinc-700 truncate">₱{r.amount.toLocaleString()}</td>
                <td className="px-5 py-3.5 text-zinc-500 truncate">{r.displayDate}</td>
                <td className="px-5 py-3.5"><span className={`inline-block max-w-full truncate text-xs font-semibold px-3 py-1 rounded-full ${statusStyles[r.status]}`}>{r.status}</span></td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
