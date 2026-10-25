import type { Product, ProductBatch } from "@/lib/types/products";
import { computeStatus } from "@/lib/supabase/products";
import { batchHealth, sellableStock } from "@/lib/utils/inventory-expiration";

export default function InventoryStats({ products, batches }: { products: Product[]; batches: ProductBatch[] }) {
  const active = products.filter(p => p.status === "active");
  const stock = active.map(p => computeStatus(sellableStock(p.id, batches), p.min_stock));
  const activeIds = new Set(active.map(p => p.id));
  const real = batches.filter(b => !b.is_adjustment && b.quantity > 0 && activeIds.has(b.product_id));
  const expired = real.filter(b => batchHealth(b) === "expired");
  const soon = real.filter(b => batchHealth(b) === "expiring");
  const unknown = real.filter(b => batchHealth(b) === "unknown");
  const cards = [
    { label: "Active Products", value: active.length, sub: "Product catalog", color: "text-zinc-800" },
    { label: "Out of Stock", value: stock.filter(s => s === "Out of Stock").length, sub: "Sellable units only", color: "text-rose-700" },
    { label: "Low Stock", value: stock.filter(s => s === "Low Stock").length, sub: "Sellable units only", color: "text-amber-700" },
    { label: "Expired Batches", value: expired.length, sub: `${expired.reduce((n,b) => n + b.quantity,0)} units to isolate`, color: "text-rose-700" },
    { label: "Expiring in 30 Days", value: soon.length, sub: `${soon.reduce((n,b) => n + b.quantity,0)} units at risk`, color: "text-amber-700" },
    { label: "Missing Expiry", value: unknown.length, sub: "Review dates on file", color: "text-zinc-700" },
  ];
  return <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
    {cards.map(card => <div key={card.label} className="rounded-2xl border border-pink-100 bg-white px-4 py-4 shadow-sm">
      <p className="text-xs font-semibold text-zinc-600">{card.label}</p>
      <p className={`mt-2 text-2xl font-extrabold ${card.color}`}>{card.value}</p>
      <p className="mt-1 text-[11px] text-zinc-500">{card.sub}</p>
    </div>)}
  </div>;
}
