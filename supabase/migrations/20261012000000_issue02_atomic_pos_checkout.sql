-- HappyTails Issue #2: atomic, server-priced, idempotent POS checkout.
-- Review in a STAGING Supabase project first; this migration is not applied by copying files.
-- Assumes existing public.products, public.product_batches, public.sales,
-- public.sale_items, public.profiles and public.staff_profiles tables.
-- Existing batch adjustments (including negative adjustment rows) are included
-- in sellable stock; expired non-adjustment batches are excluded.

begin;

-- Explicitly fail rather than partly installing on a database with different columns.
do $$
declare
  missing text;
begin
  select string_agg(spec.table_name || '.' || spec.column_name, ', ')
    into missing
  from (values
    ('products','id'), ('products','name'), ('products','price'), ('products','status'),
    ('product_batches','id'), ('product_batches','product_id'),
    ('product_batches','quantity'), ('product_batches','expiration_date'),
    ('product_batches','received_date'), ('product_batches','is_adjustment'),
    ('sales','id'), ('sales','invoice_number'), ('sales','total_amount'),
    ('sales','payment_method'), ('sales','amount_paid'),
    ('sale_items','sale_id'), ('sale_items','product_id'),
    ('sale_items','quantity'), ('sale_items','unit_price'),
    ('sale_items','line_amount'),
    ('profiles','id'), ('profiles','role'),
    ('staff_profiles','id'), ('staff_profiles','status')
  ) as spec(table_name, column_name)
  where not exists (
    select 1 from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = spec.table_name and c.column_name = spec.column_name
  );
  if missing is not null then
    raise exception 'Issue 02 migration: required columns missing: %', missing;
  end if;
end;
$$;

-- No browser table access. Requests are written only inside the function.
create table if not exists public.pos_checkout_requests (
  request_id uuid primary key,
  actor_id uuid not null,
  request_hash text not null,
  result jsonb,
  created_at timestamptz not null default now()
);
alter table public.pos_checkout_requests enable row level security;
revoke all on table public.pos_checkout_requests from public, anon, authenticated;

create or replace function public.happytails_checkout_pos(
  p_items jsonb,
  p_amount_paid numeric,
  p_request_id uuid,
  p_payment_method text default 'Cash'
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_role text;
  v_status text;
  v_item jsonb;
  v_items jsonb := '[]'::jsonb;
  v_seen uuid[] := array[]::uuid[];
  v_id_text text;
  v_product_id uuid;
  v_qty integer;
  v_product record;
  v_batch record;
  v_locked record;
  v_available numeric;
  v_total numeric := 0;
  v_price numeric;
  v_due numeric;
  v_remaining integer;
  v_take integer;
  v_sale_id uuid;
  v_invoice text;
  v_hash text;
  v_existing record;
  v_inserted integer;
  v_result jsonb;
begin
  v_actor := auth.uid();
  if v_actor is null then
    raise exception 'Sign in before processing sales';
  end if;

  select p.role::text into v_role
  from public.profiles p where p.id = v_actor;
  if v_role is null or v_role not in ('admin','superadmin') then
    raise exception 'Only authorized POS staff can complete sales';
  end if;

  select s.status::text into v_status
  from public.staff_profiles s where s.id = v_actor;
  if v_role = 'admin' and v_status is distinct from 'active' then
    raise exception 'The staff account is not active';
  end if;
  if v_status is not null and v_status <> 'active' then
    raise exception 'The staff account is not active';
  end if;

  if p_request_id is null then raise exception 'A checkout request ID is required'; end if;
  if p_payment_method is distinct from 'Cash' then
    raise exception 'Only Cash payment is currently supported';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) not between 1 and 100 then
    raise exception 'Cart must contain between 1 and 100 distinct products';
  end if;
  if p_amount_paid is null or p_amount_paid < 0 or p_amount_paid > 100000000
     or p_amount_paid <> round(p_amount_paid,2) then
    raise exception 'Cash amount must be nonnegative with at most two decimal places';
  end if;

  -- Disallow repeated lines and invalid quantities before touching tables.
  for v_item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'Invalid cart line';
    end if;
    v_id_text := v_item->>'productId';
    if v_id_text is null or v_id_text !~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$' then
      raise exception 'Invalid product identifier';
    end if;
    v_product_id := v_id_text::uuid;
    if v_product_id = any(v_seen) then
      raise exception 'Duplicate product in cart';
    end if;
    v_seen := array_append(v_seen,v_product_id);
    if jsonb_typeof(v_item->'quantity') <> 'number'
       or (v_item->>'quantity') !~ '^[1-9][0-9]*$'
       or length(v_item->>'quantity') > 6 then
      raise exception 'Invalid product quantity';
    end if;
    v_qty := (v_item->>'quantity')::integer;
    if v_qty > 10000 then raise exception 'Quantity exceeds 10000'; end if;
    -- Any supplied browser prices are ignored; only these fields are used.
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'productId',v_product_id,'quantity',v_qty
    ));
  end loop;

  -- Stable token for safe retry. A reused key with a different cart/payment
  -- raises an error rather than silently charging a different order.
  select coalesce(jsonb_agg(value order by value->>'productId'),'[]'::jsonb)
    into v_items from jsonb_array_elements(v_items);
  v_hash := md5(v_items::text || '|' || p_amount_paid::text || '|Cash');

  insert into public.pos_checkout_requests(request_id,actor_id,request_hash)
  values (p_request_id,v_actor,v_hash)
  on conflict (request_id) do nothing;
  get diagnostics v_inserted = row_count;

  select * into v_existing from public.pos_checkout_requests
  where request_id = p_request_id for update;
  if v_existing.actor_id is distinct from v_actor
     or v_existing.request_hash is distinct from v_hash then
    raise exception 'Checkout request already used for a different payment';
  end if;
  if v_inserted = 0 then
    if v_existing.result is null then
      raise exception 'Existing checkout is incomplete; retry later';
    end if;
    return v_existing.result;
  end if;

  -- Lock products in canonical order to serialize price/status changes and
  -- simultaneous checkouts. Locks on batches protect FEFO stock decrements.
  v_result := '[]'::jsonb;
  for v_item in select value from jsonb_array_elements(v_items) loop
    v_product_id := (v_item->>'productId')::uuid;
    v_qty := (v_item->>'quantity')::integer;
    select p.name, p.price, p.status
      into v_product
    from public.products p where p.id = v_product_id for update;
    if not found then raise exception 'A product in the cart no longer exists'; end if;
    if v_product.status::text <> 'active' then
      raise exception 'Product % is no longer active', v_product.name;
    end if;
    v_price := round(v_product.price::numeric,2);
    if v_price is null or v_price < 0 then
      raise exception 'Product % has an invalid price', v_product.name;
    end if;

    for v_locked in select b.id from public.product_batches b
      where b.product_id = v_product_id order by b.id for update
    loop
      null;
    end loop;

    select coalesce(sum(b.quantity),0) into v_available
    from public.product_batches b
    where b.product_id = v_product_id
      and (coalesce(b.is_adjustment,false)
           or b.expiration_date is null
           or b.expiration_date >= current_date);
    if v_available < v_qty then
      raise exception 'Insufficient unexpired stock for % (available: %)',
        v_product.name, greatest(0,v_available);
    end if;

    v_total := v_total + v_price * v_qty;
    v_result := v_result || jsonb_build_array(jsonb_build_object(
      'productId',v_product_id,'name',v_product.name,
      'quantity',v_qty,'unitPrice',v_price,'lineAmount',v_price*v_qty
    ));
  end loop;

  v_due := round(v_total,2);
  if p_amount_paid < v_due then
    raise exception 'Insufficient cash: amount due is %', v_due;
  end if;

  insert into public.sales(total_amount,payment_method,amount_paid)
  values (v_due,'Cash',p_amount_paid)
  returning id,invoice_number into v_sale_id,v_invoice;

  -- Each inventory update and ledger line executes in the SAME database
  -- transaction. Any exception rolls back ALL lines and the new sale.
  for v_item in select value from jsonb_array_elements(v_result) loop
    v_product_id := (v_item->>'productId')::uuid;
    v_qty := (v_item->>'quantity')::integer;
    v_remaining := v_qty;

    for v_batch in
      select b.id,b.quantity from public.product_batches b
      where b.product_id = v_product_id and b.quantity > 0
        and (coalesce(b.is_adjustment,false)
             or b.expiration_date is null
             or b.expiration_date >= current_date)
      order by case when coalesce(b.is_adjustment,false) then 1 else 0 end,
               b.expiration_date asc nulls last,
               b.received_date asc nulls last, b.id
      for update
    loop
      exit when v_remaining <= 0;
      v_take := least(v_remaining,v_batch.quantity);
      update public.product_batches b set quantity = b.quantity - v_take
      where b.id = v_batch.id and b.quantity >= v_take;
      if not found then raise exception 'Inventory changed during checkout; retry'; end if;
      v_remaining := v_remaining - v_take;
    end loop;

    if v_remaining > 0 then
      raise exception 'Unable to allocate batch stock; sale was rolled back';
    end if;

    insert into public.sale_items(
      sale_id,product_id,quantity,unit_price,line_amount
    ) values (
      v_sale_id,v_product_id,v_qty,
      (v_item->>'unitPrice')::numeric,
      (v_item->>'lineAmount')::numeric
    );
  end loop;

  v_result := jsonb_build_object(
    'invoiceNumber',v_invoice,
    'totalAmount',v_due,
    'amountPaid',p_amount_paid,
    'changeAmount',p_amount_paid-v_due,
    'items',v_result
  );
  update public.pos_checkout_requests set result = v_result
  where request_id = p_request_id;
  return v_result;
end;
$$;

revoke all on function public.happytails_checkout_pos(jsonb,numeric,uuid,text)
from public, anon, authenticated;
grant execute on function public.happytails_checkout_pos(jsonb,numeric,uuid,text)
to authenticated;

commit;
