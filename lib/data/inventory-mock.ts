// Mock inventory data — Products (master catalog) and Stocks (batch-level
// tracking). Updated to mirror the REAL 35-item catalog seeded into
// Supabase (supabase/019_real_product_catalog.sql), using the SAME
// category-prefixed codes (F101, T101, G101, A101, H101...) the real
// database generates — so when the UI gets rewired to real queries
// later, the codes customers/staff already got used to don't change out
// from under them.
//
// totalStock and status are still always computed from batches, never
// stored — same principle as before, now just pointed at real data.

export type InventoryCategory = "Food" | "Treats" | "Grooming" | "Accessories" | "Hygiene";

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
  expirationDate: string | null;
  receivedDate: string;
};

export const inventoryProducts: InventoryProduct[] = [
  // FOOD
  { id: "F101", name: "Aozi Cat Can", unit: "Piece", category: "Food", minStock: 15, status: "active" },
  { id: "F102", name: "Aozi Dog Can", unit: "Piece", category: "Food", minStock: 15, status: "active" },
  { id: "F103", name: "Whiskas Pouch Jr", unit: "Piece", category: "Food", minStock: 20, status: "active" },
  { id: "F104", name: "Whiskas Pouch Adult", unit: "Piece", category: "Food", minStock: 20, status: "active" },
  { id: "F105", name: "Brit Canned Food", unit: "Piece", category: "Food", minStock: 15, status: "active" },
  { id: "F106", name: "Special Dog Can", unit: "Piece", category: "Food", minStock: 15, status: "active" },
  { id: "F107", name: "Pedigree Puppy Pouch", unit: "Piece", category: "Food", minStock: 15, status: "active" },
  { id: "F108", name: "Pedigree Adult Pouch", unit: "Piece", category: "Food", minStock: 15, status: "active" },
  // GROOMING
  { id: "G101", name: "LC-Vit (120mL)", unit: "Piece", category: "Grooming", minStock: 10, status: "active" },
  { id: "G102", name: "Vitality Shampoo", unit: "Piece", category: "Grooming", minStock: 10, status: "active" },
  { id: "G103", name: "HT Cologne", unit: "Piece", category: "Grooming", minStock: 10, status: "active" },
  { id: "G104", name: "St. Roche Soap", unit: "Piece", category: "Grooming", minStock: 10, status: "active" },
  { id: "G105", name: "St. Roche Shampoo (450mL)", unit: "Piece", category: "Grooming", minStock: 10, status: "active" },
  { id: "G106", name: "Pibline Shampoo", unit: "Piece", category: "Grooming", minStock: 10, status: "active" },
  { id: "G107", name: "Pibline Tick/Flea Shampoo Spray", unit: "Piece", category: "Grooming", minStock: 10, status: "active" },
  { id: "G108", name: "Fur Magic Shampoo/Powder", unit: "Piece", category: "Grooming", minStock: 10, status: "active" },
  { id: "G109", name: "Pibline Tooth-Paw-te (Dental)", unit: "Piece", category: "Grooming", minStock: 10, status: "active" },
  { id: "G110", name: "St. Roche Shampoo (1000mL)", unit: "Piece", category: "Grooming", minStock: 8, status: "active" },
  // ACCESSORIES
  { id: "A101", name: "Dog Bowl - Big Stainless", unit: "Piece", category: "Accessories", minStock: 8, status: "active" },
  { id: "A102", name: "Pibline Collar", unit: "Piece", category: "Accessories", minStock: 8, status: "active" },
  { id: "A103", name: "Luxtail", unit: "Piece", category: "Accessories", minStock: 8, status: "active" },
  // HYGIENE
  { id: "H101", name: "Diaper - Female (L)", unit: "Piece", category: "Hygiene", minStock: 10, status: "active" },
  { id: "H102", name: "Diaper - Male (L)", unit: "Piece", category: "Hygiene", minStock: 10, status: "active" },
  { id: "H103", name: "Diaper - F/M (XL)", unit: "Piece", category: "Hygiene", minStock: 10, status: "active" },
  { id: "H104", name: "Diaper - Male (S-M)", unit: "Piece", category: "Hygiene", minStock: 10, status: "active" },
  { id: "H105", name: "Diaper - Female (S-M)", unit: "Piece", category: "Hygiene", minStock: 10, status: "active" },
  { id: "H106", name: "Pet Pad - Large", unit: "Piece", category: "Hygiene", minStock: 10, status: "active" },
  { id: "H107", name: "Pet Pad - Medium", unit: "Piece", category: "Hygiene", minStock: 10, status: "active" },
  // TREATS
  { id: "T101", name: "Pampered Pooch Powder", unit: "Piece", category: "Treats", minStock: 10, status: "active" },
  { id: "T102", name: "Jerkigh Treat", unit: "Piece", category: "Treats", minStock: 15, status: "active" },
  { id: "T103", name: "Petpero", unit: "Piece", category: "Treats", minStock: 15, status: "active" },
  { id: "T104", name: "Kitty Crunch Kitten", unit: "Piece", category: "Treats", minStock: 15, status: "active" },
  { id: "T105", name: "Denta Light Trainer Treats", unit: "Piece", category: "Treats", minStock: 10, status: "active" },
  { id: "T106", name: "Treat Lert", unit: "Piece", category: "Treats", minStock: 10, status: "active" },
  { id: "T107", name: "Catnip", unit: "Piece", category: "Treats", minStock: 10, status: "active" },
];

// One starter batch per product — 25 units, 180-day expiration — matching
// the real database seed exactly.
export const stockBatches: StockBatch[] = inventoryProducts.map((p, i) => ({
  id: `b-init-${i + 1}`,
  productId: p.id,
  batchNumber: "B-2026-INIT",
  quantity: 25,
  expirationDate: "2027-01-25",
  receivedDate: "2026-07-29",
}));

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
