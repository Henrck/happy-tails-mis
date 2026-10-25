"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AppointmentRecord = { id: string; service_type: string; scheduled_date: string; scheduled_time: string | null; drop_off_at: string | null; pick_up_at: string | null; status: string; is_walk_in: boolean; special_requests: string | null; created_at: string };
type HistoryRow = { id: string; appointment: AppointmentRecord; amount: number; groomer: string; packageName: string };
const PAGE_SIZE = 5;
const SERVICE_LABELS: Record<string, string> = { dog_grooming: "Dog Grooming", cat_grooming: "Cat Grooming", boarding: "Boarding", ala_carte: "À La Carte" };

function formatDate(date: string) { return new Date(`${date}T12:00:00+08:00`).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", year: "numeric", month: "short", day: "numeric" }); }
function formatTime(time: string | null) {
  if (!time) return "—";
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2,"0")} ${h >= 12 ? "PM" : "AM"}`;
}
function dateTime(iso: string | null) { return iso ? new Date(iso).toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—"; }

export default function PetServiceHistory({ petId }: { petId: string }) {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setPage(1); setExpanded(null); setLoading(true); setError(null);
    (async () => {
      try {
        const supabase = createClient();
        const { data, error: historyError } = await supabase.from("appointment_pets")
          .select("id, appointment_id, groomer_id, package_id, line_amount, appointments!inner(id, service_type, scheduled_date, scheduled_time, drop_off_at, pick_up_at, status, is_walk_in, special_requests, created_at)")
          .eq("pet_id", petId);
        if (historyError) throw historyError;
        type RawRow = { id: string; groomer_id: string | null; package_id: string | null; line_amount: number | null; appointments: AppointmentRecord | AppointmentRecord[] | null };
        const source = (data ?? []) as unknown as RawRow[];
        const groomerIds = [...new Set(source.map(r => r.groomer_id).filter((id): id is string => !!id))];
        const packageIds = [...new Set(source.map(r => r.package_id).filter((id): id is string => !!id))];
        const [groomers, packages] = await Promise.all([
          groomerIds.length ? supabase.from("groomers").select("id,name").in("id", groomerIds) : Promise.resolve({data: [],error:null}),
          packageIds.length ? supabase.from("packages").select("id,name").in("id", packageIds) : Promise.resolve({data: [],error:null}),
        ]);
        // Names are optional metadata. History is still shown when a staff member or package was archived.
        const groomerNames = new Map((groomers.data ?? []).map(r => [r.id as string, r.name as string]));
        const packageNames = new Map((packages.data ?? []).map(r => [r.id as string, r.name as string]));
        const mapped: HistoryRow[] = source.flatMap(r => {
          const appointment = Array.isArray(r.appointments) ? r.appointments[0] : r.appointments;
          if (!appointment) return [];
          return [{ id: r.id, appointment, amount: Number(r.line_amount ?? 0), groomer: r.groomer_id ? groomerNames.get(r.groomer_id) ?? "—" : "—", packageName: r.package_id ? packageNames.get(r.package_id) ?? "—" : "—" }];
        });
        mapped.sort((a,b) => (b.appointment.scheduled_date + (b.appointment.scheduled_time ?? "") + b.appointment.created_at).localeCompare(a.appointment.scheduled_date + (a.appointment.scheduled_time ?? "") + a.appointment.created_at));
        if (alive) setRows(mapped);
      } catch (cause) {
        if (alive) setError(cause instanceof Error ? cause.message : "Unable to load pet service history.");
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [petId]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const visible = useMemo(() => rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [rows, page]);
  return <section className="mt-6 min-w-0 rounded-2xl border border-pink-100 bg-white p-4 sm:p-5" aria-label="Pet service history">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div><h3 className="text-base font-bold text-zinc-800">Service History</h3><p className="mt-1 text-xs text-zinc-500">Appointments for this pet only, most recent first.</p></div>
      {!loading && <span className="rounded-full bg-pink-50 px-3 py-1 text-xs font-semibold text-brand-pink">{rows.length} record{rows.length === 1 ? "" : "s"}</span>}
    </div>
    {loading ? <p className="py-8 text-center text-sm text-zinc-500">Loading service history…</p>
    : error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">Unable to load service history: {error}</p>
    : !rows.length ? <p className="rounded-xl bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">No service appointments recorded for this pet yet.</p>
    : <>
      <div className="w-full overflow-x-auto rounded-xl border border-pink-100">
        <table className="w-full min-w-[660px] border-collapse text-left text-xs sm:text-sm">
          <thead className="bg-pink-50 text-zinc-700"><tr><th className="px-3 py-3 font-bold">Service</th><th className="px-3 py-3 font-bold">Date / Time</th><th className="px-3 py-3 font-bold">Groomer</th><th className="px-3 py-3 font-bold">Status</th><th className="px-3 py-3 font-bold">Details</th></tr></thead>
          <tbody>{visible.map(row => <Fragment key={row.id}><tr className="border-t border-pink-100 align-top">
            <td className="px-3 py-3"><span className="font-semibold text-zinc-800">{SERVICE_LABELS[row.appointment.service_type] ?? row.appointment.service_type}</span><span className="mt-1 block text-[11px] text-zinc-500">{row.appointment.is_walk_in ? "POS Walk-in" : "Customer booking"}</span></td>
            <td className="px-3 py-3 text-zinc-700">{formatDate(row.appointment.scheduled_date)}<span className="block text-zinc-500">{row.appointment.scheduled_time ? formatTime(row.appointment.scheduled_time) : row.appointment.drop_off_at ? dateTime(row.appointment.drop_off_at) : "—"}</span></td>
            <td className="px-3 py-3 text-zinc-700">{row.groomer}</td>
            <td className="px-3 py-3"><span className="rounded-full bg-zinc-100 px-2 py-1 capitalize text-zinc-700">{row.appointment.status.replace(/_/g," ")}</span></td>
            <td className="px-3 py-3"><button type="button" onClick={() => setExpanded(expanded === row.id ? null : row.id)} aria-expanded={expanded === row.id} className="font-semibold text-brand-pink hover:underline">{expanded === row.id ? "Hide" : "View"}</button></td>
          </tr>
          {expanded === row.id && <tr className="border-t border-pink-100 bg-pink-50/40"><td colSpan={5} className="px-4 py-3 text-xs text-zinc-700"><div className="grid gap-2 sm:grid-cols-2"><p><strong>Package:</strong> {row.packageName}</p><p><strong>Pet's service amount:</strong> ₱{row.amount.toLocaleString("en-PH",{minimumFractionDigits:2})}</p><p><strong>Drop-off:</strong> {dateTime(row.appointment.drop_off_at)}</p><p><strong>Pick-up:</strong> {dateTime(row.appointment.pick_up_at)}</p><p><strong>Booked through:</strong> {row.appointment.is_walk_in ? "POS Walk-in" : "Customer"}</p><p><strong>Service notes:</strong> {row.appointment.special_requests || "None"}</p></div></td></tr>}
          </Fragment>)}</tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-zinc-500">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, rows.length)} of {rows.length}</p>
        <nav aria-label="History pages" className="flex items-center gap-2"><button type="button" disabled={page === 1} onClick={() => {setPage(p=>p-1);setExpanded(null);}} className="rounded-full border border-pink-200 px-3 py-1.5 text-xs font-semibold text-brand-pink disabled:opacity-35">Previous</button><span className="text-xs font-semibold text-zinc-600">{page} / {pageCount}</span><button type="button" disabled={page === pageCount} onClick={() => {setPage(p=>p+1);setExpanded(null);}} className="rounded-full border border-pink-200 px-3 py-1.5 text-xs font-semibold text-brand-pink disabled:opacity-35">Next</button></nav>
      </div>
    </>}
  </section>;
}
