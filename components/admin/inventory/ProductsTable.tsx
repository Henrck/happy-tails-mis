import type { Product, ProductBatch } from "@/lib/types/products";
import { computeTotalStock, computeStatus } from "@/lib/supabase/products";
import SortableHeader, { type SortDirection } from "@/components/admin/reports/SortableHeader";

// Same fix as the other tables: table-fixed + colgroup controls each
// column's width directly, so SortableHeader (shared with Report
// Management, kept unchanged here) doesn't need to know about widths
// at all — a <col> constrains its column regardless of what's inside
// the header cell, including the sort arrows shifting active/inactive.
const COLUMN_WIDTHS = ["w-[14%]", "w-[22%]", "w-[10%]", "w-[14%]", "w-[12%]", "w-[12%]", "w-[10%]", "w-[6%]"];

export default function ProductsTable({
  products,
  batches,
  onView,
  sortKey,
  sortDirection,
  onSort,
}: {
  products: Product[];
  batches: ProductBatch[];
  onView: (product: Product) => void;
  sortKey: string | null;
  sortDirection: SortDirection;
  onSort: (key: string) => void;
}) {
  const columns = [
    { key: "product_code", label: "Product ID" },
    { key: "name", label: "Product Name" },
    { key: "unit", label: "Unit" },
    { key: "category", label: "Category" },
    { key: "totalStock", label: "Total Stocks" },
    { key: "min_stock", label: "Min Stocks" },
    { key: "statusLabel", label: "Status" },
  ];

  return (
    <div className="overflow-x-auto rounded-2xl border border-pink-100">
      <table className="w-full min-w-[880px] text-sm table-fixed">
        <colgroup>
          {COLUMN_WIDTHS.map((w, i) => <col key={i} className={w} />)}
        </colgroup>
        <thead>
          <tr className="bg-brand-pink text-white">
            {columns.map((col) => (
              <SortableHeader key={col.key} label={col.label} sortKey={col.key} activeSortKey={sortKey} direction={sortDirection} onSort={onSort} variant="light" />
            ))}
            <th className="text-left font-semibold px-4 py-3 text-white">Action</th>
          </tr>
        </thead>
        <tbody>
          {products.length === 0 ? (
            <tr><td colSpan={8} className="text-center text-zinc-400 py-10">No products match your search/filter.</td></tr>
          ) : (
            products.map((product) => {
              const total = computeTotalStock(product.id, batches);
              const status = computeStatus(total, product.min_stock);
              return (
                <tr key={product.id} className="border-t border-pink-50 hover:bg-brand-tint/50">
                  <td className="px-4 py-3 font-medium text-zinc-700 truncate">{product.product_code}</td>
                  <td className="px-4 py-3 text-zinc-800 font-semibold truncate" title={product.name}>{product.name}</td>
                  <td className="px-4 py-3 text-zinc-600 truncate">{product.unit}</td>
                  <td className="px-4 py-3 text-zinc-600 truncate">{product.category}</td>
                  <td className="px-4 py-3 font-semibold text-zinc-800 truncate">{total}</td>
                  <td className="px-4 py-3 text-zinc-600 truncate">{product.min_stock}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block max-w-full truncate text-xs font-semibold px-3 py-1 rounded-full ${
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
