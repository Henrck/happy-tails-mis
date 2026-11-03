"use client";
import Link from "next/link";
export type ReportTab = "service" | "inventory" | "sales";
const tabs: { key: ReportTab; label: string }[] = [
  { key: "service", label: "Service Reports" },
  { key: "inventory", label: "Inventory Reports" },
  { key: "sales", label: "Sales Reports" },
];
export default function ReportTabs({ active, onChange }: { active: ReportTab; onChange: (tab: ReportTab) => void }) {
  return <div className="flex flex-wrap gap-6 sm:gap-8 border-b border-[#E8E8E8]">
    {tabs.map(tab => <button type="button" key={tab.key} onClick={() => onChange(tab.key)}
      className={`relative pb-3 text-sm font-medium transition-colors ${active === tab.key ? "text-[#FF5F9E]" : "text-zinc-500 hover:text-zinc-700"}`}>
      {tab.label}{active === tab.key && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#FF5F9E]" />}
    </button>)}
    <Link href="/admin/reports/audit" className="relative pb-3 text-sm font-semibold text-zinc-500 hover:text-[#FF5F9E]">Audit Logs</Link>
  </div>;
}
