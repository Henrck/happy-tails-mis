// "Editing" side panel — shows which pets are in the leg currently
// being set up (Selection/Schedule steps), each removable. Matches the
// uploaded reference image's pet-chip style. Removing a pet here drops
// it from THIS leg entirely (not moved to a later leg) — an explicit,
// deliberate choice: the customer said "not now" for that pet, not
// "handle it some other way."
import type { Pet } from "@/lib/types/appointments";

export default function CurrentLegSidebar({
  pets,
  onRemove,
}: {
  pets: Pet[];
  onRemove: (petId: string) => void;
}) {
  if (pets.length === 0) return null;

  return (
    <div className="w-full lg:w-56 shrink-0 bg-white rounded-2xl border border-pink-100 p-4">
      <h3 className="font-bold text-brand-pink">Editing</h3>
      <div className="mt-3 space-y-2">
        {pets.map((pet) => (
          <div key={pet.id} className="flex items-center gap-2 bg-brand-tint rounded-full pl-1 pr-2 py-1">
            <span className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-lg shrink-0">
              {pet.species === "Cat" ? "🐈" : "🐕"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-800 truncate">{pet.name}</p>
              <p className="text-xs text-zinc-500 truncate">{pet.breed}</p>
            </div>
            {pets.length > 1 && (
              <button
                onClick={() => onRemove(pet.id)}
                aria-label={`Remove ${pet.name} from this service`}
                className="w-5 h-5 rounded-full bg-red-100 text-red-500 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center shrink-0"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
