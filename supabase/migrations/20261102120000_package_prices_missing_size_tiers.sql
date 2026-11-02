-- Edit an existing package's prices in place, and add missing grooming size tiers.
-- Preserve existing package_pricing IDs and all appointment amounts.
BEGIN;
CREATE OR REPLACE FUNCTION public.happytails_edit_package_prices_and_missing_tiers_v2(p_package_id uuid, p_rates jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_role text;
  v_package public.packages%ROWTYPE;
  v_entry jsonb;
  v_id uuid;
  v_size_id uuid;
  v_label text;
  v_price numeric;
  v_nights integer;
  v_per_night boolean;
  v_existing integer;
  v_seen uuid[] := ARRAY[]::uuid[];
  v_seen_size uuid[] := ARRAY[]::uuid[];
BEGIN
  SELECT role::text INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role IS DISTINCT FROM 'admin' AND v_role IS DISTINCT FROM 'superadmin' THEN
    RAISE EXCEPTION 'Administrator permissions required' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_package FROM public.packages WHERE id = p_package_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Package no longer exists. Refresh and retry.'; END IF;
  IF NOT v_package.is_active THEN RAISE EXCEPTION 'Reactivate the package before changing prices.'; END IF;
  IF p_rates IS NULL OR jsonb_typeof(p_rates) <> 'array' OR jsonb_array_length(p_rates) = 0 THEN
    RAISE EXCEPTION 'No prices provided.';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_package_id::text, 0));
  SELECT count(*) INTO v_existing FROM public.package_pricing WHERE package_id = p_package_id;
  IF v_existing > 0 AND
    (SELECT count(*) FROM pg_catalog.jsonb_array_elements(p_rates) x WHERE x.value->>'rate_id' IS NOT NULL) <> v_existing THEN
    RAISE EXCEPTION 'Some existing rates were omitted. Refresh the package and retry.';
  END IF;
  FOR v_entry IN SELECT value FROM pg_catalog.jsonb_array_elements(p_rates) LOOP
    IF jsonb_typeof(v_entry) <> 'object' THEN RAISE EXCEPTION 'Invalid rate entry.'; END IF;
    v_id := nullif(v_entry->>'rate_id','')::uuid;
    v_size_id := nullif(v_entry->>'size_id','')::uuid;
    v_label := pg_catalog.btrim(v_entry->>'size_label');
    v_price := (v_entry->>'price')::numeric;
    v_per_night := coalesce((v_entry->>'is_per_night')::boolean,false);
    v_nights := nullif(v_entry->>'nights','')::integer;
    IF v_price IS NULL OR v_price < 0 OR v_price > 99999999 THEN
      RAISE EXCEPTION 'Provide a valid nonnegative price.';
    END IF;
    IF v_id IS NOT NULL THEN
      IF v_id = ANY(v_seen) THEN RAISE EXCEPTION 'Duplicate rate reference.'; END IF;
      v_seen := pg_catalog.array_append(v_seen,v_id);
      -- Price-only UPDATE, preserving the original rate ID and booked totals.
      UPDATE public.package_pricing SET price = v_price
      WHERE id = v_id AND package_id = p_package_id AND price IS DISTINCT FROM v_price;
      IF NOT EXISTS (SELECT 1 FROM public.package_pricing WHERE id=v_id AND package_id=p_package_id) THEN
        RAISE EXCEPTION 'A rate has changed or was deleted. Refresh and retry.';
      END IF;
    ELSE
      IF v_package.service_type::text NOT IN ('dog_grooming','cat_grooming') THEN
        RAISE EXCEPTION 'New tiers can only be added for grooming sizes in this editor.';
      END IF;
      IF v_size_id IS NULL OR v_size_id = ANY(v_seen_size) THEN
        RAISE EXCEPTION 'Choose a distinct valid grooming size for the new rate.';
      END IF;
      v_seen_size := pg_catalog.array_append(v_seen_size,v_size_id);
      IF NOT EXISTS (SELECT 1 FROM public.pet_sizes
                     WHERE id=v_size_id AND service_type=v_package.service_type AND is_active) THEN
        RAISE EXCEPTION 'The requested grooming size is no longer active.';
      END IF;
      IF EXISTS (SELECT 1 FROM public.package_pricing WHERE package_id=p_package_id AND size_id=v_size_id) THEN
        RAISE EXCEPTION 'This size already has a rate. Refresh and retry.';
      END IF;
      SELECT label INTO v_label FROM public.pet_sizes WHERE id=v_size_id;
      INSERT INTO public.package_pricing(package_id,size_id,size_label,price,is_per_night,nights)
      VALUES (p_package_id,v_size_id,v_label,v_price,false,NULL);
    END IF;
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.happytails_edit_package_prices_and_missing_tiers_v2(uuid,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.happytails_edit_package_prices_and_missing_tiers_v2(uuid,jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.happytails_edit_package_prices_and_missing_tiers_v2(uuid,jsonb) TO authenticated;
COMMIT;
