"use client";
import Link from "next/link";
import type { Pet } from "@/lib/types/appointments";
import { usePetAvatarSettings } from "@/lib/hooks/usePetAvatarSettings";
import { resolvePetAvatar } from "@/lib/utils/pet-avatar";

export default function DashboardPetCard({ pet }: { pet: Pet }) {
  const settings = usePetAvatarSettings();
  const avatar = resolvePetAvatar(settings, pet.species, pet.sex);
  return (
    <article className="flex h-full flex-col justify-between rounded-2xl border border-pink-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex min-w-0 items-center gap-4">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full bg-pink-50 ring-1 ring-pink-100 sm:h-20 sm:w-20 lg:h-24 lg:w-24">
          <img src={avatar} alt={`${pet.species} avatar for ${pet.name}`} className="h-full w-full object-cover object-center" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate text-lg font-bold text-slate-800">{pet.name}</h3>
            {pet.sex && <span className="shrink-0 text-base font-semibold text-brand-pink" title={pet.sex} aria-label={pet.sex}>{pet.sex === "Male" ? "♂" : "♀"}</span>}
          </div>
          <p className="mt-1 truncate text-sm text-slate-500">{pet.breed || pet.species}{pet.size_label ? ` · ${pet.size_label}` : ""}</p>
          <p className="mt-2 text-xs text-slate-500">{pet.age == null ? "Age not specified" : `${pet.age} ${pet.age === 1 ? "year" : "years"} old`}</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <Link href={`/account/pets/${pet.id}`} className="flex min-h-10 items-center justify-center rounded-full bg-brand-pink px-2 py-2 text-center text-xs font-semibold text-white transition-colors hover:bg-brand-pink-dark sm:text-sm">View Profile</Link>
        <Link href="/account/appointments" className="flex min-h-10 items-center justify-center rounded-full border border-brand-pink px-2 py-2 text-center text-xs font-semibold text-brand-pink transition-colors hover:bg-pink-50 sm:text-sm">Book Appointment</Link>
      </div>
    </article>
  );
}
