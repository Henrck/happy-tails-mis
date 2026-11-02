"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchProducts, addProduct, setProductStatus } from "@/lib/supabase/products";
import { createClient } from "@/lib/supabase/client";
import type { Product, ProductCategory } from "@/lib/types/products";
import ProductManageCard from "@/components/admin/operations/ProductManageCard";
import ProductFormModal from "@/components/admin/operations/ProductFormModal";
import ArchiveConfirmModal from "@/components/admin/operations/ArchiveConfirmModal";

const categories: { label: string; value: ProductCategory | "all" }[] = [
  { label: "All Items", value: "all" }, { label: "Food", value: "Food" },
  { label: "Treats", value: "Treats" }, { label: "Groom Product", value: "Grooming" },
  { label: "Accessories", value: "Accessories" }, { label: "Hygiene", value: "Hygiene" },
];

export default function PosManagementPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [category, setCategory] = useState<ProductCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [formModal, setFormModal] = useState<{ mode: "add" | "edit"; product?: Product } | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Product | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadProducts = useCallback(async (): Promise<boolean> => {
    const result = await fetchProducts();
    if (result.error) { setError(result.error); return false; }
    setProducts(result.products);
    setError(null);
    return true;
  }, []);

  useEffect(() => { void loadProducts().finally(() => setLoading(false)); }, [loadProducts]);

  const filtered = products.filter(p =>
    (showArchived ? p.status === "discontinued" : p.status === "active") &&
    (category === "all" || p.category === category) &&
    (!search.trim() || `${p.name} ${p.product_code}`.toLowerCase().includes(search.trim().toLowerCase()))
  );

  async function handleSave(data: {
    name: string; unit: string; package_size: string | null; price: number;
    min_stock: number; category: ProductCategory;
  }, id?: string): Promise<{ id: string; product_code: string }> {
    if (id) {
      const current = products.find(p => p.id === id);
      if (!current) throw new Error("This item is no longer in the loaded catalog. Refresh and try again.");
      const { data: updated, error: updateError } = await createClient().from("products")
        .update(data).eq("id", id).select("id");
      if (updateError) throw new Error(updateError.message);
      if (!updated?.length) throw new Error("The item was not updated. Check your database permissions.");
      setNotice(`Updated ${data.name}.`);
      return { id, product_code: current.product_code };
    }
    const result = await addProduct(data);
    if (result.error) throw new Error(result.error.message);
    if (!result.data) throw new Error("The new item could not be confirmed. Please refresh the catalog.");
    setNotice(`Added ${data.name}.`);
    return { id: result.data.id, product_code: result.data.product_code };
  }

  async function toggleArchive() {
    if (!archiveTarget || busy) return;
    setBusy(true); setError(null); setNotice(null);
    const target = archiveTarget;
    const newStatus = target.status === "active" ? "discontinued" : "active";
    try {
      const result = await setProductStatus(target.id, newStatus);
      if (result.error) throw new Error(result.error.message);
      setArchiveTarget(null);
      const refreshed = await loadProducts();
      if (refreshed) setNotice(`${target.name} ${newStatus === "active" ? "restored" : "archived"} successfully.`);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to change item status."); }
    finally { setBusy(false); }
  }

  return <div className="pb-12">
    <h1 className="text-3xl font-bold text-brand-pink">POS Configuration</h1>
    <p className="mt-1 text-sm text-zinc-500">Manage the items used by POS and Inventory.</p>
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      <button type="button" onClick={() => router.push("/admin/pos")} aria-label="Back to POS" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-pink-200 bg-white hover:border-brand-pink">←</button>
      <input type="search" aria-label="Search items" placeholder="Search items by name or code" value={search} onChange={e => setSearch(e.target.value)} className="min-w-0 flex-1 rounded-full border border-pink-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
      <button type="button" onClick={() => { setNotice(null); setFormModal({ mode: "add" }); }} className="rounded-full border-2 border-brand-pink px-5 py-2 text-sm font-semibold text-brand-pink hover:bg-pink-50">Add Product</button>
      <button type="button" onClick={() => setShowArchived(v => !v)} className={`rounded-full border-2 px-5 py-2 text-sm font-semibold ${showArchived ? "border-zinc-800 bg-zinc-800 text-white" : "border-zinc-300 text-zinc-600"}`}>{showArchived ? "Viewing Archive" : "Archive"}</button>
    </div>
    <div className="mt-3 flex flex-wrap gap-2">{categories.map(c => <button type="button" key={c.value} onClick={() => setCategory(c.value)} className={`rounded-full border px-4 py-2 text-sm font-medium ${category === c.value ? "border-brand-pink bg-brand-pink text-white" : "border-brand-pink bg-white text-zinc-700"}`}>{c.label}</button>)}</div>
    {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>}
    <div className="mt-4 grid max-h-[60vh] grid-cols-2 gap-4 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4">
      {loading ? <p className="col-span-full py-10 text-center text-zinc-500">Loading products…</p> : filtered.length === 0 ? <p className="col-span-full py-10 text-center text-zinc-500">{showArchived ? "No archived products match these filters." : "No active products match these filters."}</p> : filtered.map(product => <ProductManageCard key={product.id} product={product} onEdit={() => { setNotice(null); setFormModal({ mode: "edit", product }); }} onArchiveToggle={() => setArchiveTarget(product)} />)}
    </div>
    {formModal && <ProductFormModal key={`${formModal.mode}-${formModal.product?.id ?? "new"}`} mode={formModal.mode} existing={formModal.product} onSave={handleSave} onClose={() => { setFormModal(null); void loadProducts(); }} />}
    {archiveTarget && <ArchiveConfirmModal itemName={archiveTarget.name} archived={archiveTarget.status === "discontinued"} onClose={() => { if (!busy) setArchiveTarget(null); }} onConfirm={toggleArchive} />}
  </div>;
}
