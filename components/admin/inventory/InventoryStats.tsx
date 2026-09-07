import type { Product, ProductBatch } from "@/lib/types/products";
import { computeTotalStock, computeStatus } from "@/lib/supabase/products";

function isExpiringSoon(expirationDate: string | null, withinDays = 30): boolean {
  if (!expirationDate) return false;
  const days = (new Date(expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return days >= 0 && days <= withinDays;
}

export default function InventoryStats({ products, batches }: { products: Product[]; batches: ProductBatch[] }) {
  const activeProducts = products.filter((p) => p.status === "active");
  const lowStockCount = activeProducts.filter(
    (p) => computeStatus(computeTotalStock(p.id, batches), p.min_stock) === "Low Stock"
  ).length;
  const expiringSoonCount = batches.filter((b) => isExpiringSoon(b.expiration_date)).length;

  // Only real deliveries count as "batches" — adjustments (damaged/lost/
  // miscount corrections) still affect stock totals, but they're a
  // different kind of record and shouldn't inflate this count every
  // time someone corrects a number.
  const realBatchCount = batches.filter((b) => !b.is_adjustment).length;

  const cards = [
    { label: "Total Products", value: activeProducts.length, icon: "📦" },
    { label: "Low Stock", value: lowStockCount, dot: "bg-red-500" },
    { label: "Expiring Soon", value: expiringSoonCount, dot: "bg-yellow-400" },
    { label: "Total Batches", value: realBatchCount, icon: "🧾" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="bg-white rounded-2xl shadow-sm border border-pink-100 px-5 py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-zinc-700">{c.label}</span>
            {c.dot ? <span className={`w-3 h-3 rounded-full ${c.dot}`} /> : <span aria-hidden>{c.icon}</span>}
          </div>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{c.value}</p>
        </div>
      ))}
    </div>
  );
}
