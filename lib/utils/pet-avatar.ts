import type { Species, Sex } from "@/lib/types/appointments";
import type { SiteSetting, SiteSettingKey } from "@/lib/supabase/site-settings";

// Reuse two existing database setting keys; no schema migration is needed.
// The previous gender-specific records are not deleted.
export const PET_AVATAR_KEYS: SiteSettingKey[] = ["pet_avatar_dog_male", "pet_avatar_cat_male"];

export function resolvePetAvatar(settings: SiteSetting[], species: Species, _sex?: Sex | null): string {
  const isCat = species === "Cat";
  const key: SiteSettingKey = isCat ? "pet_avatar_cat_male" : "pet_avatar_dog_male";
  const configured = settings.find((setting) => setting.key === key)?.image_url;
  return configured || (isCat ? "/images/pets/pet-cat.jpg" : "/images/pets/pet-dog.jpg");
}
