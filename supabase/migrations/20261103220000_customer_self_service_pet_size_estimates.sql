-- HappyTails: customer-guided provisional pet size assessment.
-- Apply before deploying the related UI. No existing size/appointment is changed.
-- Customers may estimate their pet's size; only staff may mark it verified.

alter table public.pets
  add column if not exists size_assessment_source text not null default 'unknown';
alter table public.pets
  add column if not exists customer_estimated_size text;
alter table public.pets
  add column if not exists staff_verified_size text;
alter table public.pets
  add column if not exists size_verified_by uuid;
alter table public.pets
  add column if not exists size_verified_at timestamptz;

-- Do not reclassify or overwrite historical pets automatically.
alter table public.pets drop constraint if exists pets_size_assessment_source_check;
alter table public.pets add constraint pets_size_assessment_source_check
  check (size_assessment_source in ('unknown', 'customer_estimated', 'staff_verified'));

create or replace function public.happytails_guard_pet_size_assessment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_role text;
  v_is_staff boolean := false;
  v_changed boolean;
begin
  if v_actor is not null then
    select role::text into v_role from public.profiles where id = v_actor;
    v_is_staff := v_role in ('admin', 'superadmin') and exists (
      select 1 from public.staff_profiles where id = v_actor and status = 'active'
    );
  end if;

  if tg_op = 'INSERT' then
    if not v_is_staff and (
      new.size_assessment_source = 'staff_verified' or
      new.staff_verified_size is not null or
      new.size_verified_by is not null or new.size_verified_at is not null
    ) then
      raise exception 'Only active HappyTails staff may verify a pet size.' using errcode = '42501';
    end if;
    if new.size_assessment_source = 'customer_estimated' and nullif(trim(new.customer_estimated_size), '') is null then
      raise exception 'An estimated size must be provided.' using errcode = '23514';
    end if;
    return new;
  end if;

  v_changed := new.size_label is distinct from old.size_label
    or new.pet_size_id is distinct from old.pet_size_id
    or new.weight_kg is distinct from old.weight_kg
    or new.size_assessment_source is distinct from old.size_assessment_source
    or new.customer_estimated_size is distinct from old.customer_estimated_size;

  -- Customers can correct an estimate, but cannot grant themselves a verified status.
  if not v_is_staff then
    if new.staff_verified_size is distinct from old.staff_verified_size
      or new.size_verified_by is distinct from old.size_verified_by
      or new.size_verified_at is distinct from old.size_verified_at then
      raise exception 'Only active HappyTails staff may change size verification fields.' using errcode = '42501';
    end if;
    if new.size_assessment_source = 'staff_verified' and (old.size_assessment_source is distinct from 'staff_verified' or v_changed) then
      raise exception 'Only active HappyTails staff may verify a pet size.' using errcode = '42501';
    end if;
    if v_changed then
      -- An old verified status is invalidated when the customer revises the size.
      if new.size_assessment_source = 'staff_verified' then
        raise exception 'A customer size correction must be recorded as an estimate.' using errcode = '42501';
      end if;
      new.staff_verified_size := null;
      new.size_verified_by := null;
      new.size_verified_at := null;
    end if;
  end if;

  if new.size_assessment_source = 'customer_estimated' and nullif(trim(new.customer_estimated_size), '') is null then
    raise exception 'An estimated size must be provided.' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.happytails_guard_pet_size_assessment() from public;
drop trigger if exists happytails_guard_pet_size_assessment on public.pets;
create trigger happytails_guard_pet_size_assessment
before insert or update on public.pets
for each row execute function public.happytails_guard_pet_size_assessment();

comment on column public.pets.size_assessment_source is 'unknown, customer_estimated, or staff_verified. A customer estimate is not an in-person measurement.';
comment on column public.pets.customer_estimated_size is 'Provisional size for pricing/kennel planning; remains available after staff verification.';
