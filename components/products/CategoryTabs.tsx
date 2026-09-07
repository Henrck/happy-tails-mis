"use client";
// Shared category filter pills, used by both the homepage carousel and the
// /products page. REAL FIX: the old version only had 3 category buttons
// (All/Food/Treats/Accessories) even though the actual product catalog
// has 5 categories — Grooming and Hygiene products existed in the data
// but had no way to be filtered to on either page. Now matches the real
// `products.category` values exactly.
import type { ProductCategory } from "@/lib/types/products";

const categories: { label: string; value: ProductCategory | "all" }[] = [
  { label: "All Products", value: "all" },
  { label: "Food", value: "Food" },
  { label: "Treats", value: "Treats" },
  { label: "Grooming", value: "Grooming" },
  { label: "Accessories", value: "Accessories" },
  { label: "Hygiene", value: "Hygiene" },
];

export default function CategoryTabs({
  active,
  onChange,
}: {
  active: ProductCategory | "all";
  onChange: (value: ProductCategory | "all") => void;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-2 md:gap-3">
      {categories.map((cat) => {
        const isActive = active === cat.value;
        return (
          <button
            key={cat.value}
            onClick={() => onChange(cat.value)}
            className={`px-4 md:px-5 py-1.5 rounded-full border-2 text-xs md:text-sm font-medium transition-colors ${
              isActive
                ? "bg-cyan-300 border-cyan-300 text-white"
                : "bg-white border-cyan-300 text-zinc-700 hover:bg-cyan-50"
            }`}
          >
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}
