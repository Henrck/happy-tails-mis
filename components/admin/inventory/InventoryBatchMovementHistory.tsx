"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ExpirationChange = { id:string; batch_id:string; previous_expiration:string|null; new_expiration:string; reason:string; created_at:string };
type Movement = {
  id: string;
  batch_id: string;
  quantity_removed: number;
  reason: string;
  quantity_before: number;
  quantity_after: number;
  created_at: string;
};

export default function InventoryBatchMovementHistory({ productId, batchNames }: {
  productId: string; batchNames: Map<string,string>;
}) {
  const [opened,setOpened] = useState(false);
  const [rows,setRows] = useState<Movement[]>([]);
  const [changes,setChanges] = useState<ExpirationChange[]>([]);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState<string|null>(null);
  useEffect(() => {
    if(!opened)return;
    let alive = true;
    const load = async () => {
      setLoading(true);setError(null);
      const db = createClient();
      const [removals, expiry] = await Promise.all([
        db.from("inventory_batch_movements").select("id,batch_id,quantity_removed,reason,quantity_before,quantity_after,created_at")
          .eq("product_id",productId).order("created_at",{ascending:false}).limit(30),
        batchNames.size ? db.from("inventory_batch_expiry_audit").select("id,batch_id,previous_expiration,new_expiration,reason,created_at")
          .in("batch_id",Array.from(batchNames.keys())).order("created_at",{ascending:false}).limit(30) : Promise.resolve({data:[] as ExpirationChange[],error:null}),
      ]);
      if (!alive)return;
      setRows((removals.data??[]) as Movement[]);setChanges((expiry.data??[]) as ExpirationChange[]);setError(removals.error?.message??expiry.error?.message??null);setLoading(false);
    };
    void load();
    return ()=>{alive=false;};
  },[productId,opened]);
  return <section className="mt-4 rounded-xl border border-pink-100 bg-zinc-50/70 p-3">
    <button type="button" aria-expanded={opened} onClick={()=>setOpened(v=>!v)} className="flex w-full items-center justify-between gap-2 text-left text-xs font-bold text-brand-pink">
      <span>Batch change audit trail</span><span>{opened?"Hide":"Show recent changes"}</span>
    </button>
    {opened && <div className="mt-3 space-y-2">
      {loading?<p className="text-xs text-zinc-500">Loading audit history…</p>:error?<p role="alert" className="text-xs text-rose-700">Unable to load audit history: {error}. Apply the Inventory migration if not yet installed.</p>:rows.length===0 && changes.length===0?<p className="text-xs text-zinc-500">No audited changes yet. Earlier legacy adjustments are preserved in the batch list.</p>:
      <>{rows.map(m=><div key={m.id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg bg-white px-3 py-2 text-xs"><div><p className="font-semibold text-zinc-800">{batchNames.get(m.batch_id)??"Batch"} · {m.reason}</p><p className="mt-1 text-zinc-500">{new Date(m.created_at).toLocaleString("en-PH",{timeZone:"Asia/Manila",dateStyle:"medium",timeStyle:"short"})}</p></div><div className="text-right"><p className="font-bold text-rose-700">−{m.quantity_removed} units</p><p className="text-zinc-500">{m.quantity_before} → {m.quantity_after}</p></div></div>)}
      {changes.map(c=><div key={c.id} className="rounded-lg border border-pink-100 bg-white px-3 py-2 text-xs"><p className="font-semibold text-zinc-800">{batchNames.get(c.batch_id)??"Batch"} · Verified expiration change</p><p className="mt-1 text-zinc-600">{c.previous_expiration??"No date"} → <strong>{c.new_expiration}</strong> · {c.reason}</p><p className="mt-1 text-zinc-500">{new Date(c.created_at).toLocaleString("en-PH",{timeZone:"Asia/Manila",dateStyle:"medium",timeStyle:"short"})}</p></div>)}</>}
    </div>}
  </section>;
}
