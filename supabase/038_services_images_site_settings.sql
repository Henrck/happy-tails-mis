-- The Website Management upload flow does `update site_settings set ...
-- where key = X` — it does NOT insert. Without a pre-existing row for
-- each new key, clicking "Change" in the new Pet Services photo picker
-- would silently match zero rows and appear to succeed while saving
-- nothing. Seeding these three rows now (image_url left null; the
-- Services component already falls back to its bundled defaults when
-- image_url is null) makes the update path actually work.
insert into public.site_settings (key, image_url, image_width, image_height)
values
  ('services_grooming_image', null, null, null),
  ('services_boarding_image', null, null, null),
  ('services_spa_image', null, null, null)
on conflict (key) do nothing;
