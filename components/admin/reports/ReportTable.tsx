import type { ServiceReport, ReportStatus } from "@/lib/data/service-reports-mock";
import SortableHeader, { type SortDirection } from "./SortableHeader";

const statusStyles: Record<ReportStatus, string> = {
  Completed: "bg-emerald-50 text-emerald-600",
  Ongoing: "bg-blue-50 text-blue-600",
  Scheduled: "bg-amber-50 text-amber-600",
  Cancelled: "bg-red-50 text-red-500",
};

const columns = [
  { key: "id", label: "Service ID" },
  { key: "pet", label: "Pet" },
  { key: "owner", label: "Owner" },
  { key: "service", label: "Service" },
  { key: "source", label: "Source" },
  { key: "amount", label: "Service Charge" },
  { key: "date", label: "Date" },
  { key: "status", label: "Status" },
];

function peso(value: number) {
  return `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ReportTable({
  rows, onView, sortKey, sortDirection, onSort,
}: {
  rows: ServiceReport[];
  onView: (r: ServiceReport) => void;
  sortKey: string | null;
  sortDirection: SortDirection;
  onSort: (key: string) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E8E8E8] shadow-sm overflow-hidden overflow-x-auto">
      <table className="w-full min-w-[1150px] text-sm table-fixed">
        <colgroup>
          {["w-[9%]", "w-[12%]", "w-[14%]", "w-[18%]", "w-[10%]", "w-[13%]", "w-[10%]", "w-[8%]", "w-[6%]"].map((w, i) => <col key={i} className={w} />)}
        </colgroup>
        <thead>
          <tr className="border-b border-[#E8E8E8]">
            {columns.map((col) => (
              <SortableHeader key={col.key} label={col.label} sortKey={col.key} activeSortKey={sortKey} direction={sortDirection} onSort={onSort} />
            ))}
            <th className="text-left font-semibold text-zinc-500 px-3 py-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={9} className="text-center text-zinc-400 py-10">No service reports match your filters.</td></tr>
          ) : rows.map((r) => (
            <tr key={r.appointmentPetId} className="border-b border-[#F1F1F4] last:border-none hover:bg-[#F8F9FC] transition-colors">
              <td className="px-4 py-3.5 font-semibold text-zinc-700 truncate">{r.id}</td>
              <td className="px-4 py-3.5 text-zinc-700 truncate" title={r.pet}>{r.pet}</td>
              <td className="px-4 py-3.5 text-zinc-700 truncate" title={r.owner}>{r.owner}</td>
              <td className="px-4 py-3.5 text-zinc-700 truncate" title={r.service}>{r.service}</td>
              <td className="px-4 py-3.5"><span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${r.source === "Walk-in" ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-700"}`}>{r.source}</span></td>
              <td className="px-4 py-3.5 font-medium text-zinc-700 tabular-nums">{peso(r.amount)}</td>
              <td className="px-4 py-3.5 text-zinc-500 truncate">{r.displayDate}</td>
              <td className="px-4 py-3.5"><span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${statusStyles[r.status]}`}>{r.status}</span></td>
              <td className="px-2 py-3.5"><button type="button" onClick={() => onView(r)} className="border border-[#E8E8E8] text-zinc-600 text-xs font-semibold px-3 py-1.5 rounded-lg hover:border-[#FF5F9E] hover:text-[#FF5F9E]">View</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
