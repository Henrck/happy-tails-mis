"use client";
import type { ServiceType } from "@/lib/types/services";

const tabs: { value: ServiceType; label: string }[] = [
  { value: "dog_grooming", label: "Dog Grooming" },
  { value: "cat_grooming", label: "Cat Grooming" },
  { value: "boarding", label: "Boarding" },
];

export default function ServiceTabs({ active, onChange }: { active: ServiceType; onChange: (t: ServiceType) => void }) {
  return (
    <div className="inline-flex bg-white rounded-full border border-pink-100 p-1">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={`px-5 py-1.5 rounded-full text-sm font-semibold transition-colors ${
            active === t.value ? "bg-brand-pink text-white" : "text-zinc-600 hover:bg-brand-tint"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
