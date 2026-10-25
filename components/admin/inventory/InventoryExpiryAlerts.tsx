"use client";
import type { Product, ProductBatch } from "@/lib/types/products";
import { batchHealth, expiryDaysLeft } from "@/lib/utils/inventory-expiration";

export default function InventoryExpiryAlerts({ products, batches, onViewBatch }: {
  products: Product[]; batches: ProductBatch[]; onViewBatch: () => void;
}) {
  const nameById = new Map(products.map(p => [p.id, p.name]));
  const active = new Set(products.filter(p => p.status === "active").map(p => p.id));
  const priority = batches.filter(b => active.has(b.product_id) && ["expired", "expiring"].includes(batchHealth(b)))
    .sort((a,b) => (batchHealth(a) === "expired" ? 0 : 1) - (batchHealth(b) === "expired" ? 0 : 1) || (a.expiration_date ?? "").localeCompare(b.expiration_date ?? ""));
  if (!priority.length) return null;
  return <section className="mt-5 rounded-2xl border border-rose-200 bg-white p-4 sm:p-5" aria-label="Inventory expiration alerts">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-bold text-rose-800">Expiration alerts · {priority.length} batch{priority.length === 1 ? "" : "es"}</h2><p className="mt-1 text-xs text-zinc-600">Expired inventory is excluded from sellable stock. Check affected batches before sale.</p></div>
      <button type="button" onClick={onViewBatch} className="rounded-full border border-rose-300 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50">Review Batches</button>
    </div>
    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{priority.slice(0,6).map(b => {
      const expired = batchHealth(b) === "expired";
      const days = expiryDaysLeft(b.expiration_date);
      return <div key={b.id} className={`rounded-xl border px-3 py-2.5 ${expired ? "border-rose-200 bg-rose-50" : "border-amber-200 bg-amber-50"}`}>
        <div className="flex flex-wrap items-center justify-between gap-1"><span className="truncate text-xs font-bold text-zinc-800">{nameById.get(b.product_id) ?? "Product"}</span><span className={`text-[11px] font-bold ${expired ? "text-rose-700" : "text-amber-800"}`}>{expired ? "Expired" : days === 0 ? "Expires today" : `${days} days left`}</span></div>
        <p className="mt-1 text-[11px] text-zinc-600">{b.batch_number} · {b.quantity} units · {b.expiration_date}</p>
      </div>;
    })}</div>
    {priority.length > 6 && <p className="mt-2 text-xs text-rose-700">+{priority.length - 6} additional batches require attention.</p>}
  </section>;
}
