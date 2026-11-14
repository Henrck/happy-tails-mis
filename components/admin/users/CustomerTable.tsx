import type { Customer } from "@/lib/types/users";

const COLUMNS: { label: string; width: string }[] = [
  { label: "Customer ID", width: "w-[11%]" }, { label: "First Name", width: "w-[11%]" },
  { label: "Middle Name", width: "w-[12%]" }, { label: "Last Name", width: "w-[11%]" },
  { label: "Email", width: "w-[17%]" }, { label: "Phone Number", width: "w-[13%]" },
  { label: "Penalty Count", width: "w-[10%]" }, { label: "Status", width: "w-[9%]" },
  { label: "Actions", width: "w-[6%]" },
];

function splitCustomerName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { first: parts[0] ?? "—", middle: "—", last: "—" };
  if (parts.length === 2) return { first: parts[0], middle: "—", last: parts[1] };
  return { first: parts[0], middle: parts.slice(1, -1).join(" "), last: parts[parts.length - 1] };
}

export default function CustomerTable({ customers, onView }: { customers: Customer[]; onView: (c: Customer) => void }) {
  return <div className="overflow-x-auto rounded-2xl border border-pink-100">
    <table className="w-full min-w-[1240px] table-fixed text-sm">
      <colgroup>{COLUMNS.map((column) => <col key={column.label} className={column.width} />)}</colgroup>
      <thead><tr className="sticky top-0 bg-brand-pink text-white">{COLUMNS.map((column) => <th key={column.label} className="truncate px-3 py-3 text-left font-semibold">{column.label}</th>)}</tr></thead>
      <tbody>{customers.length === 0 ? <tr><td colSpan={COLUMNS.length} className="py-10 text-center text-zinc-400">No records found.</td></tr> : customers.map((customer, index) => {
        const parsed = splitCustomerName(customer.full_name);
        const name = { first: customer.first_name ?? parsed.first, middle: customer.middle_name ?? parsed.middle, last: customer.last_name ?? parsed.last };
        const restricted = Boolean(customer.is_booking_restricted);
        return <tr key={customer.id} className={`border-t border-pink-50 transition-colors hover:bg-brand-tint/60 ${index % 2 ? "bg-zinc-50/50" : ""}`}>
          <td className="truncate px-3 py-3.5 text-zinc-600">{customer.customer_id}</td>
          <td className="truncate px-3 py-3.5 font-medium text-zinc-800" title={name.first}>{name.first}</td>
          <td className="truncate px-3 py-3.5 text-zinc-600" title={name.middle}>{name.middle}</td>
          <td className="truncate px-3 py-3.5 text-zinc-600" title={name.last}>{name.last}</td>
          <td className="truncate px-3 py-3.5 text-zinc-600" title={customer.email ?? undefined}>{customer.email ?? "—"}</td>
          <td className="truncate px-3 py-3.5 text-zinc-600">{customer.phone_number ?? "—"}</td>
          <td className="px-3 py-3.5"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${Number(customer.penalty_count ?? 0) >= 3 ? "bg-red-100 text-red-700" : Number(customer.penalty_count ?? 0) > 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{customer.penalty_count ?? 0}/3</span></td>
          <td className="px-3 py-3.5"><div className="flex flex-col items-start gap-1"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${customer.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-500"}`}>{customer.status === "active" ? "Active" : customer.status === "inactive" ? "Inactive" : "Archived"}</span>{restricted && <span className="rounded-full bg-red-100 px-2 py-1 text-[10px] font-bold text-red-700">Booking restricted</span>}</div></td>
          <td className="px-3 py-3.5"><button onClick={() => onView(customer)} aria-label={`View ${customer.full_name}`} className="rounded-full border border-brand-pink p-1.5 text-brand-pink transition-colors hover:bg-brand-pink hover:text-white"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7v10a2 2 0 0 0 2 2h4l2 2 2-2h4a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-4l-2-2-2 2H5a2 2 0 0 0-2 2z" strokeLinecap="round" strokeLinejoin="round" /></svg></button></td>
        </tr>;
      })}</tbody>
    </table>
  </div>;
}
