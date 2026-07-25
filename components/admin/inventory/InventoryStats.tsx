import { inventoryProducts, stockBatches, getTotalStock, getStatus, isExpiringSoon } from "@/lib/data/inventory-mock";

export default function InventoryStats() {
  const activeProducts = inventoryProducts.filter((p) => p.status === "active");
  const lowStockCount = activeProducts.filter(
    (p) => getStatus(getTotalStock(p.id, stockBatches), p.minStock) === "Low Stock"
  ).length;
  const expiringSoonCount = stockBatches.filter((b) => isExpiringSoon(b.expirationDate)).length;

  const cards = [
    { label: "Total Products", value: activeProducts.length, icon: "📦" },
    { label: "Low Stock", value: lowStockCount, dot: "bg-red-500" },
    { label: "Expiring Soon", value: expiringSoonCount, dot: "bg-yellow-400" },
    { label: "Total Batches", value: stockBatches.length, icon: "🧾" },
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
