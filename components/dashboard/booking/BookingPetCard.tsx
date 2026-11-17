"use client";
import type { Pet } from "@/lib/types/appointments";
import PetAvatar from "@/components/dashboard/PetAvatar";
import { formatPetId } from "@/lib/utils/pet-id";
import { House } from "lucide-react";
import { boardingUntilLabel, type ActiveBoarding } from "@/lib/supabase/active-boarding";

export default function BookingPetCard({ pet, selected, onToggleSelect, onViewProfile, boardingBooked }: {
  pet: Pet; selected: boolean; onToggleSelect: () => void; onViewProfile: () => void;
  /** Set when the pet already has an unfinished boarding booking. */
  boardingBooked?: ActiveBoarding;
}) {
  const until = boardingBooked ? boardingUntilLabel(boardingBooked) : null;
  return (
    <article className={`flex h-full flex-col rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md ${selected ? "border-brand-pink ring-2 ring-brand-pink/20" : "border-pink-100"}`}>
      <div className="flex items-start gap-4">
        <PetAvatar pet={pet} size="lg" />
        <div className="min-w-0 flex-1 pt-1">
          <h3 className="truncate text-lg font-bold text-slate-800">{pet.name}</h3>
          {formatPetId(pet.pet_number) && <p className="text-[11px] font-bold tracking-wide text-brand-pink">{formatPetId(pet.pet_number)}</p>}
          <p className="mt-1 truncate text-sm text-slate-500">{pet.breed || "Breed not specified"}{pet.size_label ? ` · ${pet.size_label}` : ""}</p>
          {pet.age != null && <p className="mt-1 text-xs text-slate-500">{pet.age} {pet.age === 1 ? "year" : "years"} old</p>}
          {boardingBooked && <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200">
            <House size={12} aria-hidden="true"/> Boarding booked{until ? ` · until ${until}` : ""}
          </p>}
        </div>
        <button type="button" onClick={onToggleSelect} aria-label={`${selected ? "Deselect" : "Select"} ${pet.name}`} aria-pressed={selected} className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${selected ? "border-brand-pink bg-brand-pink text-white" : "border-zinc-200 bg-white"}`}>
          {selected && <span aria-hidden="true">✓</span>}
        </button>
      </div>
      <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
        <button type="button" onClick={onViewProfile} className="min-h-10 rounded-full border border-brand-pink px-2 text-xs font-semibold text-brand-pink hover:bg-pink-50">View Profile</button>
        <button type="button" onClick={onToggleSelect} aria-pressed={selected} className={`min-h-10 rounded-full px-2 text-xs font-semibold ${selected ? "bg-brand-pink text-white" : "border border-brand-pink bg-white text-brand-pink hover:bg-pink-50"}`}>{selected ? "Selected" : "Select"}</button>
      </div>
    </article>
  );
}
