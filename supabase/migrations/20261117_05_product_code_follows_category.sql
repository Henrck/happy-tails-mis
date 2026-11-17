-- HappyTails: a product's ID prefix follows its category.
--
-- Product codes use one sequence per category (F = Food, T = Treats,
-- G = Grooming, A = Accessories, H = Hygiene), each starting at 101.
-- Previously the code was only generated on INSERT, so editing a product's
-- category kept the old prefix (e.g. a Treats item still showed F109).
--
-- After this migration:
--  * Changing category gives the product the NEXT code in the new category
--    (F109 -> e.g. T108). Numbers are per category, so the old number cannot
--    simply be reused with a new letter without risking a future collision.
--  * Existing products whose prefix doesn't match their category are fixed now.
--  * Sequences are moved past any code already in use, so new codes never collide.
--  * Inventory change logs record "Product ID: F109 -> T108".
-- Past log rows keep the code that was current at the time.

-- 1) One place that maps category -> prefix/sequence and issues the next code.
CREATE OR REPLACE FUNCTION public.happytails_next_product_code(p_category text)
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
declare
  v_prefix text;
  v_seq text;
  v_code text;
begin
  case p_category
    when 'Food' then v_prefix := 'F'; v_seq := 'public.product_code_food_seq';
    when 'Treats' then v_prefix := 'T'; v_seq := 'public.product_code_treats_seq';
    when 'Grooming' then v_prefix := 'G'; v_seq := 'public.product_code_grooming_seq';
    when 'Accessories' then v_prefix := 'A'; v_seq := 'public.product_code_accessories_seq';
    when 'Hygiene' then v_prefix := 'H'; v_seq := 'public.product_code_hygiene_seq';
    else v_prefix := 'P'; v_seq := 'public.product_code_seq';
  end case;
  -- Skip any number that is somehow already taken (e.g. a manually typed code).
  loop
    v_code := v_prefix || nextval(v_seq)::text;
    exit when not exists (select 1 from public.products where product_code = v_code);
  end loop;
  return v_code;
end;
$function$;

-- Expected prefix for a category (used for the one-time repair below).
CREATE OR REPLACE FUNCTION public.happytails_product_code_prefix(p_category text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $function$
  select case p_category
    when 'Food' then 'F' when 'Treats' then 'T' when 'Grooming' then 'G'
    when 'Accessories' then 'A' when 'Hygiene' then 'H' else 'P' end
$function$;

-- 2) Insert trigger: same behaviour as before, now via the shared helper.
CREATE OR REPLACE FUNCTION public.generate_product_code()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
begin
  if NEW.product_code is not null then
    return NEW;
  end if;
  NEW.product_code := public.happytails_next_product_code(NEW.category);
  return NEW;
end;
$function$;

-- 3) Update trigger: a new category means a new code with the matching prefix.
--    If the same update explicitly sets a code, that code is kept.
CREATE OR REPLACE FUNCTION public.happytails_product_code_follow_category()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
begin
  if NEW.category is distinct from OLD.category
     and NEW.product_code is not distinct from OLD.product_code
     and left(coalesce(NEW.product_code, ''), 1) is distinct from public.happytails_product_code_prefix(NEW.category) then
    NEW.product_code := public.happytails_next_product_code(NEW.category);
  end if;
  return NEW;
end;
$function$;

DROP TRIGGER IF EXISTS happytails_product_code_follow_category ON public.products;
CREATE TRIGGER happytails_product_code_follow_category
  BEFORE UPDATE OF category ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.happytails_product_code_follow_category();

-- 4) Inventory log: mention the ID change alongside the category change.
CREATE OR REPLACE FUNCTION public.happytails_log_inventory_product_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_action text;
  v_details text;
  v_row public.products%ROWTYPE;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_row := NEW;
    v_action := 'product_created';
    v_details := 'Product added to inventory';
  ELSIF TG_OP = 'DELETE' THEN
    v_row := OLD;
    v_action := 'product_deleted';
    v_details := 'Product deleted from inventory';
  ELSE
    IF (to_jsonb(OLD) - 'updated_at') IS NOT DISTINCT FROM (to_jsonb(NEW) - 'updated_at') THEN
      RETURN NEW;
    END IF;
    v_row := NEW;
    v_action := 'product_updated';
    v_details := concat_ws('; ',
      CASE WHEN OLD.name IS DISTINCT FROM NEW.name THEN 'Name: '||OLD.name||' → '||NEW.name END,
      CASE WHEN OLD.category IS DISTINCT FROM NEW.category THEN 'Category: '||OLD.category||' → '||NEW.category END,
      CASE WHEN OLD.product_code IS DISTINCT FROM NEW.product_code THEN 'Product ID: '||coalesce(OLD.product_code,'none')||' → '||coalesce(NEW.product_code,'none') END,
      CASE WHEN OLD.price IS DISTINCT FROM NEW.price THEN 'Price: '||OLD.price||' → '||NEW.price END,
      CASE WHEN OLD.min_stock IS DISTINCT FROM NEW.min_stock THEN 'Minimum stock: '||OLD.min_stock||' → '||NEW.min_stock END,
      CASE WHEN OLD.status IS DISTINCT FROM NEW.status THEN 'Status: '||OLD.status||' → '||NEW.status END,
      CASE WHEN OLD.unit IS DISTINCT FROM NEW.unit THEN 'Unit: '||OLD.unit||' → '||NEW.unit END,
      CASE WHEN OLD.package_size IS DISTINCT FROM NEW.package_size THEN 'Package size changed' END,
      CASE WHEN OLD.image_url IS DISTINCT FROM NEW.image_url THEN 'Product image updated' END
    );
    IF v_details = '' THEN v_details := 'Other product attributes updated'; END IF;
  END IF;
  INSERT INTO public.inventory_change_logs(product_id,product_name,product_code,action,details,actor_id)
  VALUES(v_row.id,v_row.name,v_row.product_code,v_action,v_details,auth.uid());
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

-- 5) Move each sequence past the highest code already used for its prefix.
DO $$
DECLARE
  r record;
  v_max integer;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('F', 'public.product_code_food_seq'),
    ('T', 'public.product_code_treats_seq'),
    ('G', 'public.product_code_grooming_seq'),
    ('A', 'public.product_code_accessories_seq'),
    ('H', 'public.product_code_hygiene_seq'),
    ('P', 'public.product_code_seq')
  ) AS s(prefix, seq)
  LOOP
    SELECT max(substring(product_code FROM 2)::integer) INTO v_max
    FROM public.products
    WHERE product_code ~ ('^' || r.prefix || '[0-9]+$');
    IF v_max IS NOT NULL THEN
      -- Only ever move forward; never reuse numbers.
      PERFORM setval(r.seq::regclass, greatest(v_max, (SELECT last_value FROM pg_sequences WHERE schemaname || '.' || sequencename = r.seq)::integer));
    END IF;
  END LOOP;
END $$;

-- 6) One-time repair: products whose prefix doesn't match their category
--    (e.g. F109 listed under Treats) get the next code in their category.
UPDATE public.products
SET product_code = public.happytails_next_product_code(category)
WHERE left(coalesce(product_code, ''), 1) IS DISTINCT FROM public.happytails_product_code_prefix(category);

-- Show what changed (most recent inventory log rows mentioning an ID change).
SELECT product_name, details, created_at
FROM public.inventory_change_logs
WHERE details LIKE '%Product ID:%'
ORDER BY created_at DESC
LIMIT 20;
