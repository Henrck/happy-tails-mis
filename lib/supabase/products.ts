// Query + mutation helpers for the unified products/batches system.
import { createClient } from "./client";
import type { Product, ProductBatch, ProductCategory } from "@/lib/types/products";

export async function fetchProducts(options?: { activeOnly?: boolean }) {
  const supabase = createClient();
  let query = supabase.from("products").select("*").order("product_code");
  if (options?.activeOnly) query = query.eq("status", "active");
  const { data, error } = await query;
  return { products: (data ?? []) as Product[], error: error?.message };
}

export async function fetchAllBatches() {
  const supabase = createClient();
  const { data, error } = await supabase.from("product_batches").select("*").order("received_date", { ascending: false });
  return { batches: (data ?? []) as ProductBatch[], error: error?.message };
}

export async function fetchBatchesForProduct(productId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("product_batches")
    .select("*")
    .eq("product_id", productId)
    .order("received_date", { ascending: false });
  return { batches: (data ?? []) as ProductBatch[], error: error?.message };
}

export function computeTotalStock(productId: string, batches: ProductBatch[]): number {
  // Sums EVERYTHING — real batches AND adjustments — since both
  // genuinely affect how much stock actually exists right now.
  return batches.filter((b) => b.product_id === productId).reduce((sum, b) => sum + b.quantity, 0);
}

export function computeStatus(totalStock: number, minStock: number): "In Stock" | "Low Stock" {
  return totalStock <= minStock ? "Low Stock" : "In Stock";
}

export async function addProduct(product: {
  name: string; category: ProductCategory; unit: string; package_size: string | null; price: number; min_stock: number;
}) {
  const supabase = createClient();
  return supabase.from("products").insert(product).select().single();
}

export async function updateProduct(id: string, fields: {
  name: string; category: ProductCategory; unit: string; min_stock: number;
}) {
  const supabase = createClient();
  return supabase.from("products").update(fields).eq("id", id);
}

// These were the two missing pieces — ProductFormModal (POS Management)
// was already calling both of these, but they never actually existed in
// this file. Follows the same "site-images" bucket + products/ prefix
// pattern already used by Website Management's image uploads.
export async function uploadProductImage(file: File, productCode: string) {
  const supabase = createClient();
  const ext = file.name.split(".").pop();
  const path = `products/${productCode}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from("site-images").upload(path, file, { upsert: true });
  if (uploadError) return { error: uploadError.message, url: null };

  const { data } = supabase.storage.from("site-images").getPublicUrl(path);
  return { error: null, url: data.publicUrl };
}

export async function setProductImage(id: string, imageUrl: string) {
  const supabase = createClient();
  const { error } = await supabase.from("products").update({ image_url: imageUrl }).eq("id", id);
  return { error };
}

export async function addBatch(batch: {
  product_id: string; quantity: number; expiration_date: string | null;
}) {
  const supabase = createClient();
  // is_adjustment defaults to false at the database level — a real
  // delivery, counted toward "Total Batches" as expected.
  return supabase.from("product_batches").insert(batch);
}

// Adjustments are now explicitly flagged is_adjustment: true — this is
// the actual fix: they still affect Total Stock correctly, they still
// show up in the batch history for audit purposes, but they no longer
// inflate "Total Batches" every time someone corrects a count.
export async function adjustStock(productId: string, delta: number, reason: string) {
  const supabase = createClient();
  return supabase.from("product_batches").insert({
    product_id: productId,
    batch_number: `ADJ · ${reason}`,
    quantity: delta,
    expiration_date: null,
    received_date: new Date().toISOString().slice(0, 10),
    is_adjustment: true,
  });
}

export async function setProductStatus(id: string, status: "active" | "discontinued") {
  const supabase = createClient();
  return supabase.from("products").update({ status }).eq("id", id);
}

export async function sellProduct(productId: string, quantity: number) {
  const supabase = createClient();
  const { error } = await supabase.rpc("deduct_stock_fefo", { p_product_id: productId, p_quantity: quantity });
  return { error: error?.message ?? null };
}
