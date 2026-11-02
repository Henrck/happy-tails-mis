-- TEMPORARY: Delete only packages with no appointment references.
-- Does not cascade through appointment or financial history.
BEGIN;
CREATE OR REPLACE FUNCTION public.happytails_delete_unused_package_v1(p_package_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role text;
  v_package public.packages%ROWTYPE;
BEGIN
  SELECT p.role::text INTO v_role FROM public.profiles p WHERE p.id = auth.uid();
  IF v_role IS NULL OR v_role NOT IN ('admin', 'superadmin') THEN
    RAISE EXCEPTION 'Only administrators may delete unused packages.' USING ERRCODE = '42501';
  END IF;
  IF p_package_id IS NULL THEN RAISE EXCEPTION 'Choose a package to delete.'; END IF;
  SELECT * INTO v_package FROM public.packages WHERE id = p_package_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Package not found. Refresh Service Management.'; END IF;

  -- Verify direct package references and rate references, including historical appointments.
  IF EXISTS (SELECT 1 FROM public.appointment_pets ap WHERE ap.package_id = p_package_id)
     OR EXISTS (SELECT 1 FROM public.appointment_pets ap
                INNER JOIN public.package_pricing pp ON pp.id = ap.package_pricing_id
                WHERE pp.package_id = p_package_id) THEN
    RAISE EXCEPTION 'Cannot delete: this package has appointment history or reservations. Archive it instead.';
  END IF;

  -- Remove only child rows owned by this otherwise unused package.
  -- Other FK dependencies intentionally fail the transaction rather than being cascaded.
  IF to_regclass('public.grooming_package_durations') IS NOT NULL THEN
    DELETE FROM public.grooming_package_durations WHERE package_id = p_package_id;
  END IF;
  DELETE FROM public.package_inclusions WHERE package_id = p_package_id;
  DELETE FROM public.package_pricing WHERE package_id = p_package_id;
  DELETE FROM public.packages WHERE id = p_package_id;
EXCEPTION
  WHEN foreign_key_violation THEN
    RAISE EXCEPTION 'Cannot delete: this package is referenced elsewhere. Archive it instead.';
END;
$$;
REVOKE ALL ON FUNCTION public.happytails_delete_unused_package_v1(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.happytails_delete_unused_package_v1(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.happytails_delete_unused_package_v1(uuid) TO authenticated;
COMMIT;
