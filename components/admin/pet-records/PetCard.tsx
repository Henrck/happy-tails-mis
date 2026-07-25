import type { Pet, Owner } from "@/lib/data/pet-records-mock";
import SpeciesIcon from "./SpeciesIcon";

export default function PetCard({
  pet,
  owner,
  onView,
}: {
  pet: Pet;
  owner: Owner | undefined;
  onView: () => void;
}) {
  const isFemale = pet.sex === "Female";
  return (
    <div
      className={`rounded-2xl border-2 p-4 ${
        isFemale ? "bg-pink-50 border-pink-200" : "bg-sky-50 border-sky-200"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${isFemale ? "bg-pink-100" : "bg-sky-100"}`}>
          <SpeciesIcon species={pet.species} className={`w-7 h-7 ${isFemale ? "text-pink-400" : "text-sky-400"}`} />
        </div>
        <div>
          <p className="font-bold text-zinc-800">{pet.name}</p>
          <p className="text-xs text-zinc-500">{pet.breed}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className={`rounded-lg px-3 py-1.5 text-xs ${isFemale ? "bg-pink-100" : "bg-sky-100"}`}>
          <span className="text-zinc-500">Age</span>
          <p className="font-semibold text-zinc-700">{pet.age} yrs</p>
        </div>
        <div className={`rounded-lg px-3 py-1.5 text-xs ${isFemale ? "bg-pink-100" : "bg-sky-100"}`}>
          <span className="text-zinc-500">Sex</span>
          <p className="font-semibold text-zinc-700">{pet.sex}</p>
        </div>
      </div>

      <div className="mt-2">
        <p className="text-xs text-zinc-500">Owner Name</p>
        <div className={`mt-0.5 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-700 truncate ${isFemale ? "bg-pink-100" : "bg-sky-100"}`}>
          {owner?.name ?? "Unknown"}
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
