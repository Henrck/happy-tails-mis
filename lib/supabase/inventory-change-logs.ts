import { createClient } from "@/lib/supabase/client";

export type InventoryChangeLog = {
  id: string;
  product_id: string | null;
  product_name: string;
  product_code: string | null;
  batch_id: string | null;
  batch_number: string | null;
  action: string;
  old_quantity: number | null;
  new_quantity: number | null;
  quantity_delta: number | null;
  details: string | null;
  actor_id: string | null;
  created_at: string;
};

/** Server-side pagination avoids silently omitting history beyond 1,000 rows. */
export async function fetchInventoryChangeLogs({page, pageSize, search, action}: {
  page: number; pageSize: number; search: string; action: string;
}): Promise<{ rows: InventoryChangeLog[]; count: number; error: string | null }> {
  const db = createClient();
  let query = db.from("inventory_change_logs")
    .select("id,product_id,product_name,product_code,batch_id,batch_number,action,old_quantity,new_quantity,quantity_delta,details,actor_id,created_at", {count:"exact"});
  if (action !== "all") query = query.eq("action",action);
  const q = search.trim();
  if (q) {
    // Escape PostgREST pattern delimiters so search cannot alter filter syntax.
    const safe = q.replace(/[,%()]/g," ").replace(/\s+/g," ").trim();
    if (safe) query = query.or(`product_name.ilike.%${safe}%,product_code.ilike.%${safe}%,batch_number.ilike.%${safe}%`);
  }
  const from = Math.max(0,page) * pageSize;
  const {data,count,error} = await query.order("created_at",{ascending:false}).order("id",{ascending:false}).range(from,from+pageSize-1);
  return {rows:(data??[]) as InventoryChangeLog[],count:count??0,error:error?.message??null};
}
