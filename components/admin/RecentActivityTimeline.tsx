import Link from "next/link";
import { recentActivity, type ActivityCategory } from "@/lib/data/admin-mock";

const iconPaths: Record<string, string> = {
  alert: "M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
  cart: "M3 4h2l2.5 12h11L21 8H6M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM18 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4.5 3.5-7 8-7s8 2.5 8 7",
  calendar: "M3 5h18v16H3zM3 9h18M8 3v4M16 3v4",
};
const categoryStyle: Record<ActivityCategory, string> = {
  "System Alert": "bg-red-50 text-red-500",
  "Counter Sale": "bg-amber-50 text-amber-600",
  "Walk-in": "bg-sky-50 text-sky-600",
  "Website Booking": "bg-brand-tint text-brand-pink",
};

export default function RecentActivityTimeline() {
  return (
    <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-4 h-full">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-brand-pink text-sm">Recent Activity</h3>
        <Link href="#" className="text-[11px] font-semibold border border-brand-pink text-brand-pink px-2.5 py-1 rounded-full hover:bg-brand-pink hover:text-white transition-colors">View All</Link>
      </div>
      <div className="mt-3 space-y-2.5">
        {recentActivity.map((item) => (
          <div key={item.id} className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-tint flex items-center justify-center text-brand-pink shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={iconPaths[item.icon]} strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-zinc-800 truncate">{item.title}</p>
              <p className="text-[10px] text-zinc-400">{item.time}</p>
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${categoryStyle[item.category]}`}>{item.category}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
