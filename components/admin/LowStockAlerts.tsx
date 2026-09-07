import Link from "next/link";
import { lowStockItems } from "@/lib/data/admin-mock";

export default function LowStockAlerts() {
  return (
    <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-4 h-full">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-brand-pink text-sm">Low Stock Alerts</h3>
        <Link href="/admin/inventory" className="text-[11px] font-semibold border border-brand-pink text-brand-pink px-2.5 py-1 rounded-full hover:bg-brand-pink hover:text-white transition-colors">
          View All
        </Link>
      </div>
      <div className="mt-3 space-y-2">
        {lowStockItems.length === 0 ? (
          <p className="text-xs text-zinc-400 text-center py-6">Nothing low on stock.</p>
        ) : (
          lowStockItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs text-zinc-700">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-pink shrink-0" />
                {item.name}
              </span>
              <span className="text-[11px] font-semibold bg-red-50 text-red-500 px-2 py-0.5 rounded-full shrink-0">{item.remaining} left</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
