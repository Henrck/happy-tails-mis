-- À La Carte needs an independent, required groomer assignment. Shared with
-- Grooming conflict checks: a groomer cannot work on two pets simultaneously.
-- Do not alter previous appointment charges or existing booking records.

create or replace function public.happytails_ala_carte_groomer_availability_v1(p_date date)
returns table(slot_time text, groomer_id uuid, available boolean)
language sql stable security definer
set search_path = public, pg_temp
as $$
  with slots as (
    select to_char(time '09:00' + (n * interval '30 minutes'), 'HH24:MI') as start_time,
           time '09:00' + (n * interval '30 minutes') as at_time
    from generate_series(0,16) n
  )
  select s.start_time, g.id,
    not exists (
      select 1
      from public.appointment_pets ap
      join public.appointments a on a.id = ap.appointment_id
      left join public.package_pricing pp on pp.id = ap.package_pricing_id
      left join public.grooming_package_durations gd on gd.package_id = pp.package_id
      where ap.groomer_id = g.id
        and a.scheduled_date = p_date
        and a.status <> 'cancelled'
        and a.service_type in ('dog_grooming','cat_grooming','ala_carte')
        and a.scheduled_time is not null
        and (a.scheduled_time::time < s.at_time + interval '30 minutes')
        and ((a.scheduled_time::time + (
          case when a.service_type in ('dog_grooming','cat_grooming') and gd.verified = true
            then greatest(coalesce(gd.duration_minutes, 30),30)
          else 30 end
        ) * interval '1 minute') > s.at_time)
    ) as available
  from slots s
  cross join public.groomers g
  where g.status = 'active';
$$;
revoke all on function public.happytails_ala_carte_groomer_availability_v1(date) from public;
grant execute on function public.happytails_ala_carte_groomer_availability_v1(date) to authenticated;

create or replace function public.happytails_protect_groomer_overlap_v1()
returns trigger language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_booking record;
  v_duration integer := 30;
  v_conflict boolean;
begin
  select id, service_type, scheduled_date, scheduled_time, status
  into v_booking
  from public.appointments
  where id = new.appointment_id;
  if not found or v_booking.service_type not in ('dog_grooming','cat_grooming','ala_carte')
      or v_booking.status = 'cancelled' then
    return new;
  end if;
  if v_booking.service_type = 'ala_carte' and new.groomer_id is null then
    raise exception 'Assign an available groomer to each À La Carte pet before booking.';
  end if;
  if new.groomer_id is null then return new; end if;
  if v_booking.scheduled_time is null or v_booking.scheduled_date is null then
    raise exception 'A scheduled date and time are required for groomer assignment.';
  end if;
  if v_booking.service_type = 'ala_carte' then
    if v_booking.scheduled_time::time < time '09:00'
       or v_booking.scheduled_time::time > time '17:00'
       or extract(minute from v_booking.scheduled_time::time)::int not in (0,30) then
      raise exception 'À La Carte starts must be between 9:00 AM and 5:00 PM, in 30-minute intervals.';
    end if;
  else
    select greatest(coalesce(gd.duration_minutes,30),30) into v_duration
    from public.package_pricing pp
    left join public.grooming_package_durations gd on gd.package_id = pp.package_id and gd.verified = true
    where pp.id = new.package_pricing_id;
    v_duration := coalesce(v_duration,30);
  end if;
  if not exists (select 1 from public.groomers where id = new.groomer_id and status = 'active') then
    raise exception 'The selected groomer is no longer active.';
  end if;
  -- Serialize concurrent assignments to the same groomer on the same date.
  perform pg_advisory_xact_lock(hashtextextended(new.groomer_id::text || ':' || v_booking.scheduled_date::text,0));
  select exists (
    select 1
    from public.appointment_pets ap
    join public.appointments a on a.id = ap.appointment_id
    left join public.package_pricing pp on pp.id = ap.package_pricing_id
    left join public.grooming_package_durations gd on gd.package_id = pp.package_id
    where ap.groomer_id = new.groomer_id and ap.id is distinct from new.id
      and a.scheduled_date = v_booking.scheduled_date and a.status <> 'cancelled'
      and a.service_type in ('dog_grooming','cat_grooming','ala_carte')
      and a.scheduled_time is not null
      and a.scheduled_time::time < v_booking.scheduled_time::time + v_duration * interval '1 minute'
      and a.scheduled_time::time + (
        case when a.service_type in ('dog_grooming','cat_grooming') and gd.verified = true
          then greatest(coalesce(gd.duration_minutes,30),30) else 30 end
      ) * interval '1 minute' > v_booking.scheduled_time::time
  ) into v_conflict;
  if v_conflict then
    raise exception 'Selected groomer is already assigned to another service at this time. Choose another groomer or time.';
  end if;
  return new;
end;
$$;

drop trigger if exists happytails_groomer_overlap_v1 on public.appointment_pets;
create trigger happytails_groomer_overlap_v1
before insert or update of groomer_id, appointment_id, package_pricing_id
on public.appointment_pets
for each row execute function public.happytails_protect_groomer_overlap_v1();
