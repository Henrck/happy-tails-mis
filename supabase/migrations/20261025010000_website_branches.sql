-- HappyTails public branch carousel. Run once in Supabase SQL Editor before deploying UI.
-- Does not change existing service, booking, or appointment tables.
BEGIN;
CREATE TABLE IF NOT EXISTS public.website_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 100),
  location text NOT NULL CHECK (char_length(btrim(location)) BETWEEN 2 AND 240),
  facebook_url text NOT NULL CHECK (facebook_url ~* '^https://([a-z0-9-]+\.)*(facebook\.com|fb\.com)/[^[:space:]]+$'),
  image_url text,
  description text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 100,
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS website_branches_visible_order_idx ON public.website_branches (published, sort_order, created_at);
ALTER TABLE public.website_branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS website_branches_public_read ON public.website_branches;
CREATE POLICY website_branches_public_read ON public.website_branches FOR SELECT TO anon, authenticated
  USING (published OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role::text = 'superadmin'));
DROP POLICY IF EXISTS website_branches_admin_insert ON public.website_branches;
CREATE POLICY website_branches_admin_insert ON public.website_branches FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role::text = 'superadmin'));
DROP POLICY IF EXISTS website_branches_admin_update ON public.website_branches;
CREATE POLICY website_branches_admin_update ON public.website_branches FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role::text = 'superadmin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role::text = 'superadmin'));
DROP POLICY IF EXISTS website_branches_admin_delete ON public.website_branches;
CREATE POLICY website_branches_admin_delete ON public.website_branches FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role::text = 'superadmin'));
COMMIT;
