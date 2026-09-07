"use client";
// Add Product — Inventory version. Image upload deliberately removed:
// product photos are managed exclusively from Operation Management >
// Point of Sales, so there's one place for that, not two. Inventory
// focuses on what it's actually for — stock, batches, thresholds.
import { useState } from "react";
import { addProduct } from "@/lib/supabase/products";
import type { ProductCategory } from "@/lib/types/products";

const categories: ProductCategory[] = ["Food", "Treats", "Grooming", "Accessories", "Hygiene"];

export default function AddProductModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [packageSize, setPackageSize] = useState("");
  const [category, setCategory] = useState<ProductCategory>("Food");
  const [price, setPrice] = useState("");
  const [minStock, setMinStock] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!name.trim() || !unit.trim() || !price) {
      setError("Name, unit, and price are required.");
      return;
    }
    setSaving(true);
    setError(null);

    const { error: err } = await addProduct({
      name: name.trim(),
      category,
      unit: unit.trim(),
      package_size: packageSize.trim() || null,
      price: parseFloat(price) || 0,
      min_stock: parseInt(minStock) || 0,
    });

    setSaving(false);
    if (err) { setError(err.message); return; }
    onAdded();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="bg-brand-pink px-6 py-4">
          <h3 className="text-white font-bold">Add Product</h3>
        </div>

        <div className="px-6 py-6 space-y-4">
          <p className="text-xs text-zinc-400">Product ID will be auto-assigned based on category (e.g. F109, G111).</p>

          <div>
            <label className="text-sm font-semibold text-zinc-700">Product Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-zinc-700">Unit</label>
              <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. Piece, Kilo" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
            </div>
            <div>
              <label className="text-sm font-semibold text-zinc-700">Package Size (optional)</label>
              <input value={packageSize} onChange={(e) => setPackageSize(e.target.value)} placeholder="e.g. 80g" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-zinc-700">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as ProductCategory)} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink">
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
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

          <p className="text-xs text-zinc-400">
            Product photos are managed from Operation Management → Point of Sales, not here.
          </p>

          <button onClick={handleSubmit} disabled={saving} className="w-full bg-brand-pink hover:bg-brand-pink-dark disabled:opacity-50 text-white font-semibold py-2.5 rounded-full transition-colors">
            {saving ? "Adding..." : "Add Product"}
          </button>
        </div>
      </div>
    </div>
  );
}
