export type SiteSettingKey =
  | "site_logo"
  | "services_grooming_image"
  | "services_boarding_image"
  | "services_spa_image"
  | "grooming_banner_background"
  | "boarding_banner_background"
  | "spa_banner_background"
  | "about_us_background"
  | "grooming_basic_image"
  | "grooming_diamond_image"
  | "grooming_premium_image"
  | "boarding_small_kennel_image"
  | "boarding_big_kennel_image"
  | "pet_avatar_dog_male"
  | "pet_avatar_dog_female"
  | "pet_avatar_cat_male"
  | "pet_avatar_cat_female";

export type SiteSetting = {
  key: SiteSettingKey;
  image_url: string | null;
  image_width: number | null;
  image_height: number | null;
  updated_at: string;
};

export const SITE_SETTING_LABELS: Record<SiteSettingKey, string> = {
  site_logo: "Site Logo",
  services_grooming_image: "Pet Services — Grooming Photo",
  services_boarding_image: "Pet Services — Boarding Photo",
  services_spa_image: "Pet Services — Spa Photo",
  grooming_banner_background: "Grooming Services Banner",
  boarding_banner_background: "Boarding Services Banner",
  spa_banner_background: "Pet Spa Banner",
  about_us_background: "About Us Background",
  grooming_basic_image: "Grooming — Basic Photo",
  grooming_diamond_image: "Grooming — Diamond Photo",
  grooming_premium_image: "Grooming — Premium Photo",
  boarding_small_kennel_image: "Boarding — Small Kennel Photo",
  boarding_big_kennel_image: "Boarding — Big Kennel Photo",
  pet_avatar_dog_male: "Pet Avatar — Dog (Male)",
  pet_avatar_dog_female: "Pet Avatar — Dog (Female)",
  pet_avatar_cat_male: "Pet Avatar — Cat (Male)",
  pet_avatar_cat_female: "Pet Avatar — Cat (Female)",
};
