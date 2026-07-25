"use client";
// Add/Edit product form. Image "upload" here only creates a local preview
// URL (URL.createObjectURL) — it is NOT actually uploaded or persisted
// anywhere. Real image upload needs Supabase Storage, which doesn't exist
// yet. This is clearly labeled in the UI so it doesn't look done when it
// isn't.
import { useState } from "react";
import type { Product, ProductCategory } from "@/lib/data/products";

const categories: { value: ProductCategory; label: string }[] = [
  { value: "food", label: "Food" },
  { value: "treats", label: "Treats" },
  { value: "groom", label: "Groom Product" },
  { value: "accessories", label: "Accessories" },
];

export default function ProductFormModal({
  mode,
  existing,
  onClose,
  onSave,
}: {
  mode: "add" | "edit";
  existing?: Product;
  onClose: () => void;
  onSave: (product: Omit<Product, "id" | "archived">, id?: string) => void;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  const [weight, setWeight] = useState(existing?.weight ?? "");
  const [price, setPrice] = useState(existing ? String(existing.price) : "");
  const [category, setCategory] = useState<ProductCategory>(existing?.category ?? "food");
  const [previewUrl, setPreviewUrl] = useState<string | null>(existing?.imageUrl ?? null);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPreviewUrl(URL.createObjectURL(file));
  }

  function handleSubmit() {
    if (!name.trim() || !weight.trim() || !price) return;
    onSave(
      { name: name.trim(), weight: weight.trim(), price: parseFloat(price) || 0, category, imageUrl: previewUrl },
      existing?.id
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="bg-brand-pink px-6 py-4 flex items-center justify-between sticky top-0">
          <h3 className="text-white font-bold">{mode === "add" ? "Add Product" : "Edit Product"}</h3>
          <button onClick={onClose} className="text-white hover:opacity-80" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-6 space-y-4">
          <div>
            <label className="text-sm font-semibold text-zinc-700">Product Image</label>
            <label className="mt-1 flex flex-col items-center justify-center border-2 border-dashed border-pink-200 rounded-xl h-32 cursor-pointer hover:border-brand-pink transition-colors overflow-hidden">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs text-zinc-400">Click to upload image</span>
              )}
              <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </label>
            <p className="mt-1 text-[11px] text-zinc-400">
              Preview only for now — real image upload needs cloud storage, not set up yet.
            </p>
          </div>

          <div>
            <label className="text-sm font-semibold text-zinc-700">Item Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-zinc-700">Unit</label>
              <input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 80g, 1pc" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
            </div>
            <div>
              <label className="text-sm font-semibold text-zinc-700">Price (₱)</label>
              <input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-zinc-700">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as ProductCategory)} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink">
              {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 border-2 border-zinc-300 text-zinc-500 font-semibold text-sm py-2.5 rounded-full hover:border-zinc-400 transition-colors">
              Cancel
            </button>
            <button onClick={handleSubmit} className="flex-1 bg-brand-pink hover:bg-brand-pink-dark text-white font-semibold text-sm py-2.5 rounded-full transition-colors">
              {mode === "add" ? "Add" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
