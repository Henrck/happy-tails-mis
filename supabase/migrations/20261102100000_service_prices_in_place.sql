-- HappyTails: Price-only update for an existing package. Does not alter package IDs,
-- rate IDs, rate labels or booked appointment totals. Requires administrator role.
-- Apply this AFTER the optional 0900 versioning migration if it was applied.
BEGIN;

CREATE OR REPLACE FUNCTION public.happytails_edit_package_prices_in_place_v1(
  p_package_id uuid, p_rates jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role text;
  v_package public.packages%ROWTYPE;
  v_item jsonb;
  v_rate_id uuid;
  v_price numeric;
  v_count integer := 0;
  v_expected integer;
  v_updated integer;
  v_seen uuid[] := ARRAY[]::uuid[];
BEGIN
  SELECT p.role::text INTO v_role FROM public.profiles p WHERE p.id = auth.uid();
  IF v_role IS NULL OR v_role NOT IN ('admin','superadmin') THEN
    RAISE EXCEPTION 'Only administrators can change package rates' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_package FROM public.packages WHERE id=p_package_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Package not found. Refresh the service list.'; END IF;
  IF NOT v_package.is_active THEN RAISE EXCEPTION 'This package is archived; reactivate it before changing prices.'; END IF;
  IF p_rates IS NULL OR jsonb_typeof(p_rates) <> 'array' THEN
    RAISE EXCEPTION 'Invalid price list.';
  END IF;
  SELECT count(*) INTO v_expected FROM public.package_pricing WHERE package_id = p_package_id;
  IF jsonb_array_length(p_rates) <> v_expected OR v_expected < 1 THEN
    RAISE EXCEPTION 'All existing pricing tiers must be included. Refresh before saving.';
  END IF;
  FOR v_item IN SELECT value FROM pg_catalog.jsonb_array_elements(p_rates) LOOP
    IF jsonb_typeof(v_item) <> 'object' THEN RAISE EXCEPTION 'Invalid rate.'; END IF;
    v_rate_id := NULLIF(v_item->>'rate_id','')::uuid;
    v_price := (v_item->>'price')::numeric;
    IF v_rate_id IS NULL OR v_price IS NULL OR v_price < 0 OR v_price > 99999999 THEN
      RAISE EXCEPTION 'Price must be a valid nonnegative amount.';
    END IF;
    IF v_rate_id = ANY(v_seen) THEN RAISE EXCEPTION 'Duplicate rate ID.'; END IF;
    v_seen := pg_catalog.array_append(v_seen,v_rate_id);
    -- UPDATE only the price column. Nothing about an existing booking is rewritten.
    UPDATE public.package_pricing SET price = v_price
    WHERE id=v_rate_id AND package_id=p_package_id
      AND price IS DISTINCT FROM v_price;
    IF NOT EXISTS (SELECT 1 FROM public.package_pricing WHERE id=v_rate_id AND package_id=p_package_id) THEN
      RAISE EXCEPTION 'A price tier was removed while editing. Refresh and retry.';
    END IF;
    v_count := v_count + 1;
  END LOOP;
  IF v_count <> v_expected THEN RAISE EXCEPTION 'Incomplete price update.'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.happytails_edit_package_prices_in_place_v1(uuid,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.happytails_edit_package_prices_in_place_v1(uuid,jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.happytails_edit_package_prices_in_place_v1(uuid,jsonb) TO authenticated;
COMMIT;
