"use client";

import Link from "next/link";
import type { Pet } from "@/lib/types/appointments";
import PetAvatar from "@/components/dashboard/PetAvatar";

/**
 * The same avatar, typography and primary actions used by Customer → My Pets,
 * adapted to preserve the owner information staff need in Pet's Record.
 * The booking action opens the existing POS walk-in workflow; it does not create
 * an appointment, bypass pet/owner verification, or preselect a pet implicitly.
 */
export default function PetCard({
  pet,
  ownerName,
  onView,
}: {
  pet: Pet;
  ownerName: string | null;
  onView: () => void;
}) {
  return (
    <article className="group flex h-full min-w-0 flex-col rounded-[26px] border border-pink-100 bg-white p-5 shadow-[0_5px_22px_rgba(136,28,74,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-pink-200 hover:shadow-[0_12px_30px_rgba(136,28,74,0.12)] sm:p-6">
      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
        <div className="shrink-0 rounded-full bg-[#fdf1f7] p-0.5 ring-1 ring-pink-100">
          <PetAvatar pet={pet} size="lg" />
        </div>

        <div className="min-w-0 flex-1 pt-1">
          <h3 className="truncate text-xl font-extrabold leading-tight tracking-tight text-[#17324d]" title={pet.name}>
            {pet.name}
          </h3>
          <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-slate-500" title={`${pet.breed || "Breed not specified"} · ${pet.size_label || "Size not specified"}`}>
            {pet.breed || "Breed not specified"}
            <span className="mx-1 text-pink-300" aria-hidden="true">·</span>
            {pet.size_label || "Size not specified"}
          </p>
          <p className="mt-1.5 text-xs font-medium text-slate-500">
            {pet.age != null ? `${pet.age} ${pet.age === 1 ? "year" : "years"} old` : "Age not recorded"}
          </p>
        </div>

        <span
          className={`shrink-0 text-2xl font-medium leading-none ${pet.sex === "Male" ? "text-brand-pink" : pet.sex === "Female" ? "text-pink-500" : "text-slate-300"}`}
          aria-label={pet.sex ?? "Sex not recorded"}
          title={pet.sex ?? "Sex not recorded"}
        >
          {pet.sex === "Male" ? "♂" : pet.sex === "Female" ? "♀" : ""}
        </span>
      </div>

      <div className="mt-4 flex min-w-0 items-center gap-2 rounded-xl bg-pink-50/70 px-3 py-2">
        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-pink-500">Owner</span>
        <span className="min-w-0 truncate text-xs font-semibold text-slate-700" title={ownerName || "Owner not recorded"}>
          {ownerName || "Owner not recorded"}
        </span>
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2.5 pt-4">
        <button
          type="button"
          onClick={onView}
          aria-label={`View ${pet.name}'s profile and service history`}
          className="flex min-h-11 min-w-0 items-center justify-center rounded-full bg-brand-pink px-2 py-2.5 text-center text-xs font-bold text-white shadow-sm transition-colors hover:bg-brand-pink-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-pink sm:text-sm"
        >
          View Profile
        </button>
        <Link
          href="/admin/pos/walk-in"
          aria-label={`Start a walk-in appointment for ${pet.name}`}
          title="Opens POS Walk-in Booking; select the pet during verification"
          className="flex min-h-11 min-w-0 items-center justify-center rounded-full border border-brand-pink px-2 py-2.5 text-center text-xs font-bold text-brand-pink transition-colors hover:bg-pink-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-pink sm:text-sm"
        >
          Book Appointment
        </Link>
      </div>
    </article>
  );
}
