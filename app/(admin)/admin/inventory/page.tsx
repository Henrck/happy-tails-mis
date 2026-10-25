"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchProducts, fetchAllBatches } from "@/lib/supabase/products";
import { computeStatus } from "@/lib/supabase/products";
import { sortRows, nextSortState, type SortDirection } from "@/lib/utils/sort";
import { batchHealth, sellableStock } from "@/lib/utils/inventory-expiration";
import type { Product, ProductBatch } from "@/lib/types/products";
import InventoryStats from "@/components/admin/inventory/InventoryStats";
import InventoryExpiryAlerts from "@/components/admin/inventory/InventoryExpiryAlerts";
import InventoryTabs from "@/components/admin/inventory/InventoryTabs";
import ProductsTable from "@/components/admin/inventory/ProductsTable";
import StocksTable from "@/components/admin/inventory/StocksTable";
import ProductDetailModal from "@/components/admin/inventory/ProductDetailModal";
import AddProductModal from "@/components/admin/inventory/AddProductModal";
import Pagination from "@/components/admin/Pagination";

const PAGE_SIZE = 10;
type Filter = "all" | "expired" | "expiring" | "low" | "unknown";

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [tab, setTab] = useState<"products"|"stocks">("products");
  const [statusView, setStatusView] = useState<"active"|"discontinued">("active");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Product|null>(null);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [productsSortKey, setProductsSortKey] = useState<string|null>(null);
  const [productsSortDirection, setProductsSortDirection] = useState<SortDirection>(null);
  const [stocksSortKey, setStocksSortKey] = useState<string|null>(null);
  const [stocksSortDirection, setStocksSortDirection] = useState<SortDirection>(null);
  const [productsPage, setProductsPage] = useState(0);
  const [stocksPage, setStocksPage] = useState(0);
  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [p,b] = await Promise.all([fetchProducts(),fetchAllBatches()]);
      if (p.error || b.error) { setError([p.error,b.error].filter(Boolean).join("; ")); return; }
      setProducts(p.products); setBatches(b.batches);
    } catch (e) { setError(e instanceof Error ? e.message : "Inventory could not be loaded."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void loadData(); }, [loadData]);
  // Refresh when staff return from POS or another tab, so status/expiry alerts aren't stale.
  useEffect(() => { const refresh = () => { if (document.visibilityState === "visible") void loadData(); }; window.addEventListener("focus", refresh); return () => window.removeEventListener("focus", refresh); }, [loadData]);
  const activeCount = products.filter(p => p.status === "active").length;
  const discontinuedCount = products.length - activeCount;
  const known = useMemo(() => new Map(products.map(p => [p.id,p])),[products]);
  const enrichedProducts = useMemo(() => products.filter(p => p.status === statusView)
    .map(p => {
      const stock = sellableStock(p.id,batches);
      const related = batches.filter(b => b.product_id === p.id);
      const health = related.map(b => batchHealth(b));
      const expiryRisk = health.includes("expired") ? "Expired batch" : health.includes("expiring") ? "Expiring Soon" : health.includes("unknown") ? "Missing dates" : "Clear";
      const statusLabel = computeStatus(stock,p.min_stock);
      return { ...p, totalStock: stock, expiryRisk, statusLabel, priority: health.includes("expired") ? 0 : statusLabel === "Out of Stock" ? 1 : health.includes("expiring") ? 2 : statusLabel === "Low Stock" ? 3 : 4 };
    }), [products,batches,statusView]);
  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase().trim();
    const matched = enrichedProducts.filter(p => (!q || `${p.name} ${p.product_code}`.toLowerCase().includes(q)) &&
      (filter === "all" || (filter === "expired" && p.expiryRisk === "Expired batch") ||
       (filter === "expiring" && p.expiryRisk === "Expiring Soon") ||
       (filter === "unknown" && p.expiryRisk === "Missing dates") ||
       (filter === "low" && p.statusLabel !== "In Stock")));
    const priorities = [0,1,2,3,4];
    return priorities.flatMap(priority => {
      const group = matched.filter(p => p.priority === priority);
      return productsSortKey && productsSortDirection ? sortRows(group,productsSortKey,productsSortDirection) : group.sort((a,b) => a.name.localeCompare(b.name));
    });
  }, [enrichedProducts,search,filter,productsSortKey,productsSortDirection]);
  const filteredBatches = useMemo(() => {
    const q = search.toLowerCase().trim();
    const rows = batches.map(b => ({ ...b, productName: known.get(b.product_id)?.name ?? b.product_id, statusLabel: (() => {
      const health = batchHealth(b);
      return health === "expired" ? "Expired" : health === "expiring" ? "Expiring Soon" : health === "healthy" ? "Good" : health === "unknown" ? "No expiry recorded" : health === "depleted" ? "Depleted" : "Adjustment";
    })() }));
    const matched = rows.filter(b => (!q || `${b.batch_number} ${b.productName}`.toLowerCase().includes(q)) &&
      (filter === "all" || (filter === "expired" && batchHealth(b) === "expired") || (filter === "expiring" && batchHealth(b) === "expiring") ||
       (filter === "unknown" && batchHealth(b) === "unknown") || (filter === "low" && known.get(b.product_id) && computeStatus(sellableStock(b.product_id,batches),known.get(b.product_id)!.min_stock) !== "In Stock")));
    return stocksSortKey && stocksSortDirection ? sortRows(matched,stocksSortKey,stocksSortDirection) : matched.sort((a,b) => (batchHealth(a) === "expired" ? 0 : batchHealth(a) === "expiring" ? 1 : 2) - (batchHealth(b) === "expired" ? 0 : batchHealth(b) === "expiring" ? 1 : 2) || (a.expiration_date ?? "9999").localeCompare(b.expiration_date ?? "9999"));
  }, [batches,known,search,filter,stocksSortKey,stocksSortDirection]);
  const productsPageSafe = Math.min(productsPage,Math.max(0,Math.ceil(filteredProducts.length/PAGE_SIZE)-1));
  const stocksPageSafe = Math.min(stocksPage,Math.max(0,Math.ceil(filteredBatches.length/PAGE_SIZE)-1));
  function switchTab(next: "products"|"stocks") {setTab(next);setProductsPage(0);setStocksPage(0);}
  function switchFilter(next: Filter) {setFilter(next);setProductsPage(0);setStocksPage(0);}
  return <main className="pb-12">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-extrabold text-brand-pink">Inventory</h1><p className="mt-1 text-sm text-zinc-500">Monitor usable stock, expiry risks, and individual batches.</p></div>
      <button type="button" onClick={() => setAddProductOpen(true)} className="rounded-full bg-brand-pink px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-pink-dark">+ Add Product</button></div>
    {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    <div className="mt-6"><InventoryStats products={products} batches={batches}/></div>
    <InventoryExpiryAlerts products={products} batches={batches} onViewBatch={() => {switchTab("stocks");switchFilter("all");}}/>
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><InventoryTabs active={tab} onChange={switchTab}/>
      <input aria-label="Search inventory" value={search} onChange={e => {setSearch(e.target.value);setProductsPage(0);setStocksPage(0);}} placeholder={tab === "products" ? "Search products" : "Search batches"} className="w-full max-w-xs rounded-full border border-pink-200 bg-white px-4 py-2.5 text-sm"/>
    </div>
    <div className="mt-3 flex flex-wrap gap-2" aria-label="Inventory alert filters">
      {([{key:"all",label:"All"},{key:"expired",label:"Expired"},{key:"expiring",label:"Expiring in 30 days"},{key:"low",label:"Low/Out Stock"},{key:"unknown",label:"No expiry recorded"}] as const).map(x=><button type="button" key={x.key} onClick={() => switchFilter(x.key)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${filter===x.key?"bg-brand-pink text-white":"bg-white text-zinc-600 border border-pink-200"}`}>{x.label}</button>)}
    </div>
    {tab === "products" && <div className="mt-3 flex gap-2">{(["active","discontinued"] as const).map(value => <button type="button" key={value} onClick={() => {setStatusView(value);setProductsPage(0);}} className={`rounded-full px-4 py-1.5 text-xs font-bold ${statusView===value?"bg-zinc-800 text-white":"bg-zinc-100 text-zinc-600"}`}>{value === "active" ? `Active (${activeCount})` : `Discontinued (${discontinuedCount})`}</button>)}</div>}
    <div className="mt-4">{loading ? <p className="py-10 text-center text-zinc-500">Loading inventory…</p> : tab === "products" ?
      <ProductsTable products={filteredProducts.slice(productsPageSafe*PAGE_SIZE,(productsPageSafe+1)*PAGE_SIZE)} batches={batches} onView={setSelected} sortKey={productsSortKey} sortDirection={productsSortDirection} onSort={key=>{const n=nextSortState(productsSortKey,productsSortDirection,key);setProductsSortKey(n.key);setProductsSortDirection(n.direction);setProductsPage(0);}}/> :
      <StocksTable batches={filteredBatches.slice(stocksPageSafe*PAGE_SIZE,(stocksPageSafe+1)*PAGE_SIZE)} products={products} sortKey={stocksSortKey} sortDirection={stocksSortDirection} onSort={key=>{const n=nextSortState(stocksSortKey,stocksSortDirection,key);setStocksSortKey(n.key);setStocksSortDirection(n.direction);setStocksPage(0);}}/>}</div>
    {!loading && <div className="mt-4"><Pagination page={tab === "products" ? productsPageSafe : stocksPageSafe} pageSize={PAGE_SIZE} totalItems={tab === "products" ? filteredProducts.length : filteredBatches.length} onPageChange={tab === "products" ? setProductsPage : setStocksPage}/></div>}
    {selected && <ProductDetailModal product={selected} batches={batches} onClose={() => setSelected(null)} onChanged={() => {void loadData();}}/>}
    {addProductOpen && <AddProductModal onClose={() => setAddProductOpen(false)} onAdded={() => {setAddProductOpen(false);void loadData();}}/>}
  </main>;
}
