"use client";

import type { PetType, ProductCategory } from "@/lib/types/products";

const categories: { label: string; value: ProductCategory | "all" }[] = [
  { label: "All items", value: "all" },
  { label: "Food", value: "Food" },
  { label: "Treats", value: "Treats" },
  { label: "Grooming", value: "Grooming" },
  { label: "Accessories", value: "Accessories" },
  { label: "Hygiene", value: "Hygiene" },
];

const petTypes: { label: string; value: PetType | "all" }[] = [
  { label: "All Pets", value: "all" },
  { label: "Dogs", value: "dog" },
  { label: "Cats", value: "cat" },
];

export default function PosCategoryTabs({
  active,
  onChange,
  activePetType,
  onPetTypeChange,
}: {
  active: ProductCategory | "all";
  onChange: (value: ProductCategory | "all") => void;
  activePetType: PetType | "all";
  onPetTypeChange: (value: PetType | "all") => void;
}) {
  const buttonClass = (selected: boolean) =>
    `rounded-full border px-4 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
      selected
        ? "bg-brand-pink border-brand-pink text-white"
        : "bg-white border-brand-pink text-zinc-700 hover:bg-brand-tint"
    }`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" aria-label="Filter products by pet">
        {petTypes.map((pet) => (
          <button
            key={pet.value}
            type="button"
            aria-pressed={activePetType === pet.value}
            onClick={() => onPetTypeChange(pet.value)}
            className={buttonClass(activePetType === pet.value)}
          >
            {pet.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Filter products by category">
        {categories.map((cat) => (
          <button
            key={cat.value}
            type="button"
            aria-pressed={active === cat.value}
            onClick={() => onChange(cat.value)}
            className={buttonClass(active === cat.value)}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
}
