import type { Package, PackageInclusion, PackagePricing } from "@/lib/types/services";

export default function PackageCard({
  pkg,
  inclusions,
  pricing,
  onEdit,
  onToggleActive,
  onArchive,
}: {
  pkg: Package;
  inclusions: PackageInclusion[];
  pricing: PackagePricing[];
  onEdit: () => void;
  onToggleActive: () => void;
  onArchive: () => void;
}) {
  return (
    <div className={`rounded-2xl overflow-hidden shadow-sm border transition-shadow hover:shadow-md ${pkg.is_active ? "border-pink-100" : "border-zinc-200 opacity-70"}`}>
      <div className="bg-gradient-to-r from-brand-pink to-brand-pink-dark px-5 py-3">
        <h3 className="text-white font-bold text-lg">{pkg.name}</h3>
      </div>

      <div className="bg-white px-5 py-4">
        {inclusions.length > 0 && (
          <ul className="space-y-1">
            {inclusions.map((inc) => (
              <li key={inc.id} className="flex items-center gap-1.5 text-sm text-zinc-700">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-brand-pink shrink-0">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {inc.label}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 bg-brand-tint rounded-xl p-3">
          <p className="text-xs font-bold text-brand-pink uppercase tracking-wide mb-1.5">Pricing</p>
          {pricing.map((p) => (
            <div key={p.id} className="flex justify-between text-sm py-0.5">
              <span className="text-zinc-600">{p.size_label}</span>
              <span className="font-semibold text-zinc-800">
                ₱{p.price.toLocaleString()}{p.is_per_night ? "/night" : ""}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={onEdit} aria-label="Edit" className="w-8 h-8 rounded-full border-2 border-brand-pink text-brand-pink flex items-center justify-center hover:bg-brand-pink hover:text-white transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <button onClick={onArchive} aria-label="Archive" className="w-8 h-8 rounded-full border-2 border-red-300 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="4" rx="1" /><path d="M5 8v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8M10 12h4" strokeLinecap="round" /></svg>
            </button>
          </div>
          <button
            onClick={onToggleActive}
            className={`text-xs font-semibold px-4 py-1.5 rounded-full transition-colors ${
              pkg.is_active ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-zinc-200 text-zinc-500 hover:bg-zinc-300"
            }`}
          >
            {pkg.is_active ? "Active" : "Inactive"}
          </button>
        </div>
      </div>
    </div>
  );
}
