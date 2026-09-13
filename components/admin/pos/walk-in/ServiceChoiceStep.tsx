"use client";

import type { ServiceType } from "@/lib/types/services";
import type { Species } from "@/lib/types/appointments";

export type WalkInServiceChoice = ServiceType | "ala_carte";

type ServiceOption = {
  type: WalkInServiceChoice;
  label: string;
  description: string;
  icon: string;
  requiresSpecies?: Species;
};

const services: ServiceOption[] = [
  { type: "dog_grooming", label: "Dog Grooming", description: "Grooming and care for dogs.", icon: "🐕", requiresSpecies: "Dog" },
  { type: "cat_grooming", label: "Cat Grooming", description: "Grooming and care for cats.", icon: "🐈", requiresSpecies: "Cat" },
  { type: "boarding", label: "Boarding", description: "A safe and comfortable stay.", icon: "🏠" },
  { type: "ala_carte", label: "Ala Carte", description: "Choose individual add-on services.", icon: "🛍️" },
];

export default function ServiceChoiceStep({
  choice, onChange, onBack, onNext, petSpecies,
}: {
  choice: WalkInServiceChoice | null;
  onChange: (choice: WalkInServiceChoice) => void;
  onBack: () => void;
  onNext: () => void;
  petSpecies?: Species[];
}) {
  const uniqueSpecies = petSpecies ? Array.from(new Set(petSpecies)) : null;
  const visibleServices = services.filter((service) => {
    if (!service.requiresSpecies || !uniqueSpecies) return true;
    return uniqueSpecies.includes(service.requiresSpecies);
  });

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-pink-50 sm:h-11 sm:w-11">
          <span className="text-lg sm:text-xl" aria-hidden="true">✨</span>
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight text-brand-pink sm:text-[28px]">Select Service</h2>
        <p className="mt-1 text-sm text-zinc-500 sm:text-[15px]">What does your pet need today?</p>
      </div>

      <div className={`mx-auto mt-6 grid w-full gap-3 sm:mt-8 sm:gap-4 ${
        visibleServices.length === 3
          ? "grid-cols-1 sm:max-w-[570px] sm:grid-cols-3"
          : "grid-cols-1 min-[430px]:grid-cols-2 sm:max-w-[720px] sm:grid-cols-4"
      }`}>
        {visibleServices.map((service) => {
          const selected = choice === service.type;
          return (
            <button
              key={service.type}
              type="button"
              onClick={() => onChange(service.type)}
              aria-pressed={selected}
              className={[
                "group relative flex min-h-[132px] w-full flex-col items-center justify-center rounded-2xl border-2 bg-white px-4 py-5 text-center",
                "transition-all duration-200 active:scale-[0.99]",
                selected
                  ? "border-brand-pink bg-brand-tint shadow-[0_4px_14px_rgba(236,72,153,0.14)]"
                  : "border-pink-100 hover:border-pink-300 hover:bg-pink-50/30",
                "sm:min-h-[150px] sm:rounded-[18px] sm:px-4 sm:py-6",
              ].join(" ")}
            >
              {selected && (
                <span className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-brand-pink text-xs font-bold text-white sm:right-3 sm:top-3">
                  ✓
                </span>
              )}
              <span className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-pink-50 text-[28px] sm:mb-3 sm:h-12 sm:w-12 sm:text-[30px]" aria-hidden="true">
                {service.icon}
              </span>
              <span className="text-sm font-bold text-zinc-800 sm:text-[15px]">{service.label}</span>
              <span className="mt-1 max-w-[230px] text-xs leading-4 text-zinc-500 sm:max-w-[160px]">{service.description}</span>
            </button>
          );
        })}
      </div>

      {choice === "ala_carte" && (
        <p className="mx-auto mt-3 max-w-[600px] text-center text-xs text-zinc-400 sm:mt-4">
          Ala Carte skips packages — you can choose individual add-on services directly.
        </p>
      )}

      <div className="mx-auto mt-6 grid w-full max-w-[720px] grid-cols-2 gap-2.5 sm:mt-8 sm:gap-3">
        <button type="button" onClick={onBack}
          className="min-h-11 rounded-full border-2 border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 sm:h-12 sm:px-6 sm:text-[15px]">
          Back
        </button>
        <button type="button" onClick={onNext} disabled={!choice}
          className="min-h-11 rounded-full bg-brand-pink px-4 py-2.5 text-sm font-semibold text-white shadow-[0_3px_8px_rgba(236,72,153,0.18)] hover:bg-brand-pink-dark disabled:cursor-not-allowed disabled:bg-pink-200 disabled:shadow-none sm:h-12 sm:px-6 sm:text-[15px]">
          Next
        </button>
      </div>
    </div>
  );
}
