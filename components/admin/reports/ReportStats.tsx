import type { ServiceReport } from "@/lib/data/service-reports-mock";

export default function ReportStats({ reports }: { reports: ServiceReport[] }) {
  const total = reports.length;
  const completed = reports.filter((r) => r.status === "Completed").length;
  const cancelled = reports.filter((r) => r.status === "Cancelled").length;

  const cards = [
    { label: "Total Reports", value: total, icon: "📊" },
    { label: "Completed", value: completed, icon: "✅" },
    { label: "Cancelled", value: cancelled, icon: "⛔" },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="bg-white rounded-2xl border border-[#E8E8E8] shadow-sm px-5 py-4 flex items-center gap-3">
          <span className="text-2xl">{c.icon}</span>
          <div>
            <p className="text-xl font-bold text-zinc-900">{c.value}</p>
            <p className="text-xs text-zinc-500">{c.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
