import type { Pet } from "@/lib/types/appointments";

const petArtwork: Record<string, string> = {
  "Dog-Male": "/images/pets/dog-male.jpg",
  "Dog-Female": "/images/pets/dog-female.jpg",
  "Cat-Male": "/images/pets/cat-male.jpg",
  "Cat-Female": "/images/pets/cat-female.jpg",
};

const genericArtwork: Record<string, string> = {
  Dog: "/images/pets/pet-dog.jpg",
  Cat: "/images/pets/pet-cat.jpg",
};

function getPetArtwork(pet: Pet) {
  const species = pet.species === "Cat" ? "Cat" : "Dog";
  // Sex is only ever "Male" | "Female" | null on the real type — no
  // guessing needed. When it's genuinely not recorded, fall back to the
  // generic species artwork instead of silently assuming "Male".
  if (pet.sex === "Male" || pet.sex === "Female") {
    return petArtwork[`${species}-${pet.sex}`];
  }
  return genericArtwork[species];
}

function GenderMark({ pet }: { pet: Pet }) {
  const sex = String((pet as Pet & { sex?: string }).sex ?? "").toLowerCase();

  if (sex === "female" || sex === "f") {
    return <span className="text-pink-500 text-[18px] leading-none">♀</span>;
  }

  if (sex === "male" || sex === "m") {
    return <span className="text-sky-500 text-[18px] leading-none">♂</span>;
  }

  return null;
}

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
  const species = pet.species === "Cat" ? "Cat" : "Dog";

  return (
    <article
      className={[
        "overflow-hidden rounded-[18px] bg-white",
        "border shadow-[0_2px_8px_rgba(31,41,55,0.08)]",
        selected
          ? "border-brand-pink ring-1 ring-brand-pink/20"
          : "border-pink-100",
      ].join(" ")}
    >
      {/* Banner is deliberately the same wide aspect ratio as the card.
          object-contain (not object-cover) keeps the whole dog/cat
          artwork visible instead of cropping it — the tinted backdrop
          fills whatever space is left around it. */}
      <div
        className={[
          "relative aspect-[1.78/1] w-full overflow-hidden",
          species === "Cat" ? "bg-pink-100" : "bg-sky-100",
        ].join(" ")}
      >
        <img
          src={getPetArtwork(pet)}
          alt=""
          className="block h-full w-full object-contain object-center"
        />

        <button
          type="button"
          onClick={onToggleSelect}
          aria-label={`${selected ? "Deselect" : "Select"} ${pet.name}`}
          aria-pressed={selected}
          className={[
            "absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full",
            "border border-white shadow-sm transition-all",
            selected
              ? "bg-brand-pink text-white"
              : "bg-white/95 text-transparent hover:bg-white",
          ].join(" ")}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </button>
      </div>

      <div className="px-6 pb-5 pt-4">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-[19px] font-bold leading-6 text-slate-800">
            {pet.name}
          </h3>
          <GenderMark pet={pet} />
        </div>

        <p className="mt-2 text-[16px] leading-5 text-slate-500">
          {pet.breed}
          <span className="mx-2 text-slate-300">•</span>
          {pet.size_label}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={onViewProfile}
            className="flex h-12 items-center justify-center gap-2 rounded-full border-2 border-brand-pink bg-white px-3 text-sm font-semibold text-brand-pink transition-colors hover:bg-brand-pink hover:text-white"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            View Profile
          </button>

          <button
            type="button"
            onClick={onToggleSelect}
            className={[
              "flex h-12 items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold transition-colors",
              selected
                ? "border-2 border-brand-pink bg-brand-pink text-white"
                : "border-2 border-sky-300 bg-white text-sky-600 hover:bg-sky-300 hover:text-white",
            ].join(" ")}
          >
            {selected && (
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            )}
            {selected ? "Selected" : "Select"}
          </button>
        </div>
      </div>
    </article>
  );
}
