import type { StaffMember } from "@/lib/types/users";

const COLUMNS: { label: string; width: string }[] = [
  { label: "Staff Name", width: "w-[28%]" },
  { label: "Employee ID", width: "w-[20%]" },
  { label: "Role", width: "w-[24%]" },
  { label: "Status", width: "w-[16%]" },
  { label: "Action", width: "w-[12%]" },
];

export default function StaffTable({ staff, onView }: { staff: StaffMember[]; onView: (s: StaffMember) => void }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-pink-100">
      <table className="w-full min-w-[680px] text-sm table-fixed">
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
          {staff.length === 0 ? (
            <tr><td colSpan={COLUMNS.length} className="text-center text-zinc-400 py-10">No records found.</td></tr>
          ) : (
            staff.map((s, i) => (
              <tr key={s.id} className={`border-t border-pink-50 hover:bg-brand-tint/60 transition-colors ${i % 2 === 1 ? "bg-zinc-50/50" : ""}`}>
                <td className="px-5 py-3.5 font-medium text-zinc-800 truncate" title={`${s.first_name} ${s.last_name}`}>{s.first_name} {s.last_name}</td>
                <td className="px-5 py-3.5 text-zinc-600 truncate">{s.employee_id}</td>
                <td className="px-5 py-3.5 text-zinc-600 truncate" title={s.job_title}>{s.job_title}</td>
                <td className="px-5 py-3.5">
                  <span className={`inline-block max-w-full truncate text-xs font-semibold px-3 py-1 rounded-full ${s.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-500"}`}>
                    {s.status === "active" ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <button onClick={() => onView(s)} aria-label={`View ${s.first_name}`} className="text-brand-pink hover:text-brand-pink-dark border border-brand-pink rounded-full p-1.5 transition-colors">
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
