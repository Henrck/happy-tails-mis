import type { Species, Sex } from "@/lib/types/appointments";
import type { SiteSetting, SiteSettingKey } from "@/lib/supabase/site-settings";

// Reuse existing rows so no SQL migration or new Storage bucket is required.
export const PET_AVATAR_KEYS: SiteSettingKey[] = ["pet_avatar_dog_male", "pet_avatar_cat_male"];
const fallback = { Dog: "/images/pets/pet-dog.jpg", Cat: "/images/pets/pet-cat.jpg" };
export function resolvePetAvatar(settings: SiteSetting[], species: Species, _sex?: Sex | null): string {
  const kind = species === "Cat" ? "Cat" : "Dog";
  const key = kind === "Dog" ? "pet_avatar_dog_male" : "pet_avatar_cat_male";
  return settings.find((setting) => setting.key === key)?.image_url || fallback[kind];
}
