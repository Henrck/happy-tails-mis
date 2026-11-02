-- HappyTails: Keep historical package/rate IDs immutable while allowing staff
-- to save updated pricing through the normal Edit Package workflow.
-- This is additive; it intentionally does not replace the existing v2 RPC.
BEGIN;

CREATE OR REPLACE FUNCTION public.happytails_fork_service_package_v1(
  p_package_id uuid,
  p_name text,
  p_inclusions jsonb,
  p_rates jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role text;
  v_old public.packages%ROWTYPE;
  v_new_id uuid;
  v_rate jsonb;
  v_label text;
  v_size_id uuid;
  v_price numeric;
  v_per_night boolean;
  v_nights integer;
  v_seen text[] := ARRAY[]::text[];
  v_per_night_count integer := 0;
  v_inclusion text;
  v_ord bigint;
BEGIN
  SELECT p.role::text INTO v_role
  FROM public.profiles p WHERE p.id = auth.uid();
  IF v_role NOT IN ('admin','superadmin') OR v_role IS NULL THEN
    RAISE EXCEPTION 'Only authorized administrators may change service pricing'
      USING ERRCODE = '42501';
  END IF;

  IF p_package_id IS NULL THEN
    RAISE EXCEPTION 'Choose an existing package before updating its rate';
  END IF;

  -- Serializes two simultaneous edits to the same package.
  SELECT * INTO v_old
  FROM public.packages WHERE id = p_package_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Package no longer exists. Refresh Service Management.'; END IF;
  IF NOT v_old.is_active THEN
    RAISE EXCEPTION 'This package has already been archived or replaced. Refresh Service Management.';
  END IF;

  -- This RPC is only for packages protected by booking history. Unreferenced
  -- packages should continue through the existing v2 editor unchanged.
  IF NOT EXISTS (
    SELECT 1 FROM public.appointment_pets ap
    WHERE ap.package_id = p_package_id OR ap.package_pricing_id IN (
      SELECT pp.id FROM public.package_pricing pp WHERE pp.package_id = p_package_id
    )
  ) THEN
    RAISE EXCEPTION 'This package is not history-protected. Refresh and retry the standard edit.';
  END IF;

  IF p_name IS NULL OR length(btrim(p_name)) = 0 OR length(btrim(p_name)) > 160 THEN
    RAISE EXCEPTION 'Enter a valid package name (up to 160 characters).';
  END IF;
  IF jsonb_typeof(p_rates) IS DISTINCT FROM 'array' OR jsonb_array_length(p_rates) < 1 THEN
    RAISE EXCEPTION 'A package must have at least one valid price.';
  END IF;
  IF jsonb_typeof(p_inclusions) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Invalid inclusion list.';
  END IF;

  -- Validate the complete replacement price list BEFORE archiving the old one.
  FOR v_rate IN SELECT value FROM pg_catalog.jsonb_array_elements(p_rates) LOOP
    IF pg_catalog.jsonb_typeof(v_rate) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'Invalid rate information.';
    END IF;
    v_label := btrim(COALESCE(v_rate->>'size_label',''));
    IF v_label = '' THEN RAISE EXCEPTION 'Every price needs a size or duration label.'; END IF;
    v_price := (v_rate->>'price')::numeric;
    IF v_price IS NULL OR v_price < 0 OR v_price > 99999999 THEN
      RAISE EXCEPTION 'Enter a valid nonnegative price.';
    END IF;
    v_per_night := COALESCE((v_rate->>'is_per_night')::boolean,false);
    v_size_id := NULLIF(v_rate->>'size_id','')::uuid;
    v_nights := NULLIF(v_rate->>'nights','')::integer;

    IF pg_catalog.lower(v_label) = ANY(v_seen) THEN
      RAISE EXCEPTION 'Each package rate must have a unique size or duration.';
    END IF;
    v_seen := pg_catalog.array_append(v_seen, pg_catalog.lower(v_label));

    IF v_old.service_type::text = 'boarding' THEN
      IF v_size_id IS NOT NULL THEN RAISE EXCEPTION 'Boarding rates must use duration tiers.'; END IF;
      IF v_per_night THEN
        v_per_night_count := v_per_night_count + 1;
        IF v_nights IS NOT NULL THEN RAISE EXCEPTION 'Per-night rate cannot specify fixed nights.'; END IF;
      ELSIF v_nights IS NULL OR v_nights < 1 THEN
        RAISE EXCEPTION 'Fixed boarding rates require a valid night count.';
      END IF;
    ELSE
      IF v_per_night OR v_nights IS NOT NULL THEN RAISE EXCEPTION 'Grooming pricing must use pet-size rates.'; END IF;
      IF v_size_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.pet_sizes s
        WHERE s.id = v_size_id AND s.service_type = v_old.service_type
      ) THEN
        RAISE EXCEPTION 'A groomer package rate references an invalid pet size.';
      END IF;
    END IF;
  END LOOP;

  IF v_per_night_count > 1 THEN RAISE EXCEPTION 'Only one open-ended per-night tier is allowed.'; END IF;

  -- The old package and its referenced rate rows remain untouched, with their
  -- historical IDs and prices. New bookings will use the new active package.
  UPDATE public.packages SET is_active = false WHERE id = p_package_id;
  -- Some installations enforce UNIQUE(service_type, name), including
  -- archived rows. If so, retain the requested public-facing name on the
  -- NEW package and label only the archived version as historical.
  BEGIN
    INSERT INTO public.packages (service_type, name, sort_order, is_active)
    VALUES (v_old.service_type, btrim(p_name), v_old.sort_order, true)
    RETURNING id INTO v_new_id;
  EXCEPTION WHEN unique_violation THEN
    IF pg_catalog.lower(btrim(v_old.name)) IS DISTINCT FROM pg_catalog.lower(btrim(p_name))
       OR EXISTS (
         SELECT 1 FROM public.packages p
         WHERE p.id <> p_package_id
           AND p.service_type = v_old.service_type
           AND pg_catalog.lower(p.name) = pg_catalog.lower(btrim(p_name))
       ) THEN
      RAISE EXCEPTION 'A different package already uses this name. Choose another name.';
    END IF;
    UPDATE public.packages
    SET name = pg_catalog.left(v_old.name, 65) || ' [Previous ' || pg_catalog.left(p_package_id::text, 8) || ']'
    WHERE id = p_package_id;
    INSERT INTO public.packages (service_type, name, sort_order, is_active)
    VALUES (v_old.service_type, btrim(p_name), v_old.sort_order, true)
    RETURNING id INTO v_new_id;
  END;

  INSERT INTO public.package_inclusions (package_id, label, sort_order)
  SELECT v_new_id, btrim(value), ordinal::integer
  FROM pg_catalog.jsonb_array_elements_text(p_inclusions) WITH ORDINALITY AS i(value, ordinal)
  WHERE length(btrim(value)) > 0;

  INSERT INTO public.package_pricing
    (package_id, size_id, size_label, price, is_per_night, nights)
  SELECT v_new_id,
    NULLIF(rate->>'size_id','')::uuid,
    btrim(rate->>'size_label'),
    (rate->>'price')::numeric,
    COALESCE((rate->>'is_per_night')::boolean, false),
    NULLIF(rate->>'nights','')::integer
  FROM pg_catalog.jsonb_array_elements(p_rates) AS j(rate);

  -- A replacement grooming package must remain schedulable without forcing
  -- staff to re-verify an unchanged treatment duration.
  IF v_old.service_type::text IN ('dog_grooming', 'cat_grooming')
     AND pg_catalog.to_regclass('public.grooming_package_durations') IS NOT NULL THEN
    EXECUTE '
      INSERT INTO public.grooming_package_durations
        (package_id, duration_minutes, verified)
      SELECT $1, duration_minutes, verified
      FROM public.grooming_package_durations WHERE package_id = $2'
    USING v_new_id, p_package_id;
  END IF;

  RETURN v_new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.happytails_fork_service_package_v1(uuid,text,jsonb,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.happytails_fork_service_package_v1(uuid,text,jsonb,jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.happytails_fork_service_package_v1(uuid,text,jsonb,jsonb) TO authenticated;

COMMIT;
