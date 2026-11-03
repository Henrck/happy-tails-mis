"use client";
import type { InventoryChangeLog } from "@/lib/supabase/inventory-change-logs";

const labels: Record<string,string> = {
  product_created:"Product added", product_updated:"Product edited", product_deleted:"Product deleted",
  batch_received:"Stock received", stock_increased:"Stock increased", stock_decreased:"Stock decreased",
  batch_updated:"Batch updated", batch_deleted:"Batch deleted", expiration_changed:"Expiration changed",
};
function formatQuantity(q: number | null) { return q === null ? "—" : q.toLocaleString("en-PH"); }
export default function InventoryLogsTable({rows,loading}:{rows:InventoryChangeLog[];loading:boolean}) {
  return <section aria-label="Inventory change history" className="overflow-hidden rounded-2xl border border-pink-100 bg-white">
    <div className="overflow-x-auto">
      <table className="w-full min-w-[850px] text-left text-sm">
        <thead className="bg-brand-pink text-white"><tr>
          <th scope="col" className="px-4 py-3">Date &amp; time</th>
          <th scope="col" className="px-4 py-3">Product / batch</th>
          <th scope="col" className="px-4 py-3">Activity</th>
          <th scope="col" className="px-4 py-3">Change</th>
          <th scope="col" className="px-4 py-3">Quantity before → after</th>
          <th scope="col" className="px-4 py-3">Details / actor</th>
        </tr></thead>
        <tbody>
          {loading ? <tr><td colSpan={6} className="p-10 text-center text-zinc-500">Loading inventory logs…</td></tr> :
           rows.length === 0 ? <tr><td colSpan={6} className="p-10 text-center text-zinc-500">No inventory changes match your filters. New changes appear here after the database audit migration is applied.</td></tr> :
           rows.map(row => <tr key={row.id} className="border-t border-pink-50 align-top hover:bg-pink-50/40">
             <td className="whitespace-nowrap px-4 py-3 text-zinc-600">{new Date(row.created_at).toLocaleString("en-PH",{timeZone:"Asia/Manila",dateStyle:"medium",timeStyle:"short"})}</td>
             <td className="px-4 py-3"><span className="block font-semibold text-zinc-900">{row.product_name}</span><span className="block text-xs text-zinc-500">{[row.product_code,row.batch_number].filter(Boolean).join(" · ") || "—"}</span></td>
             <td className="px-4 py-3 font-semibold text-zinc-800">{labels[row.action]??row.action.replaceAll("_"," ")}</td>
             <td className={`whitespace-nowrap px-4 py-3 font-bold tabular-nums ${row.quantity_delta!==null&&row.quantity_delta<0?"text-rose-700":row.quantity_delta!==null&&row.quantity_delta>0?"text-emerald-700":"text-zinc-500"}`}>{row.quantity_delta===null?"—":`${row.quantity_delta>0?"+":""}${row.quantity_delta} units`}</td>
             <td className="whitespace-nowrap px-4 py-3 text-zinc-700 tabular-nums">{formatQuantity(row.old_quantity)} → {formatQuantity(row.new_quantity)}</td>
             <td className="max-w-[320px] px-4 py-3 text-xs leading-5 text-zinc-600">{row.details || "—"}<span className="block text-zinc-400">{row.actor_id?`Actor ID: ${row.actor_id.slice(0,8)}…`:"System / unknown actor"}</span></td>
           </tr>)}
        </tbody>
      </table>
    </div>
  </section>;
}
