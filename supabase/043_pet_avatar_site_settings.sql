-- Pet avatar defaults for "My Pets" and the booking wizard's pet cards.
-- Same reasoning as 038_services_images_site_settings.sql: the upload
-- flow does `update site_settings set ... where key = X`, which
-- silently matches zero rows if the row doesn't exist yet. image_url
-- is left null — the shared resolver in lib/utils/pet-avatar.ts already
-- falls back to the bundled /images/pets/*.jpg defaults when null.
insert into public.site_settings (key, image_url, image_width, image_height)
values
  ('pet_avatar_dog_male', null, null, null),
  ('pet_avatar_dog_female', null, null, null),
  ('pet_avatar_cat_male', null, null, null),
  ('pet_avatar_cat_female', null, null, null)
on conflict (key) do nothing;
