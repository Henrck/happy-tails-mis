import type { ProductBatch, Product } from "@/lib/types/products";
import SortableHeader, { type SortDirection } from "@/components/admin/reports/SortableHeader";

function isExpiringSoon(expirationDate: string | null, withinDays = 30): boolean {
  if (!expirationDate) return false;
  const days = (new Date(expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return days >= 0 && days <= withinDays;
}

const columns = [
  { key: "batch_number", label: "Batch #" },
  { key: "productName", label: "Product" },
  { key: "quantity", label: "Quantity" },
  { key: "received_date", label: "Received" },
  { key: "expiration_date", label: "Expiration" },
  { key: "statusLabel", label: "Status" },
];

const COLUMN_WIDTHS = ["w-[16%]", "w-[26%]", "w-[14%]", "w-[15%]", "w-[15%]", "w-[14%]"];

export default function StocksTable({
  batches,
  products,
  sortKey,
  sortDirection,
  onSort,
}: {
  batches: (ProductBatch & { productName: string; statusLabel: string })[];
  products: Product[];
  sortKey: string | null;
  sortDirection: SortDirection;
  onSort: (key: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-pink-100">
      <table className="w-full min-w-[760px] text-sm table-fixed">
        <colgroup>
          {COLUMN_WIDTHS.map((w, i) => <col key={i} className={w} />)}
        </colgroup>
        <thead>
          <tr className="bg-brand-pink text-white">
            {columns.map((col) => (
              <SortableHeader key={col.key} label={col.label} sortKey={col.key} activeSortKey={sortKey} direction={sortDirection} onSort={onSort} variant="light" />
            ))}
          </tr>
        </thead>
        <tbody>
          {batches.length === 0 ? (
            <tr><td colSpan={6} className="text-center text-zinc-400 py-10">No batches match your search/filter.</td></tr>
          ) : (
            batches.map((b) => {
              const expiring = isExpiringSoon(b.expiration_date);
              return (
                <tr key={b.id} className="border-t border-pink-50 hover:bg-brand-tint/50">
                  <td className="px-4 py-3 font-medium text-zinc-700 truncate">{b.batch_number}</td>
                  <td className="px-4 py-3 text-zinc-800 font-semibold truncate" title={b.productName}>{b.productName}</td>
                  <td className={`px-4 py-3 font-semibold truncate ${b.quantity < 0 ? "text-red-500" : "text-zinc-800"}`}>
                    {b.quantity > 0 ? `+${b.quantity}` : b.quantity}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 truncate">{b.received_date}</td>
                  <td className="px-4 py-3 text-zinc-600 truncate">{b.expiration_date ?? "—"}</td>
                  <td className="px-4 py-3">
                    {expiring ? (
                      <span className="inline-block max-w-full truncate text-xs font-semibold px-3 py-1 rounded-full bg-yellow-100 text-yellow-700">Expiring Soon</span>
                    ) : (
                      <span className="inline-block max-w-full truncate text-xs font-semibold px-3 py-1 rounded-full bg-green-100 text-green-700">Good</span>
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
