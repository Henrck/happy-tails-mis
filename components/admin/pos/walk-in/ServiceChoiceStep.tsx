"use client";
// Second step: which service. CORRECTED from the first build — Ala
// Carte is its own real, separate add-on category in Service Management
// (fetchAddonsByCategory("Ala Carte")), confirmed to need no Dog/Cat/
// Boarding sub-choice. So it's a genuine 4th sibling tile here, not a
// toggle underneath Grooming/Boarding — selecting it skips straight to
// a flat add-ons list in the Selection step, no package/size/groomer
// involved at all.
//
// Optional species-based filtering: when petSpecies is provided (the
// customer booking flow, where Pet Information now comes BEFORE this
// step), a species-specific service shows if AT LEAST ONE selected pet
// matches it — Dog Grooming shows if any dog is selected, Cat Grooming
// shows if any cat is selected, and BOTH can show together for a mixed
// selection. This is deliberately different from an earlier version
// that hid grooming entirely on a mixed selection — the real
// requirement is customers can multi-select pets across species and
// set up each species' grooming as its own step (see BookingLeg),
// not "only show what applies to everyone." Boarding and Ala Carte are
// species-agnostic and always show. The walk-in flow doesn't pass this
// prop at all — pets are chosen AFTER service there, so this behaves
// exactly as before for that caller.
import type { ServiceType } from "@/lib/types/services";
import type { Species } from "@/lib/types/appointments";

export type WalkInServiceChoice = ServiceType | "ala_carte";

const services: { type: WalkInServiceChoice; label: string; icon: string; requiresSpecies?: Species }[] = [
  { type: "dog_grooming", label: "Dog Grooming", icon: "🐕", requiresSpecies: "Dog" },
  { type: "cat_grooming", label: "Cat Grooming", icon: "🐈", requiresSpecies: "Cat" },
  { type: "boarding", label: "Boarding", icon: "🏠" },
  { type: "ala_carte", label: "Ala Carte", icon: "🛍️" },
];

export default function ServiceChoiceStep({
  choice,
  onChange,
  onBack,
  onNext,
  petSpecies,
}: {
  choice: WalkInServiceChoice | null;
  onChange: (choice: WalkInServiceChoice) => void;
  onBack: () => void;
  onNext: () => void;
  petSpecies?: Species[];
}) {
  const uniqueSpecies = petSpecies ? Array.from(new Set(petSpecies)) : null;
  const visibleServices = services.filter((s) => {
    if (!s.requiresSpecies || !uniqueSpecies) return true;
    // Shows if ANY selected pet is this service's species — not "only
    // if every pet is," which is what made mixed selections hide both
    // grooming options before. A dog+cat selection now correctly shows
    // both Dog Grooming and Cat Grooming as separate choices.
    return uniqueSpecies.includes(s.requiresSpecies);
  });
  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-brand-pink text-center">Select Service</h2>
      <p className="mt-1 text-sm text-zinc-500 text-center">What does the customer need today?</p>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {visibleServices.map((s) => (
          <button
            key={s.type}
            onClick={() => onChange(s.type)}
            className={`rounded-2xl border-2 p-5 flex flex-col items-center gap-2 transition-colors ${
              choice === s.type ? "border-brand-pink bg-brand-tint" : "border-pink-100 bg-white hover:border-pink-200"
            }`}
          >
            <span className="text-3xl">{s.icon}</span>
            <span className="font-bold text-zinc-800 text-sm text-center">{s.label}</span>
          </button>
        ))}
      </div>

      {choice === "ala_carte" && (
        <p className="mt-4 text-xs text-zinc-400 text-center">Ala Carte skips packages — the customer picks individual add-on services directly.</p>
      )}

      <div className="mt-8 flex gap-3">
        <button onClick={onBack} className="flex-1 border-2 border-zinc-300 text-zinc-500 font-semibold py-2.5 rounded-full hover:border-zinc-400 transition-colors">
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!choice}
          className="flex-1 bg-brand-pink hover:bg-brand-pink-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-full transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}
