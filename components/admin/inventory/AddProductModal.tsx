"use client";

import { useState } from "react";
import { addProduct } from "@/lib/supabase/products";
import type { PetType, ProductCategory } from "@/lib/types/products";

const categories: ProductCategory[] = ["Food", "Treats", "Grooming", "Accessories", "Hygiene"];
const unitOptions = ["Piece", "Kilo", "Liters", "Pack", "Bottle", "Can", "Pouch", "Box"] as const;
const petTypeOptions: { label: string; value: PetType }[] = [
  { label: "Dogs", value: "dog" },
  { label: "Cats", value: "cat" },
];

export default function AddProductModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ProductCategory>("Food");
  const [unit, setUnit] = useState<string>(unitOptions[0]);
  const [packageSize, setPackageSize] = useState("");
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const parsedPrice = Number(price);
    const parsedMinStock = Number(minStock);

    if (!name.trim() || !unit.trim() || !packageSize.trim() || !price.trim() || !minStock.trim()) {
      setError("Product name, unit, size, price, and minimum stock are required.");
      return;
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setError("Enter a valid non-negative price.");
      return;
    }
    if (!Number.isSafeInteger(parsedMinStock) || parsedMinStock < 0) {
      setError("Minimum stock must be a non-negative whole number.");
      return;
    }
    if (petTypes.length === 0) {
      setError("Select at least one pet type: Dogs, Cats, or both.");
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
        package_size: packageSize.trim(),
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
        <div className="sticky top-0 z-10 flex items-center justify-between bg-brand-pink px-6 py-4">
          <h3 className="font-bold text-white">Add Product</h3>
          <button type="button" disabled={saving} onClick={onClose} aria-label="Close" className="text-white hover:opacity-80">
            ✕
          </button>
        </div>

        <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4 px-6 py-5">
          <label className="block text-sm font-semibold text-zinc-700">
            Product Name <span className="text-red-500">*</span>
            <input
              required
              maxLength={180}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Aozi Cat Can"
              className={field}
            />
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

          <fieldset className="rounded-xl border border-pink-200 p-4">
            <legend className="px-1 text-sm font-semibold text-zinc-700">
              Pet Applicability <span className="text-red-500">*</span>
            </legend>
            <div className="grid grid-cols-2 gap-3">
              {petTypeOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm font-semibold ${
                    petTypes.includes(option.value)
                      ? "border-brand-pink bg-pink-50 text-brand-pink"
                      : "border-zinc-200 text-zinc-700"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={petTypes.includes(option.value)}
                    onChange={() => togglePetType(option.value)}
                    className="h-4 w-4 accent-pink-600"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-semibold text-zinc-700">
              Unit <span className="text-red-500">*</span>
              <select
                required
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className={`${field} bg-white`}
              >
                {unitOptions.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-semibold text-zinc-700">
              Size <span className="text-red-500">*</span>
              <input
                required
                value={packageSize}
                onChange={(e) => setPackageSize(e.target.value)}
                placeholder="e.g. 80g, 120mL, Large"
                className={field}
              />
            </label>
          </div>

          <label className="block text-sm font-semibold text-zinc-700">
            Category <span className="text-red-500">*</span>
            <select
              required
              value={category}
              onChange={(e) => setCategory(e.target.value as ProductCategory)}
              className={`${field} bg-white`}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-semibold text-zinc-700">
              Price (₱) <span className="text-red-500">*</span>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className={field}
              />
            </label>

            <label className="text-sm font-semibold text-zinc-700">
              Min Stock <span className="text-red-500">*</span>
              <input
                required
                type="number"
                min="0"
                step="1"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                placeholder="0"
                className={field}
              />
            </label>
          </div>

          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="flex-1 rounded-full border-2 border-zinc-300 py-2.5 text-sm font-semibold text-zinc-600 hover:border-zinc-400 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-full bg-brand-pink py-2.5 text-sm font-semibold text-white hover:bg-brand-pink-dark disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
