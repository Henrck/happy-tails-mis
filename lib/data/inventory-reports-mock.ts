export type InventoryReportStatus = "In Stock" | "Low Stock" | "Out of Stock";

export type InventoryReportRow = {
  id: string;
  itemName: string;
  category: string;
  stock: number;
  unit: string;
  price: number;
  status: InventoryReportStatus;
  expirationDate: string | null; // ISO, null = no expiration
};

export const inventoryReports: InventoryReportRow[] = [
  { id: "INV-001", itemName: "Dog Food", category: "Food", stock: 50, unit: "Kilo", price: 850, status: "In Stock", expirationDate: "2026-10-01" },
  { id: "INV-002", itemName: "Cat Food", category: "Food", stock: 18, unit: "Kilo", price: 780, status: "Low Stock", expirationDate: "2026-07-30" },
  { id: "INV-003", itemName: "Shampoo", category: "Grooming", stock: 40, unit: "Liters", price: 2200, status: "In Stock", expirationDate: "2027-01-01" },
  { id: "INV-004", itemName: "Dog Leash", category: "Accessories", stock: 8, unit: "Piece", price: 150, status: "Low Stock", expirationDate: null },
  { id: "INV-005", itemName: "Cat Litter", category: "Hygiene", stock: 60, unit: "Kilo", price: 1200, status: "In Stock", expirationDate: "2026-09-01" },
  { id: "INV-006", itemName: "Flea Collar", category: "Grooming", stock: 0, unit: "Piece", price: 200, status: "Out of Stock", expirationDate: null },
  { id: "INV-007", itemName: "Pet Shampoo", category: "Grooming", stock: 25, unit: "Piece", price: 220, status: "In Stock", expirationDate: "2027-03-15" },
];
