"use client";
// POS Management: editing WHAT'S in the POS/customer catalog (not making
// sales — that's the real Point of Sale module). Add/Edit/Archive write to
// the same shared products.ts used by POS and the customer /products page.
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { products as initialProducts, type Product, type ProductCategory } from "@/lib/data/products";
import ProductManageCard from "@/components/admin/operations/ProductManageCard";
import ProductFormModal from "@/components/admin/operations/ProductFormModal";
import ArchiveConfirmModal from "@/components/admin/operations/ArchiveConfirmModal";

const categoryTabs: { label: string; value: ProductCategory | "all" }[] = [
  { label: "All Items", value: "all" },
  { label: "Food", value: "food" },
  { label: "Treats", value: "treats" },
  { label: "Groom Product", value: "groom" },
  { label: "Accesories", value: "accessories" },
];

export default function PosManagementPage() {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [category, setCategory] = useState<ProductCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [formModal, setFormModal] = useState<{ mode: "add" | "edit"; product?: Product } | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Product | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesArchive = showArchived ? !!p.archived : !p.archived;
      const matchesCategory = category === "all" || p.category === category;
      const matchesSearch = !q || p.name.toLowerCase().includes(q);
      return matchesArchive && matchesCategory && matchesSearch;
    });
  }, [products, category, search, showArchived]);

  function handleSave(data: Omit<Product, "id" | "archived">, id?: string) {
    if (id) {
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
    } else {
      const newId = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `product-${Date.now()}`;
      setProducts((prev) => [...prev, { ...data, id: newId, archived: false }]);
    }
    setFormModal(null);
  }

  function toggleArchive() {
    if (!archiveTarget) return;
    setProducts((prev) => prev.map((p) => (p.id === archiveTarget.id ? { ...p, archived: !p.archived } : p)));
    setArchiveTarget(null);
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-brand-pink">Point of Sale</h1>

      <div className="mt-4 flex flex-col sm:flex-row gap-3">
        <button onClick={() => router.push("/admin/operations")} aria-label="Back" className="w-9 h-9 shrink-0 rounded-full bg-white border border-pink-200 flex items-center justify-center text-zinc-600 hover:border-brand-pink transition-colors">
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

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto pr-1">
        {filtered.length === 0 ? (
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
        <ProductFormModal mode={formModal.mode} existing={formModal.product} onClose={() => setFormModal(null)} onSave={handleSave} />
      )}

      {archiveTarget && (
        <ArchiveConfirmModal
          itemName={archiveTarget.name}
          archived={!!archiveTarget.archived}
          onClose={() => setArchiveTarget(null)}
          onConfirm={toggleArchive}
        />
      )}
    </div>
  );
}
