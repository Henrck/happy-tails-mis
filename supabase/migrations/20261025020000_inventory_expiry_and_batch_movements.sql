-- HappyTails: batch-aware expiry protection and auditable inventory reductions.
-- Apply this migration through the Supabase SQL Editor before deploying the UI.
-- It does not delete historical batches, sales, or existing adjustments.
begin;

create index if not exists product_batches_expiration_product_idx
  on public.product_batches (product_id, expiration_date)
  where coalesce(is_adjustment,false) = false;

create table if not exists public.inventory_batch_movements (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.product_batches(id),
  product_id uuid not null references public.products(id),
  actor_id uuid not null references auth.users(id),
  quantity_removed integer not null check (quantity_removed > 0),
  reason text not null check (length(btrim(reason)) between 3 and 160),
  quantity_before integer not null,
  quantity_after integer not null,
  created_at timestamptz not null default now()
);
create index if not exists inventory_batch_movements_batch_idx
  on public.inventory_batch_movements(batch_id, created_at desc);
alter table public.inventory_batch_movements enable row level security;
revoke all on public.inventory_batch_movements from public, anon, authenticated;
grant select on public.inventory_batch_movements to authenticated;
drop policy if exists inventory_batch_movements_staff_read on public.inventory_batch_movements;
create policy inventory_batch_movements_staff_read on public.inventory_batch_movements
  for select to authenticated using (
    exists (select 1 from public.profiles p where p.id = (select auth.uid())
      and p.role::text in ('admin','superadmin'))
  );

create table if not exists public.inventory_batch_expiry_audit (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.product_batches(id),
  actor_id uuid not null references auth.users(id),
  previous_expiration date,
  new_expiration date not null,
  reason text not null check (length(btrim(reason)) between 3 and 160),
  created_at timestamptz not null default now()
);
create index if not exists inventory_batch_expiry_audit_batch_idx
  on public.inventory_batch_expiry_audit(batch_id, created_at desc);
alter table public.inventory_batch_expiry_audit enable row level security;
revoke all on public.inventory_batch_expiry_audit from public, anon, authenticated;
grant select on public.inventory_batch_expiry_audit to authenticated;
drop policy if exists inventory_batch_expiry_audit_staff_read on public.inventory_batch_expiry_audit;
create policy inventory_batch_expiry_audit_staff_read on public.inventory_batch_expiry_audit
  for select to authenticated using (
    exists (select 1 from public.profiles p where p.id = (select auth.uid())
      and p.role::text in ('admin','superadmin'))
  );

-- New batch receipts must be real, non-expired stock. Historical adjustment
-- rows are preserved but no longer created from the Inventory interface.
create or replace function public.happytails_validate_new_inventory_batch()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  v_today date := (now() at time zone 'Asia/Manila')::date;
  v_role text;
  v_staff_status text;
begin
  select role::text into v_role from public.profiles where id = auth.uid();
  if v_role is null or v_role not in ('admin','superadmin') then
    raise exception 'Only authorized staff may receive stock' using errcode = '42501';
  end if;
  select status::text into v_staff_status from public.staff_profiles where id = auth.uid();
  if (v_role = 'admin' and v_staff_status is distinct from 'active') or
      (v_staff_status is not null and v_staff_status <> 'active') then
    raise exception 'Staff account must be active' using errcode = '42501';
  end if;
  if coalesce(new.is_adjustment,false) then
    raise exception 'Use batch-level stock removal instead of adjustment rows';
  end if;
  if new.quantity is null or new.quantity <= 0 then
    raise exception 'Batch quantity must be greater than zero';
  end if;
  if new.expiration_date is not null and new.expiration_date < v_today then
    raise exception 'Expired batches cannot be received as available stock';
  end if;
  if new.received_date is not null and new.received_date > v_today then
    raise exception 'Received date cannot be in the future';
  end if;
  return new;
end $$;
drop trigger if exists happytails_validate_new_inventory_batch_trigger on public.product_batches;
create trigger happytails_validate_new_inventory_batch_trigger
  before insert on public.product_batches for each row
  execute function public.happytails_validate_new_inventory_batch();

-- Direct browser updates must not bypass the auditable batch-removal RPC.
-- The atomic POS checkout and batch-removal RPC are SECURITY DEFINER and
-- continue to update batches normally under database ownership.
create or replace function public.happytails_prevent_client_batch_quantity_update()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if (old.quantity is distinct from new.quantity
       or old.expiration_date is distinct from new.expiration_date)
     and current_user in ('authenticated','anon') then
    raise exception 'Batch quantities can only change through approved POS and inventory operations'
      using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists happytails_prevent_client_batch_quantity_update_trigger on public.product_batches;
create trigger happytails_prevent_client_batch_quantity_update_trigger
  before update of quantity, expiration_date on public.product_batches for each row
  execute function public.happytails_prevent_client_batch_quantity_update();

-- Only authorized active staff can reduce inventory; quantity is removed
-- directly from the chosen physical batch under a row lock. If any step
-- fails, both the quantity update and audit log roll back together.
create or replace function public.happytails_remove_inventory_batch_stock(
  p_batch_id uuid, p_quantity integer, p_reason text
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_role text;
  v_staff_status text;
  v_batch public.product_batches%rowtype;
begin
  if v_user is null then raise exception 'Sign in to adjust inventory' using errcode = '42501'; end if;
  select p.role::text into v_role from public.profiles p where p.id = v_user;
  if v_role is null or v_role not in ('admin','superadmin') then
    raise exception 'Only authorized staff can adjust inventory' using errcode = '42501';
  end if;
  select s.status::text into v_staff_status from public.staff_profiles s where s.id = v_user;
  if (v_role = 'admin' and v_staff_status is distinct from 'active') or
      (v_staff_status is not null and v_staff_status <> 'active') then
    raise exception 'Staff account must be active' using errcode = '42501';
  end if;
  if p_batch_id is null or p_quantity is null or p_quantity < 1 or p_quantity > 1000000 then
    raise exception 'Enter a valid number of units to remove';
  end if;
  if p_reason is null or length(btrim(p_reason)) not between 3 and 160 then
    raise exception 'A reason between 3 and 160 characters is required';
  end if;
  select b.* into v_batch from public.product_batches b where b.id = p_batch_id for update;
  if not found then raise exception 'Batch not found'; end if;
  if coalesce(v_batch.is_adjustment,false) then raise exception 'Historical adjustment rows cannot be modified'; end if;
  if v_batch.quantity < p_quantity then
    raise exception 'Cannot remove % units; batch % contains only %', p_quantity, v_batch.batch_number, v_batch.quantity;
  end if;
  update public.product_batches b set quantity = b.quantity - p_quantity where b.id = p_batch_id;
  insert into public.inventory_batch_movements
    (batch_id, product_id, actor_id, quantity_removed, reason, quantity_before, quantity_after)
  values (p_batch_id, v_batch.product_id, v_user, p_quantity, btrim(p_reason), v_batch.quantity, v_batch.quantity - p_quantity);
end $$;
revoke all on function public.happytails_remove_inventory_batch_stock(uuid,integer,text) from public, anon;
grant execute on function public.happytails_remove_inventory_batch_stock(uuid,integer,text) to authenticated;

-- Correct previously missing/wrong expiration dates through an audited RPC.
-- Staff may only set a definite date (never erase a known expiry).
-- Past expiration dates ARE allowed here so legacy stock can be quarantined.
create or replace function public.happytails_set_inventory_batch_expiration(
  p_batch_id uuid, p_expiration_date date, p_reason text
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_role text;
  v_status text;
  v_batch public.product_batches%rowtype;
begin
  if v_user is null then raise exception 'Sign in to edit batch expiration' using errcode='42501'; end if;
  select p.role::text into v_role from public.profiles p where p.id=v_user;
  if v_role is null or v_role not in ('admin','superadmin') then
    raise exception 'Only authorized inventory staff can edit expiration dates' using errcode='42501';
  end if;
  select s.status::text into v_status from public.staff_profiles s where s.id=v_user;
  if (v_role='admin' and v_status is distinct from 'active') or
     (v_status is not null and v_status <> 'active') then
    raise exception 'Staff account must be active' using errcode='42501';
  end if;
  if p_batch_id is null or p_expiration_date is null or
     p_reason is null or length(btrim(p_reason)) not between 3 and 160 then
    raise exception 'Specify a date and an audit reason (3–160 characters)';
  end if;
  select b.* into v_batch from public.product_batches b where b.id=p_batch_id for update;
  if not found then raise exception 'Batch not found'; end if;
  if coalesce(v_batch.is_adjustment,false) then raise exception 'Legacy adjustment rows do not have an expiry'; end if;
  if v_batch.expiration_date is not distinct from p_expiration_date then return; end if;
  update public.product_batches b set expiration_date=p_expiration_date where b.id=p_batch_id;
  insert into public.inventory_batch_expiry_audit
    (batch_id,actor_id,previous_expiration,new_expiration,reason)
  values (p_batch_id,v_user,v_batch.expiration_date,p_expiration_date,btrim(p_reason));
end $$;
revoke all on function public.happytails_set_inventory_batch_expiration(uuid,date,text) from public, anon;
grant execute on function public.happytails_set_inventory_batch_expiration(uuid,date,text) to authenticated;

-- The existing idempotent, atomic POS function already excludes expired batches,
-- but PostgreSQL current_date is affected by its DB session timezone (often UTC).
-- Align both stock availability and FEFO allocation with Asia/Manila. Preserve
-- the current function body and its security model; do not rebuild sales logic.
do $$
declare v_definition text;
begin
  select pg_get_functiondef('public.happytails_checkout_pos(jsonb,numeric,uuid,text)'::regprocedure)
    into v_definition;
  if v_definition is null or strpos(v_definition,'current_date') = 0 then
    raise exception 'Expected POS checkout function with current_date was not found; review installed SQL before migration';
  end if;
  v_definition := replace(v_definition, 'current_date', '(now() at time zone ''Asia/Manila'')::date');
  execute v_definition;
end $$;

commit;
