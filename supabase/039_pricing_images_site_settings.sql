-- Seed editable pricing-card photos for Website Management.
-- The upload UI updates existing site_settings rows, so these keys must exist.
insert into public.site_settings (key, image_url, image_width, image_height)
values
  ('grooming_basic_image', null, null, null),
  ('grooming_diamond_image', null, null, null),
  ('grooming_premium_image', null, null, null),
  ('boarding_small_kennel_image', null, null, null),
  ('boarding_big_kennel_image', null, null, null)
on conflict (key) do nothing;
