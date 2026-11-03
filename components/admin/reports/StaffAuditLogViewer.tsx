"use client";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Download, Eye, RefreshCw, Search, X } from "lucide-react";
import { fetchStaffAuditPage, type StaffAuditEntry, type AuditFilters } from "@/lib/supabase/staff-audit";
const CATEGORIES = ["Appointments", "Check-in & Checkout", "POS & Sales", "Inventory", "Boarding", "Pet Records", "Service Management", "User Management", "Website Management", "Account Security"];
const empty: AuditFilters = { search: "", module: "all", severity: "all", fromDate: "", toDate: "" };
const inManila = (iso: string) => new Date(iso).toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" });
const safeCell = (s: string) => /^[\s]*[=+\-@\t\r]/.test(s) ? `'${s}` : s;
const csvCell = (value: unknown) => `"${safeCell(String(value ?? "")).replace(/"/g, '""')}"`;
const compareText = (item: unknown) => item === undefined ? "—" : item === null ? "None" : typeof item === "object" ? JSON.stringify(item) : String(item);

export default function StaffAuditLogViewer() {
  const [filters, setFilters] = useState<AuditFilters>(empty);
  const [applied, setApplied] = useState<AuditFilters>(empty);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<StaffAuditEntry[]>([]);
  const [count, setCount] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<StaffAuditEntry | null>(null);
  const [refresh, setRefresh] = useState(0);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchStaffAuditPage(applied, page);
      setRows(result.rows); setCount(result.count); setPageSize(result.pageSize); setError(result.error);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load audit logs."); }
    finally { setLoading(false); }
  }, [applied, page, refresh]);
  useEffect(() => { void load(); }, [load]);
  function apply() { setPage(0); setApplied({ ...filters }); }
  function reset() { setPage(0); setFilters(empty); setApplied(empty); }
  function exportCurrentPage() {
    if (!rows.length) return;
    const headers = ["Audit Record ID", "Date (Philippines)", "Staff/Source", "Role", "Module", "Action", "Severity", "Table", "Affected Record Reference", "Fields", "Origin"];
    const data = rows.map(r => [r.id, inManila(r.occurred_at), r.actor_name, r.actor_role, r.module, r.action, r.severity,
      r.entity_table, r.entity_id, r.changed_fields.join("; "), r.origin]);
    const csv = "\uFEFF" + [headers, ...data].map(cols => cols.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `happytails-audit-page-${page + 1}.csv`;
    anchor.click(); URL.revokeObjectURL(url);
  }
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  return <div className="space-y-4">
    <div className="rounded-2xl border border-pink-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-800"><Eye size={17} className="text-brand-pink" /> Event history</div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setRefresh(x => x + 1)} disabled={loading} className="inline-flex items-center gap-1 rounded-full border px-3 py-2 text-xs font-semibold disabled:opacity-40"><RefreshCw size={14} /> Refresh</button>
          <button type="button" onClick={exportCurrentPage} disabled={!rows.length || loading} title="Exports the visible page only" className="inline-flex items-center gap-1 rounded-full border border-pink-200 px-3 py-2 text-xs font-semibold text-brand-pink disabled:opacity-40"><Download size={14} /> Export page</button>
        </div>
      </div>
      <form onSubmit={e => { e.preventDefault(); apply(); }} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <label className="lg:col-span-2"><span className="mb-1 block text-xs font-semibold text-zinc-600">Staff, action, or audit record ID</span><div className="flex items-center gap-2 rounded-xl border px-3"><Search size={16} className="text-zinc-400"/><input value={filters.search} onChange={e=>setFilters(f=>({...f,search:e.target.value}))} placeholder="Search history" className="w-full min-w-0 py-2.5 text-sm outline-none" /></div></label>
        <label><span className="mb-1 block text-xs font-semibold text-zinc-600">Module</span><select value={filters.module} onChange={e=>setFilters(f=>({...f,module:e.target.value}))} className="w-full rounded-xl border bg-white p-2.5 text-sm"><option value="all">All modules</option>{CATEGORIES.map(v=><option key={v} value={v}>{v}</option>)}</select></label>
        <label><span className="mb-1 block text-xs font-semibold text-zinc-600">Priority</span><select value={filters.severity} onChange={e=>setFilters(f=>({...f,severity:e.target.value}))} className="w-full rounded-xl border bg-white p-2.5 text-sm"><option value="all">All priorities</option><option value="critical">Critical</option><option value="high">High</option><option value="info">Info</option></select></label>
        <label><span className="mb-1 block text-xs font-semibold text-zinc-600">From date</span><input type="date" value={filters.fromDate} max={filters.toDate || undefined} onChange={e=>setFilters(f=>({...f,fromDate:e.target.value}))} className="w-full rounded-xl border p-2.5 text-sm" /></label>
        <label><span className="mb-1 block text-xs font-semibold text-zinc-600">To date</span><input type="date" value={filters.toDate} min={filters.fromDate || undefined} onChange={e=>setFilters(f=>({...f,toDate:e.target.value}))} className="w-full rounded-xl border p-2.5 text-sm" /></label>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-6"><button type="submit" className="rounded-full bg-brand-pink px-5 py-2 text-sm font-semibold text-white">Apply filters</button><button type="button" onClick={reset} className="rounded-full border px-5 py-2 text-sm font-semibold">Reset</button></div>
      </form>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-600">
      <span><strong>{count.toLocaleString("en-PH")}</strong> matching events · Past 365 days</span>
      <span>Times shown in Philippine time · Export includes the current page only</span>
    </div>
    {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertTriangle size={18} className="shrink-0" />{error}. Confirm that the audit SQL migration was applied and this account is SuperAdmin.</div>}
    <div className="overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-sm">
      <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-pink-50 text-xs uppercase text-zinc-600"><tr>{["Date / time","Account","Module","Action","Priority","Record ID","Details"].map(h=><th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
        <tbody>{rows.map(row=><tr key={row.id} className="border-t border-pink-50 hover:bg-pink-50/40"><td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-600">{inManila(row.occurred_at)}</td><td className="px-4 py-3"><span className="block font-semibold">{row.actor_name}</span><span className="text-xs text-zinc-500">{row.actor_role === "admin" ? "Staff" : row.actor_role}</span></td><td className="px-4 py-3">{row.module}</td><td className="px-4 py-3 font-medium">{row.action}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${row.severity === "critical" ? "bg-red-50 text-red-700" : row.severity === "high" ? "bg-amber-50 text-amber-700" : "bg-zinc-100 text-zinc-600"}`}>{row.severity}</span></td><td className="px-4 py-3"><span className="block text-sm font-bold text-zinc-800">#{row.id.toLocaleString("en-PH")}</span><span className="text-xs text-zinc-500">{row.entity_table}</span></td><td className="px-4 py-3"><button type="button" onClick={()=>setDetails(row)} className="rounded-full border border-pink-200 px-3 py-1.5 text-xs font-semibold text-brand-pink hover:bg-pink-50">View</button></td></tr>)}
          {!loading && !error && rows.length === 0 && <tr><td colSpan={7} className="p-10 text-center text-zinc-500">No audit events match the selected filters.</td></tr>}
          {loading && <tr><td colSpan={7} className="p-10 text-center text-zinc-500">Loading audit events…</td></tr>}
        </tbody></table></div>
      <div className="flex items-center justify-between border-t p-3 text-sm"><span className="text-zinc-500">Page {page + 1} of {totalPages}</span><div className="flex gap-2"><button type="button" disabled={page === 0 || loading} onClick={()=>setPage(p=>p-1)} className="rounded-lg border p-2 disabled:opacity-40" aria-label="Previous page"><ChevronLeft size={18}/></button><button type="button" disabled={page + 1 >= totalPages || loading} onClick={()=>setPage(p=>p+1)} className="rounded-lg border p-2 disabled:opacity-40" aria-label="Next page"><ChevronRight size={18}/></button></div></div>
    </div>
    {details && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Audit event details" onClick={()=>setDetails(null)}>
      <div className="max-h-[85dvh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-7" onClick={e=>e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-brand-pink">Audit event #{details.id}</p><h2 className="mt-1 text-xl font-bold text-zinc-800">{details.module} · {details.action}</h2></div><button type="button" aria-label="Close details" onClick={()=>setDetails(null)} className="rounded-full border p-2"><X size={18}/></button></div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-zinc-500">When</dt><dd className="font-semibold">{inManila(details.occurred_at)}</dd></div><div><dt className="text-zinc-500">Account</dt><dd className="font-semibold">{details.actor_name} ({details.actor_role})</dd></div><div><dt className="text-zinc-500">Table</dt><dd>{details.entity_table}</dd></div><div><dt className="text-zinc-500">Record ID</dt><dd className="font-bold">#{details.id.toLocaleString("en-PH")}</dd></div>{details.entity_id && <div className="col-span-2"><dt className="text-zinc-500">Affected database record reference</dt><dd className="break-all text-xs text-zinc-600">{details.entity_id}</dd></div>}</dl>
        <h3 className="mt-6 font-bold">Recorded changes</h3>
        {details.changed_fields.length ? <div className="mt-2 overflow-x-auto rounded-xl border"><table className="w-full text-sm"><thead className="bg-zinc-50"><tr><th className="p-2 text-left">Field</th><th className="p-2 text-left">Before</th><th className="p-2 text-left">After</th></tr></thead><tbody>{details.changed_fields.map(f=><tr key={f} className="border-t"><td className="p-2 font-medium">{f.replace(/_/g," ")}</td><td className="max-w-[200px] break-words p-2 text-zinc-500">{compareText(details.before_data[f])}</td><td className="max-w-[200px] break-words p-2">{compareText(details.after_data[f])}</td></tr>)}</tbody></table></div> : <p className="mt-2 text-sm text-zinc-500">No field-level comparison available.</p>}
        {details.origin === "server" && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">This operation ran using a server/system database connection; the individual staff identity was not available.</p>}
        <button type="button" onClick={()=>setDetails(null)} className="mt-5 w-full rounded-full bg-brand-pink p-3 font-semibold text-white">Close</button>
      </div></div>}
  </div>;
}
