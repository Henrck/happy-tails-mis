// Selection-aware variant of DashboardPetCard for the Pet Information
// step of the booking wizard — same visual (species banner, name,
// breed - size), but with a Select toggle instead of a "Book" link
// (redundant here, already inside the booking flow) and no navigation
// away from the wizard.
import type { Pet } from "@/lib/types/appointments";

const bannerColors: Record<string, string> = {
  Dog: "from-sky-200 to-sky-100",
  Cat: "from-pink-200 to-pink-100",
};

export default function BookingPetCard({
  pet,
  selected,
  onToggleSelect,
  onViewProfile,
}: {
  pet: Pet;
  selected: boolean;
  onToggleSelect: () => void;
  onViewProfile: () => void;
}) {
  return (
    <div className={`bg-white rounded-2xl overflow-hidden shadow-sm border-2 transition-colors ${selected ? "border-brand-pink" : "border-pink-100"}`}>
      <div className={`h-24 relative bg-gradient-to-br ${bannerColors[pet.species] ?? bannerColors.Dog} flex items-center justify-center`}>
        <span className="text-5xl">{pet.species === "Cat" ? "🐈" : "🐕"}</span>
        {selected && (
          <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-brand-pink text-white flex items-center justify-center">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
        )}
      </div>
      <div className="p-4">
        <p className="font-bold text-zinc-800">{pet.name}</p>
        <p className="text-sm text-zinc-500">{pet.breed} - {pet.size_label}</p>

        <div className="mt-3 flex gap-2">
          <button
            onClick={onViewProfile}
            className="flex-1 border-2 border-brand-pink text-brand-pink text-xs font-semibold py-2 rounded-full hover:bg-brand-pink hover:text-white transition-colors"
          >
            View Profile
          </button>
          <button
            onClick={onToggleSelect}
            className={`flex-1 text-xs font-semibold py-2 rounded-full transition-colors ${
              selected ? "bg-brand-pink text-white" : "border-2 border-sky-300 text-sky-600 hover:bg-sky-300 hover:text-white"
            }`}
          >
            {selected ? "Selected" : "Select"}
          </button>
        </div>
      </div>
    </div>
  );
}
