"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchProducts, fetchAllBatches, computeStatus } from "@/lib/supabase/products";
import { fetchInventoryChangeLogs, type InventoryChangeLog } from "@/lib/supabase/inventory-change-logs";
import { sortRows, nextSortState, type SortDirection } from "@/lib/utils/sort";
import { batchHealth, sellableStock } from "@/lib/utils/inventory-expiration";
import type { Product, ProductBatch } from "@/lib/types/products";
import InventoryStats from "@/components/admin/inventory/InventoryStats";
import InventoryExpiryAlerts from "@/components/admin/inventory/InventoryExpiryAlerts";
import InventoryTabs from "@/components/admin/inventory/InventoryTabs";
import ProductsTable from "@/components/admin/inventory/ProductsTable";
import InventoryLogsTable from "@/components/admin/inventory/InventoryLogsTable";
import StocksTable from "@/components/admin/inventory/StocksTable";
import ProductDetailModal from "@/components/admin/inventory/ProductDetailModal";
import AddProductModal from "@/components/admin/inventory/AddProductModal";
import Pagination from "@/components/admin/Pagination";

const PAGE_SIZE = 10;
type Filter = "all" | "expired" | "expiring" | "low" | "unknown";
const logFilters = [
  {key:"all",label:"All changes"}, {key:"batch_received",label:"Received"},
  {key:"stock_decreased",label:"Stock decreased"}, {key:"stock_increased",label:"Stock increased"},
  {key:"expiration_changed",label:"Expiration"}, {key:"product_updated",label:"Product edits"},
] as const;

export default function InventoryPage() {
  const [products,setProducts] = useState<Product[]>([]);
  const [batches,setBatches] = useState<ProductBatch[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState<string|null>(null);
  // Keep the internal 'stocks' value compatible with existing inventory tabs.
  const [tab,setTab] = useState<"products"|"stocks">("products");
  const [statusView,setStatusView] = useState<"active"|"discontinued">("active");
  const [search,setSearch] = useState("");
  const [filter,setFilter] = useState<Filter>("all");
  const [selected,setSelected] = useState<Product|null>(null);
  const [addProductOpen,setAddProductOpen] = useState(false);
  const [productsSortKey,setProductsSortKey] = useState<string|null>(null);
  const [productsSortDirection,setProductsSortDirection] = useState<SortDirection>(null);
  const [productsPage,setProductsPage] = useState(0);
  const [logs,setLogs] = useState<InventoryChangeLog[]>([]);
  const [logsError,setLogsError] = useState<string|null>(null);
  const [logsLoading,setLogsLoading] = useState(false);
  const [logsCount,setLogsCount] = useState(0);
  const [logsPage,setLogsPage] = useState(0);
  const [logAction,setLogAction] = useState<string>("all");
  const [logsVersion,setLogsVersion] = useState(0);
  const [showBatches,setShowBatches] = useState(false);
  const [batchSortKey,setBatchSortKey] = useState<string|null>(null);
  const [batchSortDirection,setBatchSortDirection] = useState<SortDirection>(null);
  const [batchPage,setBatchPage] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);setError(null);
    try {
      const [p,b] = await Promise.all([fetchProducts(),fetchAllBatches()]);
      if (p.error || b.error) {setError([p.error,b.error].filter(Boolean).join("; "));return;}
      setProducts(p.products);setBatches(b.batches);
    } catch(e) {setError(e instanceof Error?e.message:"Inventory could not be loaded.");}
    finally {setLoading(false);}
  },[]);
  useEffect(()=>{void loadData();},[loadData]);
  useEffect(()=>{
    const refresh=()=>{if(document.visibilityState==="visible") {void loadData();setLogsVersion(v=>v+1);}};
    window.addEventListener("focus",refresh);
    return ()=>window.removeEventListener("focus",refresh);
  },[loadData]);
  useEffect(()=>{
    if(tab!=="stocks")return;
    let active=true;
    setLogsLoading(true);setLogsError(null);
    void fetchInventoryChangeLogs({page:logsPage,pageSize:PAGE_SIZE,search,action:logAction}).then(result=>{
      if(!active)return;
      if(result.error) {setLogsError(result.error);setLogs([]);setLogsCount(0);}
      else {setLogs(result.rows);setLogsCount(result.count);}
    }).catch(e=>{if(active){setLogsError(e instanceof Error?e.message:"Unable to load inventory history.");setLogs([]);setLogsCount(0);}})
      .finally(()=>{if(active)setLogsLoading(false);});
    return ()=>{active=false;};
  },[tab,logsPage,search,logAction,logsVersion]);

  const activeCount=products.filter(p=>p.status==="active").length;
  const discontinuedCount=products.length-activeCount;
  const enrichedProducts=useMemo(()=>products.filter(p=>p.status===statusView).map(p=>{
    const stock=sellableStock(p.id,batches);
    const health=batches.filter(b=>b.product_id===p.id).map(b=>batchHealth(b));
    const expiryRisk=health.includes("expired")?"Expired batch":health.includes("expiring")?"Expiring Soon":health.includes("unknown")?"Missing dates":"Clear";
    const statusLabel=computeStatus(stock,p.min_stock);
    return {...p,totalStock:stock,expiryRisk,statusLabel,priority:health.includes("expired")?0:statusLabel==="Out of Stock"?1:health.includes("expiring")?2:statusLabel==="Low Stock"?3:4};
  }),[products,batches,statusView]);
  const filteredProducts=useMemo(()=>{
    const q=search.toLowerCase().trim();
    const matched=enrichedProducts.filter(p=>(!q||`${p.name} ${p.product_code}`.toLowerCase().includes(q))&&
      (filter==="all"||(filter==="expired"&&p.expiryRisk==="Expired batch")||
       (filter==="expiring"&&p.expiryRisk==="Expiring Soon")||
       (filter==="unknown"&&p.expiryRisk==="Missing dates")||
       (filter==="low"&&p.statusLabel!=="In Stock")));
    return [0,1,2,3,4].flatMap(priority=>{
      const group=matched.filter(p=>p.priority===priority);
      return productsSortKey&&productsSortDirection?sortRows(group,productsSortKey,productsSortDirection):group.sort((a,b)=>a.name.localeCompare(b.name));
    });
  },[enrichedProducts,search,filter,productsSortKey,productsSortDirection]);
  const allBatches = useMemo(()=>{
    const named = new Map(products.map(p=>[p.id,p.name]));
    const rows = batches.map(b=>({
      ...b, productName:named.get(b.product_id)??b.product_id,
      statusLabel:(()=>{const status=batchHealth(b);return status==="expired"?"Expired":status==="expiring"?"Expiring Soon":status==="healthy"?"Good":status==="depleted"?"Depleted":status==="unknown"?"No expiry recorded":"Adjustment";})(),
    }));
    return batchSortKey&&batchSortDirection?sortRows(rows,batchSortKey,batchSortDirection):rows.sort((a,b)=>b.received_date.localeCompare(a.received_date));
  },[batches,products,batchSortKey,batchSortDirection]);
  const batchPageSafe=Math.min(batchPage,Math.max(0,Math.ceil(allBatches.length/PAGE_SIZE)-1));
  const productsPageSafe=Math.min(productsPage,Math.max(0,Math.ceil(filteredProducts.length/PAGE_SIZE)-1));
  const logsPageSafe=Math.min(logsPage,Math.max(0,Math.ceil(logsCount/PAGE_SIZE)-1));
  function switchTab(next:"products"|"stocks") {setTab(next);setSearch("");setProductsPage(0);setLogsPage(0);}
  function switchFilter(next:Filter) {setFilter(next);setProductsPage(0);}
  return <main className="pb-12">
    <div className="flex flex-wrap items-center justify-between gap-3"><div>
      <h1 className="text-3xl font-extrabold text-brand-pink">Inventory</h1>
      <p className="mt-1 text-sm text-zinc-500">Monitor products, expiry risks, and recorded inventory changes.</p>
    </div><div className="flex flex-wrap gap-2"><button type="button" onClick={()=>setShowBatches(true)} className="rounded-full border border-pink-200 bg-white px-5 py-2.5 text-sm font-bold text-brand-pink">View Batches</button><button type="button" onClick={()=>setAddProductOpen(true)} className="rounded-full bg-brand-pink px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-pink-dark">+ Add Product</button></div></div>
    {error&&<p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    <div className="mt-6"><InventoryStats products={products} batches={batches}/></div>
    <InventoryExpiryAlerts products={products} batches={batches} onViewBatch={()=>setShowBatches(true)}/>
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <InventoryTabs active={tab} onChange={switchTab}/>
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
        <input aria-label={tab==="products"?"Search inventory products":"Search inventory logs"} value={search}
          onChange={e=>{setSearch(e.target.value);setProductsPage(0);setLogsPage(0);}}
          placeholder={tab==="products"?"Search products":"Search product or batch"}
          className="min-w-0 flex-1 rounded-full border border-pink-200 bg-white px-4 py-2.5 text-sm sm:w-64"/>
        {tab==="stocks"&&<button type="button" onClick={()=>setLogsVersion(v=>v+1)} className="rounded-full border border-pink-200 px-4 py-2.5 text-sm font-semibold text-brand-pink">Refresh logs</button>}
      </div>
    </div>
    {tab==="products"?<>
      <div className="mt-3 flex flex-wrap gap-2" aria-label="Inventory alert filters">
        {([{key:"all",label:"All"},{key:"expired",label:"Expired"},{key:"expiring",label:"Expiring in 30 days"},{key:"low",label:"Low/Out Stock"},{key:"unknown",label:"No expiry recorded"}] as const).map(x=><button type="button" key={x.key} onClick={()=>switchFilter(x.key)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${filter===x.key?"bg-brand-pink text-white":"border border-pink-200 bg-white text-zinc-600"}`}>{x.label}</button>)}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">{(["active","discontinued"] as const).map(value=><button type="button" key={value} onClick={()=>{setStatusView(value);setProductsPage(0);}} className={`rounded-full px-4 py-1.5 text-xs font-bold ${statusView===value?"bg-zinc-800 text-white":"bg-zinc-100 text-zinc-600"}`}>{value==="active"?`Active (${activeCount})`:`Discontinued (${discontinuedCount})`}</button>)}</div>
      <div className="mt-4">{loading?<p className="py-10 text-center text-zinc-500">Loading inventory…</p>:<ProductsTable
        products={filteredProducts.slice(productsPageSafe*PAGE_SIZE,(productsPageSafe+1)*PAGE_SIZE)} batches={batches} onView={setSelected}
        sortKey={productsSortKey} sortDirection={productsSortDirection} onSort={key=>{const n=nextSortState(productsSortKey,productsSortDirection,key);setProductsSortKey(n.key);setProductsSortDirection(n.direction);setProductsPage(0);}}/>}</div>
      {!loading&&<div className="mt-4"><Pagination page={productsPageSafe} pageSize={PAGE_SIZE} totalItems={filteredProducts.length} onPageChange={setProductsPage}/></div>}
    </>:<>
      <p className="mt-4 text-sm text-zinc-600">Read-only chronological history of product changes, batch receipts, quantity changes, and expiration updates. Batch balances remain available through <strong>Products → View</strong>.</p>
      <div className="mt-3 flex flex-wrap gap-2" aria-label="Inventory log filters">{logFilters.map(f=><button key={f.key} type="button" onClick={()=>{setLogAction(f.key);setLogsPage(0);}} className={`rounded-full px-3 py-1.5 text-xs font-bold ${logAction===f.key?"bg-brand-pink text-white":"border border-pink-200 bg-white text-zinc-600"}`}>{f.label}</button>)}</div>
      {logsError&&<p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Inventory logs could not load: {logsError}. Apply the separate inventory log SQL migration, then refresh.</p>}
      <div className="mt-4"><InventoryLogsTable rows={logs} loading={logsLoading}/></div>
      {!logsLoading&&!logsError&&<div className="mt-4"><Pagination page={logsPageSafe} pageSize={PAGE_SIZE} totalItems={logsCount} onPageChange={setLogsPage}/></div>}
    </>}
    {showBatches&&<div role="presentation" className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-3 sm:p-6" onMouseDown={e=>{if(e.currentTarget===e.target)setShowBatches(false);}}>
      <div role="dialog" aria-modal="true" aria-label="Inventory batch balances" className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold text-zinc-900">Inventory Batch Balances</h2><p className="mt-1 text-xs text-zinc-600">Current quantities and expiry status. Stock changes are tracked in Inventory → Logs.</p></div>
          <button type="button" onClick={()=>setShowBatches(false)} className="rounded-full border border-pink-200 px-4 py-2 text-sm font-semibold text-brand-pink">Close</button></div>
        <StocksTable batches={allBatches.slice(batchPageSafe*PAGE_SIZE,(batchPageSafe+1)*PAGE_SIZE)} products={products}
          sortKey={batchSortKey} sortDirection={batchSortDirection} onSort={key=>{const n=nextSortState(batchSortKey,batchSortDirection,key);setBatchSortKey(n.key);setBatchSortDirection(n.direction);setBatchPage(0);}}/>
        <div className="mt-4"><Pagination page={batchPageSafe} pageSize={PAGE_SIZE} totalItems={allBatches.length} onPageChange={setBatchPage}/></div>
      </div>
    </div>}
    {selected&&<ProductDetailModal product={selected} batches={batches} onClose={()=>setSelected(null)} onChanged={()=>{void loadData();setLogsVersion(v=>v+1);}}/>}
    {addProductOpen&&<AddProductModal onClose={()=>setAddProductOpen(false)} onAdded={()=>{setAddProductOpen(false);void loadData();setLogsVersion(v=>v+1);}}/>}
  </main>;
}
