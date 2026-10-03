// service choice is intentionally based on the pets selected immediately
// before this step. A single-species booking gets the species-specific
// grooming option; a Dog + Cat booking gets one generalized "Grooming"
// option so both pets stay attached to the same customer booking flow.
"use client";

import type { Species } from "@/lib/types/appointments";

export type WalkInServiceChoice =
  | "dog_grooming"
  | "cat_grooming"
  | "grooming"
  | "boarding"
  | "ala_carte";

type ServiceOption = {
  type: WalkInServiceChoice;
  label: string;
  description: string;
  icon: string;
};

export default function ServiceChoiceStep({
  choice,
  onChange,
  onBack,
  onNext,
  petSpecies = [],
}: {
  choice: WalkInServiceChoice | null;
  onChange: (choice: WalkInServiceChoice) => void;
  onBack: () => void;
  onNext: () => void;
  petSpecies?: Species[];
}) {
  const uniqueSpecies = Array.from(new Set(petSpecies));
  const isMixedSpecies = uniqueSpecies.includes("Dog") && uniqueSpecies.includes("Cat");
  const hasDog = uniqueSpecies.includes("Dog");
  const hasCat = uniqueSpecies.includes("Cat");

  const groomingOption: ServiceOption | null = isMixedSpecies
    ? {
        type: "grooming",
        label: "Grooming",
        description: "Grooming and care for your selected dogs and cats.",
        icon: "✂️",
      }
    : hasDog
      ? {
          type: "dog_grooming",
          label: "Dog Grooming",
          description: "Grooming and care for dogs.",
          icon: "🐕",
        }
      : hasCat
        ? {
            type: "cat_grooming",
            label: "Cat Grooming",
            description: "Grooming and care for cats.",
            icon: "🐈",
          }
        : null;

  const services: ServiceOption[] = [
    ...(groomingOption ? [groomingOption] : []),
    {
      type: "boarding",
      label: "Boarding",
      description: "A safe and comfortable stay.",
      icon: "🏠",
    },
    {
      type: "ala_carte",
      label: "Ala Carte",
      description: "Choose individual add-on services.",
      icon: "🛍️",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-pink-50 sm:h-11 sm:w-11">
          <span className="text-lg sm:text-xl" aria-hidden="true">✨</span>
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight text-brand-pink sm:text-[28px]">Select Service</h2>
        <p className="mt-1 text-sm text-zinc-500 sm:text-[15px]">
          {isMixedSpecies
            ? "Choose one service for your selected dogs and cats."
            : "Choose the service for your selected pet."}
        </p>
      </div>

      {isMixedSpecies && (
        <div className="mx-auto mt-4 max-w-xl rounded-xl border border-pink-100 bg-pink-50/60 px-4 py-3 text-center text-xs text-zinc-600">
          <strong>Mixed-pet booking:</strong> Grooming applies to both dogs and cats in this booking.
          Boarding and Ala Carte are also available for all selected pets.
        </div>
      )}

      <div className={`mx-auto mt-6 grid w-full gap-3 sm:mt-8 sm:gap-4 ${
        services.length === 3
          ? "grid-cols-1 sm:max-w-[570px] sm:grid-cols-3"
          : "grid-cols-1 min-[430px]:grid-cols-2 sm:max-w-[720px] sm:grid-cols-3"
      }`}>
        {services.map((service) => {
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
              ].join(" ")}
            >
              {selected && (
                <span className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-brand-pink text-xs font-bold text-white">
                  ✓
                </span>
              )}
              <span className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-pink-50 text-[28px]" aria-hidden="true">
                {service.icon}
              </span>
              <span className="text-sm font-bold text-zinc-800 sm:text-[15px]">{service.label}</span>
              <span className="mt-1 max-w-[230px] text-xs leading-4 text-zinc-500">{service.description}</span>
            </button>
          );
        })}
      </div>

      {choice === "ala_carte" && (
        <p className="mx-auto mt-3 max-w-[600px] text-center text-xs text-zinc-400 sm:mt-4">
          Ala Carte skips packages — choose individual add-on services directly.
        </p>
      )}

      <div className="mx-auto mt-6 grid w-full max-w-[720px] grid-cols-2 gap-2.5 sm:mt-8 sm:gap-3">
        <button type="button" onClick={onBack}
          className="min-h-11 rounded-full border-2 border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50">
          Back
        </button>
        <button type="button" onClick={onNext} disabled={!choice}
          className="min-h-11 rounded-full bg-brand-pink px-4 py-2.5 text-sm font-semibold text-white shadow-[0_3px_8px_rgba(236,72,153,0.18)] hover:bg-brand-pink-dark disabled:cursor-not-allowed disabled:bg-pink-200 disabled:shadow-none">
          Next
        </button>
      </div>
    </div>
  );
}
