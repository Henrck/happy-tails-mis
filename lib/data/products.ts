// Shared product catalog — used by the customer-facing /products page, the
// transactional POS (Point of Sale), and now POS Management (this file is
// what "add product" in Operation Management actually writes to).
//
// KNOWN GAP, flagged directly rather than hidden: Inventory's Products tab
// currently uses its own SEPARATE mock dataset (lib/data/inventory-mock.ts)
// with different ID formats (P101 vs dog-food) and category casing (Food
// vs food) — built in an earlier session before this reconciliation was
// discussed. These two catalogs are NOT yet unified. That reconciliation
// is real work (deciding one true ID scheme, one true category list) and
// deserves its own dedicated pass once we're closer to real Supabase
// tables — not something to paper over quietly here.
export type ProductCategory = "food" | "treats" | "accessories" | "groom";

export type Product = {
  id: string;
  name: string;
  category: ProductCategory;
  weight: string;
  price: number;
  imageUrl: string | null;
  archived?: boolean; // soft delete — hidden from POS/customer site, not deleted
};

export const products: Product[] = [
  { id: "dental-stix", name: "Dental Stix", category: "treats", weight: "220g", price: 210, imageUrl: null },
  { id: "kitty-crunch-kitten", name: "Kitty Crunch Kitten", category: "treats", weight: "60g", price: 95, imageUrl: null },
  { id: "brit-canned-food", name: "Brit Canned Food", category: "food", weight: "80g", price: 125, imageUrl: null },
  { id: "mondex", name: "Mondex", category: "food", weight: "20g", price: 145, imageUrl: null },
  { id: "whiskas-jr", name: "Whiskas (JR)", category: "food", weight: "80g", price: 45, imageUrl: null },
  { id: "aozi-dog-20g", name: "Aozi (Dog)", category: "food", weight: "100g", price: 190, imageUrl: null },
  { id: "aozi-dog-100g", name: "Aozi (Dog)", category: "food", weight: "100g", price: 190, imageUrl: null },
  { id: "whiskas-adult", name: "Whiskas (Adult)", category: "food", weight: "80g", price: 45, imageUrl: null },
  { id: "petpero", name: "Petpero", category: "treats", weight: "80g", price: 180, imageUrl: null },
  { id: "pup-cup", name: "Pup Cup", category: "treats", weight: "1pc", price: 80, imageUrl: null },
  { id: "pizza-dawg", name: "Pizza Dawg", category: "treats", weight: "1pc", price: 165, imageUrl: null },
  { id: "pet-shampoo", name: "Pet Shampoo", category: "groom", weight: "250ml", price: 220, imageUrl: null },
  { id: "pet-conditioner", name: "Pet Conditioner", category: "groom", weight: "250ml", price: 220, imageUrl: null },
  { id: "nail-clipper", name: "Nail Clipper", category: "groom", weight: "1pc", price: 150, imageUrl: null },
  { id: "grooming-brush", name: "Grooming Brush", category: "groom", weight: "1pc", price: 180, imageUrl: null },
];
