"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchAllBatches, fetchProducts, computeStatus } from "@/lib/supabase/products";
import { batchHealth, sellableStock } from "@/lib/utils/inventory-expiration";
import type { Product, ProductBatch } from "@/lib/types/products";

export default function LowStockAlerts() {
  const [products,setProducts] = useState<Product[]>([]);
  const [batches,setBatches] = useState<ProductBatch[]>([]);
  const [error,setError] = useState<string|null>(null);
  useEffect(() => {
    let active = true;
    async function load() {
      const [p,b] = await Promise.all([fetchProducts({activeOnly:true}),fetchAllBatches()]);
      if(!active)return;
      if(p.error || b.error){setError(p.error??b.error??"Unable to load inventory alerts.");return;}
      setError(null);setProducts(p.products);setBatches(b.batches);
    }
    void load();
    const refresh = () => {if(document.visibilityState === "visible")void load();};
    window.addEventListener("focus",refresh);
    return ()=>{active=false;window.removeEventListener("focus",refresh);};
  },[]);
  const low = products.filter(p => computeStatus(sellableStock(p.id,batches),p.min_stock) !== "In Stock")
    .sort((a,b)=>sellableStock(a.id,batches)-sellableStock(b.id,batches));
  const risk = batches.filter(b => b.quantity>0 && products.some(p=>p.id===b.product_id) && ["expired","expiring"].includes(batchHealth(b)))
    .sort((a,b)=>(batchHealth(a)==="expired"?0:1)-(batchHealth(b)==="expired"?0:1) || (a.expiration_date??"").localeCompare(b.expiration_date??""));
  return <section className="h-full rounded-2xl border border-pink-100 bg-white p-4 shadow-sm">
    <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-bold text-brand-pink">Inventory Alerts</h3><Link href="/admin/inventory" className="rounded-full border border-brand-pink px-2.5 py-1 text-[11px] font-semibold text-brand-pink hover:bg-pink-50">View All</Link></div>
    {error?<p role="alert" className="mt-3 text-xs text-rose-700">{error}</p>:<div className="mt-3 space-y-2">
      {low.length===0 && risk.length===0 && <p className="py-6 text-center text-xs text-zinc-500">No low stock or expiration warnings.</p>}
      {risk.slice(0,3).map(b=><div key={b.id} className="flex items-start justify-between gap-2 text-xs"><span className="min-w-0 truncate text-zinc-700">{products.find(p=>p.id===b.product_id)?.name??"Product"} · {b.batch_number}</span><span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${batchHealth(b)==="expired"?"bg-rose-50 text-rose-700":"bg-amber-50 text-amber-800"}`}>{batchHealth(b)==="expired"?"Expired":"Expiring"}</span></div>)}
      {low.slice(0,3).map(p=><div key={p.id} className="flex items-center justify-between gap-2 text-xs"><span className="truncate text-zinc-700">{p.name}</span><span className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">{sellableStock(p.id,batches)} left</span></div>)}
      {(low.length>3||risk.length>3)&&<p className="text-[11px] text-zinc-500">More inventory alerts available in Inventory.</p>}
    </div>}
  </section>;
}
