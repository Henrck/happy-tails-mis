"use client";

import type { PetType } from "@/lib/types/products";

const options: { label: string; value: PetType | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Dogs", value: "dog" },
  { label: "Cats", value: "cat" },
];

export default function PetTypeTabs({
  active,
  onChange,
}: {
  active: PetType | "all";
  onChange: (value: PetType | "all") => void;
}) {
  return (
    <div
      className="flex items-center justify-center gap-2"
      role="group"
      aria-label="Filter products by pet type"
    >
      {options.map((option) => {
        const selected = active === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`min-w-20 rounded-full border px-5 py-2.5 text-sm font-bold transition-colors ${
              selected
                ? "border-brand-pink bg-brand-pink text-white shadow-sm"
                : "border-pink-100 bg-white text-zinc-700 hover:border-brand-pink hover:text-brand-pink"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
