"use client";

import { useState } from "react";
import { setProductImage, uploadProductImage } from "@/lib/supabase/products";
import type { PetType, Product, ProductCategory } from "@/lib/types/products";

const categories: ProductCategory[] = ["Food", "Treats", "Grooming", "Accessories", "Hygiene"];
const unitOptions = ["Piece", "Kilo", "Liters", "Pack", "Bottle", "Can", "Pouch", "Box"] as const;
const petTypeOptions: { label: string; value: PetType }[] = [
  { label: "Dogs", value: "dog" },
  { label: "Cats", value: "cat" },
];

type FormValues = {
  name: string;
  description: string;
  pet_types: PetType[];
  unit: string;
  package_size: string | null;
  price: number;
  min_stock: number;
  category: ProductCategory;
};

export default function ProductFormModal({
  mode,
  existing,
  onClose,
  onSave,
}: {
  mode: "add" | "edit";
  existing?: Product;
  onClose: () => void;
  onSave: (product: FormValues, id?: string) => Promise<{ id: string; product_code: string } | null>;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [petTypes, setPetTypes] = useState<PetType[]>(existing?.pet_types ?? []);
  const [unit, setUnit] = useState(existing?.unit || unitOptions[0]);
  const [packageSize, setPackageSize] = useState(existing?.package_size ?? "");
  const [price, setPrice] = useState(existing ? String(existing.price) : "");
  const [minStock, setMinStock] = useState(existing ? String(existing.min_stock) : "0");
  const [category, setCategory] = useState<ProductCategory>(existing?.category ?? "Food");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(existing?.image_url ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableUnitOptions = unitOptions.includes(unit as (typeof unitOptions)[number])
    ? [...unitOptions]
    : [unit, ...unitOptions];

  function togglePetType(value: PetType) {
    setPetTypes((current) =>
      current.includes(value) ? current.filter((type) => type !== value) : [...current, value]
    );
  }

  function selectImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const priceNumber = Number(price);
    const stockNumber = Number(minStock);

    if (!name.trim() || !unit.trim() || !packageSize.trim() || !price.trim() || !minStock.trim()) {
      setError("Product name, unit, size, price, and minimum stock are required.");
      return;
    }
    if (!Number.isFinite(priceNumber) || priceNumber < 0) {
      setError("Enter a valid non-negative price.");
      return;
    }
    if (!Number.isSafeInteger(stockNumber) || stockNumber < 0) {
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
      const result = await onSave(
        {
          name: name.trim(),
          description: description.trim(),
          pet_types: petTypes,
          unit: unit.trim(),
          package_size: packageSize.trim(),
          price: priceNumber,
          min_stock: stockNumber,
          category,
        },
        existing?.id
      );
      if (!result) throw new Error("The product could not be saved. Please retry.");
      if (imageFile) {
        const upload = await uploadProductImage(imageFile, result.product_code);
        if (upload.error || !upload.url)
          throw new Error(`Item saved, but image upload failed: ${upload.error ?? "no URL returned"}`);
        const linked = await setProductImage(result.id, upload.url);
        if (linked.error)
          throw new Error(`Item saved, but image could not be linked: ${linked.error.message}`);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save item.");
    } finally {
      setSaving(false);
    }
  }

  const field =
    "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink";

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/55 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={mode === "add" ? "Add product" : "Edit product"}
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between bg-brand-pink px-6 py-4 text-white">
          <h2 className="font-bold">{mode === "add" ? "Add Product" : "Edit Product"}</h2>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            aria-label="Close"
            className="rounded-full px-2 py-1 hover:bg-white/20"
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={(e) => {
            void submit(e);
          }}
          className="space-y-4 px-6 py-5"
        >
          <div>
            <span className="text-sm font-semibold text-zinc-700">Product Image</span>
            <label className="mt-1 flex h-32 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-pink-200 bg-pink-50">
              {previewUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="Selected product preview" className="h-full w-full object-contain p-2" />
                </>
              ) : (
                <span className="text-sm text-zinc-500">Choose an image</span>
              )}
              <input type="file" accept="image/*" disabled={saving} onChange={selectImage} className="sr-only" />
            </label>
          </div>

          <label className="block text-sm font-semibold text-zinc-700">
            Product Name <span className="text-red-500">*</span>
            <input
              required
              maxLength={180}
              value={name}
              onChange={(e) => setName(e.target.value)}
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
            <span className="mt-1 block text-right text-xs font-normal text-zinc-400">
              {description.length}/300
            </span>
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
                className={field}
              >
                {availableUnitOptions.map((u) => (
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
              className={field}
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
