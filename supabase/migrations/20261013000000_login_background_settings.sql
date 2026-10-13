-- HappyTails login artwork: two independently editable image settings.
-- Apply to the same Supabase project used by your Next.js website.
-- This deliberately does NOT modify authentication, credentials or RLS policies.
-- Existing site_settings permissions must allow the authorized superadmin to
-- update these records, just like the existing website-management images.
BEGIN;

DO $$
BEGIN
  IF to_regclass('public.site_settings') IS NULL THEN
    RAISE EXCEPTION 'HappyTails site_settings table not found';
  END IF;
END
$$;

INSERT INTO public.site_settings (key, image_url, image_width, image_height, updated_at)
VALUES
  ('login_background_desktop', NULL, NULL, NULL, now()),
  ('login_background_mobile', NULL, NULL, NULL, now())
ON CONFLICT (key) DO NOTHING;

COMMIT;
