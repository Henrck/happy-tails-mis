import type { ServiceReport, ReportStatus } from "@/lib/data/service-reports-mock";
import SortableHeader, { type SortDirection } from "./SortableHeader";

// NOTE (unrelated to this width fix, flagging since I noticed it while
// in here): this table's data still comes from
// lib/data/service-reports-mock. Not fixing that now, just not hiding
// it either.
const statusStyles: Record<ReportStatus, string> = {
  Completed: "bg-emerald-50 text-emerald-600",
  Ongoing: "bg-blue-50 text-blue-600",
  Scheduled: "bg-amber-50 text-amber-600",
  Cancelled: "bg-red-50 text-red-500",
};

const columns: { key: string; label: string }[] = [
  { key: "id", label: "ID" },
  { key: "pet", label: "Pet" },
  { key: "owner", label: "Owner" },
  { key: "service", label: "Service" },
  { key: "date", label: "Date" },
  { key: "status", label: "Status" },
];

const COLUMN_WIDTHS = ["w-[10%]", "w-[16%]", "w-[18%]", "w-[18%]", "w-[14%]", "w-[13%]", "w-[11%]"];

export default function ReportTable({
  rows,
  onView,
  sortKey,
  sortDirection,
  onSort,
}: {
  rows: ServiceReport[];
  onView: (r: ServiceReport) => void;
  sortKey: string | null;
  sortDirection: SortDirection;
  onSort: (key: string) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E8E8E8] shadow-sm overflow-hidden overflow-x-auto">
      <table className="w-full min-w-[860px] text-sm table-fixed">
        <colgroup>
          {COLUMN_WIDTHS.map((w, i) => <col key={i} className={w} />)}
        </colgroup>
        <thead>
          <tr className="border-b border-[#E8E8E8]">
            {columns.map((col) => (
              <SortableHeader key={col.key} label={col.label} sortKey={col.key} activeSortKey={sortKey} direction={sortDirection} onSort={onSort} />
            ))}
            <th className="text-left font-semibold text-zinc-500 px-5 py-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={7} className="text-center text-zinc-400 py-10">No reports match your filters.</td></tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id} className="border-b border-[#F1F1F4] last:border-none hover:bg-[#F8F9FC] transition-colors">
                <td className="px-5 py-3.5 font-medium text-zinc-700 truncate">{r.id}</td>
                <td className="px-5 py-3.5 text-zinc-700 truncate" title={r.pet}>{r.pet}</td>
                <td className="px-5 py-3.5 text-zinc-700 truncate" title={r.owner}>{r.owner}</td>
                <td className="px-5 py-3.5 text-zinc-700 truncate">{r.service}</td>
                <td className="px-5 py-3.5 text-zinc-500 truncate">{r.displayDate}</td>
                <td className="px-5 py-3.5">
                  <span className={`inline-block max-w-full truncate text-xs font-semibold px-3 py-1 rounded-full ${statusStyles[r.status]}`}>{r.status}</span>
                </td>
                <td className="px-5 py-3.5">
                  <button onClick={() => onView(r)} className="flex items-center gap-1.5 border border-[#E8E8E8] text-zinc-600 text-xs font-semibold px-3 py-1.5 rounded-lg hover:border-[#FF5F9E] hover:text-[#FF5F9E] transition-colors">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    View
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
