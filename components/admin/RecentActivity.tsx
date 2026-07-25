import { recentActivity } from "@/lib/data/admin-mock";

export default function RecentActivity() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-pink-100 p-5">
      <h3 className="font-bold text-brand-pink">Recent Activity</h3>
      <ul className="mt-3 space-y-3">
        {recentActivity.map((item) => (
          <li key={item.id} className="flex gap-2 text-sm">
            <span className={item.isAlert ? "text-red-500" : "text-brand-pink"}>●</span>
            <div>
              <p className={`font-medium ${item.isAlert ? "text-red-600" : "text-zinc-800"}`}>
                {item.title}
              </p>
              <p className="text-xs text-zinc-400">{item.meta}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
