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
    <div className="order-1 w-full shrink-0 rounded-2xl border border-pink-100 bg-white p-3 sm:p-4 lg:order-2 lg:w-56">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-brand-pink">Editing</h3>
        <span className="text-xs text-zinc-400">
          {pets.length} {pets.length === 1 ? "pet" : "pets"}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
        {pets.map((pet) => (
          <div
            key={pet.id}
            className="flex min-w-0 items-center gap-2 rounded-full bg-brand-tint pl-1 pr-2 py-1"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-lg">
              {pet.species === "Cat" ? "🐈" : "🐕"}
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-zinc-800">{pet.name}</p>
              <p className="truncate text-xs text-zinc-500">{pet.breed}</p>
            </div>

            {pets.length > 1 && (
              <button
                type="button"
                onClick={() => onRemove(pet.id)}
                aria-label={`Remove ${pet.name} from this service`}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-500 transition-colors hover:bg-red-500 hover:text-white"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
