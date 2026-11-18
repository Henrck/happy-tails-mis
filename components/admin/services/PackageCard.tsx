"use client";
import { canonicalSizeLabel } from "@/lib/utils/size-label";
import { formatPeso } from "@/lib/utils/currency";

import type { Package, PackageInclusion, PackagePricing } from "@/lib/types/services";
import { Archive, Pencil } from "lucide-react";

/** Small → Medium → Large → Extra Large → 2X Extra Large (unknown sizes last). */
function sizeRank(label: string) {
  const key = label.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (key.startsWith("2") || key.startsWith("xx")) return 5;
  if (key.includes("extralarge") || key === "xl") return 4;
  if (key.includes("large")) return 3;
  if (key.includes("medium")) return 2;
  if (key.includes("small")) return 1;
  return 6;
}

export default function PackageCard({ pkg, inclusions, pricing, onEdit, onToggleActive, onArchive }: {
  pkg: Package; inclusions: PackageInclusion[]; pricing: PackagePricing[];
  onEdit: () => void; onToggleActive: () => void; onArchive: () => void;
}) {
  const grooming = pkg.service_type !== "boarding";
  // Grooming: one row per size, smallest first, shown by size name. Legacy rows
  // that don't name a size (e.g. "Standard") are hidden when sized rows exist.
  const named = (p: PackagePricing) => !!p.size_id || sizeRank(canonicalSizeLabel(p.size_label)) < 6;
  const visible = grooming && pricing.some(named) ? pricing.filter(named) : pricing;
  const sorted = [...visible].sort((a,b) => grooming
    ? sizeRank(canonicalSizeLabel(a.size_label)) - sizeRank(canonicalSizeLabel(b.size_label)) || a.size_label.localeCompare(b.size_label)
    : (a.nights ?? Number.MAX_SAFE_INTEGER) - (b.nights ?? Number.MAX_SAFE_INTEGER) || a.size_label.localeCompare(b.size_label, undefined, {numeric:true}));

  return (
    <article className={`flex h-full min-h-[390px] flex-col overflow-hidden rounded-3xl border bg-white shadow-sm transition-shadow hover:shadow-md ${pkg.is_active ? "border-pink-100" : "border-zinc-200 opacity-75"}`}>
      <div className="bg-gradient-to-r from-brand-pink to-brand-pink-dark px-6 py-4"><h3 className="text-xl font-extrabold text-white">{pkg.name}</h3></div>
      <div className="flex flex-1 flex-col p-5">
        {inclusions.length > 0 && <ul className="mb-4 space-y-2">{inclusions.map(i => <li key={i.id} className="flex gap-2 text-sm text-zinc-700"><span className="font-bold text-brand-pink">✓</span><span>{i.label}</span></li>)}</ul>}
        {inclusions.length === 0 && <p className="mb-4 text-xs text-zinc-500">{pkg.service_type === "boarding" ? "Select a duration from the rates below." : "No inclusions configured."}</p>}
        <div className="mt-auto rounded-2xl bg-brand-tint p-4"><p className="mb-2 text-xs font-bold uppercase tracking-wider text-brand-pink">Pricing</p>
          {sorted.length ? sorted.map(p => <div key={p.id} className="flex justify-between gap-3 py-1 text-sm"><span className="text-zinc-600">{grooming ? canonicalSizeLabel(p.size_label) : p.size_detail || p.size_label}</span><span className="shrink-0 font-bold text-zinc-800">{formatPeso(p.price)}{p.is_per_night ? "/night" : ""}</span></div>) : <p className="text-sm text-zinc-500">No rates configured</p>}
        </div>
        <div className="mt-5 flex items-center justify-between gap-2"><div className="flex gap-2">
          <button type="button" onClick={onEdit} aria-label={`Edit ${pkg.name}`} className="rounded-full border-2 border-brand-pink p-2 text-brand-pink hover:bg-pink-50"><Pencil size={16}/></button>
          <button type="button" onClick={onArchive} disabled={!pkg.is_active} title={pkg.is_active ? "Archive package" : "Already archived"} aria-label={`Archive ${pkg.name}`} className="rounded-full border-2 border-rose-300 p-2 text-rose-500 hover:bg-rose-50 disabled:opacity-30"><Archive size={16}/></button>
        </div><button type="button" onClick={onToggleActive} className={`rounded-full px-4 py-2 text-xs font-bold ${pkg.is_active ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-600"}`}>{pkg.is_active ? "Active" : "Inactive · Reactivate"}</button></div>
      </div>
    </article>
  );
}
