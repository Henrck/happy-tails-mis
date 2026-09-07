// Shared product catalog — used by the customer-facing /products page and
// POS. This now mirrors the REAL 35-item catalog seeded into Supabase
// (supabase/019_real_product_catalog.sql), so what you see here matches
// what's actually in the database, even though the UI still reads this
// mock file for now (real UI rewiring is the next step, not done yet).
// "hygiene" added as a category — the real catalog needed it, the
// original mock list didn't have it.
export type ProductCategory = "food" | "treats" | "accessories" | "groom" | "hygiene";

export type Product = {
  id: string;
  name: string;
  category: ProductCategory;
  weight: string;
  price: number;
  imageUrl: string | null;
  archived?: boolean;
};

export const products: Product[] = [
  // FOOD
  { id: "aozi-cat-can", name: "Aozi Cat Can", category: "food", weight: "100-150g", price: 98, imageUrl: null },
  { id: "aozi-dog-can", name: "Aozi Dog Can", category: "food", weight: "400-800g", price: 190, imageUrl: null },
  { id: "whiskas-pouch-jr", name: "Whiskas Pouch Jr", category: "food", weight: "50-85g", price: 45, imageUrl: null },
  { id: "whiskas-pouch-adult", name: "Whiskas Pouch Adult", category: "food", weight: "85-100g", price: 95, imageUrl: null },
  { id: "brit-canned-food", name: "Brit Canned Food", category: "food", weight: "400g", price: 125, imageUrl: null },
  { id: "special-dog-can", name: "Special Dog Can", category: "food", weight: "100-200g", price: 95, imageUrl: null },
  { id: "pedigree-puppy-pouch", name: "Pedigree Puppy Pouch", category: "food", weight: "80-100g", price: 60, imageUrl: null },
  { id: "pedigree-adult-pouch", name: "Pedigree Adult Pouch", category: "food", weight: "100g", price: 100, imageUrl: null },
  // GROOMING
  { id: "lc-vit", name: "LC-Vit", category: "groom", weight: "120mL", price: 210, imageUrl: null },
  { id: "vitality-shampoo", name: "Vitality Shampoo", category: "groom", weight: "1pc", price: 350, imageUrl: null },
  { id: "ht-cologne", name: "HT Cologne", category: "groom", weight: "1pc", price: 280, imageUrl: null },
  { id: "st-roche-soap", name: "St. Roche Soap", category: "groom", weight: "1pc", price: 150, imageUrl: null },
  { id: "st-roche-shampoo-450", name: "St. Roche Shampoo", category: "groom", weight: "450mL", price: 265, imageUrl: null },
  { id: "pibline-shampoo", name: "Pibline Shampoo", category: "groom", weight: "1pc", price: 230, imageUrl: null },
  { id: "pibline-tick-flea-spray", name: "Pibline Tick/Flea Shampoo Spray", category: "groom", weight: "1pc", price: 210, imageUrl: null },
  { id: "fur-magic", name: "Fur Magic Shampoo/Powder", category: "groom", weight: "1pc", price: 230, imageUrl: null },
  { id: "pibline-tooth-pawte", name: "Pibline Tooth-Paw-te (Dental)", category: "groom", weight: "1pc", price: 150, imageUrl: null },
  { id: "st-roche-shampoo-1000", name: "St. Roche Shampoo", category: "groom", weight: "1000mL", price: 375, imageUrl: null },
  // ACCESSORIES
  { id: "dog-bowl-big", name: "Dog Bowl - Big Stainless", category: "accessories", weight: "1pc", price: 210, imageUrl: null },
  { id: "pibline-collar", name: "Pibline Collar", category: "accessories", weight: "1pc", price: 170, imageUrl: null },
  { id: "luxtail", name: "Luxtail", category: "accessories", weight: "1pc", price: 320, imageUrl: null },
  // HYGIENE
  { id: "diaper-female-l", name: "Diaper - Female (L)", category: "hygiene", weight: "1pack", price: 220, imageUrl: null },
  { id: "diaper-male-l", name: "Diaper - Male (L)", category: "hygiene", weight: "1pack", price: 220, imageUrl: null },
  { id: "diaper-fm-xl", name: "Diaper - F/M (XL)", category: "hygiene", weight: "1pack", price: 250, imageUrl: null },
  { id: "diaper-male-sm", name: "Diaper - Male (S-M)", category: "hygiene", weight: "1pack", price: 198, imageUrl: null },
  { id: "diaper-female-sm", name: "Diaper - Female (S-M)", category: "hygiene", weight: "1pack", price: 198, imageUrl: null },
  { id: "pet-pad-large", name: "Pet Pad - Large", category: "hygiene", weight: "1pack", price: 290, imageUrl: null },
  { id: "pet-pad-medium", name: "Pet Pad - Medium", category: "hygiene", weight: "1pack", price: 280, imageUrl: null },
  // TREATS
  { id: "pampered-pooch-powder", name: "Pampered Pooch Powder", category: "treats", weight: "1pc", price: 200, imageUrl: null },
  { id: "jerkigh-treat", name: "Jerkigh Treat", category: "treats", weight: "1pc", price: 125, imageUrl: null },
  { id: "petpero", name: "Petpero", category: "treats", weight: "1pc", price: 180, imageUrl: null },
  { id: "kitty-crunch-kitten", name: "Kitty Crunch Kitten", category: "treats", weight: "1pc", price: 95, imageUrl: null },
  { id: "denta-light-trainer-treats", name: "Denta Light Trainer Treats", category: "treats", weight: "1pc", price: 215, imageUrl: null },
  { id: "treat-lert", name: "Treat Lert", category: "treats", weight: "1pc", price: 185, imageUrl: null },
  { id: "catnip", name: "Catnip", category: "treats", weight: "1pc", price: 150, imageUrl: null },
];
