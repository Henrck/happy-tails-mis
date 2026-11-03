"use client";
export default function InventoryTabs({ active, onChange }: {
  active: "products" | "stocks";
  onChange: (tab: "products" | "stocks") => void;
}) {
  return <div className="flex flex-wrap gap-2" role="tablist" aria-label="Inventory views">
    {([ {key:"products",label:"Products"}, {key:"stocks",label:"Logs"}] as const).map(tab =>
      <button key={tab.key} type="button" role="tab" aria-selected={active===tab.key}
        onClick={()=>onChange(tab.key)} className={`min-h-10 rounded-full px-5 py-2 text-sm font-semibold transition-colors ${active===tab.key?"bg-brand-pink text-white":"border border-brand-pink bg-white text-brand-pink hover:bg-brand-tint"}`}>
        {tab.label}
      </button>)}
  </div>;
}
