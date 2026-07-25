import type { Kennel } from "@/lib/data/boarding-kennels-mock";

export default function KennelStats({ kennels }: { kennels: Kennel[] }) {
  const total = kennels.length;
  const inProgress = kennels.filter((k) => k.session?.stage === "checked_in").length;
  const scheduled = kennels.filter((k) => k.session?.stage === "booked").length;
  const available = kennels.filter((k) => !k.session).length;

  const cards = [
    { label: "Total Kennels", value: total, dot: null, extra: "🏠" },
    { label: "In progress", value: inProgress, dot: "bg-red-500" },
    { label: "Scheduled", value: scheduled, dot: "bg-yellow-400" },
    { label: "Available Kennel", value: available, dot: "bg-green-500" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="bg-white rounded-2xl shadow-sm border border-pink-100 px-5 py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-zinc-700">{c.label}</span>
            {c.dot ? <span className={`w-3 h-3 rounded-full ${c.dot}`} /> : <span aria-hidden>{c.extra}</span>}
          </div>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{c.value}</p>
        </div>
      ))}
    </div>
  );
}
