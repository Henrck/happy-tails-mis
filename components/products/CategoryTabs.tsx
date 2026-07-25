"use client";
// Shared category filter pills, used by both the homepage carousel and the
// /products page.
import type { ProductCategory } from "@/lib/data/products";

const categories: { label: string; value: ProductCategory | "all" }[] = [
  { label: "All Product", value: "all" },
  { label: "Food", value: "food" },
  { label: "Treats", value: "treats" },
  { label: "Accesories", value: "accessories" },
];

export default function CategoryTabs({
  active,
  onChange,
}: {
  active: ProductCategory | "all";
  onChange: (value: ProductCategory | "all") => void;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {categories.map((cat) => {
        const isActive = active === cat.value;
        return (
          <button
            key={cat.value}
            onClick={() => onChange(cat.value)}
            className={`px-5 py-1.5 rounded-full border-2 text-sm font-medium transition-colors ${
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
