import type { AppointmentRow } from "@/lib/supabase/appointment-management";
import { CalendarClock, Eye } from "lucide-react";

const statusStyles: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700", confirmed: "bg-blue-100 text-blue-700",
  checked_in: "bg-purple-100 text-purple-700", completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};
const serviceLabels: Record<string, string> = {
  dog_grooming: "Dog Grooming", cat_grooming: "Cat Grooming", boarding: "Boarding", ala_carte: "Ala Carte",
};
function isToday(date: string) {
  return date === new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
const COLUMNS = ["Pet(s)", "Owner", "Service", "Date & Time", "Amount", "Status", "Actions"];
export default function AppointmentsTable({ rows, onView, onReschedule }: {
  rows: AppointmentRow[];
  onView: (appointment: AppointmentRow) => void;
  onReschedule?: (appointment: AppointmentRow) => void;
}) {
  return <div className="overflow-x-auto rounded-2xl border border-pink-100">
    <table className="w-full min-w-[900px] table-fixed text-sm">
      <colgroup><col className="w-[17%]"/><col className="w-[14%]"/><col className="w-[13%]"/><col className="w-[17%]"/><col className="w-[10%]"/><col className="w-[12%]"/><col className="w-[17%]"/></colgroup>
      <thead className="bg-brand-pink text-white"><tr>{COLUMNS.map(label => <th key={label} className="px-3 py-3 text-left font-semibold">{label}</th>)}</tr></thead>
      <tbody>{rows.length === 0 ? <tr><td colSpan={7} className="py-10 text-center text-zinc-400">No appointments match your search/filter.</td></tr>
        : rows.map((a, i) => <tr key={a.id} className={`border-t border-pink-50 transition-colors hover:bg-brand-tint/60 ${i % 2 ? "bg-zinc-50/50" : ""} ${isToday(a.scheduled_date) ? "border-l-4 border-l-brand-pink" : ""}`}>
          <td className="truncate px-3 py-3.5 font-medium text-zinc-800" title={a.pets.map(p => p.name).join(", ")}>{a.pets.map(p => p.name).join(", ") || "—"}{a.pets.length > 1 && <span className="ml-1 text-xs text-zinc-400">({a.pets.length})</span>}</td>
          <td className="truncate px-3 py-3.5 text-zinc-600" title={a.owner_name}>{a.owner_name}</td>
          <td className="truncate px-3 py-3.5 text-zinc-600">{serviceLabels[a.service_type] ?? a.service_type}</td>
          <td className="px-3 py-3.5 text-zinc-600">
            <div className="truncate">{a.scheduled_date}{a.scheduled_time ? ` · ${a.scheduled_time}` : ""}{isToday(a.scheduled_date) && <span className="ml-1 text-[10px] font-bold text-brand-pink">TODAY</span>}</div>
            {(a as AppointmentRow & { last_reschedule_reason?: string | null }).last_reschedule_reason &&
              <div className="mt-1 break-words rounded-md bg-amber-50 px-2 py-1 text-[11px] leading-4 text-amber-800"
                title={(a as AppointmentRow & { last_reschedule_reason?: string | null }).last_reschedule_reason ?? ""}>
                <span className="font-bold">Rescheduled:</span> {(a as AppointmentRow & { last_reschedule_reason?: string | null }).last_reschedule_reason}
              </div>}
          </td>
          <td className="truncate px-3 py-3.5 font-semibold text-zinc-800">₱{a.total_amount.toLocaleString()}</td>
          <td className="px-3 py-3.5"><span className={`inline-block max-w-full truncate rounded-full px-2 py-1 text-xs font-semibold ${statusStyles[a.status]}`}>{a.status.replace(/_/g, " ")}</span></td>
          <td className="px-3 py-3.5"><div className="flex items-center gap-1.5">
            <button type="button" aria-label={`View ${a.owner_name}'s appointment`} title="View" onClick={() => onView(a)} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-brand-pink text-brand-pink hover:bg-brand-pink hover:text-white"><Eye size={17}/></button>
            {onReschedule && (a.status === "pending" || a.status === "confirmed") && <button type="button" onClick={() => onReschedule(a)} className="inline-flex min-h-9 items-center gap-1 rounded-full border border-brand-pink px-2.5 text-xs font-semibold text-brand-pink hover:bg-pink-50"><CalendarClock size={15}/>Resched</button>}
          </div></td>
        </tr>)}
      </tbody>
    </table>
  </div>;
}
