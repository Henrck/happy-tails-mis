import Link from "next/link";
import { todaysSchedule, type ScheduleServiceType } from "@/lib/data/admin-mock";

const badgeStyle: Record<ScheduleServiceType, string> = {
  Grooming: "bg-brand-tint text-brand-pink",
  Boarding: "bg-sky-50 text-sky-600",
};

export default function TodaysSchedule() {
  return (
    <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-4 h-full">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-brand-pink text-sm">Today&apos;s Schedule</h3>
        <Link href="/admin/appointments" className="text-[11px] font-semibold border border-brand-pink text-brand-pink px-2.5 py-1 rounded-full hover:bg-brand-pink hover:text-white transition-colors">View All</Link>
      </div>
      <div className="mt-3 space-y-2.5">
        {todaysSchedule.map((item) => (
          <div key={item.id} className="flex items-center gap-2.5">
            <span className="text-xs font-semibold text-zinc-500 w-[70px] shrink-0">{item.time}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-zinc-800 truncate">{item.title}{item.petInfo ? ` — ${item.petInfo}` : ""}</p>
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${badgeStyle[item.service]}`}>{item.service}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
