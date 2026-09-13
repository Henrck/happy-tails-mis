"use client";

import type { WalkInServiceChoice } from "@/components/admin/pos/walk-in/ServiceChoiceStep";

const labels: Record<WalkInServiceChoice, { label: string; icon: string }> = {
  dog_grooming: { label: "Dog Grooming", icon: "🐕" },
  cat_grooming: { label: "Cat Grooming", icon: "🐈" },
  boarding: { label: "Boarding", icon: "🏠" },
  ala_carte: { label: "Ala Carte", icon: "🛍️" },
};

export default function AddAnotherServicePrompt({
  eligibleServices, onAddService, onDone,
}: {
  eligibleServices: WalkInServiceChoice[];
  onAddService: (choice: WalkInServiceChoice) => void;
  onDone: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center py-5 text-center sm:py-10">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 sm:h-14 sm:w-14">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-600 sm:h-[26px] sm:w-[26px]">
          <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <h2 className="mt-4 text-xl font-bold text-zinc-800 sm:text-2xl">That service is set up!</h2>
      <p className="mt-1 max-w-sm text-sm leading-5 text-zinc-500">Want to add another service to this booking?</p>

      {eligibleServices.length > 0 ? (
        <div className="mt-5 grid w-full grid-cols-1 gap-3 min-[430px]:grid-cols-2 sm:max-w-md">
          {eligibleServices.map((choice) => (
            <button key={choice} type="button" onClick={() => onAddService(choice)}
              className="flex min-h-[112px] w-full flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-pink-100 bg-white px-4 py-4 active:scale-[0.99] hover:border-brand-pink sm:min-h-[116px]">
              <span className="text-2xl" aria-hidden="true">{labels[choice].icon}</span>
              <span className="text-sm font-semibold text-zinc-700">{labels[choice].label}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-1 max-w-sm text-sm text-zinc-500">All your selected pets are covered — ready for the summary.</p>
      )}

      <button type="button" onClick={onDone}
        className="mt-5 min-h-12 w-full rounded-full bg-brand-pink px-5 py-3 text-sm font-semibold text-white hover:bg-brand-pink-dark sm:mt-6 sm:text-base">
        {eligibleServices.length > 0 ? "No, continue to Summary" : "Continue to Summary"}
      </button>
    </div>
  );
}
