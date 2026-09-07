import type { Customer } from "@/lib/types/users";

// Same fix as AppointmentsTable: table-fixed + explicit column widths
// via colgroup, so the grid never shifts when the underlying data
// changes (searching, filtering, or just different customers loading).
const COLUMNS: { label: string; width: string }[] = [
  { label: "Customer Name", width: "w-[24%]" },
  { label: "Customer ID", width: "w-[16%]" },
  { label: "Email", width: "w-[24%]" },
  { label: "Phone Number", width: "w-[16%]" },
  { label: "Status", width: "w-[12%]" },
  { label: "Action", width: "w-[8%]" },
];

export default function CustomerTable({ customers, onView }: { customers: Customer[]; onView: (c: Customer) => void }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-pink-100">
      <table className="w-full min-w-[760px] text-sm table-fixed">
        <colgroup>
          {COLUMNS.map((c) => <col key={c.label} className={c.width} />)}
        </colgroup>
        <thead>
          <tr className="bg-brand-pink text-white sticky top-0">
            {COLUMNS.map((c) => (
              <th key={c.label} className="text-left font-semibold px-5 py-3 truncate">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {customers.length === 0 ? (
            <tr><td colSpan={COLUMNS.length} className="text-center text-zinc-400 py-10">No records found.</td></tr>
          ) : (
            customers.map((c, i) => (
              <tr key={c.id} className={`border-t border-pink-50 hover:bg-brand-tint/60 transition-colors ${i % 2 === 1 ? "bg-zinc-50/50" : ""}`}>
                <td className="px-5 py-3.5 font-medium text-zinc-800 truncate" title={c.full_name}>{c.full_name}</td>
                <td className="px-5 py-3.5 text-zinc-600 truncate">{c.customer_id}</td>
                <td className="px-5 py-3.5 text-zinc-600 truncate" title={c.email ?? undefined}>{c.email ?? "—"}</td>
                <td className="px-5 py-3.5 text-zinc-600 truncate">{c.phone_number ?? "—"}</td>
                <td className="px-5 py-3.5">
                  <span className={`inline-block max-w-full truncate text-xs font-semibold px-3 py-1 rounded-full ${c.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-500"}`}>
                    {c.status === "active" ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <button onClick={() => onView(c)} aria-label={`View ${c.full_name}`} className="text-brand-pink hover:text-brand-pink-dark border border-brand-pink rounded-full p-1.5 transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 7v10a2 2 0 0 0 2 2h4l2 2 2-2h4a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-4l-2-2-2 2H5a2 2 0 0 0-2 2z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
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
