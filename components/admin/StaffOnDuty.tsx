import { staffOnDuty } from "@/lib/data/admin-mock";

export default function StaffOnDuty() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-pink-100 p-5">
      <h3 className="font-bold text-brand-pink">Staff on Duty</h3>
      <div className="mt-4 space-y-3">
        {staffOnDuty.map((staff) => (
          <div
            key={staff.id}
            className="flex items-center justify-between border-2 border-pink-100 rounded-xl px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-tint flex items-center justify-center text-brand-pink font-bold">
                {staff.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-800">{staff.name}</p>
                <p className="text-xs text-zinc-500">
                  {staff.role} • {staff.tasksToday} Tasks Today
                </p>
              </div>
            </div>
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full ${
                staff.status === "active"
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {staff.status === "active" ? "Active" : "Break"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
