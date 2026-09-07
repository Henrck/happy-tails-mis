import type { AppointmentRow } from "@/lib/supabase/appointment-management";

const statusStyles: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  checked_in: "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const serviceLabels: Record<string, string> = {
  dog_grooming: "Dog Grooming",
  cat_grooming: "Cat Grooming",
  boarding: "Boarding",
  ala_carte: "Ala Carte",
};

function isToday(dateStr: string) {
  return dateStr === new Date().toISOString().split("T")[0];
}

// FIXED: this table used no column widths at all, so switching filters
// or scope (Today/All History) could visibly shift every column left or
// right depending on how long that page's content happened to be — a
// row with "Hunter, Whiskers (2 pets)" is wider than "Rex," and nothing
// constrained that. table-fixed + explicit widths on every <th> means
// the grid itself never moves; only the text inside each cell changes,
// truncating with an ellipsis if it's too long for its column rather
// than stretching the table.
const COLUMNS: { label: string; width: string }[] = [
  { label: "Pet(s)", width: "w-[16%]" },
  { label: "Owner", width: "w-[14%]" },
  { label: "Service", width: "w-[13%]" },
  { label: "Date & Time", width: "w-[16%]" },
  { label: "Amount", width: "w-[10%]" },
  { label: "Status", width: "w-[13%]" },
  { label: "Action", width: "w-[8%]" },
];

export default function AppointmentsTable({
  rows,
  onView,
}: {
  rows: AppointmentRow[];
  onView: (appointment: AppointmentRow) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-pink-100">
      <table className="w-full min-w-[820px] text-sm table-fixed">
        <colgroup>
          {COLUMNS.map((c) => <col key={c.label} className={c.width} />)}
        </colgroup>
        <thead>
          <tr className="bg-brand-pink text-white">
            {COLUMNS.map((c) => (
              <th key={c.label} className="text-left font-semibold px-4 py-3 truncate">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={COLUMNS.length} className="text-center text-zinc-400 py-10">
                No appointments match your search/filter.
              </td>
            </tr>
          ) : (
            rows.map((a, i) => (
              <tr key={a.id} className={`border-t border-pink-50 hover:bg-brand-tint/60 transition-colors ${i % 2 === 1 ? "bg-zinc-50/50" : ""} ${isToday(a.scheduled_date) ? "border-l-4 border-l-brand-pink" : ""}`}>
                <td className="px-4 py-3.5 font-medium text-zinc-800 truncate" title={a.pets.map((p) => p.name).join(", ")}>
                  {a.pets.map((p) => p.name).join(", ") || "—"}
                  {a.pets.length > 1 && <span className="ml-1.5 text-xs text-zinc-400">({a.pets.length})</span>}
                </td>
                <td className="px-4 py-3.5 text-zinc-600 truncate" title={a.owner_name}>{a.owner_name}</td>
                <td className="px-4 py-3.5 text-zinc-600 truncate">{serviceLabels[a.service_type] ?? a.service_type}</td>
                <td className="px-4 py-3.5 text-zinc-600 truncate">
                  {a.scheduled_date}{a.scheduled_time ? ` · ${a.scheduled_time}` : ""}
                  {isToday(a.scheduled_date) && <span className="ml-1.5 text-[10px] font-bold text-brand-pink">TODAY</span>}
                </td>
                <td className="px-4 py-3.5 text-zinc-800 font-semibold truncate">₱{a.total_amount.toLocaleString()}</td>
                <td className="px-4 py-3.5">
                  <span className={`inline-block max-w-full truncate text-xs font-semibold px-3 py-1 rounded-full ${statusStyles[a.status]}`}>
                    {a.status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <button onClick={() => onView(a)} aria-label="View" className="w-8 h-8 rounded-full border-2 border-brand-pink text-brand-pink flex items-center justify-center hover:bg-brand-pink hover:text-white transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" /><circle cx="12" cy="12" r="3" /></svg>
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
