"use client";
export type ReportTab = "service" | "inventory" | "transaction" | "sales";

const tabs: { key: ReportTab; label: string }[] = [
  { key: "service", label: "Service Reports" },
  { key: "inventory", label: "Inventory Reports" },
  { key: "transaction", label: "Transaction Reports" },
  { key: "sales", label: "Sales Reports" },
];

export default function ReportTabs({ active, onChange }: { active: ReportTab; onChange: (tab: ReportTab) => void }) {
  return (
    <div className="flex gap-8 border-b border-[#E8E8E8]">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`pb-3 text-sm font-medium transition-colors relative ${
            active === tab.key ? "text-[#FF5F9E]" : "text-zinc-500 hover:text-zinc-700"
          }`}
        >
          {tab.label}
          {active === tab.key && (
            <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-[#FF5F9E] rounded-full" />
          )}
        </button>
      ))}
    </div>
  );
}
