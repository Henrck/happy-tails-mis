"use client";
import { useState } from "react";
import type { Product, ProductBatch, ProductCategory } from "@/lib/types/products";
import { updateProduct, addBatch, adjustInventoryBatch, setInventoryBatchExpiration, setProductStatus, computeStatus } from "@/lib/supabase/products";
import { batchHealth, batchHealthLabel, expiryDaysLeft, sellableStock, physicalStock, philippinesToday } from "@/lib/utils/inventory-expiration";
import InventoryBatchMovementHistory from "./InventoryBatchMovementHistory";

type Mode = "view" | "edit" | "addBatch" | "adjust" | "confirmAdjust" | "editExpiry" | "confirmDiscontinue" | "confirmReactivate";
const categories: ProductCategory[] = ["Food","Treats","Grooming","Accessories","Hygiene"];
const reasons = ["Expired Removal","Damaged","Lost/Miscount","Return to Supplier","Other"];
export default function ProductDetailModal({ product, batches, onClose, onChanged }: {
  product: Product; batches: ProductBatch[]; onClose: () => void; onChanged: () => void;
}) {
  const [mode,setMode] = useState<Mode>("view");
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState<string|null>(null);
  const [editName,setEditName] = useState(product.name);
  const [editUnit,setEditUnit] = useState(product.unit);
  const [editCategory,setEditCategory] = useState<ProductCategory>(product.category);
  const [editMinStock,setEditMinStock] = useState(String(product.min_stock));
  const [batchQty,setBatchQty] = useState("");
  const [batchExpiry,setBatchExpiry] = useState("");
  const [adjustBatch,setAdjustBatch] = useState("");
  const [adjustQty,setAdjustQty] = useState("");
  const [adjustReason,setAdjustReason] = useState(reasons[0]);
  const [customReason,setCustomReason] = useState("");
  const [expiryBatch,setExpiryBatch] = useState("");
  const [expiryDate,setExpiryDate] = useState("");
  const [expiryReason,setExpiryReason] = useState("");
  const productBatches = batches.filter(b => b.product_id === product.id)
    .sort((a,b) => (a.expiration_date ?? "9999").localeCompare(b.expiration_date ?? "9999") || b.received_date.localeCompare(a.received_date));
  const stock = sellableStock(product.id,batches);
  const physical = physicalStock(product.id,batches);
  const expired = productBatches.filter(b => batchHealth(b) === "expired");
  const expiring = productBatches.filter(b => batchHealth(b) === "expiring");
  const status = computeStatus(stock,product.min_stock);
  const availableToAdjust = productBatches.filter(b => !b.is_adjustment && b.quantity > 0);
  const chosen = availableToAdjust.find(b => b.id === adjustBatch);
  const field = "mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink";
  function switchMode(next: Mode) {setError(null);setMode(next);}
  async function saveEdit() {
    const min = Number(editMinStock);
    if (!editName.trim() || !editUnit.trim() || !Number.isSafeInteger(min) || min < 0) {setError("Enter a product name, unit, and valid minimum stock.");return;}
    setSaving(true);setError(null);
    try {const result = await updateProduct(product.id,{name:editName.trim(),unit:editUnit.trim(),category:editCategory,min_stock:min});
      if(result.error){setError(result.error.message);return;} onChanged();switchMode("view");
    } catch(e){setError(e instanceof Error?e.message:"Unable to update product.");} finally {setSaving(false);}
  }
  async function saveBatch() {
    const qty = Number(batchQty);
    if (!Number.isSafeInteger(qty) || qty < 1) {setError("Enter a positive whole-number batch quantity.");return;}
    if (batchExpiry && batchExpiry < philippinesToday()) {setError("Expired stock cannot be received as sellable inventory.");return;}
    setSaving(true);setError(null);
    try {const result = await addBatch({product_id:product.id,quantity:qty,expiration_date:batchExpiry||null});
      if(result.error){setError(result.error.message);return;}setBatchQty("");setBatchExpiry("");onChanged();switchMode("view");
    } catch(e){setError(e instanceof Error?e.message:"Unable to receive batch.");} finally {setSaving(false);}
  }
  async function removeStock() {
    const qty = Number(adjustQty);
    const reason = adjustReason === "Other" ? customReason.trim() : adjustReason;
    if (!chosen || !Number.isSafeInteger(qty) || qty < 1 || qty > chosen.quantity) {setError("Choose a batch and a quantity not exceeding its remaining units.");return;}
    if (reason.length < 3) {setError("Describe the reason for stock removal.");return;}
    setSaving(true);setError(null);
    try {const result = await adjustInventoryBatch(chosen.id,qty,reason);
      if(result.error){setError(result.error.message);return;}setAdjustQty("");setAdjustBatch("");onChanged();switchMode("view");
    } catch(e){setError(e instanceof Error?e.message:"Could not remove stock.");} finally {setSaving(false);}
  }
  async function saveExpiry() {
    if (!expiryBatch || !expiryDate || expiryReason.trim().length < 3) {setError("Enter a date and a correction reason (at least three characters).");return;}
    setSaving(true);setError(null);
    try {const result = await setInventoryBatchExpiration(expiryBatch,expiryDate,expiryReason);
      if(result.error){setError(result.error.message);return;}onChanged();switchMode("view");
    } catch(e){setError(e instanceof Error?e.message:"Could not update batch expiration.");}finally{setSaving(false);}
  }
  async function changeStatus(status: "active"|"discontinued") {
    setSaving(true);setError(null);
    try {const result=await setProductStatus(product.id,status);
      if(result.error){setError(result.error.message);return;}onChanged();onClose();
    } catch(e){setError(e instanceof Error?e.message:"Unable to change status.");} finally{setSaving(false);}
  }
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 px-3 py-5 sm:px-4" role="dialog" aria-modal="true" aria-label={`${product.name} inventory details`} onClick={() => {if(!saving)onClose();}}>
    <div className="max-h-[94vh] w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between bg-brand-pink px-5 py-4 text-white sm:px-6"><div><h2 className="text-lg font-bold">{mode === "view"?"Product Information":mode === "edit"?"Edit Product":mode === "addBatch"?"Receive Stock Batch":mode === "adjust"?"Remove Stock from Batch":mode === "confirmAdjust"?"Confirm Stock Removal":mode === "editExpiry"?"Correct Batch Expiration":mode === "confirmDiscontinue"?"Discontinue Product":"Reactivate Product"}</h2><p className="text-xs text-white/80">{product.product_code} · {product.name}</p></div>
        <button type="button" onClick={()=>{if(!saving){if(mode === "view")onClose();else switchMode("view");}}} aria-label="Close modal" className="rounded-full p-1.5 hover:bg-white/20">✕</button></div>
      <div className="max-h-[calc(94vh-90px)] overflow-y-auto p-5 sm:p-6">
        {error && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {mode === "view" && <>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-xl font-extrabold text-zinc-900">{product.name}</h3><p className="mt-1 text-sm text-zinc-500">{product.category} · {product.unit}{product.package_size?` · ${product.package_size}`:""}</p></div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${status === "In Stock"?"bg-emerald-100 text-emerald-800":status === "Low Stock"?"bg-amber-100 text-amber-800":"bg-rose-100 text-rose-800"}`}>{status}</span></div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[{title:"Sellable Stock",val:stock},{title:"Physical Stock",val:physical},{title:"Min Stock",val:product.min_stock},{title:"Unit Price",val:`₱${Number(product.price).toLocaleString()}`}].map(x => <div key={x.title} className="rounded-xl bg-pink-50 p-3"><p className="text-[11px] text-zinc-600">{x.title}</p><p className="mt-1 text-xl font-extrabold text-zinc-800">{x.val}</p></div>)}
          </div>
          {(expired.length>0 || expiring.length>0) && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"><strong>Expiration attention:</strong> {expired.length>0&&`${expired.length} expired batch(es), ${expired.reduce((n,b)=>n+b.quantity,0)} unsellable units. `}{expiring.length>0&&`${expiring.length} batch(es) expire within 30 days.`}</div>}
          <div className="mt-5 flex items-center justify-between"><h3 className="text-sm font-bold text-brand-pink">Batch Information ({productBatches.length})</h3><span className="text-xs text-zinc-500">Individual expiry &amp; quantity</span></div>
          <div className="mt-2 space-y-2">{productBatches.length === 0?<p className="rounded-xl border border-pink-100 p-6 text-center text-sm text-zinc-500">No batches received yet.</p>:productBatches.map(b => {
            const health=batchHealth(b),days=expiryDaysLeft(b.expiration_date);
            const color=health==="expired"?"border-rose-200 bg-rose-50 text-rose-700":health==="expiring"?"border-amber-200 bg-amber-50 text-amber-800":"border-zinc-100 bg-zinc-50 text-zinc-700";
            return <div key={b.id} className={`rounded-xl border p-3 ${color}`}><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-bold">{b.batch_number}</p><p className="mt-1 text-xs">Received: {b.received_date}</p><p className="mt-0.5 text-xs">Expiration: <strong>{b.expiration_date ?? "Not recorded"}</strong>{health==="expiring"&&days!==null ? ` · ${days===0?"Today":`${days} days left`}`:""}</p></div><div className="text-right"><p className="text-lg font-extrabold tabular-nums">{b.quantity} <span className="text-xs font-normal">units</span></p><span className="inline-block rounded-full bg-white/80 px-2 py-1 text-[10px] font-bold">{batchHealthLabel(health)}</span></div></div>{!b.is_adjustment && <button type="button" onClick={()=>{setExpiryBatch(b.id);setExpiryDate(b.expiration_date??"");setExpiryReason("");switchMode("editExpiry");}} className="mt-2 rounded-full border border-zinc-300 bg-white px-3 py-1 text-[11px] font-bold text-zinc-700 hover:border-brand-pink">{b.expiration_date?"Correct expiration date":"Record missing expiration"}</button>}</div>;
          })}</div>
          <InventoryBatchMovementHistory productId={product.id} batchNames={new Map(productBatches.map(b=>[b.id,b.batch_number]))}/>
          <p className="mt-3 text-xs text-zinc-500">Physical stock includes expired items; sellable stock excludes them. Unknown expiry dates require manual verification before sale.</p>
          {product.status === "active"?<div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4"><button type="button" onClick={()=>switchMode("edit")} className="rounded-full border border-brand-pink p-2 text-xs font-bold text-brand-pink">Edit Details</button><button type="button" onClick={()=>switchMode("addBatch")} className="rounded-full border border-emerald-500 p-2 text-xs font-bold text-emerald-700">Receive Batch</button><button type="button" onClick={()=>switchMode("adjust")} className="rounded-full border border-amber-500 p-2 text-xs font-bold text-amber-700">Remove Stock</button><button type="button" onClick={()=>switchMode("confirmDiscontinue")} className="rounded-full border border-rose-400 p-2 text-xs font-bold text-rose-700">Discontinue</button></div>:<div className="mt-5 rounded-xl bg-zinc-50 p-4 text-center"><p className="text-sm text-zinc-600">Discontinued — hidden from POS.</p><button type="button" onClick={()=>switchMode("confirmReactivate")} className="mt-3 rounded-full border border-emerald-500 px-5 py-2 text-xs font-bold text-emerald-700">Reactivate Product</button></div>}
        </>}
        {mode === "edit" && <div className="space-y-3"><p className="text-xs text-zinc-500">Product photos are managed in POS configuration.</p><label className="block text-sm font-semibold">Product Name<input className={field} value={editName} maxLength={180} onChange={e=>setEditName(e.target.value)}/></label><label className="block text-sm font-semibold">Unit<input className={field} value={editUnit} onChange={e=>setEditUnit(e.target.value)}/></label><label className="block text-sm font-semibold">Category<select className={field} value={editCategory} onChange={e=>setEditCategory(e.target.value as ProductCategory)}>{categories.map(c=><option key={c}>{c}</option>)}</select></label><label className="block text-sm font-semibold">Minimum Stock<input className={field} value={editMinStock} type="number" step={1} min={0} onChange={e=>setEditMinStock(e.target.value)}/></label><button type="button" disabled={saving} onClick={()=>void saveEdit()} className="w-full rounded-full bg-brand-pink py-3 font-bold text-white disabled:opacity-50">{saving?"Saving…":"Save Changes"}</button></div>}
        {mode === "addBatch" && <div className="space-y-4"><p className="text-sm text-zinc-600">Receive a new physical batch. Its batch number is generated by the database.</p><label className="block text-sm font-semibold">Quantity<input type="number" min={1} step={1} value={batchQty} onChange={e=>setBatchQty(e.target.value)} className={field}/></label><label className="block text-sm font-semibold">Expiration Date<input type="date" min={philippinesToday()} value={batchExpiry} onChange={e=>setBatchExpiry(e.target.value)} className={field}/></label><p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">If the supplier does not provide an expiry, the batch will be marked “No expiry recorded.” Verify this before offering perishable goods for sale.</p><button type="button" disabled={saving} onClick={()=>void saveBatch()} className="w-full rounded-full bg-emerald-600 py-3 font-bold text-white disabled:opacity-50">{saving?"Receiving…":"Receive Batch"}</button></div>}
        {mode === "adjust" && <div className="space-y-4"><p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">Remove stock from its exact batch, with an audit record. To add stock, receive a new batch instead. Requires the Inventory SQL migration.</p><label className="block text-sm font-semibold">Batch<select className={field} value={adjustBatch} onChange={e=>{setAdjustBatch(e.target.value);setAdjustQty("");}}><option value="">Select a physical batch</option>{availableToAdjust.map(b=><option key={b.id} value={b.id}>{b.batch_number} · {b.quantity} units · Expiry {b.expiration_date??"unknown"}</option>)}</select></label><label className="block text-sm font-semibold">Units to Remove<input type="number" min={1} max={chosen?.quantity} step={1} value={adjustQty} onChange={e=>setAdjustQty(e.target.value)} className={field}/></label><label className="block text-sm font-semibold">Reason<select className={field} value={adjustReason} onChange={e=>setAdjustReason(e.target.value)}>{reasons.map(r=><option key={r}>{r}</option>)}</select></label>{adjustReason==="Other"&&<label className="block text-sm font-semibold">Explain Reason<input className={field} maxLength={160} value={customReason} onChange={e=>setCustomReason(e.target.value)}/></label>}<button type="button" disabled={saving||!chosen} onClick={()=>{
          const qty = Number(adjustQty); const reason=adjustReason==="Other"?customReason.trim():adjustReason;
          if(!chosen || !Number.isSafeInteger(qty) || qty<1 || qty>chosen.quantity || reason.length<3){setError("Select a valid quantity, batch and reason.");return;}
          switchMode("confirmAdjust");
        }} className="w-full rounded-full bg-amber-600 py-3 font-bold text-white disabled:opacity-50">Review Stock Removal</button></div>}
        {mode === "confirmAdjust" && <div className="space-y-4 py-4 text-center"><h3 className="font-bold text-rose-700">Confirm irreversible stock removal</h3><p className="text-sm text-zinc-700">Remove <strong>{adjustQty} units</strong> from batch <strong>{chosen?.batch_number}</strong>?<span className="mt-2 block text-xs text-zinc-500">Reason: {adjustReason==="Other"?customReason:adjustReason}. An audit entry will be created.</span></p><div className="grid grid-cols-2 gap-3"><button type="button" disabled={saving} onClick={()=>switchMode("adjust")} className="rounded-full border border-zinc-300 py-3 font-semibold">Cancel</button><button type="button" disabled={saving} onClick={()=>void removeStock()} className="rounded-full bg-rose-600 py-3 font-semibold text-white disabled:opacity-50">{saving?"Recording…":"Remove Units"}</button></div></div>}
        {mode === "editExpiry" && <div className="space-y-4"><p className="text-sm text-zinc-700">Record the verified expiration date for <strong>{productBatches.find(b=>b.id===expiryBatch)?.batch_number}</strong>. Corrections are logged. An expired date immediately removes this stock from sellable inventory.</p><label className="block text-sm font-semibold">Verified Expiration Date<input type="date" value={expiryDate} onChange={e=>setExpiryDate(e.target.value)} className={field}/></label><label className="block text-sm font-semibold">Reason for correction<input maxLength={160} placeholder="e.g. Checked supplier packaging" value={expiryReason} onChange={e=>setExpiryReason(e.target.value)} className={field}/></label><button type="button" disabled={saving||!expiryDate||expiryReason.trim().length<3} onClick={()=>void saveExpiry()} className="w-full rounded-full bg-brand-pink py-3 font-bold text-white disabled:opacity-50">{saving?"Updating…":"Save Verified Expiration"}</button></div>}
        {(mode === "confirmDiscontinue"||mode === "confirmReactivate")&&<div className="space-y-5 py-4 text-center"><p className="text-sm text-zinc-700">{mode === "confirmDiscontinue" ? `Discontinue ${product.name}? It will no longer be sold at POS, but all batch and sales records remain.` : `Reactivate ${product.name}? It will return to POS if usable stock is available.`}</p><div className="grid grid-cols-2 gap-3"><button type="button" disabled={saving} onClick={()=>switchMode("view")} className="rounded-full border border-zinc-300 px-4 py-2.5 font-semibold">Cancel</button><button type="button" disabled={saving} onClick={()=>void changeStatus(mode === "confirmDiscontinue"?"discontinued":"active")} className="rounded-full bg-brand-pink px-4 py-2.5 font-semibold text-white disabled:opacity-50">{saving?"Updating…":"Confirm"}</button></div></div>}
      </div>
    </div>
  </div>;
}
