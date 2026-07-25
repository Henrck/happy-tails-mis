// Shared types + helpers for site_settings — the table that holds the
// CURRENT image URL for each editable background across the site.
export type SiteSettingKey =
  | "hero_background"
  | "grooming_banner_background"
  | "boarding_banner_background"
  | "spa_banner_background"
  | "about_us_background";

export type SiteSetting = {
  key: SiteSettingKey;
  image_url: string | null;
  image_width: number | null;
  image_height: number | null;
  updated_at: string;
};

export const SITE_SETTING_LABELS: Record<SiteSettingKey, string> = {
  hero_background: "Homepage Hero",
  grooming_banner_background: "Grooming Services Banner",
  boarding_banner_background: "Boarding Services Banner",
  spa_banner_background: "Pet Spa Banner",
  about_us_background: "About Us Background",
};
