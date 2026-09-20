// Resolves the right default pet avatar image for a pet, based on
// species + sex. This used to be two separate hardcoded maps living
// independently in DashboardPetCard.tsx (species only) and
// BookingPetCard.tsx (species+sex, pointing at a different image
// folder) — consolidated here as one source of truth, now backed by
// admin-configurable site_settings rows (see the Pet Avatars
// Configuration screen in Service Management) instead of being baked
// into each component.
import type { Species, Sex } from "@/lib/types/appointments";
import type { SiteSetting, SiteSettingKey } from "@/lib/supabase/site-settings";

// Bundled fallback images — used until an admin uploads a replacement,
// and as a safety net if a settings row is somehow missing.
const DEFAULT_AVATARS: Record<"Dog-Male" | "Dog-Female" | "Cat-Male" | "Cat-Female", string> = {
  "Dog-Male": "/images/pets/dog-male.jpg",
  "Dog-Female": "/images/pets/dog-female.jpg",
  "Cat-Male": "/images/pets/cat-male.jpg",
  "Cat-Female": "/images/pets/cat-female.jpg",
};

// Species-only fallback for when sex isn't set on the pet (it's an
// optional field at registration) — deliberately not guessing "Male".
const GENERIC_AVATARS: Record<"Dog" | "Cat", string> = {
  Dog: "/images/pets/pet-dog.jpg",
  Cat: "/images/pets/pet-cat.jpg",
};

const KEY_BY_CATEGORY: Record<"Dog-Male" | "Dog-Female" | "Cat-Male" | "Cat-Female", SiteSettingKey> = {
  "Dog-Male": "pet_avatar_dog_male",
  "Dog-Female": "pet_avatar_dog_female",
  "Cat-Male": "pet_avatar_cat_male",
  "Cat-Female": "pet_avatar_cat_female",
};

export const PET_AVATAR_KEYS: SiteSettingKey[] = Object.values(KEY_BY_CATEGORY);

export function resolvePetAvatar(settings: SiteSetting[], species: Species, sex: Sex | null): string {
  const normalizedSpecies: "Dog" | "Cat" = species === "Cat" ? "Cat" : "Dog";

  if (sex === "Male" || sex === "Female") {
    const category = `${normalizedSpecies}-${sex}` as keyof typeof KEY_BY_CATEGORY;
    const key = KEY_BY_CATEGORY[category];
    const configured = settings.find((s) => s.key === key)?.image_url;
    return configured || DEFAULT_AVATARS[category];
  }

  return GENERIC_AVATARS[normalizedSpecies];
}
