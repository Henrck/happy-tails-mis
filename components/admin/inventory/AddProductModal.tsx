"use client";

import { useState } from "react";
import { addProduct } from "@/lib/supabase/products";
import type { PetType, ProductCategory } from "@/lib/types/products";

const categories: ProductCategory[] = ["Food", "Treats", "Grooming", "Accessories", "Hygiene"];
const petTypeOptions: { label: string; value: PetType }[] = [
  { label: "Dogs", value: "dog" },
  { label: "Cats", value: "cat" },
];

export default function AddProductModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("");
  const [packageSize, setPackageSize] = useState("");
  const [category, setCategory] = useState<ProductCategory>("Food");
  const [price, setPrice] = useState("");
  const [minStock, setMinStock] = useState("");
  const [petTypes, setPetTypes] = useState<PetType[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function togglePetType(value: PetType) {
    setPetTypes((current) =>
      current.includes(value) ? current.filter((type) => type !== value) : [...current, value]
    );
  }

  async function handleSubmit() {
    if (saving) return;
    if (!name.trim() || !unit.trim() || !price.trim()) {
      setError("Product name, unit, and price are required.");
      return;
    }
    if (petTypes.length === 0) {
      setError("Select at least one pet type: Dogs, Cats, or both.");
      return;
    }
    const parsedPrice = Number(price);
    const parsedMinStock = minStock.trim() ? Number(minStock) : 0;
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setError("Enter a valid price of zero or higher.");
      return;
    }
    if (!Number.isSafeInteger(parsedMinStock) || parsedMinStock < 0) {
      setError("Minimum stock must be a non-negative whole number.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const { error: err } = await addProduct({
        name: name.trim(),
        description: description.trim(),
        category,
        unit: unit.trim(),
        package_size: packageSize.trim() || null,
        price: parsedPrice,
        min_stock: parsedMinStock,
        pet_types: petTypes,
      });
      if (err) {
        setError(err.message);
        return;
      }
      onAdded();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to add product.");
    } finally {
      setSaving(false);
    }
  }

  const field = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="w-full max-w-md overflow-y-auto rounded-3xl bg-white max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="bg-brand-pink px-6 py-4">
          <h3 className="font-bold text-white">Add Product</h3>
        </div>

        <div className="space-y-4 px-6 py-6">
          <p className="text-xs text-zinc-400">Product ID will be auto-assigned based on category (e.g. F109, G111).</p>

          <label className="block text-sm font-semibold text-zinc-700">
            Product Name
            <input value={name} maxLength={180} onChange={(e) => setName(e.target.value)} className={field} />
          </label>

          <label className="block text-sm font-semibold text-zinc-700">
            Brief Description <span className="font-normal text-zinc-400">(optional)</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={300}
              rows={3}
              placeholder="Describe the product, its purpose, or key benefits..."
              className={`${field} resize-y`}
            />
            <span className="mt-1 block text-right text-xs font-normal text-zinc-400">{description.length}/300</span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-semibold text-zinc-700">
              Unit
              <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. Piece, Kilo" className={field} />
            </label>
            <label className="text-sm font-semibold text-zinc-700">
              Package Size <span className="font-normal text-zinc-400">(optional)</span>
              <input value={packageSize} onChange={(e) => setPackageSize(e.target.value)} placeholder="e.g. 80g" className={field} />
            </label>
          </div>

          <label className="block text-sm font-semibold text-zinc-700">
            Category
            <select value={category} onChange={(e) => setCategory(e.target.value as ProductCategory)} className={field}>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>

          <fieldset className="rounded-xl border border-pink-200 p-4">
            <legend className="px-1 text-sm font-semibold text-zinc-700">Pet Applicability</legend>
            <p className="mb-3 text-xs font-normal text-zinc-500">Choose which pets this product is suitable for. You may select one or both.</p>
            <div className="grid grid-cols-2 gap-3">
              {petTypeOptions.map((option) => (
                <label key={option.value} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm font-semibold transition-colors ${petTypes.includes(option.value) ? "border-brand-pink bg-pink-50 text-brand-pink" : "border-zinc-200 bg-white text-zinc-700 hover:border-pink-300"}`}>
                  <input type="checkbox" checked={petTypes.includes(option.value)} onChange={() => togglePetType(option.value)} className="h-4 w-4 accent-pink-600" />
                  {option.label}
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs font-normal text-zinc-500">
              {petTypes.length ? `Selected: ${petTypeOptions.filter((option) => petTypes.includes(option.value)).map((option) => option.label).join(" and ")}` : "Select at least one pet type."}
            </p>
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-semibold text-zinc-700">
              Price (₱)
              <input type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className={field} />
            </label>
            <label className="text-sm font-semibold text-zinc-700">
              Min Stock
              <input type="number" min={0} step={1} value={minStock} onChange={(e) => setMinStock(e.target.value)} className={field} />
            </label>
          </div>

          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          <p className="text-xs text-zinc-400">Product photos are managed from Operation Management → Point of Sales.</p>

          <div className="flex gap-3">
            <button type="button" onClick={onClose} disabled={saving} className="flex-1 rounded-full border border-zinc-300 py-2.5 text-sm font-semibold text-zinc-600">Cancel</button>
            <button type="button" onClick={() => void handleSubmit()} disabled={saving} className="flex-1 rounded-full bg-brand-pink py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-pink-dark disabled:opacity-50">
              {saving ? "Adding..." : "Add Product"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
