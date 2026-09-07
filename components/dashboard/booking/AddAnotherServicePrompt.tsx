"use client";
// Shown right after a service leg finishes scheduling — "the ad thingy,
// add grooming? or add boarding?" Offers only genuinely still-eligible
// services (via eligibleServicesFor — e.g. won't re-offer Dog Grooming
// if every selected dog already has a completed grooming leg), plus a
// clear way to stop and move to Summary.
import type { WalkInServiceChoice } from "@/components/admin/pos/walk-in/ServiceChoiceStep";

const labels: Record<WalkInServiceChoice, { label: string; icon: string }> = {
  dog_grooming: { label: "Dog Grooming", icon: "🐕" },
  cat_grooming: { label: "Cat Grooming", icon: "🐈" },
  boarding: { label: "Boarding", icon: "🏠" },
  ala_carte: { label: "Ala Carte", icon: "🛍️" },
};

export default function AddAnotherServicePrompt({
  eligibleServices,
  onAddService,
  onDone,
}: {
  eligibleServices: WalkInServiceChoice[];
  onAddService: (choice: WalkInServiceChoice) => void;
  onDone: () => void;
}) {
  return (
    <div className="max-w-md mx-auto text-center py-10">
      <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-600"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
      <h2 className="mt-4 text-xl font-bold text-zinc-800">That service is set up!</h2>

      {eligibleServices.length > 0 ? (
        <>
          <p className="mt-1 text-sm text-zinc-500">Want to add another service to this booking?</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {eligibleServices.map((choice) => (
              <button
                key={choice}
                onClick={() => onAddService(choice)}
                className="rounded-2xl border-2 border-pink-100 bg-white p-4 flex flex-col items-center gap-1.5 hover:border-brand-pink transition-colors"
              >
                <span className="text-2xl">{labels[choice].icon}</span>
                <span className="text-sm font-semibold text-zinc-700">{labels[choice].label}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-1 text-sm text-zinc-500">All your selected pets are covered — ready for the summary.</p>
      )}

      <button
        onClick={onDone}
        className="mt-6 w-full bg-brand-pink hover:bg-brand-pink-dark text-white font-semibold py-2.5 rounded-full transition-colors"
      >
        {eligibleServices.length > 0 ? "No, continue to Summary" : "Continue to Summary"}
      </button>
    </div>
  );
}
