import type { ProductBatch, Product } from "@/lib/types/products";
import { batchHealth, batchHealthLabel, expiryDaysLeft } from "@/lib/utils/inventory-expiration";
import SortableHeader, { type SortDirection } from "@/components/admin/reports/SortableHeader";

const cols = [
  {key:"batch_number",label:"Batch #"},{key:"productName",label:"Product"},{key:"quantity",label:"Units"},
  {key:"received_date",label:"Received"},{key:"expiration_date",label:"Expiration"},{key:"statusLabel",label:"Status"},
];
export default function StocksTable({ batches, products: _products, sortKey, sortDirection, onSort }: {
  batches: (ProductBatch & { productName: string; statusLabel: string })[];
  products: Product[]; sortKey: string | null; sortDirection: SortDirection; onSort: (key: string) => void;
}) {
  return <div className="overflow-x-auto rounded-2xl border border-pink-100 bg-white"><table className="w-full min-w-[770px] table-fixed text-sm">
    <thead><tr className="bg-brand-pink text-white">{cols.map(c => <SortableHeader key={c.key} label={c.label} sortKey={c.key} activeSortKey={sortKey} direction={sortDirection} onSort={onSort} variant="light" />)}</tr></thead>
    <tbody>{batches.length === 0 ? <tr><td colSpan={6} className="py-10 text-center text-zinc-400">No batches match your search/filter.</td></tr> : batches.map(b => {
      const health = batchHealth(b), days = expiryDaysLeft(b.expiration_date);
      const color = health === "expired" ? "bg-rose-100 text-rose-700" : health === "expiring" ? "bg-amber-100 text-amber-800" : health === "healthy" ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-600";
      return <tr key={b.id} className={`border-t border-pink-50 ${health === "expired" ? "bg-rose-50/60" : "hover:bg-pink-50/50"}`}>
        <td className="truncate px-3 py-3 font-medium" title={b.batch_number}>{b.batch_number}</td>
        <td className="truncate px-3 py-3 font-semibold" title={b.productName}>{b.productName}</td>
        <td className="px-3 py-3 font-semibold tabular-nums">{b.quantity}</td>
        <td className="px-3 py-3 text-zinc-600">{b.received_date}</td>
        <td className="px-3 py-3 text-zinc-700">{b.expiration_date ?? "Not recorded"}{health === "expiring" && days !== null && <span className="block text-[11px] text-amber-700">{days === 0 ? "Expires today" : `${days} days remaining`}</span>}</td>
        <td className="px-3 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${color}`}>{batchHealthLabel(health)}</span></td>
      </tr>;
    })}</tbody>
  </table></div>;
}
