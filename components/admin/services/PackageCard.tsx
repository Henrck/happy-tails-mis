"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Package, PackageInclusion, PackagePricing } from "@/lib/types/services";
import { Archive, Pencil, Trash2 } from "lucide-react";

/** Temporary removal option for accidental duplicate packages. Database rejects referenced packages. */
export default function PackageCard({ pkg, inclusions, pricing, onEdit, onToggleActive, onArchive }: {
  pkg: Package; inclusions: PackageInclusion[]; pricing: PackagePricing[];
  onEdit: () => void; onToggleActive: () => void; onArchive: () => void;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const sorted = [...pricing].sort((a,b) => (a.nights ?? Number.MAX_SAFE_INTEGER) - (b.nights ?? Number.MAX_SAFE_INTEGER) || a.size_label.localeCompare(b.size_label, undefined, {numeric:true}));

  async function removeDuplicate() {
    if (deleting) return;
    setDeleting(true); setDeleteError(null);
    try {
      const { error } = await createClient().rpc("happytails_delete_unused_package_v1", { p_package_id: pkg.id });
      if (error) throw new Error(error.message);
      // This component is nested within a client-loaded list. Refresh the list from the DB.
      window.location.reload();
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : "Unable to delete this package.");
      setDeleting(false);
    }
  }

  return <>
    <article className={`flex h-full min-h-[390px] flex-col overflow-hidden rounded-3xl border bg-white shadow-sm transition-shadow hover:shadow-md ${pkg.is_active ? "border-pink-100" : "border-zinc-200 opacity-75"}`}>
      <div className="bg-gradient-to-r from-brand-pink to-brand-pink-dark px-6 py-4"><h3 className="text-xl font-extrabold text-white">{pkg.name}</h3></div>
      <div className="flex flex-1 flex-col p-5">
        {inclusions.length > 0 && <ul className="mb-4 space-y-2">{inclusions.map(i => <li key={i.id} className="flex gap-2 text-sm text-zinc-700"><span className="font-bold text-brand-pink">✓</span><span>{i.label}</span></li>)}</ul>}
        {inclusions.length === 0 && <p className="mb-4 text-xs text-zinc-500">{pkg.service_type === "boarding" ? "Select a duration from the rates below." : "No inclusions configured."}</p>}
        <div className="mt-auto rounded-2xl bg-brand-tint p-4"><p className="mb-2 text-xs font-bold uppercase tracking-wider text-brand-pink">Pricing</p>
          {sorted.length ? sorted.map(p => <div key={p.id} className="flex justify-between gap-3 py-1 text-sm"><span className="text-zinc-600">{p.size_detail || p.size_label}</span><span className="shrink-0 font-bold text-zinc-800">₱{p.price.toLocaleString()}{p.is_per_night ? "/night" : ""}</span></div>) : <p className="text-sm text-zinc-500">No rates configured</p>}
        </div>
        <div className="mt-5 flex items-center justify-between gap-2"><div className="flex gap-2">
          <button type="button" onClick={onEdit} aria-label={`Edit ${pkg.name}`} className="rounded-full border-2 border-brand-pink p-2 text-brand-pink hover:bg-pink-50"><Pencil size={16}/></button>
          <button type="button" onClick={onArchive} disabled={!pkg.is_active} title={pkg.is_active ? "Archive package" : "Already archived"} aria-label={`Archive ${pkg.name}`} className="rounded-full border-2 border-rose-300 p-2 text-rose-500 hover:bg-rose-50 disabled:opacity-30"><Archive size={16}/></button>
          <button type="button" onClick={() => { setDeleteError(null); setDeleteOpen(true); }} aria-label={`Permanently delete ${pkg.name}`} title="Delete unused duplicate (temporary)" className="rounded-full border-2 border-red-300 p-2 text-red-700 hover:bg-red-50"><Trash2 size={16}/></button>
        </div><button type="button" onClick={onToggleActive} className={`rounded-full px-4 py-2 text-xs font-bold ${pkg.is_active ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-600"}`}>{pkg.is_active ? "Active" : "Inactive · Reactivate"}</button></div>
      </div>
    </article>
    {deleteOpen && <div role="presentation" className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-4" onMouseDown={event => { if (event.target === event.currentTarget && !deleting) setDeleteOpen(false); }}>
      <section role="alertdialog" aria-modal="true" aria-labelledby={`delete-package-${pkg.id}`} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <h2 id={`delete-package-${pkg.id}`} className="text-xl font-bold text-red-700">Permanently delete this package?</h2>
        <p className="mt-3 break-words text-sm leading-6 text-zinc-700"><strong>{pkg.name}</strong> will be deleted along with its unused pricing tiers and inclusions. This cannot be undone.</p>
        <p className="mt-3 text-sm leading-6 text-zinc-600">Only delete duplicates created by mistake. Packages used by appointments, including past bookings, are protected and cannot be deleted.</p>
        {deleteError && <p role="alert" className="mt-3 break-words rounded-xl bg-red-50 p-3 text-sm text-red-700">{deleteError}</p>}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button type="button" disabled={deleting} onClick={() => setDeleteOpen(false)} className="min-h-11 rounded-full border border-pink-200 font-semibold disabled:opacity-50">Cancel</button>
          <button type="button" disabled={deleting} onClick={() => void removeDuplicate()} className="min-h-11 rounded-full bg-red-600 px-3 font-semibold text-white disabled:opacity-50">{deleting ? "Deleting…" : "Delete Package"}</button>
        </div>
      </section>
    </div>}
  </>;
}
