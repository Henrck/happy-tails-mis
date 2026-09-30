-- Add the job title field expected by the staff account creation flow.
-- This is safe to run against an existing database: existing rows receive
-- the default value and the column is only created when it does not exist.

ALTER TABLE public.staff_profiles
  ADD COLUMN IF NOT EXISTS job_title text NOT NULL DEFAULT 'Staff';

COMMENT ON COLUMN public.staff_profiles.job_title IS
  'Display-only staff job title/role label. Does not control permissions.';

-- Tell PostgREST/Supabase to reload its schema cache immediately.
NOTIFY pgrst, 'reload schema';
