import Link from "next/link";

export default function KpiCard({
  icon,
  value,
  label,
  href,
  badge,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  href?: string;
  badge?: { text: string; positive: boolean };
}) {
  const content = (
    <div className="bg-white rounded-2xl border border-pink-100 shadow-sm px-4 py-3.5 h-[92px] flex items-center gap-3 hover:shadow-md hover:border-brand-pink-light transition-all">
      <div className="w-11 h-11 rounded-xl bg-brand-tint flex items-center justify-center text-brand-pink shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-xl font-bold text-zinc-900 truncate">{value}</p>
          {badge && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shrink-0 ${badge.positive ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-500"}`}>
              {badge.positive ? "↑" : "↓"} {badge.text}
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500 truncate">{label}</p>
      </div>
      {href && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-zinc-300 shrink-0">
          <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
