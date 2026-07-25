import Link from "next/link";
import { lowStockItems } from "@/lib/data/admin-mock";

export default function LowStock() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-pink-100 p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-brand-pink">Low Stock</h3>
        <Link
          href="/admin/inventory"
          className="text-xs font-semibold border border-brand-pink text-brand-pink px-3 py-1 rounded-full hover:bg-brand-pink hover:text-white transition-colors"
        >
          View
        </Link>
      </div>
      <div className="mt-4">
        {lowStockItems.length === 0 ? (
          <p className="text-sm text-zinc-400 py-6 text-center">
            Nothing low on stock right now.
          </p>
        ) : (
          <ul className="space-y-2">
            {lowStockItems.map((item) => (
              <li key={item.id} className="flex justify-between text-sm">
                <span className="text-zinc-700">{item.name}</span>
                <span className="text-red-600 font-semibold">{item.remaining} left</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
