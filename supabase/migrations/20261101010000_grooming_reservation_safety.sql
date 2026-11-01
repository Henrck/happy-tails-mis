-- HappyTails grooming reservation safety. Apply after the 2026-10-25 groomer capacity migration.
-- Review and configure all package durations BEFORE accepting bookings with the new UI.
-- Existing appointments and their quoted amounts are not deleted or repriced.
begin;

create table if not exists public.grooming_package_durations (
  package_id uuid primary key references public.packages(id) on delete restrict,
  duration_minutes integer not null default 30 check (duration_minutes between 30 and 480 and duration_minutes % 30 = 0),
  verified boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.grooming_package_durations(package_id,duration_minutes,verified)
select p.id,30,false from public.packages p
where p.service_type::text in ('dog_grooming','cat_grooming')
on conflict (package_id) do nothing;
alter table public.grooming_package_durations enable row level security;
drop policy if exists grooming_duration_read on public.grooming_package_durations;
create policy grooming_duration_read on public.grooming_package_durations for select to authenticated using (true);
drop policy if exists grooming_duration_manage on public.grooming_package_durations;
create policy grooming_duration_manage on public.grooming_package_durations for all to authenticated
  using (exists (select 1 from public.profiles x where x.id=auth.uid() and x.role::text in ('admin','superadmin')))
  with check (exists (select 1 from public.profiles x where x.id=auth.uid() and x.role::text in ('admin','superadmin')));
grant select,insert,update on public.grooming_package_durations to authenticated;

-- Specific shifts and leave dates can be configured without changing groomer employment status.
create table if not exists public.groomer_time_off (
  id uuid primary key default gen_random_uuid(),
  groomer_id uuid not null references public.groomers(id) on delete restrict,
  off_date date not null,
  start_time time not null default '09:00',
  end_time time not null default '18:00',
  reason text,
  created_at timestamptz not null default now(),
  constraint grooming_time_off_valid check(start_time < end_time)
);
create index if not exists grooming_time_off_lookup on public.groomer_time_off(groomer_id,off_date);
alter table public.groomer_time_off enable row level security;
drop policy if exists groomer_time_off_read on public.groomer_time_off;
create policy groomer_time_off_read on public.groomer_time_off for select to authenticated using (true);
drop policy if exists groomer_time_off_manage on public.groomer_time_off;
create policy groomer_time_off_manage on public.groomer_time_off for all to authenticated
  using (exists (select 1 from public.profiles x where x.id=auth.uid() and x.role::text in ('admin','superadmin')))
  with check (exists (select 1 from public.profiles x where x.id=auth.uid() and x.role::text in ('admin','superadmin')));
grant select,insert,update,delete on public.groomer_time_off to authenticated;

-- Immutable scheduling snapshot. Old bookings receive the configured duration for analysis,
-- but their previous groomer assignment and price are never changed here.
alter table public.appointment_pets add column if not exists grooming_duration_minutes integer;
create index if not exists happytails_grooming_reservation_slot_idx on public.appointments(scheduled_date,scheduled_time);
create index if not exists happytails_grooming_assignment_idx on public.appointment_pets(groomer_id,appointment_id);
update public.appointment_pets ap set grooming_duration_minutes=d.duration_minutes
from public.appointments a, public.package_pricing pp, public.grooming_package_durations d
where ap.appointment_id=a.id and ap.package_pricing_id=pp.id and pp.package_id=d.package_id
and a.service_type::text in ('dog_grooming','cat_grooming') and ap.grooming_duration_minutes is null;

-- All new plans use the actual configured duration; never silently interpret every
-- grooming package as a 30-minute appointment. Admin must verify each duration.
create or replace function public.happytails_grooming_duration(p_pricing_id uuid)
returns integer language plpgsql stable security definer set search_path='' as $$
declare v_minutes int;
begin
  select d.duration_minutes into v_minutes from public.package_pricing pp
  join public.packages p on p.id=pp.package_id
  join public.grooming_package_durations d on d.package_id=p.id
  where pp.id=p_pricing_id and p.service_type::text in ('dog_grooming','cat_grooming')
    and p.is_active and d.verified;
  if v_minutes is null then
    raise exception 'Grooming package duration has not been verified by an administrator. Configure it in Pet Services > Grooming.';
  end if;
  return v_minutes;
end $$;
revoke all on function public.happytails_grooming_duration(uuid) from public,anon;
grant execute on function public.happytails_grooming_duration(uuid) to authenticated;

-- Availability depends on (a) reserved groomer, (b) full occupied interval,
-- (c) legacy bookings with no assigned groomer, and (d) staff time off.
create or replace function public.happytails_groomer_is_free(
  p_groomer_id uuid,p_date date,p_start time,p_duration integer,p_ignore_appointment uuid default null)
returns boolean language plpgsql volatile security definer set search_path='' as $$
declare v_end timestamp;v_count int;v_capacity int;
begin
  if p_start < time '09:00' or p_duration is null or p_duration<30 or p_duration>480
     or p_start + (p_duration||' minutes')::interval > time '18:00' then return false; end if;
  if not exists(select 1 from public.groomers g where g.id=p_groomer_id and g.status::text='active') then return false; end if;
  if exists(select 1 from public.groomer_time_off t where t.groomer_id=p_groomer_id
     and t.off_date=p_date and t.start_time < p_start + (p_duration||' minutes')::interval
     and t.end_time>p_start) then return false;end if;
  v_end := p_date+p_start+(p_duration||' minutes')::interval;
  if exists (
    select 1 from public.appointment_pets ap
    join public.appointments a on a.id=ap.appointment_id
    where ap.groomer_id=p_groomer_id and a.scheduled_date=p_date
      and a.status::text <> 'cancelled' and a.service_type::text in ('dog_grooming','cat_grooming')
      and (p_ignore_appointment is null or a.id<>p_ignore_appointment)
      and a.scheduled_date+a.scheduled_time::time < v_end
      and a.scheduled_date+a.scheduled_time::time
        + (coalesce(ap.grooming_duration_minutes,30)||' minutes')::interval > p_date+p_start
  ) then return false;end if;
  -- Unassigned legacy bookings still consume headcount across their duration.
  -- Demand at every half-hour boundary must be less than active staff on duty.
  for v_count in 0..(p_duration/30-1) loop
    select count(*)::integer into v_capacity from public.groomers g where g.status::text='active'
      and not exists(select 1 from public.groomer_time_off t where t.groomer_id=g.id
        and t.off_date=p_date and t.start_time<=p_start+(v_count*interval '30 minutes')
        and t.end_time>p_start+(v_count*interval '30 minutes'));
    if (select count(*) from public.appointment_pets ap join public.appointments a on a.id=ap.appointment_id
        where a.scheduled_date=p_date and a.service_type::text in ('dog_grooming','cat_grooming')
          and a.status::text<>'cancelled' and (p_ignore_appointment is null or a.id<>p_ignore_appointment)
          and a.scheduled_time::time<=p_start+(v_count*interval '30 minutes')
          and a.scheduled_time::time + (coalesce(ap.grooming_duration_minutes,30)||' minutes')::interval > p_start+(v_count*interval '30 minutes')
       ) >= v_capacity then return false;end if;
  end loop;
  return true;
end $$;
revoke all on function public.happytails_groomer_is_free(uuid,date,time,integer,uuid) from public,anon;
grant execute on function public.happytails_groomer_is_free(uuid,date,time,integer,uuid) to authenticated;

create or replace function public.happytails_groomer_choices_v2(
  p_date date,p_time text,p_pricing_id uuid)
returns table(groomer_id uuid,groomer_name text,available boolean)
language plpgsql stable security definer set search_path='' as $$
declare v_minutes int;
begin
  v_minutes := public.happytails_grooming_duration(p_pricing_id);
  return query select g.id,g.name::text,
    public.happytails_groomer_is_free(g.id,p_date,p_time::time,v_minutes,null)
    from public.groomers g where g.status::text='active' order by g.name;
end $$;
revoke all on function public.happytails_groomer_choices_v2(date,text,uuid) from public,anon;
grant execute on function public.happytails_groomer_choices_v2(date,text,uuid) to authenticated;

-- A multi-pet plan preserves pet order. Choosing the same groomer for consecutive
-- 30-minute packages yields 09:00 then 09:30, but longer packages start later.
create or replace function public.happytails_grooming_plan_v2(
  p_date date,p_pricing_ids uuid[],p_preferred_start text,p_groomer_ids uuid[])
returns table("index" integer,"time" text,"durationMinutes" integer,"endTime" text,"groomerId" uuid)
language plpgsql stable security definer set search_path='' as $$
declare i int;v_length int;v_minutes int;v_t time;v_assigned uuid;v_pref uuid;
  v_draft jsonb:='[]'::jsonb;g record;v_blocked boolean;v_start time;v_tick time;v_cap int;v_busy int;v_draft_busy int;
begin
  v_length:=coalesce(array_length(p_pricing_ids,1),0);
  if v_length<1 or v_length>30 or coalesce(array_length(p_groomer_ids,1),0)<>v_length then
    raise exception 'Grooming plan needs one pricing and groomer entry per pet';end if;
  v_start:=p_preferred_start::time;
  if v_start<time '09:00' or v_start>time '17:00'
     or extract(minute from v_start)::integer % 30<>0 then
    raise exception 'Select a 30-minute start slot between 09:00 and 17:00';end if;
  for i in 1..v_length loop
    v_minutes:=public.happytails_grooming_duration(p_pricing_ids[i]);
    v_pref:=p_groomer_ids[i];v_assigned:=null;
    for v_t in select gs::time from generate_series(
      p_date+v_start,p_date+time '17:00',interval '30 minutes') gs loop
      if v_t+(v_minutes||' minutes')::interval>time '18:00' then continue;end if;
      for g in select id from public.groomers where status::text='active'
          and (v_pref is null or id=v_pref) order by name loop
        if not public.happytails_groomer_is_free(g.id,p_date,v_t,v_minutes,null) then continue;end if;
        select exists(select 1 from jsonb_array_elements(v_draft) d
          where (d->>'groomer')::uuid=g.id
            and (d->>'start')::time < v_t+(v_minutes||' minutes')::interval
            and (d->>'finish')::time > v_t) into v_blocked;
        if v_blocked then continue;end if;
        v_blocked:=false;
        for v_tick in select gs::time from generate_series(
          p_date+v_t,p_date+v_t+(v_minutes-30)*interval '1 minute',interval '30 minutes') gs loop
          select count(*)::int into v_cap from public.groomers staff
            where staff.status::text='active'
            and not exists(select 1 from public.groomer_time_off o where o.groomer_id=staff.id
              and o.off_date=p_date and o.start_time<=v_tick and o.end_time>v_tick);
          select count(*)::int into v_busy from public.appointment_pets ap
            join public.appointments a on a.id=ap.appointment_id
            where a.scheduled_date=p_date and a.service_type::text in ('dog_grooming','cat_grooming')
              and a.status::text<>'cancelled' and a.scheduled_time::time<=v_tick
              and a.scheduled_time::time+(coalesce(ap.grooming_duration_minutes,30)||' minutes')::interval>v_tick;
          select count(*)::int into v_draft_busy from jsonb_array_elements(v_draft) d
            where (d->>'start')::time<=v_tick and (d->>'finish')::time>v_tick;
          if v_busy+v_draft_busy+1>v_cap then v_blocked:=true;exit;end if;
        end loop;
        if v_blocked then continue;end if;
        v_assigned:=g.id;exit;
      end loop;
      if v_assigned is not null then exit;end if;
    end loop;
    if v_assigned is null then raise exception 'No compatible grooming slot remains for pet % and the selected groomer. Choose a different time or groomer.',i;end if;
    v_draft:=v_draft||jsonb_build_array(jsonb_build_object(
      'groomer',v_assigned::text,'start',v_t::text,
      'finish',(v_t+(v_minutes||' minutes')::interval)::text));
    "index":=i-1;"time":=to_char(v_t,'HH24:MI');"durationMinutes":=v_minutes;
    "endTime":=to_char(v_t+(v_minutes||' minutes')::interval,'HH24:MI');"groomerId":=v_assigned;
    return next;
  end loop;
end $$;
revoke all on function public.happytails_grooming_plan_v2(date,uuid[],text,uuid[]) from public,anon;
grant execute on function public.happytails_grooming_plan_v2(date,uuid[],text,uuid[]) to authenticated;

-- Serialize reservations for each date. The original start-only guard remains in place;
-- this trigger adds full-interval and per-groomer protection.
create or replace function public.happytails_reserve_groomer_v2()
returns trigger language plpgsql security definer set search_path='' as $$
declare a record;v_duration int;g record;v_groomer uuid;
begin
  select scheduled_date,scheduled_time,status,service_type into a
    from public.appointments where id=new.appointment_id;
  if a.service_type::text not in ('dog_grooming','cat_grooming') or a.status::text='cancelled' then return new;end if;
  perform pg_advisory_xact_lock(hashtext('ht-grooming-day:'||a.scheduled_date::text));
  if a.scheduled_time is null or new.package_pricing_id is null then
    raise exception 'Grooming needs a selected package rate and start time';end if;
  if tg_op='INSERT' then
    new.grooming_duration_minutes:=public.happytails_grooming_duration(new.package_pricing_id);
  elsif new.package_pricing_id is distinct from old.package_pricing_id then
    new.grooming_duration_minutes:=public.happytails_grooming_duration(new.package_pricing_id);
  end if;
  v_duration:=new.grooming_duration_minutes;
  if v_duration is null then raise exception 'Missing grooming duration';end if;
  if new.groomer_id is null then
    for g in select id from public.groomers where status::text='active' order by name loop
      if public.happytails_groomer_is_free(g.id,a.scheduled_date,a.scheduled_time::time,v_duration,
        case when tg_op='UPDATE' then new.appointment_id else null end) then
        v_groomer:=g.id;exit;end if;
    end loop;
    new.groomer_id:=v_groomer;
  end if;
  if new.groomer_id is null or not public.happytails_groomer_is_free(
      new.groomer_id,a.scheduled_date,a.scheduled_time::time,v_duration,
      case when tg_op='UPDATE' then new.appointment_id else null end) then
    raise exception 'Selected groomer is already reserved or the grooming duration exceeds availability. Refresh the schedule.' using errcode='23514';
  end if;
  return new;
end $$;
drop trigger if exists happytails_reserve_groomer_v2_guard on public.appointment_pets;
create trigger happytails_reserve_groomer_v2_guard before insert or update of
  appointment_id,package_pricing_id,groomer_id on public.appointment_pets
  for each row execute function public.happytails_reserve_groomer_v2();

-- Existing appointment time edits cannot bypass occupied-time checks.
create or replace function public.happytails_recheck_groomer_reschedule_v2()
returns trigger language plpgsql security definer set search_path='' as $$
declare p record;
begin
  if new.service_type::text not in ('dog_grooming','cat_grooming') or new.status::text='cancelled'
    or (new.scheduled_date=old.scheduled_date and new.scheduled_time is not distinct from old.scheduled_time) then return new;end if;
  perform pg_advisory_xact_lock(hashtext('ht-grooming-day:'||new.scheduled_date::text));
  for p in select groomer_id,coalesce(grooming_duration_minutes,30) as duration
      from public.appointment_pets where appointment_id=new.id loop
    if p.groomer_id is null or not public.happytails_groomer_is_free(
        p.groomer_id,new.scheduled_date,new.scheduled_time::time,p.duration,new.id) then
      raise exception 'Cannot move this grooming appointment: its groomer is not available for the whole duration.' using errcode='23514';end if;
  end loop;
  return new;
end $$;
drop trigger if exists happytails_groomer_reschedule_v2_guard on public.appointments;
create trigger happytails_groomer_reschedule_v2_guard after update of scheduled_date,scheduled_time
on public.appointments for each row execute function public.happytails_recheck_groomer_reschedule_v2();

-- Do not archive someone with checked-in or future reservations; old completed
-- appointments are kept for history but do not stop a groomer retiring.
create or replace function public.happytails_prevent_busy_groomer_archive()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if old.status::text='active' and new.status::text<>'active' and exists(
     select 1 from public.appointment_pets ap join public.appointments a on a.id=ap.appointment_id
      where ap.groomer_id=old.id and a.service_type::text in ('dog_grooming','cat_grooming')
        and a.status::text in ('pending','confirmed','checked_in')
        and (a.scheduled_date>=current_date or a.status::text='checked_in')) then
    raise exception 'This groomer still has current or future reservations. Reassign them before archiving.';
  end if;
  return new;
end $$;
drop trigger if exists happytails_busy_groomer_archive_guard on public.groomers;
create trigger happytails_busy_groomer_archive_guard before update of status on public.groomers
for each row execute function public.happytails_prevent_busy_groomer_archive();

-- Pet completion is synchronized by Grooming Management via the existing
-- appointment status API, which also handles customer emails. Do not bypass it
-- with a database-side automatic status update.

-- Historical rates must not be removed: verification references original row IDs.
create or replace function public.happytails_keep_referenced_package_prices()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if exists(select 1 from public.appointment_pets where package_pricing_id=old.id) then
    raise exception 'This price has appointment history. Create a new package/rate version instead of deleting the referenced pricing row.';
  end if;
  return old;
end $$;
drop trigger if exists happytails_protect_package_pricing_history on public.package_pricing;
create trigger happytails_protect_package_pricing_history before delete on public.package_pricing
for each row execute function public.happytails_keep_referenced_package_prices();

-- Further SQL routines below are CREATE OR REPLACE and do not change historical rows.
-- Start-time calendar now counts all occupied 30-minute intervals, not only starts.
create or replace function public.happytails_live_groomer_slots(p_date date)
returns table(slot_time text,capacity integer,booked integer,remaining integer)
language sql stable security definer set search_path='' as $$
with slots as (
  select gs::time as t from generate_series(timestamp '2000-01-01 09:00',
    timestamp '2000-01-01 17:00',interval '30 minutes') gs
), occupancy as (
  select s.t,
    (select count(*)::int from public.groomers g where g.status::text='active'
       and not exists(select 1 from public.groomer_time_off o where o.groomer_id=g.id
         and o.off_date=p_date and o.start_time<=s.t and o.end_time>s.t)) as cap,
    (select count(*)::int from public.appointment_pets ap
       join public.appointments a on a.id=ap.appointment_id
       where a.scheduled_date=p_date and a.status::text<>'cancelled'
         and a.service_type::text in ('dog_grooming','cat_grooming')
         and a.scheduled_time::time<=s.t
         and a.scheduled_time::time+(coalesce(ap.grooming_duration_minutes,30)||' minutes')::interval>s.t) as taken
  from slots s
)
select to_char(o.t,'HH24:MI'),o.cap,o.taken,greatest(0,o.cap-o.taken)
from occupancy o order by o.t;
$$;

create or replace function public.happytails_groomer_month_availability(p_first_day date)
returns table(day date,open_slots integer,capacity integer)
language sql stable security definer set search_path='' as $$
  with days as (
    select gs::date d from generate_series(date_trunc('month',p_first_day::timestamp),
      date_trunc('month',p_first_day::timestamp)+interval '1 month - 1 day',interval '1 day') gs
  )
  select d.d,count(*) filter (where s.remaining>0)::integer,max(s.capacity)::integer
  from days d cross join lateral public.happytails_live_groomer_slots(d.d) s
  group by d.d order by d.d;
$$;

-- A staff break cannot silently invalidate an existing groomer reservation.
create or replace function public.happytails_time_off_conflict_guard()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if exists(select 1 from public.appointment_pets ap
    join public.appointments a on a.id=ap.appointment_id
    where ap.groomer_id=new.groomer_id and a.scheduled_date=new.off_date
      and a.status::text in ('pending','confirmed','checked_in')
      and a.service_type::text in ('dog_grooming','cat_grooming')
      and a.scheduled_time::time<new.end_time
      and a.scheduled_time::time+(coalesce(ap.grooming_duration_minutes,30)||' minutes')::interval>new.start_time)
    then raise exception 'A reserved grooming appointment overlaps this time off. Reassign or reschedule the appointment first.';
  end if;
  return new;
end $$;
drop trigger if exists happytails_time_off_existing_booking_guard on public.groomer_time_off;
create trigger happytails_time_off_existing_booking_guard before insert or update on public.groomer_time_off
for each row execute function public.happytails_time_off_conflict_guard();

-- Save groomer assignments and checked_in status in ONE transaction.
-- A failed assignment rolls the entire check-in back.
create or replace function public.happytails_checkin_grooming_v2(p_appointment_id uuid,p_assignments jsonb)
returns void language plpgsql security invoker set search_path='' as $$
declare a record;v_count int;v_item jsonb;v_pet uuid;v_groomer uuid;v_recorded int;v_ready boolean;
begin
  if not exists(select 1 from public.profiles p where p.id=auth.uid() and p.role::text in ('admin','superadmin')) then
    raise exception 'Staff access required' using errcode='42501';end if;
  select id,scheduled_date,status,service_type,is_walk_in into a
    from public.appointments where id=p_appointment_id for update;
  if not found or a.status::text<>'confirmed' or a.service_type::text not in ('dog_grooming','cat_grooming','ala_carte') then
    raise exception 'Only confirmed grooming and À La Carte appointments may be checked in';end if;
  -- Online weight and final-price approval is mandatory at the database level,
  -- not just disabled visually in the appointment modal.
  if not a.is_walk_in and a.service_type::text in ('dog_grooming','cat_grooming') then
    if to_regprocedure('public.happytails_online_grooming_ready_for_checkin(uuid)') is null then
      raise exception 'Online grooming verification guard is not installed';end if;
    execute 'select public.happytails_online_grooming_ready_for_checkin($1)' into v_ready using p_appointment_id;
    if v_ready is distinct from true then raise exception 'Verify and approve the final grooming price before check-in';end if;
  end if;
  if jsonb_typeof(p_assignments) is distinct from 'array' or jsonb_array_length(p_assignments)=0 then
    raise exception 'Provide a groomer for each pet';end if;
  select count(*) into v_count from public.appointment_pets where appointment_id=p_appointment_id;
  if v_count<>jsonb_array_length(p_assignments) then raise exception 'All appointment pets must be assigned exactly once';end if;
  if exists(select 1 from jsonb_array_elements(p_assignments) x
    group by x.value->>'appointment_pet_id' having count(*)>1) then raise exception 'Duplicate pet assignments';end if;
  if exists(select 1 from jsonb_array_elements(p_assignments) x
    group by x.value->>'groomer_id' having count(*)>1) then raise exception 'One groomer cannot check in two pets simultaneously';end if;
  perform pg_advisory_xact_lock(hashtext('ht-grooming-day:'||a.scheduled_date::text));
  for v_item in select value from jsonb_array_elements(p_assignments) loop
    v_pet:=(v_item->>'appointment_pet_id')::uuid;
    v_groomer:=(v_item->>'groomer_id')::uuid;
    if v_groomer is null or not exists(select 1 from public.groomers where id=v_groomer and status::text='active') then
      raise exception 'Select an active groomer';end if;
    if exists(select 1 from public.appointment_pets busy
       join public.appointments other on other.id=busy.appointment_id
       where busy.groomer_id=v_groomer and other.id<>p_appointment_id
         and other.status::text='checked_in'
         and other.service_type::text in ('dog_grooming','cat_grooming','ala_carte')) then
       raise exception 'Selected groomer is already serving another pet';end if;
    update public.appointment_pets set groomer_id=v_groomer
      where id=v_pet and appointment_id=p_appointment_id;
    get diagnostics v_recorded = row_count;
    if v_recorded<>1 then raise exception 'An appointment pet could not be assigned';end if;
  end loop;
  update public.appointments set status='checked_in' where id=p_appointment_id and status::text='confirmed';
  get diagnostics v_recorded = row_count;
  if v_recorded<>1 then raise exception 'Check-in did not update the appointment';end if;
end $$;
revoke all on function public.happytails_checkin_grooming_v2(uuid,jsonb) from public,anon;
grant execute on function public.happytails_checkin_grooming_v2(uuid,jsonb) to authenticated;

-- Price integrity at the END of the transaction, after add-on rows are inserted.
-- Applied to NEW grooming appointments only; historic quotes are unchanged.
create or replace function public.happytails_verify_new_grooming_quote()
returns trigger language plpgsql security definer set search_path='' as $$
declare a record;v_rate numeric;v_size text;v_norm text;v_addon record;v_price numeric;v_expected numeric;
begin
  select service_type into a from public.appointments where id=new.appointment_id;
  if a.service_type::text not in ('dog_grooming','cat_grooming') then return null;end if;
  select pp.price,coalesce(ps.label,pp.size_label) into v_rate,v_size
  from public.package_pricing pp left join public.pet_sizes ps on ps.id=new.size_id
  where pp.id=new.package_pricing_id and pp.package_id=new.package_id;
  if v_rate is null or v_rate<0 then raise exception 'Selected grooming package rate is invalid';end if;
  v_expected:=v_rate; v_norm:=regexp_replace(lower(coalesce(v_size,'')),'[^a-z0-9]','','g');
  for v_addon in select addon_id from public.appointment_addons where appointment_pet_id=new.id loop
    select p.price into v_price from public.addon_prices p where p.addon_id=v_addon.addon_id
      and (case when v_norm in ('large','l','extralarge','xl','2extralarge','extraextralarge','xxl','2xl')
        then regexp_replace(lower(p.size_label),'[^a-z0-9]','','g') in ('large','largesize')
        else regexp_replace(lower(p.size_label),'[^a-z0-9]','','g') in (v_norm,'small','smallmedium','standard','allsize','fixed') end)
      order by case when regexp_replace(lower(p.size_label),'[^a-z0-9]','','g')=v_norm then 0 else 1 end,p.id
      limit 1;
    if v_price is null then raise exception 'Grooming add-on has no price for the selected size';end if;
    v_expected:=v_expected+v_price;
    v_price:=null;
  end loop;
  if abs(v_expected-new.line_amount)>0.009 then
    raise exception 'Grooming quote does not match package/add-on prices (expected %, received %). Refresh the service selection.',
      v_expected,new.line_amount using errcode='23514';
  end if;
  return null;
end $$;
drop trigger if exists happytails_verify_new_grooming_quote_guard on public.appointment_pets;
create constraint trigger happytails_verify_new_grooming_quote_guard
  after insert on public.appointment_pets deferrable initially deferred
  for each row execute function public.happytails_verify_new_grooming_quote();

-- Preserve the first quote even when verified weight later changes the final price.
alter table public.appointment_pets add column if not exists original_quote_amount numeric;
update public.appointment_pets set original_quote_amount=line_amount where original_quote_amount is null;
create or replace function public.happytails_preserve_original_quote()
returns trigger language plpgsql as $$
begin
  if tg_op='INSERT' then new.original_quote_amount:=new.line_amount;
  elsif new.original_quote_amount is distinct from old.original_quote_amount then
    raise exception 'Original booking quote is immutable';end if;
  return new;
end $$;
drop trigger if exists happytails_original_quote_guard on public.appointment_pets;
create trigger happytails_original_quote_guard before insert or update of original_quote_amount
on public.appointment_pets for each row execute function public.happytails_preserve_original_quote();

-- Referenced rate rows are historical price versions: reject in-place price changes.
create or replace function public.happytails_prevent_referenced_rate_change()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if (new.price is distinct from old.price or new.size_id is distinct from old.size_id
     or new.size_label is distinct from old.size_label)
    and exists(select 1 from public.appointment_pets ap where ap.package_pricing_id=old.id) then
    raise exception 'This rate is referenced by appointment history. Add a new package version rather than changing this price.';
  end if;
  return new;
end $$;
drop trigger if exists happytails_rate_history_immutable_guard on public.package_pricing;
create trigger happytails_rate_history_immutable_guard before update of price,size_id,size_label
on public.package_pricing for each row execute function public.happytails_prevent_referenced_rate_change();

-- Preserve the completed pet's staff assignment for audit/history without
-- requiring a client-side change to the old completeAppointmentPet helper.
create or replace function public.happytails_preserve_completed_groomer()
returns trigger language plpgsql as $$
begin
  if new.status::text='completed' and new.groomer_id is null and old.groomer_id is not null
     then new.groomer_id:=old.groomer_id;end if;
  return new;
end $$;
drop trigger if exists happytails_preserve_completed_groomer_guard on public.appointment_pets;
create trigger happytails_preserve_completed_groomer_guard before update of status,groomer_id
on public.appointment_pets for each row execute function public.happytails_preserve_completed_groomer();

-- First verification of a package duration upgrades upcoming legacy reservations'
-- from their temporary 30-minute backfill. Existing completed bookings keep
-- their historical snapshot; later price/duration edits never rewrite bookings.
create or replace function public.happytails_reconcile_first_duration_review()
returns trigger language plpgsql security definer set search_path='' as $$
declare r record;
begin
  if new.verified and not old.verified then
    update public.appointment_pets ap set grooming_duration_minutes=new.duration_minutes
      from public.appointments a, public.package_pricing pp
      where ap.appointment_id=a.id and ap.package_pricing_id=pp.id
        and pp.package_id=new.package_id
        and a.service_type::text in ('dog_grooming','cat_grooming')
        and a.status::text in ('pending','confirmed') and a.scheduled_date>=current_date;
    for r in select ap.id,ap.groomer_id,ap.grooming_duration_minutes,a.id as appointment_id,
        a.scheduled_date,a.scheduled_time
      from public.appointment_pets ap join public.appointments a on a.id=ap.appointment_id
      join public.package_pricing pp on pp.id=ap.package_pricing_id
      where pp.package_id=new.package_id and a.scheduled_date>=current_date
        and a.status::text in ('pending','confirmed') loop
      if r.groomer_id is not null and not public.happytails_groomer_is_free(
          r.groomer_id,r.scheduled_date,r.scheduled_time::time,r.grooming_duration_minutes,r.appointment_id) then
        raise exception 'Existing reservations for this package conflict with the reviewed % minute duration. Reschedule them before verifying.',new.duration_minutes;
      end if;
    end loop;
    for r in select distinct a.scheduled_date as day from public.appointment_pets ap
      join public.appointments a on a.id=ap.appointment_id
      join public.package_pricing pp on pp.id=ap.package_pricing_id
      where pp.package_id=new.package_id and a.scheduled_date>=current_date
        and a.status::text in ('pending','confirmed') loop
      if exists(select 1 from public.happytails_live_groomer_slots(r.day) slot
        where slot.booked>slot.capacity) then
        raise exception 'Duration change would overbook existing grooming capacity on %. Reschedule existing appointments first.',r.day;
      end if;
    end loop;
  end if;
  return new;
end $$;
drop trigger if exists happytails_reconcile_duration_first_review on public.grooming_package_durations;
create trigger happytails_reconcile_duration_first_review after update of verified on public.grooming_package_durations
for each row execute function public.happytails_reconcile_first_duration_review();

-- Record the amount of each selected grooming add-on instead of storing zero.
-- Existing non-grooming addon behavior is unchanged.
create or replace function public.happytails_snapshot_grooming_addon_price()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_service text;v_size text;v_norm text;v_price numeric;
begin
  select a.service_type::text,coalesce(ps.label,pp.size_label)
    into v_service,v_size
    from public.appointment_pets ap join public.appointments a on a.id=ap.appointment_id
    left join public.pet_sizes ps on ps.id=ap.size_id
    left join public.package_pricing pp on pp.id=ap.package_pricing_id
    where ap.id=new.appointment_pet_id;
  if v_service not in ('dog_grooming','cat_grooming') then return new;end if;
  v_norm:=regexp_replace(lower(coalesce(v_size,'')),'[^a-z0-9]','','g');
  select p.price into v_price from public.addon_prices p where p.addon_id=new.addon_id
    and (case when v_norm in ('large','l','extralarge','xl','2extralarge','extraextralarge','xxl','2xl')
      then regexp_replace(lower(p.size_label),'[^a-z0-9]','','g') in ('large','largesize')
      else regexp_replace(lower(p.size_label),'[^a-z0-9]','','g') in (v_norm,'small','smallmedium','standard','allsize','fixed') end)
    order by case when regexp_replace(lower(p.size_label),'[^a-z0-9]','','g')=v_norm then 0 else 1 end,p.id
    limit 1;
  if v_price is null then raise exception 'The selected grooming add-on has no price configured for this size.';end if;
  new.price:=v_price;
  return new;
end $$;
drop trigger if exists happytails_grooming_addon_quote_snapshot on public.appointment_addons;
create trigger happytails_grooming_addon_quote_snapshot before insert on public.appointment_addons
for each row execute function public.happytails_snapshot_grooming_addon_price();

-- Atomic Service Management package writes. If the package has appointment
-- history, staff must create a new package version instead of editing rates.
create or replace function public.happytails_save_service_package_v2(
  p_package_id uuid,p_service_type text,p_name text,p_inclusions text[],p_rates jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_id uuid;v_pkg public.packages%rowtype;v_rate jsonb;v_item text;v_order int:=0;
begin
  if not exists(select 1 from public.profiles p where p.id=auth.uid()
       and p.role::text in ('admin','superadmin')) then
    raise exception 'Staff access required' using errcode='42501';end if;
  if p_service_type not in ('dog_grooming','cat_grooming','boarding')
     or nullif(btrim(p_name),'') is null then raise exception 'Service type and package name are required';end if;
  if p_rates is null or jsonb_typeof(p_rates) is distinct from 'array'
     or jsonb_array_length(p_rates)=0 then raise exception 'Supply at least one rate';end if;
  v_pkg:=jsonb_populate_record(null::public.packages,
    jsonb_build_object('service_type',p_service_type,'name',btrim(p_name)));
  if p_package_id is null then
    insert into public.packages(service_type,name,sort_order,is_active)
      values(v_pkg.service_type,v_pkg.name,99,true) returning id into v_id;
  else
    select id into v_id from public.packages
       where id=p_package_id and service_type=v_pkg.service_type for update;
    if not found then raise exception 'Package not found';end if;
    if exists(select 1 from public.appointment_pets ap
       where ap.package_id=v_id or exists(
         select 1 from public.package_pricing pp where pp.package_id=v_id
          and ap.package_pricing_id=pp.id)) then
      raise exception 'This package is referenced by appointments. Keep it for history and create a NEW package version for revised rates.';
    end if;
    update public.packages set name=v_pkg.name where id=v_id;
    delete from public.package_inclusions where package_id=v_id;
    delete from public.package_pricing where package_id=v_id;
  end if;
  if p_service_type<>'boarding' then
    for v_item in select btrim(x) from unnest(coalesce(p_inclusions,array[]::text[])) x
       where nullif(btrim(x),'') is not null loop
      insert into public.package_inclusions(package_id,label,sort_order)
         values(v_id,v_item,v_order);
      v_order:=v_order+1;
    end loop;
  end if;
  for v_rate in select value from jsonb_array_elements(p_rates) loop
    if coalesce((v_rate->>'price')::numeric,-1)<0 or nullif(btrim(v_rate->>'size_label'),'') is null then
      raise exception 'Rates need a valid size label and non-negative numeric price';end if;
    insert into public.package_pricing(package_id,size_id,size_label,price,is_per_night,nights)
      values(v_id,(v_rate->>'size_id')::uuid, v_rate->>'size_label',
        (v_rate->>'price')::numeric,coalesce((v_rate->>'is_per_night')::boolean,false),
        (v_rate->>'nights')::integer);
  end loop;
  return v_id;
end $$;
revoke all on function public.happytails_save_service_package_v2(uuid,text,text,text[],jsonb) from public,anon;
grant execute on function public.happytails_save_service_package_v2(uuid,text,text,text[],jsonb) to authenticated;

commit;
