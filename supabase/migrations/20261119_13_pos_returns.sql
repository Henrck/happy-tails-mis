-- HappyTails POS returns (replacement only, no cash refunds)
--
-- A customer brings back a product that was damaged or expired. Staff find
-- the sale by its INVOICE NUMBER, choose the item(s) and quantity, and give
-- the customer the SAME product as a replacement.
--
--   * Money does not change; the original sale stays as it was.
--   * The returned (damaged/expired) unit is NOT put back into sellable
--     stock. The replacement unit is taken from unexpired stock, oldest
--     expiry first (same order as a sale), and each batch it came from is
--     recorded in the batch movement history with the return number.
--   * A unit can't be returned twice: per item, at most (sold - returned).
--   * Returns are accepted within 7 days of the sale. A Super Admin can
--     accept an older one.
--   * Admins and Super Admins (active staff) can process returns.
--
-- Run once in the Supabase SQL editor. Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1) Tables
-- ---------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.happytails_return_number_seq;

CREATE TABLE IF NOT EXISTS public.sale_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number text NOT NULL UNIQUE
    DEFAULT 'RET-' || lpad(nextval('public.happytails_return_number_seq')::text, 6, '0'),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE RESTRICT,
  reason text NOT NULL CHECK (reason IN ('damaged', 'expired', 'other')),
  note text CHECK (note IS NULL OR length(note) <= 300),
  late_override boolean NOT NULL DEFAULT false,
  request_id uuid NOT NULL UNIQUE,
  result jsonb,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sale_return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id uuid NOT NULL REFERENCES public.sale_returns(id) ON DELETE CASCADE,
  sale_item_id uuid NOT NULL REFERENCES public.sale_items(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS sale_returns_sale_id_idx ON public.sale_returns(sale_id);
CREATE INDEX IF NOT EXISTS sale_return_items_sale_item_idx ON public.sale_return_items(sale_item_id);

-- Staff can read returns; writes only go through the function below.
ALTER TABLE public.sale_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_return_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view sale returns" ON public.sale_returns;
CREATE POLICY "Staff can view sale returns" ON public.sale_returns FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'superadmin')));

DROP POLICY IF EXISTS "Staff can view sale return items" ON public.sale_return_items;
CREATE POLICY "Staff can view sale return items" ON public.sale_return_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'superadmin')));

-- ---------------------------------------------------------------------------
-- 2) Shared staff check (active Admin or Super Admin). Returns the role.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.happytails_require_pos_staff()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
declare
  v_role text;
  v_status text;
begin
  if auth.uid() is null then raise exception 'Sign in to process returns' using errcode = '42501'; end if;
  select p.role::text into v_role from public.profiles p where p.id = auth.uid();
  if v_role is null or v_role not in ('admin', 'superadmin') then
    raise exception 'Only authorized POS staff can process returns' using errcode = '42501';
  end if;
  select s.status::text into v_status from public.staff_profiles s where s.id = auth.uid();
  if (v_role = 'admin' and v_status is distinct from 'active') or (v_status is not null and v_status <> 'active') then
    raise exception 'The staff account is not active' using errcode = '42501';
  end if;
  return v_role;
end;
$function$;

REVOKE ALL ON FUNCTION public.happytails_require_pos_staff() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) Find a sale from what staff type: "INV-23", "inv 23", "Invoice #INV-23"
--    or just "23" all find invoice INV-23. Labels, spaces, # and dashes are
--    ignored; a plain number matches the invoice's number part.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.happytails_find_sale_by_invoice(p_invoice text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
declare
  v_key text := upper(regexp_replace(coalesce(p_invoice, ''), '[^A-Za-z0-9]', '', 'g'));
  v_id uuid;
begin
  v_key := regexp_replace(v_key, '^(INVOICE|RECEIPT)(NO|NUMBER)?', '');
  if v_key = '' or length(v_key) > 40 then return null; end if;
  select s.id into v_id from public.sales s
  where upper(regexp_replace(s.invoice_number, '[^A-Za-z0-9]', '', 'g')) = v_key
     or (v_key ~ '^[0-9]+$' and ltrim(v_key, '0') <> ''
         and ltrim(regexp_replace(s.invoice_number, '[^0-9]', '', 'g'), '0') = ltrim(v_key, '0'))
  order by (upper(regexp_replace(s.invoice_number, '[^A-Za-z0-9]', '', 'g')) = v_key) desc, s.sold_at desc
  limit 1;
  return v_id;
end;
$function$;

REVOKE ALL ON FUNCTION public.happytails_find_sale_by_invoice(text) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3b) Look up a sale by invoice number for the return screen.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.happytails_lookup_sale_for_return(p_invoice text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
declare
  v_sale record;
  v_items jsonb;
  v_days integer;
begin
  perform public.happytails_require_pos_staff();
  if p_invoice is null or length(btrim(p_invoice)) not between 1 and 60 then
    raise exception 'Enter an invoice number';
  end if;

  select s.id, s.invoice_number, s.sold_at, s.total_amount into v_sale
  from public.sales s where s.id = public.happytails_find_sale_by_invoice(p_invoice);
  if not found then return jsonb_build_object('found', false); end if;

  v_days := (now() at time zone 'Asia/Manila')::date - (v_sale.sold_at at time zone 'Asia/Manila')::date;

  select coalesce(jsonb_agg(jsonb_build_object(
      'saleItemId', si.id,
      'productId', si.product_id,
      'name', coalesce(p.name, 'Unknown product'),
      'productCode', p.product_code,
      'quantity', si.quantity,
      'unitPrice', si.unit_price,
      'returned', coalesce(r.returned, 0),
      'productActive', coalesce(p.status::text = 'active', false),
      'stockAvailable', coalesce((
        select sum(b.quantity) from public.product_batches b
        where b.product_id = si.product_id and b.quantity > 0
          and (coalesce(b.is_adjustment, false) or b.expiration_date is null
               or b.expiration_date >= (now() at time zone 'Asia/Manila')::date)), 0)
    ) order by p.name), '[]'::jsonb)
  into v_items
  from public.sale_items si
  left join public.products p on p.id = si.product_id
  left join (
    select sale_item_id, sum(quantity)::integer as returned
    from public.sale_return_items group by sale_item_id
  ) r on r.sale_item_id = si.id
  where si.sale_id = v_sale.id;

  return jsonb_build_object(
    'found', true,
    'saleId', v_sale.id,
    'invoiceNumber', v_sale.invoice_number,
    'soldAt', v_sale.sold_at,
    'totalAmount', v_sale.total_amount,
    'daysSinceSale', v_days,
    'withinWindow', v_days <= 7,
    'items', v_items,
    'previousReturns', coalesce((
      select jsonb_agg(jsonb_build_object('returnNumber', sr.return_number, 'createdAt', sr.created_at, 'reason', sr.reason) order by sr.created_at)
      from public.sale_returns sr where sr.sale_id = v_sale.id), '[]'::jsonb)
  );
end;
$function$;

REVOKE ALL ON FUNCTION public.happytails_lookup_sale_for_return(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.happytails_lookup_sale_for_return(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4) Process a return: record it and hand out replacement units.
--    p_items: [{ "saleItemId": uuid, "quantity": int }, ...]
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.happytails_process_sale_return(
  p_request_id uuid,
  p_invoice text,
  p_items jsonb,
  p_reason text,
  p_note text DEFAULT NULL,
  p_late_override boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
declare
  v_actor uuid := auth.uid();
  v_role text;
  v_existing record;
  v_sale record;
  v_days integer;
  v_return_id uuid;
  v_return_number text;
  v_item jsonb;
  v_seen uuid[] := array[]::uuid[];
  v_sale_item record;
  v_qty integer;
  v_returned integer;
  v_available numeric;
  v_remaining integer;
  v_take integer;
  v_batch record;
  v_lines jsonb := '[]'::jsonb;
  v_result jsonb;
begin
  v_role := public.happytails_require_pos_staff();

  if p_request_id is null then raise exception 'A return request ID is required'; end if;
  -- Safe retry: the same request returns the saved result instead of a second return.
  select sr.created_by, sr.result into v_existing from public.sale_returns sr where sr.request_id = p_request_id;
  if found then
    if v_existing.created_by is distinct from v_actor then raise exception 'Return request already used'; end if;
    return v_existing.result;
  end if;

  if p_reason is null or p_reason not in ('damaged', 'expired', 'other') then
    raise exception 'Choose why the item is being returned';
  end if;
  if p_reason = 'other' and length(btrim(coalesce(p_note, ''))) < 5 then
    raise exception 'Describe the problem (at least 5 characters) when the reason is Other';
  end if;
  if p_note is not null and length(p_note) > 300 then raise exception 'The note can be at most 300 characters'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 100 then
    raise exception 'Choose at least one item to return';
  end if;

  select s.id, s.invoice_number, s.sold_at into v_sale
  from public.sales s where s.id = public.happytails_find_sale_by_invoice(p_invoice)
  for update;
  if not found then raise exception 'No sale found with invoice number %', btrim(coalesce(p_invoice, '')); end if;

  v_days := (now() at time zone 'Asia/Manila')::date - (v_sale.sold_at at time zone 'Asia/Manila')::date;
  if v_days > 7 then
    if not coalesce(p_late_override, false) then
      raise exception 'This sale was % days ago. Returns are accepted within 7 days.', v_days;
    end if;
    if v_role <> 'superadmin' then
      raise exception 'Only a Super Admin can accept a return after 7 days';
    end if;
  end if;

  insert into public.sale_returns(sale_id, reason, note, late_override, request_id, created_by)
  values (v_sale.id, p_reason, nullif(btrim(coalesce(p_note, '')), ''), v_days > 7, p_request_id, v_actor)
  returning id, return_number into v_return_id, v_return_number;

  for v_item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item) <> 'object'
       or coalesce(v_item->>'saleItemId', '') !~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
       or coalesce(v_item->>'quantity', '') !~ '^[1-9][0-9]{0,4}$' then
      raise exception 'Invalid return line';
    end if;
    if (v_item->>'saleItemId')::uuid = any(v_seen) then raise exception 'An item is listed twice'; end if;
    v_seen := array_append(v_seen, (v_item->>'saleItemId')::uuid);
    v_qty := (v_item->>'quantity')::integer;

    select si.id, si.product_id, si.quantity, si.unit_price, p.name, p.status::text as status
      into v_sale_item
    from public.sale_items si join public.products p on p.id = si.product_id
    where si.id = (v_item->>'saleItemId')::uuid and si.sale_id = v_sale.id
    for update of si;
    if not found then raise exception 'That item is not part of invoice %', v_sale.invoice_number; end if;

    select coalesce(sum(ri.quantity), 0)::integer into v_returned
    from public.sale_return_items ri where ri.sale_item_id = v_sale_item.id;
    if v_qty > v_sale_item.quantity - v_returned then
      raise exception 'Only % of % can still be returned', greatest(0, v_sale_item.quantity - v_returned), v_sale_item.name;
    end if;
    if v_sale_item.status <> 'active' then
      raise exception '% is no longer sold, so it can''t be replaced', v_sale_item.name;
    end if;

    -- Replacement comes from unexpired stock, oldest expiry first (same as a sale).
    perform 1 from public.product_batches b where b.product_id = v_sale_item.product_id order by b.id for update;
    select coalesce(sum(b.quantity), 0) into v_available
    from public.product_batches b
    where b.product_id = v_sale_item.product_id
      and (coalesce(b.is_adjustment, false) or b.expiration_date is null
           or b.expiration_date >= (now() at time zone 'Asia/Manila')::date);
    if v_available < v_qty then
      raise exception 'Not enough unexpired stock to replace % (available: %)', v_sale_item.name, greatest(0, v_available);
    end if;

    v_remaining := v_qty;
    for v_batch in
      select b.id, b.quantity from public.product_batches b
      where b.product_id = v_sale_item.product_id and b.quantity > 0
        and (coalesce(b.is_adjustment, false) or b.expiration_date is null
             or b.expiration_date >= (now() at time zone 'Asia/Manila')::date)
      order by case when coalesce(b.is_adjustment, false) then 1 else 0 end,
               b.expiration_date asc nulls last, b.received_date asc nulls last, b.id
    loop
      exit when v_remaining <= 0;
      v_take := least(v_remaining, v_batch.quantity);
      update public.product_batches b set quantity = b.quantity - v_take
      where b.id = v_batch.id and b.quantity >= v_take;
      if not found then raise exception 'Inventory changed during the return; try again'; end if;
      insert into public.inventory_batch_movements
        (batch_id, product_id, actor_id, quantity_removed, reason, quantity_before, quantity_after)
      values (v_batch.id, v_sale_item.product_id, v_actor, v_take,
        left(format('Replacement for %s (%s, %s)', v_return_number, v_sale.invoice_number, p_reason), 160),
        v_batch.quantity, v_batch.quantity - v_take);
      v_remaining := v_remaining - v_take;
    end loop;
    if v_remaining > 0 then raise exception 'Unable to allocate replacement stock; nothing was changed'; end if;

    insert into public.sale_return_items(return_id, sale_item_id, product_id, quantity, unit_price)
    values (v_return_id, v_sale_item.id, v_sale_item.product_id, v_qty, v_sale_item.unit_price);

    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'name', v_sale_item.name, 'quantity', v_qty, 'unitPrice', v_sale_item.unit_price));
  end loop;

  v_result := jsonb_build_object(
    'returnNumber', v_return_number,
    'invoiceNumber', v_sale.invoice_number,
    'soldAt', v_sale.sold_at,
    'reason', p_reason,
    'note', nullif(btrim(coalesce(p_note, '')), ''),
    'items', v_lines,
    'createdAt', now()
  );
  update public.sale_returns set result = v_result where id = v_return_id;
  return v_result;
end;
$function$;

REVOKE ALL ON FUNCTION public.happytails_process_sale_return(uuid, text, jsonb, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.happytails_process_sale_return(uuid, text, jsonb, text, text, boolean) TO authenticated;
