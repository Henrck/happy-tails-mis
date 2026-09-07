import type { Pet } from "@/lib/types/appointments";
import SpeciesIcon from "./SpeciesIcon";

// ownerName is passed in directly rather than resolved here — on the
// Registered Owners tab it comes from the matched Customer, on the
// Walk-in Only tab it comes straight from the pet's own owner_name.
// Keeping that resolution at the page level means this card doesn't
// need to know which tab it's rendering in.
export default function PetCard({
  pet,
  ownerName,
  onView,
}: {
  pet: Pet;
  ownerName: string | null;
  onView: () => void;
}) {
  const isFemale = pet.sex === "Female";
  const tint = pet.sex === null ? "bg-zinc-50 border-zinc-200" : isFemale ? "bg-pink-50 border-pink-200" : "bg-sky-50 border-sky-200";
  const chip = pet.sex === null ? "bg-zinc-100" : isFemale ? "bg-pink-100" : "bg-sky-100";
  const iconColor = pet.sex === null ? "text-zinc-400" : isFemale ? "text-pink-400" : "text-sky-400";

  return (
    <div className={`rounded-2xl border-2 p-4 ${tint}`}>
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${chip}`}>
          <SpeciesIcon species={pet.species} className={`w-7 h-7 ${iconColor}`} />
        </div>
        <div>
          <p className="font-bold text-zinc-800">{pet.name}</p>
          <p className="text-xs text-zinc-500">{pet.breed}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className={`rounded-lg px-3 py-1.5 text-xs ${chip}`}>
          <span className="text-zinc-500">Age</span>
          <p className="font-semibold text-zinc-700">{pet.age != null ? `${pet.age} yrs` : "—"}</p>
        </div>
        <div className={`rounded-lg px-3 py-1.5 text-xs ${chip}`}>
          <span className="text-zinc-500">Sex</span>
          <p className="font-semibold text-zinc-700">{pet.sex ?? "—"}</p>
        </div>
      </div>

      <div className="mt-2">
        <p className="text-xs text-zinc-500">Owner Name</p>
        <div className={`mt-0.5 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-700 truncate ${chip}`}>
          {ownerName ?? "Unknown"}
        </div>
      </div>

      <button
        onClick={onView}
        className="mt-3 text-xs font-semibold border border-brand-pink text-brand-pink px-5 py-1.5 rounded-full hover:bg-brand-pink hover:text-white transition-colors"
      >
        View
      </button>
    </div>
  );
}
