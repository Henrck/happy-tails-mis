import type { Addon, AddonPrice } from "@/lib/types/services";

export default function AddOnsSection({
  title,
  addons,
  prices,
  onEdit,
  onToggleActive,
  onArchive,
}: {
  title: string;
  addons: Addon[];
  prices: AddonPrice[];
  onEdit: (addon: Addon) => void;
  onToggleActive: (addon: Addon) => void;
  onArchive: (addon: Addon) => void;
}) {
  return (
    <div>
      <h3 className="font-bold text-zinc-800">{title}</h3>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {addons.map((addon) => {
          const addonPrices = prices.filter((p) => p.addon_id === addon.id);
          return (
            <div key={addon.id} className={`bg-white rounded-xl border p-3 ${addon.is_active ? "border-pink-100" : "border-zinc-200 opacity-60"}`}>
              <p className="text-sm font-semibold text-zinc-800">{addon.name}</p>
              {addon.price_note ? (
                <p className="mt-1 text-xs text-zinc-400 italic">{addon.price_note}</p>
              ) : (
                <div className="mt-1 space-y-0.5">
                  {addonPrices.map((p) => (
                    <div key={p.id} className="flex justify-between text-xs">
                      <span className="text-zinc-500">{p.size_label}</span>
                      <span className="font-semibold text-brand-pink">₱{p.price}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <button onClick={() => onEdit(addon)} aria-label="Edit" className="w-6 h-6 rounded-full border border-brand-pink text-brand-pink flex items-center justify-center hover:bg-brand-pink hover:text-white transition-colors">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                  <button onClick={() => onArchive(addon)} aria-label="Archive" className="w-6 h-6 rounded-full border border-red-300 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="4" rx="1" /><path d="M5 8v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" strokeLinecap="round" /></svg>
                  </button>
                </div>
                <button onClick={() => onToggleActive(addon)} className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full transition-colors ${addon.is_active ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-500"}`}>
                  {addon.is_active ? "Active" : "Inactive"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
