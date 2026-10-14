"use client";
import Link from "next/link";
import type { Pet } from "@/lib/types/appointments";
import PetAvatar from "@/components/dashboard/PetAvatar";

export default function DashboardPetCard({ pet }: { pet: Pet }) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-pink-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex min-w-0 items-start gap-4">
        <PetAvatar pet={pet} size="lg" />
        <div className="min-w-0 flex-1 pt-1">
          <h3 className="truncate text-lg font-bold text-slate-800">{pet.name}</h3>
          <p className="mt-1 truncate text-sm text-slate-500">{pet.breed || "Breed not specified"}{pet.size_label ? ` · ${pet.size_label}` : ""}</p>
          {pet.age != null && <p className="mt-1 text-xs text-slate-500">{pet.age} {pet.age === 1 ? "year" : "years"} old</p>}
        </div>
        <span className="text-lg font-semibold text-brand-pink" aria-label={pet.sex ?? "Unknown sex"}>{pet.sex === "Male" ? "♂" : pet.sex === "Female" ? "♀" : ""}</span>
      </div>
      <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
        <Link href={`/account/pets/${pet.id}`} className="flex min-h-10 items-center justify-center rounded-full bg-brand-pink px-2 text-xs font-semibold text-white hover:opacity-90">View Profile</Link>
        <Link href="/account/appointments" className="flex min-h-10 items-center justify-center rounded-full border border-brand-pink px-2 text-center text-xs font-semibold text-brand-pink hover:bg-pink-50">Book Appointment</Link>
      </div>
    </article>
  );
}
