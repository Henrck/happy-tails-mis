"use client";
// New product form. Auto-generates the next Product ID (P106, P107, ...)
// based on existing products, so the owner doesn't have to invent IDs.
import { useState } from "react";
import type { InventoryCategory } from "@/lib/data/inventory-mock";

const categories: InventoryCategory[] = ["Food", "Grooming", "Accessories", "Hygiene"];

export default function AddProductModal({
  nextId,
  onClose,
  onAdd,
}: {
  nextId: string;
  onClose: () => void;
  onAdd: (product: { id: string; name: string; unit: string; category: InventoryCategory; minStock: number }) => void;
}) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [category, setCategory] = useState<InventoryCategory>("Food");
  const [minStock, setMinStock] = useState("");

  function handleSubmit() {
    if (!name.trim() || !unit.trim()) return;
    onAdd({ id: nextId, name: name.trim(), unit: unit.trim(), category, minStock: parseInt(minStock) || 0 });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="bg-brand-pink px-6 py-4 flex items-center justify-between">
          <h3 className="text-white font-bold">Add Product</h3>
          <button onClick={onClose} className="text-white hover:opacity-80" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-6 space-y-4">
          <p className="text-xs text-zinc-400">Product ID: <span className="font-semibold text-zinc-600">{nextId}</span> (auto-assigned)</p>

          <div>
            <label className="text-sm font-semibold text-zinc-700">Product Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
          </div>
          <div>
            <label className="text-sm font-semibold text-zinc-700">Unit</label>
            <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. Kilo, Piece, Liters" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
          </div>
          <div>
            <label className="text-sm font-semibold text-zinc-700">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as InventoryCategory)} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink">
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-zinc-700">Min Stock</label>
            <input type="number" min={0} value={minStock} onChange={(e) => setMinStock(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
          </div>

          <p className="text-xs text-zinc-400">
            This product will also appear in Point of Sale and the customer shop — same catalog, one source.
          </p>

          <button onClick={handleSubmit} className="w-full bg-brand-pink hover:bg-brand-pink-dark text-white font-semibold py-2.5 rounded-full transition-colors">
            Add Product
          </button>
        </div>
      </div>
    </div>
  );
}
