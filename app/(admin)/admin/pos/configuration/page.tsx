"use client";
// POS Configuration: editing WHAT'S in the POS/customer catalog (not
// making sales — that's the main Point of Sale screen). Add/Edit/Archive
// write to the same real "products" Supabase table used by Inventory and
// the sales-side POS screen.
//
// Moved here from Operation Management — this now lives under the POS
// module itself, reached via a "Configuration" button on the main POS
// screen, since that's where it conceptually belongs.
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchProducts, addProduct, updateProduct, setProductStatus } from "@/lib/supabase/products";
import type { Product, ProductCategory } from "@/lib/types/products";
import ProductManageCard from "@/components/admin/operations/ProductManageCard";
import ProductFormModal from "@/components/admin/operations/ProductFormModal";
import ArchiveConfirmModal from "@/components/admin/operations/ArchiveConfirmModal";

const categoryTabs: { label: string; value: ProductCategory | "all" }[] = [
  { label: "All Items", value: "all" },
  { label: "Food", value: "Food" },
  { label: "Treats", value: "Treats" },
  { label: "Groom Product", value: "Grooming" },
  { label: "Accessories", value: "Accessories" },
  { label: "Hygiene", value: "Hygiene" },
];

export default function PosManagementPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [category, setCategory] = useState<ProductCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [formModal, setFormModal] = useState<{ mode: "add" | "edit"; product?: Product } | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Product | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const loadProducts = useCallback(async () => {
    const { products: data, error } = await fetchProducts();
    if (error) { setLoadError(error); return; }
    setLoadError(null);
    setProducts(data);
  }, []);

  useEffect(() => {
    setLoading(true);
    loadProducts().finally(() => setLoading(false));
  }, [loadProducts]);

  const filtered = products.filter((p) => {
    const matchesArchive = showArchived ? p.status === "discontinued" : p.status === "active";
    const matchesCategory = category === "all" || p.category === category;
    const matchesSearch = !search.trim() || p.name.toLowerCase().includes(search.trim().toLowerCase());
    return matchesArchive && matchesCategory && matchesSearch;
  });

  async function handleSave(
    data: { name: string; unit: string; package_size: string | null; price: number; min_stock: number; category: ProductCategory },
    id?: string
  ): Promise<{ id: string; product_code: string } | null> {
    if (id) {
      const { error } = await updateProduct(id, {
        name: data.name, category: data.category, unit: data.unit, min_stock: data.min_stock,
      });
      if (error) return null;
      await loadProducts();
      // product_code never changes on edit, so the existing product's
      // code is still correct here — only the freshly reloaded id/code
      // pairing actually matters for the image-upload step that follows.
      const current = products.find((p) => p.id === id);
      return current ? { id, product_code: current.product_code } : null;
    } else {
      const { data: created, error } = await addProduct({
        name: data.name, category: data.category, unit: data.unit,
        package_size: data.package_size, price: data.price, min_stock: data.min_stock,
      });
      if (error || !created) return null;
      return { id: created.id, product_code: created.product_code };
    }
  }

  async function toggleArchive() {
    if (!archiveTarget) return;
    const newStatus = archiveTarget.status === "active" ? "discontinued" : "active";
    await setProductStatus(archiveTarget.id, newStatus);
    await loadProducts();
    setArchiveTarget(null);
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-brand-pink">POS Configuration</h1>

      <div className="mt-4 flex flex-col sm:flex-row gap-3">
        <button onClick={() => router.push("/admin/pos")} aria-label="Back" className="w-9 h-9 shrink-0 rounded-full bg-white border border-pink-200 flex items-center justify-center text-zinc-600 hover:border-brand-pink transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M5 12l6-6M5 12l6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="flex-1 relative">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4-4" strokeLinecap="round" />
          </svg>
          <input type="text" placeholder="Search items" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-full border border-pink-200 bg-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
        </div>
        <button onClick={() => setFormModal({ mode: "add" })} className="border-2 border-brand-pink text-brand-pink font-semibold text-sm px-5 py-2 rounded-full hover:bg-brand-pink hover:text-white transition-colors whitespace-nowrap">
          Add Product
        </button>
        <button
          onClick={() => setShowArchived((v) => !v)}
          className={`font-semibold text-sm px-5 py-2 rounded-full border-2 transition-colors whitespace-nowrap ${
            showArchived ? "bg-zinc-800 border-zinc-800 text-white" : "border-zinc-300 text-zinc-500 hover:border-zinc-400"
          }`}
        >
          {showArchived ? "Viewing Archive" : "Archive"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {categoryTabs.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setCategory(cat.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              category === cat.value ? "bg-brand-pink border-brand-pink text-white" : "bg-white border-brand-pink text-zinc-700 hover:bg-brand-tint"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {loadError && <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{loadError}</p>}

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto pr-1">
        {loading ? (
          <p className="col-span-full text-center text-zinc-400 py-10">Loading products…</p>
        ) : filtered.length === 0 ? (
          <p className="col-span-full text-center text-zinc-400 py-10">
            {showArchived ? "No archived products." : "No products match your search/filter."}
          </p>
        ) : (
          filtered.map((product) => (
            <ProductManageCard
              key={product.id}
              product={product}
              onEdit={() => setFormModal({ mode: "edit", product })}
              onArchiveToggle={() => setArchiveTarget(product)}
            />
          ))
        )}
      </div>

      {formModal && (
        <ProductFormModal
          mode={formModal.mode}
          existing={formModal.product}
          onClose={() => { setFormModal(null); loadProducts(); }}
          onSave={handleSave}
        />
      )}

      {archiveTarget && (
        <ArchiveConfirmModal
          itemName={archiveTarget.name}
          archived={archiveTarget.status === "discontinued"}
          onClose={() => setArchiveTarget(null)}
          onConfirm={toggleArchive}
        />
      )}
    </div>
  );
}
