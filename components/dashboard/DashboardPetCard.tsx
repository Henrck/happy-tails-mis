"use client";

import Link from "next/link";
import type { Pet } from "@/lib/types/appointments";
import { usePetAvatarSettings } from "@/lib/hooks/usePetAvatarSettings";
import { resolvePetAvatar } from "@/lib/utils/pet-avatar";

export default function DashboardPetCard({ pet }: { pet: Pet }) {
  const avatarSettings = usePetAvatarSettings();
  const artwork = resolvePetAvatar(avatarSettings, pet.species, pet.sex);
  const isCat = pet.species === "Cat";

  return (
    <article className="overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Species-specific artwork: dog cards always use the dog image,
          cat cards always use the cat image. */}
      <div
        className={[
          "relative h-[102px] w-full overflow-hidden sm:h-[112px]",
          isCat ? "bg-pink-100" : "bg-sky-100",
        ].join(" ")}
      >
        <img
          src={artwork}
          alt=""
          aria-hidden="true"
          className="h-full w-full object-contain object-center"
        />
      </div>

      <div className="p-4 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-zinc-800">
              {pet.name}
            </h3>
            <p className="mt-0.5 truncate text-sm text-zinc-500">
              {pet.breed || "Breed not specified"}{" "}
              {pet.size_label ? `- ${pet.size_label}` : ""}
            </p>
          </div>

          <span
            className={[
              "shrink-0 text-base font-bold",
              isCat ? "text-pink-500" : "text-sky-500",
            ].join(" ")}
            title={pet.sex ? String(pet.sex) : undefined}
            aria-label={pet.sex ? String(pet.sex) : undefined}
          >
            {pet.sex === "Male" ? "♂" : pet.sex === "Female" ? "♀" : ""}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link
            href="/account/appointments"
            className="flex min-h-10 items-center justify-center gap-1.5 rounded-full border-2 border-brand-pink px-3 py-2 text-xs font-semibold text-brand-pink transition-colors hover:bg-brand-pink hover:text-white"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 5h16v16H4zM4 9h16M8 3v4M16 3v4" />
            </svg>
            Book
          </Link>

          <Link
            href={`/account/pets/${pet.id}`}
            className="flex min-h-10 items-center justify-center rounded-full bg-brand-pink px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-pink-dark"
          >
            View Profile
          </Link>
        </div>
      </div>
    </article>
  );
}
