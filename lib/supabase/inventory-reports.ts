// Inventory Reports must use the same sellable quantities as POS and Inventory.
// Expired batches remain in the audit history, but do not inflate stock.
import { fetchProducts, fetchAllBatches, computeStatus } from "./products";
import { sellableStock } from "@/lib/utils/inventory-expiration";
import type { InventoryReportRow, InventoryReportStatus } from "@/lib/data/inventory-reports-mock";

export async function fetchInventoryReportRows() {
  const [{ products, error: productsError }, { batches, error: batchesError }] = await Promise.all([
    fetchProducts(), fetchAllBatches(),
  ]);
  const error = productsError || batchesError;
  if (error) return { rows: [] as InventoryReportRow[], error };
  const rows: InventoryReportRow[] = products.map(p => {
    const stock = sellableStock(p.id,batches);
    const status: InventoryReportStatus = computeStatus(stock,p.min_stock);
    const expirationDate = batches.filter(b => b.product_id === p.id && b.quantity > 0 && !b.is_adjustment && !!b.expiration_date)
      .map(b => b.expiration_date as string).sort()[0] ?? null;
    return { id:p.product_code,itemName:p.name,category:p.category,stock,unit:p.unit,price:p.price,status,expirationDate };
  });
  return { rows, error: null };
}
