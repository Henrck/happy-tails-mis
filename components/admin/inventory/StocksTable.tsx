import type { StockBatch, InventoryProduct } from "@/lib/data/inventory-mock";
import { isExpiringSoon } from "@/lib/data/inventory-mock";

export default function StocksTable({
  batches,
  products,
}: {
  batches: StockBatch[];
  products: InventoryProduct[];
}) {
  const productName = (id: string) => products.find((p) => p.id === id)?.name ?? id;

  return (
    <div className="overflow-x-auto rounded-2xl border border-pink-100">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-brand-pink text-white">
            {["Batch #", "Product", "Quantity", "Received", "Expiration", "Status"].map((h) => (
              <th key={h} className="text-left font-semibold px-4 py-3 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {batches.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center text-zinc-400 py-10">No batches match your search/filter.</td>
            </tr>
          ) : (
            batches.map((b) => {
              const expiring = isExpiringSoon(b.expirationDate);
              return (
                <tr key={b.id} className="border-t border-pink-50 hover:bg-brand-tint/50">
                  <td className="px-4 py-3 font-medium text-zinc-700 whitespace-nowrap">{b.batchNumber}</td>
                  <td className="px-4 py-3 text-zinc-800 font-semibold">{productName(b.productId)}</td>
                  <td className={`px-4 py-3 font-semibold ${b.quantity < 0 ? "text-red-500" : "text-zinc-800"}`}>
                    {b.quantity > 0 ? `+${b.quantity}` : b.quantity}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 whitespace-nowrap">{b.receivedDate}</td>
                  <td className="px-4 py-3 text-zinc-600 whitespace-nowrap">{b.expirationDate ?? "—"}</td>
                  <td className="px-4 py-3">
                    {expiring ? (
                      <span className="text-xs font-semibold px-3 py-1 rounded-full bg-yellow-100 text-yellow-700">
                        Expiring Soon
                      </span>
                    ) : (
                      <span className="text-xs font-semibold px-3 py-1 rounded-full bg-green-100 text-green-700">
                        Good
                      </span>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
