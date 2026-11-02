"use client";

import { useEffect, useState } from "react";
import { uploadProductImage, setProductImage } from "@/lib/supabase/products";
import type { Product, ProductCategory } from "@/lib/types/products";

const categories: ProductCategory[] = ["Food", "Treats", "Grooming", "Accessories", "Hygiene"];
type FormValues = { name: string; unit: string; package_size: string | null; price: number; min_stock: number; category: ProductCategory };

export default function ProductFormModal({ mode, existing, onClose, onSave }: {
  mode: "add" | "edit";
  existing?: Product;
  onClose: () => void;
  onSave: (product: FormValues, id?: string) => Promise<{ id: string; product_code: string } | null>;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  const [unit, setUnit] = useState(existing?.unit ?? "");
  const [packageSize, setPackageSize] = useState(existing?.package_size ?? "");
  const [price, setPrice] = useState(existing ? String(existing.price) : "");
  const [minStock, setMinStock] = useState(existing ? String(existing.min_stock) : "0");
  const [category, setCategory] = useState<ProductCategory>(existing?.category ?? "Food");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(existing?.image_url ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    return () => { if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);
  function selectImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please select an image file."); return; }
    if (file.size > 8 * 1024 * 1024) { setError("Images must be 8 MB or smaller."); return; }
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError(null);
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const priceNumber = Number(price), stockNumber = Number(minStock);
    if (!name.trim() || !unit.trim() || !price.trim() || !minStock.trim()) { setError("Item name, unit, price, and minimum stock are required."); return; }
    if (!Number.isFinite(priceNumber) || priceNumber < 0) { setError("Enter a valid non-negative price."); return; }
    if (!Number.isSafeInteger(stockNumber) || stockNumber < 0) { setError("Minimum stock must be a non-negative whole number."); return; }
    setSaving(true); setError(null);
    try {
      const result = await onSave({ name: name.trim(), unit: unit.trim(), package_size: packageSize.trim() || null, price: priceNumber, min_stock: stockNumber, category }, existing?.id);
      if (!result) throw new Error("The product could not be saved. Please retry.");
      if (imageFile) {
        const upload = await uploadProductImage(imageFile, result.product_code);
        if (upload.error || !upload.url) throw new Error(`Item saved, but image upload failed: ${upload.error ?? "no URL returned"}`);
        const linked = await setProductImage(result.id, upload.url);
        if (linked.error) throw new Error(`Item saved, but image could not be linked: ${linked.error.message}`);
      }
      onClose();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to save item."); }
    finally { setSaving(false); }
  }
  const field = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink";
  return <div role="presentation" className="fixed inset-0 z-[110] flex items-center justify-center bg-black/55 p-4" onMouseDown={e => { if (e.target === e.currentTarget && !saving) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-label={mode === "add" ? "Add product" : "Edit product"} className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white shadow-2xl">
      <div className="sticky top-0 z-10 flex items-center justify-between bg-brand-pink px-6 py-4 text-white"><h2 className="font-bold">{mode === "add" ? "Add Product" : "Edit Product"}</h2><button type="button" disabled={saving} onClick={onClose} aria-label="Close" className="rounded-full px-2 py-1 hover:bg-white/20">✕</button></div>
      <form onSubmit={e => { void submit(e); }} className="space-y-4 px-6 py-5">
        <div><span className="text-sm font-semibold text-zinc-700">Product Image</span><label className="mt-1 flex h-32 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-pink-200 bg-pink-50">
          {previewUrl ? <>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={previewUrl} alt="Selected product preview" className="h-full w-full object-contain p-2" /></> : <span className="text-sm text-zinc-500">Choose an image</span>}
          <input type="file" accept="image/*" disabled={saving} onChange={selectImage} className="sr-only" />
        </label></div>
        <label className="block text-sm font-semibold text-zinc-700">Item Name<input required value={name} onChange={e => setName(e.target.value)} className={field} /></label>
        <div className="grid grid-cols-2 gap-3"><label className="text-sm font-semibold text-zinc-700">Unit<input required value={unit} onChange={e => setUnit(e.target.value)} placeholder="Piece, Kilo" className={field} /></label><label className="text-sm font-semibold text-zinc-700">Package Size<input value={packageSize} onChange={e => setPackageSize(e.target.value)} placeholder="80g" className={field} /></label></div>
        <label className="block text-sm font-semibold text-zinc-700">Category<select value={category} onChange={e => setCategory(e.target.value as ProductCategory)} className={field}>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
        <div className="grid grid-cols-2 gap-3"><label className="text-sm font-semibold text-zinc-700">Price (₱)<input required type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className={field} /></label><label className="text-sm font-semibold text-zinc-700">Min Stock<input required type="number" min="0" step="1" value={minStock} onChange={e => setMinStock(e.target.value)} className={field} /></label></div>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="flex gap-3 pt-2"><button type="button" disabled={saving} onClick={onClose} className="flex-1 rounded-full border-2 border-zinc-300 py-2.5 text-sm font-semibold text-zinc-600">Cancel</button><button type="submit" disabled={saving} className="flex-1 rounded-full bg-brand-pink py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : mode === "add" ? "Add" : "Save Changes"}</button></div>
      </form>
    </div>
  </div>;
}
