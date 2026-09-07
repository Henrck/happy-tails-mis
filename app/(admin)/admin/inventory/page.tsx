"use client";
// Inventory — real data, sortable + paginated tables. Stocks now
// defaults to sorting by real insertion timestamp (created_at) instead
// of received_date, so "latest changes first" is actually reliable even
// when multiple batches/adjustments happen on the same day.
import { useState, useEffect, useMemo, useCallback } from "react";
import { fetchProducts, fetchAllBatches } from "@/lib/supabase/products";
import { sortRows, nextSortState, type SortDirection } from "@/lib/utils/sort";
import type { Product, ProductBatch } from "@/lib/types/products";
import InventoryStats from "@/components/admin/inventory/InventoryStats";
import InventoryTabs from "@/components/admin/inventory/InventoryTabs";
import ProductsTable from "@/components/admin/inventory/ProductsTable";
import StocksTable from "@/components/admin/inventory/StocksTable";
import ProductDetailModal from "@/components/admin/inventory/ProductDetailModal";
import AddProductModal from "@/components/admin/inventory/AddProductModal";
import Pagination from "@/components/admin/Pagination";

const PAGE_SIZE = 10;

function isExpiringSoon(expirationDate: string | null, withinDays = 30): boolean {
  if (!expirationDate) return false;
  const days = (new Date(expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return days >= 0 && days <= withinDays;
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<"products" | "stocks">("products");
  const [statusView, setStatusView] = useState<"active" | "discontinued">("active");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);
  const [addProductOpen, setAddProductOpen] = useState(false);

  const [productsSortKey, setProductsSortKey] = useState<string | null>(null);
  const [productsSortDirection, setProductsSortDirection] = useState<SortDirection>(null);
  const [stocksSortKey, setStocksSortKey] = useState<string | null>(null);
  const [stocksSortDirection, setStocksSortDirection] = useState<SortDirection>(null);

  const [productsPage, setProductsPage] = useState(0);
  const [stocksPage, setStocksPage] = useState(0);

  const loadData = useCallback(async () => {
    setError(null);
    const [productsResult, batchesResult] = await Promise.all([fetchProducts(), fetchAllBatches()]);
    if (productsResult.error) setError(productsResult.error);
    setProducts(productsResult.products);
    setBatches(batchesResult.batches);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const activeCount = products.filter((p) => p.status === "active").length;
  const discontinuedCount = products.filter((p) => p.status === "discontinued").length;
  const visibleProducts = products.filter((p) => p.status === statusView);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matched = visibleProducts.filter(
      (p) => !q || p.name.toLowerCase().includes(q) || p.product_code.toLowerCase().includes(q)
    );
    const enriched = matched.map((p) => {
      const total = batches.filter((b) => b.product_id === p.id).reduce((sum, b) => sum + b.quantity, 0);
      return { ...p, totalStock: total, statusLabel: total <= p.min_stock ? "Low Stock" : "In Stock" };
    });
    return sortRows(enriched, productsSortKey, productsSortDirection);
  }, [visibleProducts, search, batches, productsSortKey, productsSortDirection]);

  const filteredBatches = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matches = batches.filter((b) => {
      if (!q) return true;
      const name = products.find((p) => p.id === b.product_id)?.name.toLowerCase() ?? "";
      return b.batch_number.toLowerCase().includes(q) || name.includes(q);
    });

    const enriched = matches.map((b) => ({
      ...b,
      productName: products.find((p) => p.id === b.product_id)?.name ?? b.product_id,
      statusLabel: isExpiringSoon(b.expiration_date) ? "Expiring Soon" : "Good",
    }));

    // Default: real insertion order, newest first — created_at has full
    // timestamp precision, so this is reliable even when several things
    // happen on the same calendar day (received_date alone can't tell
    // those apart). Once a header is clicked, that sort takes over.
    if (!stocksSortKey) {
      return [...enriched].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return sortRows(enriched, stocksSortKey, stocksSortDirection);
  }, [batches, products, search, stocksSortKey, stocksSortDirection]);

  const pagedProducts = filteredProducts.slice(productsPage * PAGE_SIZE, productsPage * PAGE_SIZE + PAGE_SIZE);
  const pagedBatches = filteredBatches.slice(stocksPage * PAGE_SIZE, stocksPage * PAGE_SIZE + PAGE_SIZE);

  function handleProductsSort(key: string) {
    const next = nextSortState(productsSortKey, productsSortDirection, key);
    setProductsSortKey(next.key);
    setProductsSortDirection(next.direction);
    setProductsPage(0);
  }

  function handleStocksSort(key: string) {
    const next = nextSortState(stocksSortKey, stocksSortDirection, key);
    setStocksSortKey(next.key);
    setStocksSortDirection(next.direction);
    setStocksPage(0);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setProductsPage(0);
    setStocksPage(0);
  }

  function handleStatusViewChange(view: "active" | "discontinued") {
    setStatusView(view);
    setProductsPage(0);
  }

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-brand-pink">Inventory</h1>
        <button
          onClick={() => setAddProductOpen(true)}
          className="flex items-center gap-2 bg-brand-pink hover:bg-brand-pink-dark text-white font-semibold text-sm px-5 py-2.5 rounded-full transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>
          Add Product
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2.5">{error}</p>}

      <div className="mt-6"><InventoryStats products={products} batches={batches} /></div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <InventoryTabs active={tab} onChange={setTab} />
        <div className="relative w-full sm:w-72">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder={tab === "products" ? "Search products" : "Search batches"}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-full border border-pink-200 bg-white pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
          />
        </div>
      </div>

      {tab === "products" && (
        <div className="mt-3 flex gap-2">
          <button onClick={() => handleStatusViewChange("active")} className={`text-xs font-semibold px-4 py-1.5 rounded-full transition-colors ${statusView === "active" ? "bg-zinc-800 text-white" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"}`}>
            Active ({activeCount})
          </button>
          <button onClick={() => handleStatusViewChange("discontinued")} className={`text-xs font-semibold px-4 py-1.5 rounded-full transition-colors ${statusView === "discontinued" ? "bg-zinc-800 text-white" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"}`}>
            Discontinued ({discontinuedCount})
          </button>
        </div>
      )}

      <div className="mt-4">
        {loading ? (
          <p className="text-center text-zinc-400 py-10">Loading inventory...</p>
        ) : tab === "products" ? (
          <ProductsTable products={pagedProducts} batches={batches} onView={setSelected} sortKey={productsSortKey} sortDirection={productsSortDirection} onSort={handleProductsSort} />
        ) : (
          <StocksTable batches={pagedBatches} products={products} sortKey={stocksSortKey} sortDirection={stocksSortDirection} onSort={handleStocksSort} />
        )}
      </div>

      {!loading && (
        <div className="mt-4">
          {tab === "products" ? (
            <Pagination page={productsPage} pageSize={PAGE_SIZE} totalItems={filteredProducts.length} onPageChange={setProductsPage} />
          ) : (
            <Pagination page={stocksPage} pageSize={PAGE_SIZE} totalItems={filteredBatches.length} onPageChange={setStocksPage} />
          )}
        </div>
      )}

      {selected && (
        <ProductDetailModal product={selected} batches={batches} onClose={() => setSelected(null)} onChanged={loadData} />
      )}

      {addProductOpen && (
        <AddProductModal onClose={() => setAddProductOpen(false)} onAdded={() => { setAddProductOpen(false); loadData(); }} />
      )}
    </div>
  );
}
