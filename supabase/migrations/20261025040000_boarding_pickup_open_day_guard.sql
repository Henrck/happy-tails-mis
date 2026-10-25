-- HappyTails boarding: both check-in and pickup must be on operating days.
-- Staging first. Prerequisites:
--   20261019030000_booking_closed_dates.sql
--   20261025010000_calendar_management_and_groomer_capacity.sql
--   20261025030000_boarding_kennel_capacity.sql
-- Existing appointments are not changed or cancelled.
begin;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='booking_closed_dates' and column_name='is_open_override'
  ) then
    raise exception 'Install Calendar Management holiday overrides before this boarding migration.';
  end if;
  if to_regclass('public.appointments') is null then
    raise exception 'Boarding pickup migration requires public.appointments.';
  end if;
end $$;

-- Check the shop's local calendar, not UTC. Pickup is checked even though
-- its day is EXCLUDED from the occupied-night range, which correctly allows
-- another pet to check in on the same checkout day when the store is open.
create or replace function public.happytails_validate_boarding_operating_days()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_arrival date;
  v_pickup date;
  v_reason text;
  v_arrival_time time;
  v_pickup_time time;
begin
  if new.service_type::text <> 'boarding' or new.status::text = 'cancelled' then
    return new;
  end if;

  -- Retain already accepted reservations when a shop closure is added later.
  -- New reservations and rescheduled/reopened reservations must pass current rules.
  if tg_op = 'UPDATE' then
    if old.service_type is not distinct from new.service_type
       and old.scheduled_date is not distinct from new.scheduled_date
       and old.drop_off_at is not distinct from new.drop_off_at
       and old.pick_up_at is not distinct from new.pick_up_at
       and old.status::text <> 'cancelled' then
      return new;
    end if;
  end if;

  if new.drop_off_at is null or new.pick_up_at is null then
    raise exception 'Boarding needs both a check-in and a pickup schedule.' using errcode='23514';
  end if;
  v_arrival := (new.drop_off_at at time zone 'Asia/Manila')::date;
  v_pickup := (new.pick_up_at at time zone 'Asia/Manila')::date;
  v_arrival_time := (new.drop_off_at at time zone 'Asia/Manila')::time;
  v_pickup_time := (new.pick_up_at at time zone 'Asia/Manila')::time;

  if v_pickup <= v_arrival or v_pickup - v_arrival not between 1 and 365
     or new.scheduled_date is distinct from v_arrival
     or new.pick_up_at <= new.drop_off_at then
    raise exception 'The selected boarding stay or pickup date is invalid.' using errcode='23514';
  end if;
  if v_arrival_time < time '09:00' or v_arrival_time > time '18:00'
     or v_pickup_time < time '09:00' or v_pickup_time > time '18:00' then
    raise exception 'Check-in and pickup must be between 9 AM and 6 PM (Philippine time).' using errcode='23514';
  end if;

  select d.name into v_reason from public.booking_closed_dates d
   where d.date = v_arrival and not d.is_open_override;
  if found then
    raise exception 'Check-in unavailable on %: store closed (%). Select another date.', v_arrival, v_reason using errcode='23514';
  end if;
  select d.name into v_reason from public.booking_closed_dates d
   where d.date = v_pickup and not d.is_open_override;
  if found then
    raise exception 'Pickup unavailable on %: store closed (%). Select another check-in date or duration.', v_pickup, v_reason using errcode='23514';
  end if;
  return new;
end;
$$;

revoke all on function public.happytails_validate_boarding_operating_days() from public, anon, authenticated;
drop trigger if exists happytails_boarding_open_days_guard on public.appointments;
create trigger happytails_boarding_open_days_guard
  before insert or update of service_type, status, scheduled_date, drop_off_at, pick_up_at
  on public.appointments for each row
  execute function public.happytails_validate_boarding_operating_days();
commit;
