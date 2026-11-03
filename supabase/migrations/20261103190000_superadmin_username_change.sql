-- HappyTails: Self-service Super Admin username change.
-- Run in Supabase SQL Editor after backing up, before deploying the UI patch.
-- Both username columns are updated in one transaction to preserve username login.
CREATE OR REPLACE FUNCTION public.happytails_change_superadmin_username(p_username text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_username text := btrim(p_username);
  v_existing text;
BEGIN
  IF v_actor IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.staff_profiles s ON s.id = p.id
    WHERE p.id = v_actor AND p.role::text = 'superadmin' AND s.status::text = 'active'
  ) THEN
    RAISE EXCEPTION 'Only an active Super Admin can change their username.' USING ERRCODE = '42501';
  END IF;

  IF v_username IS NULL OR char_length(v_username) NOT BETWEEN 3 AND 20
     OR v_username !~ '^[A-Za-z0-9_.]+$' THEN
    RAISE EXCEPTION 'Username must contain 3 to 20 letters, numbers, periods or underscores.' USING ERRCODE = '22023';
  END IF;

  -- Serializes simultaneous calls to this function. Do not use the client to
  -- mutate either username column directly; all changes go through this RPC.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('happytails-username-change'));

  SELECT s.username INTO v_existing FROM public.staff_profiles s WHERE s.id = v_actor FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Staff record not found.'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.staff_profiles s WHERE s.id <> v_actor AND lower(s.username) = lower(v_username)
  ) OR EXISTS (
    SELECT 1 FROM public.customers c WHERE c.id <> v_actor AND lower(c.username) = lower(v_username)
  ) OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id <> v_actor AND lower(p.username) = lower(v_username)
  ) THEN
    RAISE EXCEPTION 'This username is already in use. Choose another.' USING ERRCODE = '23505';
  END IF;

  IF v_existing IS DISTINCT FROM v_username THEN
    UPDATE public.staff_profiles SET username = v_username WHERE id = v_actor;
  END IF;
  UPDATE public.profiles SET username = v_username WHERE id = v_actor AND username IS DISTINCT FROM v_username;

  RETURN v_username;
END;
$$;
REVOKE ALL ON FUNCTION public.happytails_change_superadmin_username(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.happytails_change_superadmin_username(text) TO authenticated;
