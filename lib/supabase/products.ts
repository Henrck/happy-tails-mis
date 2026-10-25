// Inventory and POS share batch-aware stock calculations. Mutations are handled
// by Supabase; reductions use an auditable, transactional server-side RPC.
import { createClient } from "./client";
import { philippinesToday } from "@/lib/utils/inventory-expiration";
import type { Product, ProductBatch, ProductCategory } from "@/lib/types/products";

// PostgREST usually caps a single response at 1,000 rows. Never silently
// under-count stock or omit batches because inventory grew past that limit.
const PAGE = 1000;
async function loadProducts(activeOnly?: boolean) {
  const db = createClient();
  const rows: Product[] = [];
  for (let offset = 0;; offset += PAGE) {
    let q = db.from("products").select("*");
    if (activeOnly) q = q.eq("status","active");
    const { data, error } = await q.order("product_code").range(offset,offset+PAGE-1);
    if (error) return { rows: [] as Product[], error: error.message };
    rows.push(...((data ?? []) as Product[]));
    if (!data || data.length < PAGE) break;
  }
  return { rows, error: null as string | null };
}
async function loadBatches(): Promise<{ rows: ProductBatch[]; error: string|null }> {
  const db = createClient();
  const rows: ProductBatch[] = [];
  for (let offset=0;;offset+=PAGE) {
    const { data, error } = await db.from("product_batches").select("*").order("id").range(offset,offset+PAGE-1);
    if (error) return { rows: [] as ProductBatch[], error: error.message };
    rows.push(...((data ?? []) as unknown as ProductBatch[]));
    if (!data || data.length < PAGE) break;
  }
  return { rows, error: null };
}
export async function fetchProducts(options?: { activeOnly?: boolean }) {
  const [p,b] = await Promise.all([loadProducts(options?.activeOnly),loadBatches()]);
  if (p.error || b.error) return { products: [] as Product[], error: `Unable to read inventory: ${p.error ?? b.error}` };
  const today = philippinesToday();
  const stockById = new Map<string, number>();
  for (const batch of b.rows) {
    if (options?.activeOnly && !batch.is_adjustment && batch.expiration_date && batch.expiration_date < today) continue;
    stockById.set(batch.product_id, (stockById.get(batch.product_id) ?? 0) + Number(batch.quantity ?? 0));
  }
  return { products: p.rows.map(p => ({ ...p, stock: Math.max(0, stockById.get(p.id) ?? 0) })), error: undefined };
}
export async function fetchAllBatches() {
  const result = await loadBatches();
  return { batches: result.rows.sort((a,b) => b.received_date.localeCompare(a.received_date)), error: result.error ?? undefined };
}
export async function fetchBatchesForProduct(productId: string) {
  const { data, error } = await createClient().from("product_batches").select("*").eq("product_id", productId).order("received_date", { ascending: false });
  return { batches: (data ?? []) as ProductBatch[], error: error?.message };
}
export function computeTotalStock(productId: string, batches: ProductBatch[]) {
  return batches.filter(b => b.product_id === productId).reduce((sum, b) => sum + Number(b.quantity), 0);
}
export function computeStatus(qty: number, minStock: number): "Out of Stock" | "Low Stock" | "In Stock" {
  return qty <= 0 ? "Out of Stock" : qty <= minStock ? "Low Stock" : "In Stock";
}
export async function addProduct(product: { name: string; category: ProductCategory; unit: string; package_size: string | null; price: number; min_stock: number }) {
  return createClient().from("products").insert(product).select().single();
}
export async function updateProduct(id: string, fields: { name: string; category: ProductCategory; unit: string; min_stock: number }) {
  const { data, error } = await createClient().from("products").update(fields).eq("id", id).select("id");
  return { error: error ?? (!data?.length ? { message: "No product was updated; check inventory permissions." } : null) };
}
export async function uploadProductImage(file: File, productCode: string) {
  const db = createClient();
  const ext = file.name.split(".").pop();
  const path = `products/${productCode}-${Date.now()}.${ext}`;
  const { error: uploadError } = await db.storage.from("site-images").upload(path, file, { upsert: true });
  if (uploadError) return { error: uploadError.message, url: null };
  const { data } = db.storage.from("site-images").getPublicUrl(path);
  return { error: null, url: data.publicUrl };
}
export async function setProductImage(id: string, url: string) {
  const { error } = await createClient().from("products").update({ image_url: url }).eq("id", id);
  return { error };
}
export async function addBatch(batch: { product_id: string; quantity: number; expiration_date: string | null }) {
  if (!Number.isSafeInteger(batch.quantity) || batch.quantity <= 0) return { error: { message: "Batch quantity must be a positive whole number." } };
  if (batch.expiration_date && batch.expiration_date < philippinesToday()) return { error: { message: "Expired stock cannot be received as sellable inventory." } };
  return createClient().from("product_batches").insert(batch);
}

// Keep legacy signature for existing callers; positive/unattributed adjustments
// are forbidden. The detail form calls the batch-specific version instead.
export async function adjustStock(_productId: string, _delta: number, _reason: string) {
  return { error: { message: "Choose a specific batch for stock removal. To increase stock, receive a new batch." } };
}
export async function adjustInventoryBatch(batchId: string, quantity: number, reason: string) {
  if (!Number.isSafeInteger(quantity) || quantity <= 0) return { error: { message: "Enter a positive whole number to remove." } };
  const { error } = await createClient().rpc("happytails_remove_inventory_batch_stock", {
    p_batch_id: batchId, p_quantity: quantity, p_reason: reason,
  });
  return { error: error ? { message: error.message } : null };
}
export async function setInventoryBatchExpiration(batchId: string, expirationDate: string, reason: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expirationDate) || reason.trim().length < 3) return { error: { message: "Enter an expiration date and correction reason." } };
  const { error } = await createClient().rpc("happytails_set_inventory_batch_expiration", {
    p_batch_id: batchId, p_expiration_date: expirationDate, p_reason: reason.trim(),
  });
  return { error: error ? { message: error.message } : null };
}
export async function setProductStatus(id: string, status: "active" | "discontinued") {
  const { data, error } = await createClient().from("products").update({ status }).eq("id", id).select("id");
  return { error: error ?? (!data?.length ? { message: "No product status changed; check inventory permissions." } : null) };
}
export async function sellProduct(productId: string, quantity: number) {
  const { error } = await createClient().rpc("deduct_stock_fefo", { p_product_id: productId, p_quantity: quantity });
  return { error: error?.message ?? null };
}
