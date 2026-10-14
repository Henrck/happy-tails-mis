"use client";
import { usePetAvatarSettings } from "@/lib/hooks/usePetAvatarSettings";
import { resolvePetAvatar } from "@/lib/utils/pet-avatar";
import type { Pet } from "@/lib/types/appointments";

export default function PetAvatar({ pet, size = "md" }: { pet: Pet; size?: "md" | "lg" }) {
  const settings = usePetAvatarSettings();
  const image = resolvePetAvatar(settings, pet.species, pet.sex);
  return (
    <div className={`${size === "lg" ? "h-20 w-20" : "h-16 w-16"} shrink-0 overflow-hidden rounded-full border border-pink-100 bg-pink-50 shadow-sm`}>
      <img src={image} alt={`${pet.species} avatar`} className="h-full w-full object-cover object-center" />
    </div>
  );
}
