import type { InventoryProduct, StockBatch } from "@/lib/data/inventory-mock";
import { getTotalStock, getStatus } from "@/lib/data/inventory-mock";

export default function ProductsTable({
  products,
  batches,
  onView,
}: {
  products: InventoryProduct[];
  batches: StockBatch[];
  onView: (product: InventoryProduct) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-pink-100">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-brand-pink text-white">
            {["Product ID", "Product Name", "Unit", "Category", "Total Stocks", "Min Stocks", "Status", "Action"].map((h) => (
              <th key={h} className="text-left font-semibold px-4 py-3 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {products.length === 0 ? (
            <tr>
              <td colSpan={8} className="text-center text-zinc-400 py-10">No products match your search/filter.</td>
            </tr>
          ) : (
            products.map((product) => {
              const total = getTotalStock(product.id, batches);
              const status = getStatus(total, product.minStock);
              return (
                <tr key={product.id} className="border-t border-pink-50 hover:bg-brand-tint/50">
                  <td className="px-4 py-3 font-medium text-zinc-700 whitespace-nowrap">{product.id}</td>
                  <td className="px-4 py-3 text-zinc-800 font-semibold">{product.name}</td>
                  <td className="px-4 py-3 text-zinc-600">{product.unit}</td>
                  <td className="px-4 py-3 text-zinc-600">{product.category}</td>
                  <td className="px-4 py-3 font-semibold text-zinc-800">{total}</td>
                  <td className="px-4 py-3 text-zinc-600">{product.minStock}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      status === "Low Stock" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"
                    }`}>
                      {status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onView(product)}
                      aria-label={`View ${product.name}`}
                      className="text-brand-pink hover:text-brand-pink-dark border border-brand-pink rounded-full p-1.5 transition-colors"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
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
