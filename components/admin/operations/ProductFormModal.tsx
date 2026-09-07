"use client";
// Add/Edit product form. FIXED: setProductImage()'s result was being
// awaited but its error was never checked — a silent failure there
// would close the modal and look successful while the database never
// actually got the new image_url. Now it's checked and surfaced like
// every other error path here.
import { useState } from "react";
import { uploadProductImage, setProductImage } from "@/lib/supabase/products";
import type { Product, ProductCategory } from "@/lib/types/products";

const categories: { value: ProductCategory; label: string }[] = [
  { value: "Food", label: "Food" },
  { value: "Treats", label: "Treats" },
  { value: "Grooming", label: "Grooming" },
  { value: "Accessories", label: "Accessories" },
  { value: "Hygiene", label: "Hygiene" },
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
  onSave: (product: {
    name: string; unit: string; package_size: string | null; price: number; min_stock: number; category: ProductCategory;
  }, id?: string) => Promise<{ id: string; product_code: string } | null>;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  const [unit, setUnit] = useState(existing?.unit ?? "");
  const [packageSize, setPackageSize] = useState(existing?.package_size ?? "");
  const [price, setPrice] = useState(existing ? String(existing.price) : "");
  const [minStock, setMinStock] = useState(existing ? String(existing.min_stock) : "");
  const [category, setCategory] = useState<ProductCategory>(existing?.category ?? "Food");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(existing?.image_url ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  }

  async function handleSubmit() {
    if (!name.trim() || !unit.trim() || !price) {
      setError("Name, unit, and price are required.");
      return;
    }
    setSaving(true);
    setError(null);

    const saved = await onSave(
      {
        name: name.trim(),
        unit: unit.trim(),
        package_size: packageSize.trim() || null,
        price: parseFloat(price) || 0,
        min_stock: parseInt(minStock) || 0,
        category,
      },
      existing?.id
    );

    if (!saved) {
      setSaving(false);
      setError("Failed to save product.");
      return;
    }

    if (imageFile) {
      const { url, error: uploadError } = await uploadProductImage(imageFile, saved.product_code);
      if (uploadError) {
        setSaving(false);
        setError(`Product saved, but image upload failed: ${uploadError}`);
        return; // deliberately do NOT close the modal — the image didn't save, so the user should see that and can retry
      }
      if (url) {
        const { error: linkError } = await setProductImage(saved.id, url);
        if (linkError) {
          // THIS was the silent failure — now it's caught and shown
          // instead of pretending everything worked.
          setSaving(false);
          setError(`Image uploaded, but couldn't be linked to the product: ${linkError.message}`);
          return;
        }
      }
    }

    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="bg-brand-pink px-6 py-4 flex items-center justify-between sticky top-0">
          <h3 className="text-white font-bold">{mode === "add" ? "Add Product" : "Edit Product"}</h3>
          <button onClick={onClose} className="text-white hover:opacity-80" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="px-6 py-6 space-y-4">
          <div>
            <label className="text-sm font-semibold text-zinc-700">Product Image</label>
            <label className="mt-1 flex flex-col items-center justify-center border-2 border-dashed border-pink-200 rounded-xl h-32 cursor-pointer hover:border-brand-pink transition-colors overflow-hidden bg-brand-tint">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="Preview" className="w-full h-full object-contain p-2" />
              ) : (
                <span className="text-xs text-zinc-400">Click to upload image</span>
              )}
              <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </label>
          </div>

          <div>
            <label className="text-sm font-semibold text-zinc-700">Item Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-zinc-700">Unit</label>
              <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. Piece, Kilo" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
            </div>
            <div>
              <label className="text-sm font-semibold text-zinc-700">Package Size</label>
              <input value={packageSize} onChange={(e) => setPackageSize(e.target.value)} placeholder="e.g. 80g" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-zinc-700">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as ProductCategory)} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink">
              {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-zinc-700">Price (₱)</label>
              <input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
            </div>
            <div>
              <label className="text-sm font-semibold text-zinc-700">Min Stock</label>
              <input type="number" min={0} value={minStock} onChange={(e) => setMinStock(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 border-2 border-zinc-300 text-zinc-500 font-semibold text-sm py-2.5 rounded-full hover:border-zinc-400 transition-colors">Cancel</button>
            <button onClick={handleSubmit} disabled={saving} className="flex-1 bg-brand-pink hover:bg-brand-pink-dark disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded-full transition-colors">
              {saving ? "Saving..." : mode === "add" ? "Add" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
