"use client";
import type { ProductCategory } from "@/lib/types/products";

const categories: { label: string; value: ProductCategory | "all" }[] = [
  { label: "All items", value: "all" },
  { label: "Food", value: "Food" },
  { label: "Treats", value: "Treats" },
  { label: "Grooming", value: "Grooming" },
  { label: "Accessories", value: "Accessories" },
  { label: "Hygiene", value: "Hygiene" },
];

export default function PosCategoryTabs({
  active,
  onChange,
}: {
  active: ProductCategory | "all";
  onChange: (value: ProductCategory | "all") => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((cat) => {
        const isActive = active === cat.value;
        return (
          <button
            key={cat.value}
            onClick={() => onChange(cat.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors whitespace-nowrap ${
              isActive ? "bg-brand-pink border-brand-pink text-white" : "bg-white border-brand-pink text-zinc-700 hover:bg-brand-tint"
            }`}
          >
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}
