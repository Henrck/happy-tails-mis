"use client";
export default function InventoryTabs({
  active,
  onChange,
}: {
  active: "products" | "stocks";
  onChange: (tab: "products" | "stocks") => void;
}) {
  const tabs: { key: "products" | "stocks"; label: string }[] = [
    { key: "products", label: "Products" },
    { key: "stocks", label: "Stocks" },
  ];
  return (
    <div className="flex gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`px-6 py-2 rounded-full text-sm font-semibold transition-colors ${
            active === tab.key
              ? "bg-brand-pink text-white"
              : "bg-white border border-brand-pink text-brand-pink hover:bg-brand-tint"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
