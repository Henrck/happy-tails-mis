"use client";
// Product detail modal — batch breakdown (view) plus the 4 actions we
// agreed on: Edit product, Add Batch, Adjust Stock (as a signed adjustment
// entry, so it stays consistent with "everything computed from batches" —
// no special-casing needed elsewhere), and Discontinue (soft delete, since
// a hard delete could break historical sales/reports referencing this
// product later).
import { useState } from "react";
import type { InventoryProduct, StockBatch, InventoryCategory } from "@/lib/data/inventory-mock";
import { getTotalStock, getStatus } from "@/lib/data/inventory-mock";

type Mode = "view" | "edit" | "addBatch" | "adjust" | "confirmDiscontinue";

const categories: InventoryCategory[] = ["Food", "Grooming", "Accessories", "Hygiene"];
const adjustReasons = ["Damaged", "Lost/Miscount", "Expired Removal", "Other"];

export default function ProductDetailModal({
  product,
  batches,
  onClose,
  onUpdateProduct,
  onAddBatch,
  onAdjustStock,
  onDiscontinue,
  onReactivate,
}: {
  product: InventoryProduct;
  batches: StockBatch[];
  onClose: () => void;
  onUpdateProduct: (updated: InventoryProduct) => void;
  onAddBatch: (batch: Omit<StockBatch, "id">) => void;
  onAdjustStock: (delta: number, reason: string) => void;
  onDiscontinue: () => void;
  onReactivate: () => void;
}) {
  const [mode, setMode] = useState<Mode>("view");

  const productBatches = batches.filter((b) => b.productId === product.id);
  const total = getTotalStock(product.id, batches);
  const status = getStatus(total, product.minStock);

  // --- Edit form state ---
  const [editName, setEditName] = useState(product.name);
  const [editUnit, setEditUnit] = useState(product.unit);
  const [editCategory, setEditCategory] = useState<InventoryCategory>(product.category);
  const [editMinStock, setEditMinStock] = useState(String(product.minStock));

  // --- Add batch form state ---
  const [batchNumber, setBatchNumber] = useState("");
  const [batchQty, setBatchQty] = useState("");
  const [batchExpiry, setBatchExpiry] = useState("");

  // --- Adjust stock form state ---
  const [adjustDelta, setAdjustDelta] = useState("");
  const [adjustReason, setAdjustReason] = useState(adjustReasons[0]);

  function saveEdit() {
    onUpdateProduct({
      ...product,
      name: editName,
      unit: editUnit,
      category: editCategory,
      minStock: parseInt(editMinStock) || 0,
    });
    setMode("view");
  }

  function saveAddBatch() {
    const qty = parseInt(batchQty) || 0;
    if (!batchNumber || qty <= 0) return;
    onAddBatch({
      productId: product.id,
      batchNumber,
      quantity: qty,
      expirationDate: batchExpiry || null,
      receivedDate: new Date().toISOString().slice(0, 10),
    });
    setBatchNumber("");
    setBatchQty("");
    setBatchExpiry("");
    setMode("view");
  }

  function saveAdjustment() {
    const delta = parseInt(adjustDelta);
    if (!delta) return;
    onAdjustStock(delta, adjustReason);
    setAdjustDelta("");
    setMode("view");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="bg-brand-pink px-6 py-4 flex items-center justify-between sticky top-0">
          <h3 className="text-white font-bold">
            {mode === "view" && "Product Details"}
            {mode === "edit" && "Edit Product"}
            {mode === "addBatch" && "Add Batch"}
            {mode === "adjust" && "Adjust Stock"}
            {mode === "confirmDiscontinue" && "Discontinue Product"}
          </h3>
          <button onClick={mode === "view" ? onClose : () => setMode("view")} className="text-white hover:opacity-80" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5">
          {mode === "view" && (
            <>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-zinc-400">{product.id}</p>
                  <h4 className="text-lg font-bold text-zinc-900">{product.name}</h4>
                  <p className="text-sm text-zinc-500">{product.unit} · {product.category}</p>
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                  status === "Low Stock" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"
                }`}>
                  {status}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="bg-brand-tint rounded-xl px-4 py-3">
                  <p className="text-zinc-500">Total Stock</p>
                  <p className="text-xl font-bold text-brand-pink">{total}</p>
                </div>
                <div className="bg-brand-tint rounded-xl px-4 py-3">
                  <p className="text-zinc-500">Min Stock</p>
                  <p className="text-xl font-bold text-zinc-700">{product.minStock}</p>
                </div>
              </div>

              <h5 className="mt-5 text-sm font-bold text-brand-pink">Batch Breakdown</h5>
              <div className="mt-2 max-h-48 overflow-y-auto space-y-2 border border-pink-100 rounded-xl p-2.5">
                {productBatches.length === 0 ? (
                  <p className="text-sm text-zinc-400 text-center py-4">No batches on record.</p>
                ) : (
                  productBatches.map((b) => (
                    <div key={b.id} className="flex items-center justify-between bg-zinc-50 rounded-lg px-3 py-2 text-sm">
                      <div>
                        <p className="font-medium text-zinc-800">{b.batchNumber}</p>
                        <p className="text-xs text-zinc-400">
                          Received {b.receivedDate}
                          {b.expirationDate ? ` · Expires ${b.expirationDate}` : " · No expiration"}
                        </p>
                      </div>
                      <span className={`font-semibold shrink-0 pl-2 ${b.quantity < 0 ? "text-red-500" : "text-zinc-800"}`}>
                        {b.quantity > 0 ? `+${b.quantity}` : b.quantity}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {product.status === "active" ? (
                <>
                  <h5 className="mt-5 text-sm font-bold text-brand-pink">Actions</h5>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button onClick={() => setMode("edit")} className="border-2 border-brand-pink text-brand-pink font-semibold text-sm py-2 rounded-full hover:bg-brand-pink hover:text-white transition-colors">
                      Edit Product
                    </button>
                    <button onClick={() => setMode("addBatch")} className="border-2 border-green-500 text-green-600 font-semibold text-sm py-2 rounded-full hover:bg-green-500 hover:text-white transition-colors">
                      Add Batch
                    </button>
                    <button onClick={() => setMode("adjust")} className="border-2 border-amber-500 text-amber-600 font-semibold text-sm py-2 rounded-full hover:bg-amber-500 hover:text-white transition-colors">
                      Adjust Stock
                    </button>
                    <button onClick={() => setMode("confirmDiscontinue")} className="border-2 border-red-400 text-red-500 font-semibold text-sm py-2 rounded-full hover:bg-red-500 hover:text-white transition-colors">
                      Discontinue
                    </button>
                  </div>
                </>
              ) : (
                <div className="mt-5 bg-zinc-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-zinc-500">This product is discontinued.</p>
                  <button onClick={onReactivate} className="mt-3 border-2 border-green-500 text-green-600 font-semibold text-sm px-6 py-2 rounded-full hover:bg-green-500 hover:text-white transition-colors">
                    Reactivate Product
                  </button>
                </div>
              )}
            </>
          )}

          {mode === "edit" && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-zinc-700">Product Name</label>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
              </div>
              <div>
                <label className="text-sm font-semibold text-zinc-700">Unit</label>
                <input value={editUnit} onChange={(e) => setEditUnit(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
              </div>
              <div>
                <label className="text-sm font-semibold text-zinc-700">Category</label>
                <select value={editCategory} onChange={(e) => setEditCategory(e.target.value as InventoryCategory)} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink">
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-zinc-700">Min Stock</label>
                <input type="number" min={0} value={editMinStock} onChange={(e) => setEditMinStock(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
              </div>
              <button onClick={saveEdit} className="w-full bg-brand-pink hover:bg-brand-pink-dark text-white font-semibold py-2.5 rounded-full transition-colors">
                Save Changes
              </button>
            </div>
          )}

          {mode === "addBatch" && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-zinc-700">Batch Number</label>
                <input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} placeholder="e.g. B-2026-031" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
              </div>
              <div>
                <label className="text-sm font-semibold text-zinc-700">Quantity ({product.unit})</label>
                <input type="number" min={1} value={batchQty} onChange={(e) => setBatchQty(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
              </div>
              <div>
                <label className="text-sm font-semibold text-zinc-700">Expiration Date (optional)</label>
                <input type="date" value={batchExpiry} onChange={(e) => setBatchExpiry(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
              </div>
              <button onClick={saveAddBatch} className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 rounded-full transition-colors">
                Add Batch
              </button>
            </div>
          )}

          {mode === "adjust" && (
            <div className="space-y-4">
              <p className="text-sm text-zinc-500">
                Current total: <span className="font-semibold text-zinc-800">{total} {product.unit}</span>
              </p>
              <div>
                <label className="text-sm font-semibold text-zinc-700">Adjustment (use negative to reduce, e.g. -5)</label>
                <input type="number" value={adjustDelta} onChange={(e) => setAdjustDelta(e.target.value)} placeholder="-5" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
              </div>
              <div>
                <label className="text-sm font-semibold text-zinc-700">Reason</label>
                <select value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink">
                  {adjustReasons.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <button onClick={saveAdjustment} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 rounded-full transition-colors">
                Apply Adjustment
              </button>
            </div>
          )}

          {mode === "confirmDiscontinue" && (
            <div className="text-center py-4">
              <p className="text-sm text-zinc-600">
                Discontinuing <strong>{product.name}</strong> hides it from POS and the shop, but keeps its
                sales/batch history intact. This can be reversed later.
              </p>
              <div className="mt-5 flex gap-3">
                <button onClick={() => setMode("view")} className="flex-1 border-2 border-zinc-300 text-zinc-500 font-semibold text-sm py-2.5 rounded-full hover:border-zinc-400 transition-colors">
                  Cancel
                </button>
                <button onClick={onDiscontinue} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold text-sm py-2.5 rounded-full transition-colors">
                  Discontinue
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
