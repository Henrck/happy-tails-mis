// Mock inventory data: Products (master catalog record + stock rules) and
// Stocks (batch-level tracking). These are kept as SEPARATE mock files
// from lib/data/products.ts for now, since Inventory needs richer fields
// (unit, minStock, batches) the customer-facing catalog doesn't have yet.
// In the real schema these become one reconciled set of tables — this
// split is a mock-data-phase simplification, not the final design.
//
// IMPORTANT: totalStock and status are NEVER stored directly — they're
// always computed from batches (see getTotalStock/getStatus below). This
// is the same principle as "Today's Appointment" matching the Dashboard:
// one real source, everything else derives from it, so numbers can't
// silently drift out of sync with each other.

export type InventoryCategory = "Food" | "Grooming" | "Accessories" | "Hygiene";
// NOTE: category list is a placeholder — Josh is finalizing the full
// product list, and categories should eventually be their own manageable
// table (not a hardcoded type) so they can be added/edited without a code
// change. That becomes possible once real Supabase tables exist.

export type InventoryProduct = {
  id: string;
  name: string;
  unit: string;
  category: InventoryCategory;
  minStock: number;
  status: "active" | "discontinued";
};

export type StockBatch = {
  id: string;
  productId: string;
  batchNumber: string;
  quantity: number;
  expirationDate: string | null; // null = doesn't expire (e.g. some accessories)
  receivedDate: string;
};

export const inventoryProducts: InventoryProduct[] = [
  { id: "P101", name: "Dog Food", unit: "Kilo", category: "Food", minStock: 20, status: "active" },
  { id: "P102", name: "Cat Food", unit: "Kilo", category: "Food", minStock: 20, status: "active" },
  { id: "P103", name: "Shampoo", unit: "Liters", category: "Grooming", minStock: 30, status: "active" },
  { id: "P104", name: "Dog Leash", unit: "Piece", category: "Accessories", minStock: 10, status: "active" },
  { id: "P105", name: "Cat Litter", unit: "Kilo", category: "Hygiene", minStock: 15, status: "active" },
];

export const stockBatches: StockBatch[] = [
  { id: "b1", productId: "P101", batchNumber: "B-2026-014", quantity: 30, expirationDate: "2026-08-15", receivedDate: "2026-06-01" },
  { id: "b2", productId: "P101", batchNumber: "B-2026-022", quantity: 20, expirationDate: "2026-10-01", receivedDate: "2026-07-10" },
  { id: "b3", productId: "P102", batchNumber: "B-2026-015", quantity: 18, expirationDate: "2026-07-30", receivedDate: "2026-06-01" },
  { id: "b4", productId: "P103", batchNumber: "B-2026-009", quantity: 40, expirationDate: "2027-01-01", receivedDate: "2026-05-15" },
  { id: "b5", productId: "P104", batchNumber: "B-2026-011", quantity: 8, expirationDate: null, receivedDate: "2026-05-20" },
  { id: "b6", productId: "P105", batchNumber: "B-2026-018", quantity: 60, expirationDate: "2026-09-01", receivedDate: "2026-06-20" },
];

export function getTotalStock(productId: string, batches: StockBatch[]): number {
  return batches.filter((b) => b.productId === productId).reduce((sum, b) => sum + b.quantity, 0);
}

export function getStatus(totalStock: number, minStock: number): "In Stock" | "Low Stock" {
  return totalStock <= minStock ? "Low Stock" : "In Stock";
}

export function isExpiringSoon(expirationDate: string | null, withinDays = 30): boolean {
  if (!expirationDate) return false;
  const days = (new Date(expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return days >= 0 && days <= withinDays;
}
