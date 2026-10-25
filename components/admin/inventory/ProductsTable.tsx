import type { Product, ProductBatch } from "@/lib/types/products";
import { computeStatus } from "@/lib/supabase/products";
import { batchHealth, sellableStock, physicalStock } from "@/lib/utils/inventory-expiration";
import SortableHeader, { type SortDirection } from "@/components/admin/reports/SortableHeader";
const cols = [
  { key: "product_code", label: "Product ID" }, { key: "name", label: "Product Name" },
  { key: "category", label: "Category" }, { key: "totalStock", label: "Sellable" },
  { key: "min_stock", label: "Min Stock" }, { key: "statusLabel", label: "Stock Status" },
  { key: "expiryRisk", label: "Expiration" },
];
export default function ProductsTable({ products, batches, onView, sortKey, sortDirection, onSort }: {
  products: Product[]; batches: ProductBatch[]; onView: (p: Product) => void;
  sortKey: string | null; sortDirection: SortDirection; onSort: (key: string) => void;
}) {
  return <div className="overflow-x-auto rounded-2xl border border-pink-100 bg-white"><table className="w-full min-w-[900px] text-sm">
    <thead><tr className="bg-brand-pink text-white">{cols.map(c => <SortableHeader key={c.key} label={c.label} sortKey={c.key} activeSortKey={sortKey} direction={sortDirection} onSort={onSort} variant="light" />)}<th className="px-3 py-3 text-left">Action</th></tr></thead>
    <tbody>{products.length === 0 ? <tr><td colSpan={8} className="py-10 text-center text-zinc-400">No products found.</td></tr> : products.map(p => {
      const stock = sellableStock(p.id, batches);
      const status = computeStatus(stock,p.min_stock);
      const related = batches.filter(b => b.product_id === p.id);
      const hasExpired = related.some(b => batchHealth(b) === "expired");
      const hasSoon = related.some(b => batchHealth(b) === "expiring");
      const atRisk = hasExpired ? "Expired batch" : hasSoon ? "Expiring Soon" : related.some(b => batchHealth(b) === "unknown") ? "Missing dates" : "Clear";
      return <tr key={p.id} className={`border-t border-pink-50 ${hasExpired ? "bg-rose-50/50" : "hover:bg-pink-50/50"}`}>
        <td className="px-3 py-3 text-zinc-600">{p.product_code}</td>
        <td className="px-3 py-3 font-semibold text-zinc-800">{p.name}<span className="block text-[11px] font-normal text-zinc-400">{p.unit}{p.package_size?` · ${p.package_size}`:""}</span></td>
        <td className="px-3 py-3 text-zinc-600">{p.category}</td>
        <td className="px-3 py-3 font-semibold tabular-nums">{stock}<span className="block text-[11px] font-normal text-zinc-500">{physicalStock(p.id,batches)} physical</span></td>
        <td className="px-3 py-3 tabular-nums">{p.min_stock}</td>
        <td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-[11px] font-bold ${status === "In Stock"?"bg-emerald-100 text-emerald-700":status === "Low Stock"?"bg-amber-100 text-amber-800":"bg-rose-100 text-rose-700"}`}>{status}</span></td>
        <td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-[11px] font-bold ${hasExpired?"bg-rose-100 text-rose-700":hasSoon?"bg-amber-100 text-amber-800":"bg-zinc-100 text-zinc-600"}`}>{atRisk}</span></td>
        <td className="px-3 py-3"><button type="button" onClick={()=>onView(p)} className="rounded-full border border-brand-pink px-3 py-1.5 text-xs font-semibold text-brand-pink hover:bg-pink-50" aria-label={`View ${p.name}`}>View</button></td>
      </tr>;
    })}</tbody>
  </table></div>;
}
