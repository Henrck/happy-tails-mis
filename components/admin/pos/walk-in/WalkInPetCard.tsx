"use client";
// One pet card in the existing-customer pet grid — shows name/breed/
// size, selectable (multi-select, matches the reference design's pet
// dashboard cards), with a "View Profile" link to see full details
// without leaving the selection screen.
import type { Pet } from "@/lib/types/appointments";

export default function WalkInPetCard({
  pet,
  selected,
  onToggle,
  onViewProfile,
}: {
  pet: Pet;
  selected: boolean;
  onToggle: () => void;
  onViewProfile: () => void;
}) {
  return (
    <div
      onClick={onToggle}
      className={`cursor-pointer rounded-2xl border-2 p-4 transition-colors ${
        selected ? "border-brand-pink bg-brand-tint" : "border-pink-100 bg-white hover:border-pink-200"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="w-12 h-12 rounded-full bg-white border border-pink-100 flex items-center justify-center text-2xl">
          {pet.species === "Cat" ? "🐈" : "🐕"}
        </div>
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected ? "bg-brand-pink border-brand-pink" : "border-zinc-300"}`}>
          {selected && (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </div>
      <p className="mt-3 font-bold text-zinc-800">{pet.name}</p>
      <p className="text-xs text-zinc-500">{pet.breed} · {pet.size_label}</p>
      <button
        onClick={(e) => { e.stopPropagation(); onViewProfile(); }}
        className="mt-2 text-xs font-semibold text-brand-pink hover:underline"
      >
        View Profile
      </button>
    </div>
  );
}
