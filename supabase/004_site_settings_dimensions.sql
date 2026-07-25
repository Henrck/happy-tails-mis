-- Run this in Supabase SQL Editor after 002_site_settings.sql.
-- Adds width/height columns so uploaded banner images can still use the
-- "no crop" intrinsic-size technique (see PhotoBanner.tsx) even though
-- we no longer know the dimensions ahead of time like we did with the
-- bundled default images.
alter table public.site_settings add column if not exists image_width integer;
alter table public.site_settings add column if not exists image_height integer;
