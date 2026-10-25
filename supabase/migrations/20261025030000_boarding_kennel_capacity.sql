-- HappyTails: one kennel per boarding pet, reserved for EVERY night of the stay.
-- Apply in Supabase SQL Editor on STAGING first. Keep the existing booking
-- and holiday migrations installed. No existing appointments are deleted.
-- Staff may add/remove kennels in Pet Services; there is no fixed 6/2 cap.
begin;

-- Fail closed if the expected booking schema is different.
do $$
declare missing text;
begin
  select string_agg(t||'.'||c, ', ') into missing
  from (values
    ('appointments','id'),('appointments','service_type'),('appointments','status'),
    ('appointments','scheduled_date'),('appointments','drop_off_at'),('appointments','pick_up_at'),
    ('appointment_pets','id'),('appointment_pets','appointment_id'),('appointment_pets','pet_id'),
    ('appointment_pets','package_id'),('appointment_pets','package_pricing_id'),('appointment_pets','kennel_id'),
    ('kennels','id'),('kennels','size'),('kennels','number'),
    ('pets','id'),('pets','size_label'),('packages','id'),('packages','name'),
    ('package_pricing','id'),('package_pricing','package_id'),
    ('package_pricing','is_per_night'),('package_pricing','nights')
  ) as required(t,c)
  where not exists(select 1 from information_schema.columns i
    where i.table_schema='public' and i.table_name=required.t and i.column_name=required.c);
  if missing is not null then raise exception 'Boarding migration: required columns missing: %', missing; end if;
end $$;

-- Soft-disable physical kennels instead of deleting audit/history references.
alter table public.kennels add column if not exists is_active boolean not null default true;

create index if not exists ht_boarding_kennel_ref_idx on public.appointment_pets(kennel_id,appointment_id)
  where kennel_id is not null;
create index if not exists ht_boarding_stay_idx on public.appointments(drop_off_at,pick_up_at)
  where drop_off_at is not null and pick_up_at is not null;

-- Authoritative availability for an entire stay: [drop-off DATE, pickup DATE).
-- Check-out on Oct 31 releases that kennel for new Oct 31 drop-offs.
-- One pet occupies one kennel; we intentionally do NOT assume sharing.
create or replace function public.happytails_boarding_stay_capacity(
  p_date date, p_size text, p_nights integer
) returns table(total integer, remaining integer)
language sql stable security definer set search_path = '' as $$
  select count(*)::integer,
    count(*) filter (where not exists (
      select 1 from public.appointment_pets ap
      join public.appointments a on a.id=ap.appointment_id
      where ap.kennel_id=k.id and a.service_type::text='boarding'
        and a.status::text <> 'cancelled'
        and (a.drop_off_at at time zone 'Asia/Manila')::date < p_date+p_nights
        and (a.pick_up_at at time zone 'Asia/Manila')::date > p_date
    ))::integer
  from public.kennels k
  where k.is_active and k.size::text=p_size and p_size in ('small','big')
    and p_date is not null and p_nights between 1 and 365;
$$;
revoke all on function public.happytails_boarding_stay_capacity(date,text,integer) from public,anon;
grant execute on function public.happytails_boarding_stay_capacity(date,text,integer) to authenticated;

-- Calendars query one month, for the chosen kennel size + stay duration.
-- Only aggregated counts are disclosed; no private guest data is returned.
create or replace function public.happytails_boarding_month_availability(
  p_first_day date, p_size text, p_nights integer
) returns table(day date,total integer,remaining integer)
language sql stable security definer set search_path = '' as $$
  select dates.day::date, counts.total, counts.remaining
  from generate_series(
    date_trunc('month',p_first_day::timestamp)::timestamp,
    (date_trunc('month',p_first_day::timestamp)+interval '1 month - 1 day')::timestamp,
    interval '1 day'
  ) as dates(day)
  cross join lateral public.happytails_boarding_stay_capacity(dates.day::date,p_size,p_nights) as counts
  where p_first_day is not null and p_size in ('small','big') and p_nights between 1 and 365
  order by dates.day;
$$;
revoke all on function public.happytails_boarding_month_availability(date,text,integer) from public,anon;
grant execute on function public.happytails_boarding_month_availability(date,text,integer) to authenticated;

-- The trigger is the FINAL gate. Concurrent customers cannot both take the
-- last kennel: allocation and the overlapping-reservation check are locked
-- for the entire database transaction. Neither UI nor a direct RPC bypasses it.
create or replace function public.happytails_assign_boarding_kennel()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  a record;
  v_package_name text;
  v_size text;
  v_pet_size text;
  v_pricing record;
  v_start date;
  v_end date;
  v_nights integer;
  v_choice uuid;
begin
  select service_type::text as service,status::text as status,
         scheduled_date,drop_off_at,pick_up_at
  into a from public.appointments where id=new.appointment_id;
  if not found then raise exception 'Appointment was not found'; end if;
  if a.service <> 'boarding' then return new; end if;
  if a.status = 'cancelled' then return new; end if;

  if a.drop_off_at is null or a.pick_up_at is null then
    raise exception 'Boarding requires both drop-off and pickup before saving.' using errcode='23514';
  end if;
  v_start := (a.drop_off_at at time zone 'Asia/Manila')::date;
  v_end   := (a.pick_up_at at time zone 'Asia/Manila')::date;
  v_nights := v_end-v_start;
  if v_nights not between 1 and 365 or a.pick_up_at <= a.drop_off_at
     or a.scheduled_date is distinct from v_start then
    raise exception 'Boarding dates are inconsistent; choose a valid 1–365 night stay.' using errcode='23514';
  end if;

  select lower(p.name) into v_package_name from public.packages p where p.id=new.package_id;
  if v_package_name is null then raise exception 'Choose a valid boarding kennel package.' using errcode='23514'; end if;
  v_size := case
    when v_package_name ~ '(^|[^a-z])small([^a-z]|$)' and v_package_name !~ '(^|[^a-z])(big|large)([^a-z]|$)' then 'small'
    when v_package_name ~ '(^|[^a-z])(big|large)([^a-z]|$)' and v_package_name !~ '(^|[^a-z])small([^a-z]|$)' then 'big'
    else null end;
  if v_size is null then
    raise exception 'Cannot identify Small/Big Kennel from package name: %',v_package_name using errcode='23514';
  end if;
  select pp.package_id, pp.is_per_night, pp.nights into v_pricing
    from public.package_pricing pp where pp.id=new.package_pricing_id;
  if not found or v_pricing.package_id is distinct from new.package_id then
    raise exception 'The selected boarding duration does not match its kennel package.' using errcode='23514';
  end if;
  if v_pricing.is_per_night and v_nights < 7 then
    raise exception '7 Days & Up requires at least 7 nights.' using errcode='23514';
  end if;
  if not v_pricing.is_per_night and v_pricing.nights is not null and v_pricing.nights <> v_nights then
    raise exception 'The selected boarding package requires % nights.',v_pricing.nights using errcode='23514';
  end if;
  select lower(trim(p.size_label)) into v_pet_size from public.pets p where p.id=new.pet_id;
  if v_pet_size is null then raise exception 'Cannot verify the boarding pet size.' using errcode='23514'; end if;
  if v_size='small' and v_pet_size not in ('small','medium') then
    raise exception 'Large and larger pets require a Big Kennel.' using errcode='23514';
  end if;

  perform pg_advisory_xact_lock(786533,2601);
  -- Retain the existing kennel if it still fits, otherwise reassign. A
  -- browser-supplied kennel ID does not grant the right to overbook it.
  select k.id into v_choice from public.kennels k
  where k.is_active and k.size::text=v_size
    and (new.kennel_id is null or k.id=new.kennel_id)
    and not exists (
      select 1 from public.appointment_pets ap
      join public.appointments olda on olda.id=ap.appointment_id
      where ap.kennel_id=k.id and ap.id is distinct from new.id
        and olda.service_type::text='boarding' and olda.status::text<>'cancelled'
        and (olda.drop_off_at at time zone 'Asia/Manila')::date < v_end
        and (olda.pick_up_at at time zone 'Asia/Manila')::date > v_start
    ) order by k.number,k.id limit 1;
  if v_choice is null and new.kennel_id is not null then
    -- Preserve selected room if possible; otherwise find another room.
    select k.id into v_choice from public.kennels k
    where k.is_active and k.size::text=v_size and not exists (
      select 1 from public.appointment_pets ap
      join public.appointments olda on olda.id=ap.appointment_id
      where ap.kennel_id=k.id and ap.id is distinct from new.id
        and olda.service_type::text='boarding' and olda.status::text<>'cancelled'
        and (olda.drop_off_at at time zone 'Asia/Manila')::date < v_end
        and (olda.pick_up_at at time zone 'Asia/Manila')::date > v_start
    ) order by k.number,k.id limit 1;
  end if;
  if v_choice is null then
    raise exception 'All % kennels are fully booked for % to % (% nights). Choose another date or kennel size.',
      case when v_size='big' then 'Big' else 'Small' end, v_start, v_end, v_nights
      using errcode='23514';
  end if;
  new.kennel_id := v_choice;
  return new;
end $$;

drop trigger if exists happytails_boarding_kennel_assignment_guard on public.appointment_pets;
create trigger happytails_boarding_kennel_assignment_guard
before insert or update of appointment_id,kennel_id,pet_id,package_id,package_pricing_id
on public.appointment_pets for each row
execute function public.happytails_assign_boarding_kennel();

-- Rescheduling and restoring cancelled appointments must also be checked.
-- An UPDATE which fails capacity validation is rolled back atomically.
create or replace function public.happytails_recheck_boarding_reschedule()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_pet record;
begin
  if new.service_type::text <> 'boarding' or new.status::text='cancelled' then return new; end if;
  if old.service_type is distinct from new.service_type
     or old.status::text='cancelled'
     or old.drop_off_at is distinct from new.drop_off_at
     or old.pick_up_at is distinct from new.pick_up_at
     or old.scheduled_date is distinct from new.scheduled_date then
    perform pg_advisory_xact_lock(786533,2601);
    for v_pet in select id from public.appointment_pets where appointment_id=new.id order by id loop
      update public.appointment_pets set kennel_id=null where id=v_pet.id;
    end loop;
  end if;
  return new;
end $$;
drop trigger if exists happytails_boarding_reschedule_guard on public.appointments;
create trigger happytails_boarding_reschedule_guard
  after update of service_type,status,scheduled_date,drop_off_at,pick_up_at
  on public.appointments for each row
  execute function public.happytails_recheck_boarding_reschedule();

-- A kennel referenced by booking history must not silently disappear or
-- change size. Add new kennels instead of deleting already-used ones.
create or replace function public.happytails_protect_assigned_kennel()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(786533,2601);
  if exists(select 1 from public.appointment_pets where kennel_id=old.id) then
    raise exception 'This kennel has appointment history and cannot be removed or resized. Keep it on record.' using errcode='23514';
  end if;
  return old;
end $$;
drop trigger if exists happytails_protect_kennel_delete on public.kennels;
create trigger happytails_protect_kennel_delete before delete on public.kennels
for each row execute function public.happytails_protect_assigned_kennel();
drop trigger if exists happytails_protect_kennel_resize on public.kennels;
create trigger happytails_protect_kennel_resize before update of size on public.kennels
for each row when (old.size is distinct from new.size)
execute function public.happytails_protect_assigned_kennel();

-- Only an active Admin/Staff or Superadmin may activate/deactivate rooms.
-- An upcoming confirmed booking blocks deactivation, so existing guests keep
-- their reserved accommodation. Room history is never deleted.
create or replace function public.happytails_set_kennel_active(p_kennel_id uuid, p_active boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_kennel_id is null or p_active is null then raise exception 'Specify a kennel and state'; end if;
  if not exists (
    select 1 from public.profiles p join public.staff_profiles s on s.id=p.id
    where p.id=auth.uid() and p.role::text in ('admin','superadmin') and s.status::text='active'
  ) then raise exception 'Only active staff may change kennel availability' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(786533,2601);
  if not p_active and exists (
    select 1 from public.appointment_pets ap
    join public.appointments a on a.id=ap.appointment_id
    where ap.kennel_id=p_kennel_id and a.service_type::text='boarding'
      and a.status::text <> 'cancelled'
      and (a.pick_up_at at time zone 'Asia/Manila')::date > (now() at time zone 'Asia/Manila')::date
  ) then
    raise exception 'This kennel has an active/upcoming boarding reservation. It cannot be disabled until that stay ends.' using errcode='23514';
  end if;
  update public.kennels set is_active=p_active where id=p_kennel_id;
  if not found then raise exception 'Kennel not found'; end if;
end $$;
revoke all on function public.happytails_set_kennel_active(uuid,boolean) from public,anon;
grant execute on function public.happytails_set_kennel_active(uuid,boolean) to authenticated;

-- Direct table updates must meet the same rules; the management RPC is
-- NOT the only possible database write path.
create or replace function public.happytails_guard_kennel_active_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.profiles p join public.staff_profiles s on s.id=p.id
    where p.id=auth.uid() and p.role::text in ('admin','superadmin') and s.status::text='active'
  ) then raise exception 'Only active staff may change kennel availability' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(786533,2601);
  if new.is_active=false and exists (
    select 1 from public.appointment_pets ap
    join public.appointments a on a.id=ap.appointment_id
    where ap.kennel_id=old.id and a.service_type::text='boarding'
      and a.status::text<>'cancelled'
      and (a.pick_up_at at time zone 'Asia/Manila')::date > (now() at time zone 'Asia/Manila')::date
  ) then
    raise exception 'Kennel has an active/upcoming booking; it cannot be disabled.' using errcode='23514';
  end if;
  return new;
end $$;
drop trigger if exists happytails_kennel_active_update_guard on public.kennels;
create trigger happytails_kennel_active_update_guard
before update of is_active on public.kennels
for each row when (old.is_active is distinct from new.is_active)
execute function public.happytails_guard_kennel_active_update();

-- Previously saved bookings may have no room assigned. Allocate historical
-- future stays in order. If they overrun actual inventory this migration
-- FAILS rather than presenting misleading free capacity.
do $$
declare v record;
begin
  for v in
    select ap.id from public.appointment_pets ap
    join public.appointments a on a.id=ap.appointment_id
    where a.service_type::text='boarding' and a.status::text<>'cancelled'
      and (a.scheduled_date >= (now() at time zone 'Asia/Manila')::date
        or (a.pick_up_at at time zone 'Asia/Manila')::date > (now() at time zone 'Asia/Manila')::date
        or (a.status::text='checked_in' and a.pick_up_at is null))
      and ap.kennel_id is null
    order by a.drop_off_at nulls last,ap.id
  loop
    update public.appointment_pets set kennel_id=null where id=v.id;
  end loop;
end $$;
commit;
