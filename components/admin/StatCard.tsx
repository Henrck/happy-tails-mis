// Small stat card used for "Today's Appointment", "Monthly Revenue", etc.
export default function StatCard({
  value,
  label,
  icon,
}: {
  value: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-pink-100 px-6 py-5 flex items-center justify-between">
      <div>
        <p className="text-3xl font-bold text-zinc-900">{value}</p>
        <p className="mt-1 text-sm text-zinc-500">{label}</p>
      </div>
      <div className="shrink-0">{icon}</div>
    </div>
  );
}
