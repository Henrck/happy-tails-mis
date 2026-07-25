"use client";
// Inventory: Products tab (catalog + computed stock/status) and Stocks
// tab (flat batch list, newest first). Total Stock and Status are always
// computed from batches, never stored directly — see
// lib/data/inventory-mock.ts for why.
import { useState, useMemo } from "react";
import {
  inventoryProducts as initialProducts,
  stockBatches as initialBatches,
  type InventoryProduct,
  type StockBatch,
} from "@/lib/data/inventory-mock";
import InventoryStats from "@/components/admin/inventory/InventoryStats";
import InventoryTabs from "@/components/admin/inventory/InventoryTabs";
import ProductsTable from "@/components/admin/inventory/ProductsTable";
import StocksTable from "@/components/admin/inventory/StocksTable";
import ProductDetailModal from "@/components/admin/inventory/ProductDetailModal";
import AddProductModal from "@/components/admin/inventory/AddProductModal";

export default function InventoryPage() {
  const [products, setProducts] = useState(initialProducts);
  const [batches, setBatches] = useState(initialBatches);
  const [tab, setTab] = useState<"products" | "stocks">("products");
  const [statusView, setStatusView] = useState<"active" | "discontinued">("active");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<InventoryProduct | null>(null);
  const [addProductOpen, setAddProductOpen] = useState(false);

  const activeCount = products.filter((p) => p.status === "active").length;
  const discontinuedCount = products.filter((p) => p.status === "discontinued").length;

  const visibleProducts = products.filter((p) => p.status === statusView);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return visibleProducts.filter(
      (p) => !q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)
    );
  }, [visibleProducts, search]);

  const filteredBatches = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matches = batches.filter((b) => {
      if (!q) return true;
      const name = products.find((p) => p.id === b.productId)?.name.toLowerCase() ?? "";
      return b.batchNumber.toLowerCase().includes(q) || name.includes(q);
    });
    // Newest first — sort by received date descending, falling back to
    // insertion order (id) for same-day entries so freshly-added batches
    // and stock adjustments always land at the top.
    return [...matches].sort((a, b) => {
      const dateDiff = new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime();
      if (dateDiff !== 0) return dateDiff;
      return b.id.localeCompare(a.id);
    });
  }, [batches, products, search]);

  function updateProduct(updated: InventoryProduct) {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setSelected(updated);
  }

  function addBatch(newBatch: Omit<StockBatch, "id">) {
    setBatches((prev) => [...prev, { ...newBatch, id: `b-${Date.now()}` }]);
  }

  function adjustStock(delta: number, reason: string) {
    if (!selected) return;
    setBatches((prev) => [
      ...prev,
      {
        id: `adj-${Date.now()}`,
        productId: selected.id,
        batchNumber: `ADJ · ${reason}`,
        quantity: delta,
        expirationDate: null,
        receivedDate: new Date().toISOString().slice(0, 10),
      },
    ]);
  }

  function discontinueProduct() {
    if (!selected) return;
    setProducts((prev) => prev.map((p) => (p.id === selected.id ? { ...p, status: "discontinued" } : p)));
    setSelected(null);
  }

  function reactivateProduct() {
    if (!selected) return;
    setProducts((prev) => prev.map((p) => (p.id === selected.id ? { ...p, status: "active" } : p)));
    setSelected(null);
  }

  function addProduct(newProduct: { id: string; name: string; unit: string; category: InventoryProduct["category"]; minStock: number }) {
    setProducts((prev) => [...prev, { ...newProduct, status: "active" }]);
    setAddProductOpen(false);
  }

  // Next Product ID, e.g. existing max P105 -> P106.
  const nextProductId = useMemo(() => {
    const maxNum = products.reduce((max, p) => {
      const num = parseInt(p.id.replace(/\D/g, ""), 10);
      return Number.isNaN(num) ? max : Math.max(max, num);
    }, 100);
    return `P${maxNum + 1}`;
  }, [products]);

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-brand-pink">Inventory</h1>
        <button
          onClick={() => setAddProductOpen(true)}
          className="flex items-center gap-2 bg-brand-pink hover:bg-brand-pink-dark text-white font-semibold text-sm px-5 py-2.5 rounded-full transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          Add Product
        </button>
      </div>

      <div className="mt-6">
        <InventoryStats />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <InventoryTabs active={tab} onChange={setTab} />
        <div className="relative w-full sm:w-72">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4-4" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder={tab === "products" ? "Search products" : "Search batches"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-full border border-pink-200 bg-white pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
          />
        </div>
      </div>

      {tab === "products" && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setStatusView("active")}
            className={`text-xs font-semibold px-4 py-1.5 rounded-full transition-colors ${
              statusView === "active" ? "bg-zinc-800 text-white" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setStatusView("discontinued")}
            className={`text-xs font-semibold px-4 py-1.5 rounded-full transition-colors ${
              statusView === "discontinued" ? "bg-zinc-800 text-white" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
            }`}
          >
            Discontinued ({discontinuedCount})
          </button>
        </div>
      )}

      <div className="mt-4">
        {tab === "products" ? (
          <ProductsTable products={filteredProducts} batches={batches} onView={setSelected} />
        ) : (
          <StocksTable batches={filteredBatches} products={products} />
        )}
      </div>

      {selected && (
        <ProductDetailModal
          product={selected}
          batches={batches}
          onClose={() => setSelected(null)}
          onUpdateProduct={updateProduct}
          onAddBatch={addBatch}
          onAdjustStock={adjustStock}
          onDiscontinue={discontinueProduct}
          onReactivate={reactivateProduct}
        />
      )}

      {addProductOpen && (
        <AddProductModal
          nextId={nextProductId}
          onClose={() => setAddProductOpen(false)}
          onAdd={addProduct}
        />
      )}
    </div>
  );
}
