// Inventory Reports real data layer. Reuses the same products +
// product_batches helpers the POS/Inventory admin pages already use
// (fetchProducts, fetchAllBatches, computeTotalStock, computeStatus) so
// this report can never disagree with what Inventory Management shows
// for the same item.
import { fetchProducts, fetchAllBatches, computeTotalStock, computeStatus } from "./products";
import type { InventoryReportRow, InventoryReportStatus } from "@/lib/data/inventory-reports-mock";

export async function fetchInventoryReportRows() {
  const [{ products, error: productsError }, { batches, error: batchesError }] = await Promise.all([
    fetchProducts(),
    fetchAllBatches(),
  ]);
  const error = productsError || batchesError;
  if (error) return { rows: [] as InventoryReportRow[], error };

  const rows: InventoryReportRow[] = products.map((product) => {
    const totalStock = computeTotalStock(product.id, batches);

    // computeStatus() (shared with Inventory Management) only
    // distinguishes In Stock / Low Stock — it was never asked to
    // recognize zero. This report needs the 3-way split, so that one
    // extra case is handled here rather than changing the shared
    // util's behavior for pages that don't want it.
    const status: InventoryReportStatus = totalStock <= 0 ? "Out of Stock" : computeStatus(totalStock, product.min_stock);

    // A product can have several batches with different expiration
    // dates — the earliest upcoming one is what actually matters for a
    // report (that's the stock that will expire first), so that's what
    // gets shown, not an arbitrary batch.
    const expirationDate = batches
      .filter((b) => b.product_id === product.id && b.expiration_date)
      .map((b) => b.expiration_date as string)
      .sort()[0] ?? null;

    return {
      id: product.product_code,
      itemName: product.name,
      category: product.category,
      stock: totalStock,
      unit: product.unit,
      price: product.price,
      status,
      expirationDate,
    };
  });

  return { rows, error: null };
}
