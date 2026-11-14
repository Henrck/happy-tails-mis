"use client";
import type { ProductCategory } from "@/lib/types/products";

const categories: { label: string; value: ProductCategory | "all" }[] = [
  { label: "All Products", value: "all" },
  { label: "Food", value: "Food" },
  { label: "Treats", value: "Treats" },
  { label: "Grooming", value: "Grooming" },
  { label: "Accessories", value: "Accessories" },
  { label: "Hygiene", value: "Hygiene" },
];

export default function CategoryTabs({ active, onChange }: { active: ProductCategory | "all"; onChange: (value: ProductCategory | "all") => void }) {
  return (
    <div className="no-scrollbar flex items-center justify-start gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:justify-center sm:overflow-visible" aria-label="Product categories">
      {categories.map((cat) => {
        const isActive = active === cat.value;
        return <button key={cat.value} type="button" onClick={() => onChange(cat.value)} aria-pressed={isActive} className={`shrink-0 rounded-full border px-4 py-2.5 text-xs font-semibold transition-all sm:px-5 sm:text-sm ${isActive ? "border-brand-pink bg-brand-pink text-white shadow-sm ring-2 ring-pink-100" : "border-pink-100 bg-white text-zinc-700 hover:border-brand-pink/60 hover:text-brand-pink"}`}>{cat.label}</button>;
      })}
    </div>
  );
}
