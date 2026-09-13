// Query + mutation helpers for the unified products/batches system.
import { createClient } from "./client";
import type { Product, ProductBatch, ProductCategory } from "@/lib/types/products";

export async function fetchProducts(options?: { activeOnly?: boolean }) {
  const supabase = createClient();

  let query = supabase.from("products").select("*").order("product_code");
  if (options?.activeOnly) query = query.eq("status", "active");

  const { data, error } = await query;
  if (error) {
    return { products: [] as Product[], error: error.message };
  }

  // POS availability must come from the same product_batches records
  // used by Inventory. A product with zero total quantity is not sellable.
  const { data: batchData, error: batchError } = await supabase
    .from("product_batches")
    .select("product_id, quantity");

  if (batchError) {
    return {
      products: [] as Product[],
      error: `Unable to read current stock: ${batchError.message}`,
    };
  }

  const stockByProduct = new Map<string, number>();

  for (const batch of batchData ?? []) {
    stockByProduct.set(
      batch.product_id,
      (stockByProduct.get(batch.product_id) ?? 0) + Number(batch.quantity ?? 0)
    );
  }

  const products = (data ?? []).map((product) => ({
    ...(product as Product),
    stock: Math.max(0, stockByProduct.get(product.id) ?? 0),
  }));

  return { products, error: undefined };
}

export async function fetchAllBatches() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("product_batches")
    .select("*")
    .order("received_date", { ascending: false });
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
  return batches
    .filter((b) => b.product_id === productId)
    .reduce((sum, b) => sum + b.quantity, 0);
}

export function computeStatus(
  totalStock: number,
  minStock: number
): "Out of Stock" | "Low Stock" | "In Stock" {
  if (totalStock <= 0) return "Out of Stock";
  return totalStock <= minStock ? "Low Stock" : "In Stock";
}

export async function addProduct(product: {
  name: string;
  category: ProductCategory;
  unit: string;
  package_size: string | null;
  price: number;
  min_stock: number;
}) {
  const supabase = createClient();
  return supabase.from("products").insert(product).select().single();
}

export async function updateProduct(
  id: string,
  fields: {
    name: string;
    category: ProductCategory;
    unit: string;
    min_stock: number;
  }
) {
  const supabase = createClient();
  return supabase.from("products").update(fields).eq("id", id);
}

export async function uploadProductImage(file: File, productCode: string) {
  const supabase = createClient();
  const ext = file.name.split(".").pop();
  const path = `products/${productCode}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("site-images")
    .upload(path, file, { upsert: true });

  if (uploadError) return { error: uploadError.message, url: null };

  const { data } = supabase.storage.from("site-images").getPublicUrl(path);
  return { error: null, url: data.publicUrl };
}

export async function setProductImage(id: string, imageUrl: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("products")
    .update({ image_url: imageUrl })
    .eq("id", id);
  return { error };
}

export async function addBatch(batch: {
  product_id: string;
  quantity: number;
  expiration_date: string | null;
}) {
  const supabase = createClient();
  return supabase.from("product_batches").insert(batch);
}

export async function adjustStock(
  productId: string,
  delta: number,
  reason: string
) {
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

export async function setProductStatus(
  id: string,
  status: "active" | "discontinued"
) {
  const supabase = createClient();
  return supabase.from("products").update({ status }).eq("id", id);
}

export async function sellProduct(productId: string, quantity: number) {
  const supabase = createClient();
  const { error } = await supabase.rpc("deduct_stock_fefo", {
    p_product_id: productId,
    p_quantity: quantity,
  });
  return { error: error?.message ?? null };
}
