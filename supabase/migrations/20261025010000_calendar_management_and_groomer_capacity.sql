-- HappyTails shared booking calendar and live grooming capacity.
-- Prerequisite: 20261019030000_booking_closed_dates.sql.
-- Keeps existing appointments intact. Apply this migration through Supabase.
begin;

alter table public.booking_closed_dates
  add column if not exists is_open_override boolean not null default false;

-- Holidays remain recorded even when the store elects to operate. The audit
-- metadata and official holiday identity are retained.
create or replace function public.happytails_set_holiday_open(p_date date, p_open boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_category text;
begin
  if not exists (select 1 from public.profiles p where p.id=auth.uid() and p.role::text='superadmin') then
    raise exception 'Only Superadmin may override an official holiday' using errcode='42501';
  end if;
  select d.category into v_category from public.booking_closed_dates d where d.date=p_date for update;
  if v_category is null or v_category not in ('regular_holiday','special_non_working') then
    raise exception 'This date is not an official holiday';
  end if;
  update public.booking_closed_dates d set is_open_override=p_open where d.date=p_date;
end; $$;
revoke all on function public.happytails_set_holiday_open(date,boolean) from public,anon;
grant execute on function public.happytails_set_holiday_open(date,boolean) to authenticated;

-- Enforce the EFFECTIVE calendar state for all appointment creation paths,
-- including the atomic booking RPC. Holiday overrides only affect NEW bookings.
create or replace function public.happytails_reject_closed_appointment_date()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare v_reason text;
begin
  select d.name into v_reason from public.booking_closed_dates d
    where d.date=new.scheduled_date and not d.is_open_override;
  if v_reason is not null then
    raise exception 'HappyTails is closed on % (%). Please choose another date.',new.scheduled_date,v_reason
      using errcode='23514';
  end if;
  return new;
end; $$;

-- Staff (admin) and Superadmin may maintain the groomer roster.
-- These policies are additive; existing RLS is not disabled or loosened globally.
grant select, insert, update on public.groomers to authenticated;
alter table public.groomers enable row level security;
drop policy if exists happytails_groomers_authenticated_read on public.groomers;
create policy happytails_groomers_authenticated_read on public.groomers for select to authenticated using (true);
drop policy if exists happytails_groomers_staff_insert on public.groomers;
create policy happytails_groomers_staff_insert on public.groomers for insert to authenticated
with check (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role::text in ('admin','superadmin')));
drop policy if exists happytails_groomers_staff_update on public.groomers;
create policy happytails_groomers_staff_update on public.groomers for update to authenticated
using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role::text in ('admin','superadmin')))
with check (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role::text in ('admin','superadmin')));

-- Aggregated live capacity, no customer details disclosed. Cancelled bookings
-- free their slot. Each appointment_pets row consumes one pet start slot.
create or replace function public.happytails_live_groomer_slots(p_date date)
returns table(slot_time text, capacity integer, booked integer, remaining integer)
language sql stable security definer set search_path = '' as $$
  with active as (
    select count(*)::integer as n from public.groomers where status::text='active'
  ), slots as (
    select to_char(gs,'HH24:MI') as t
    from generate_series(timestamp '2000-01-01 09:00',timestamp '2000-01-01 17:00',interval '30 minutes') gs
  ), bookings as (
    select to_char(a.scheduled_time::time,'HH24:MI') as t, count(ap.id)::integer as n
    from public.appointments a join public.appointment_pets ap on ap.appointment_id=a.id
    where a.scheduled_date=p_date
      and a.service_type::text in ('dog_grooming','cat_grooming')
      and a.status::text <> 'cancelled'
    group by a.scheduled_time
  )
  select s.t, active.n,coalesce(b.n,0),greatest(0,active.n-coalesce(b.n,0))
    from slots s cross join active left join bookings b on b.t=s.t
    order by s.t;
$$;
revoke all on function public.happytails_live_groomer_slots(date) from public,anon;
grant execute on function public.happytails_live_groomer_slots(date) to authenticated;

-- Monthly day totals for calendar labels. A day is red/Full when no starts
-- have capacity, or when no groomers are active. The client also checks
-- current-day past times locally using Asia/Manila time.
create or replace function public.happytails_groomer_month_availability(p_first_day date)
returns table(day date, open_slots integer, capacity integer)
language sql stable security definer set search_path = '' as $$
  with active as (select count(*)::integer n from public.groomers where status::text='active'),
  dates as (select gs::date d from generate_series(date_trunc('month',p_first_day::timestamp),
      (date_trunc('month',p_first_day::timestamp)+interval '1 month - 1 day'),interval '1 day') gs),
  starts as (select to_char(gs,'HH24:MI') t from generate_series(timestamp '2000-01-01 09:00',timestamp '2000-01-01 17:00',interval '30 minutes') gs),
  booked as (
    select a.scheduled_date d,to_char(a.scheduled_time::time,'HH24:MI') t,count(ap.id)::integer n
    from public.appointments a join public.appointment_pets ap on ap.appointment_id=a.id
    where a.scheduled_date>=date_trunc('month',p_first_day::timestamp)::date
      and a.scheduled_date<(date_trunc('month',p_first_day::timestamp)+interval '1 month')::date
      and a.service_type::text in ('dog_grooming','cat_grooming') and a.status::text <> 'cancelled'
    group by a.scheduled_date,a.scheduled_time
  )
  select dates.d, count(*) filter (where active.n>coalesce(booked.n,0))::integer,active.n
  from dates cross join starts cross join active
  left join booked on booked.d=dates.d and booked.t=starts.t
  group by dates.d,active.n order by dates.d;
$$;
revoke all on function public.happytails_groomer_month_availability(date) from public,anon;
grant execute on function public.happytails_groomer_month_availability(date) to authenticated;

-- Prevent overbooking even if two clients simultaneously choose the same
-- timeslot or old UI code is used. Transaction advisory lock serializes writes.
create or replace function public.happytails_check_active_groomer_capacity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_date date;v_time text;v_service text;v_status text;v_cap int;v_taken int;
begin
  select a.scheduled_date,to_char(a.scheduled_time::time,'HH24:MI'),a.service_type::text,a.status::text
    into v_date,v_time,v_service,v_status from public.appointments a where a.id=new.appointment_id;
  if v_service not in ('dog_grooming','cat_grooming') or v_status='cancelled' then return new;end if;
  if v_time is null then raise exception 'Grooming requires a scheduled start time';end if;
  perform pg_advisory_xact_lock(hashtext('happytails-grooming:'||v_date::text||':'||v_time));
  select count(*)::int into v_cap from public.groomers g where g.status::text='active';
  select count(*)::int into v_taken
    from public.appointment_pets ap join public.appointments a on a.id=ap.appointment_id
    where a.scheduled_date=v_date and to_char(a.scheduled_time::time,'HH24:MI')=v_time
      and a.service_type::text in ('dog_grooming','cat_grooming') and a.status::text<>'cancelled'
      and (tg_op='INSERT' or ap.id is distinct from new.id);
  if v_taken>=v_cap then
    raise exception 'The % grooming slot on % is full (% active groomers). Please choose another time.',v_time,v_date,v_cap
      using errcode='23514';
  end if;
  return new;
end; $$;
drop trigger if exists happytails_active_groomer_slot_guard on public.appointment_pets;
create trigger happytails_active_groomer_slot_guard
before insert or update of appointment_id on public.appointment_pets
for each row execute function public.happytails_check_active_groomer_capacity();


-- Rescheduling an existing grooming appointment must respect the same cap.
-- Changing status or other appointment details alone never revalidates old slots.
create or replace function public.happytails_check_grooming_reschedule_capacity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_cap integer; v_taken integer; v_time text;
begin
  if new.service_type::text not in ('dog_grooming','cat_grooming')
     or new.status::text='cancelled'
     or (old.scheduled_date is not distinct from new.scheduled_date
          and old.scheduled_time is not distinct from new.scheduled_time) then
    return new;
  end if;
  if new.scheduled_time is null then raise exception 'Grooming requires a start time'; end if;
  v_time:=to_char(new.scheduled_time::time,'HH24:MI');
  perform pg_advisory_xact_lock(hashtext('happytails-grooming:'||new.scheduled_date::text||':'||v_time));
  select count(*)::integer into v_cap from public.groomers where status::text='active';
  select count(*)::integer into v_taken from public.appointment_pets ap
    join public.appointments a on a.id=ap.appointment_id
    where a.scheduled_date=new.scheduled_date
      and to_char(a.scheduled_time::time,'HH24:MI')=v_time
      and a.service_type::text in ('dog_grooming','cat_grooming')
      and a.status::text <> 'cancelled';
  if v_taken > v_cap then
    raise exception 'Not enough active groomers on % at %: % pets already booked, % slots.',
      new.scheduled_date,v_time,v_taken,v_cap using errcode='23514';
  end if;
  return new;
end; $$;
drop trigger if exists happytails_grooming_reschedule_capacity_guard on public.appointments;
create trigger happytails_grooming_reschedule_capacity_guard
  after update of scheduled_date, scheduled_time on public.appointments
  for each row execute function public.happytails_check_grooming_reschedule_capacity();

commit;
