-- HappyTails: synchronize booked groomer reservations with staff check-in.
-- Requires 20261101010000_grooming_reservation_safety.sql.
-- Read-only availability options plus atomic, revalidated check-in.
-- Does not rewrite any existing appointment or booking.

begin;

create or replace function public.happytails_checkin_groomer_options(p_appointment_id uuid)
returns table(appointment_pet_id uuid, groomer_id uuid, groomer_name text)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_date date;
  v_start time;
  v_status text;
  v_service text;
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role::text in ('admin', 'superadmin')
  ) then
    raise exception 'Staff access required' using errcode = '42501';
  end if;

  select a.scheduled_date, a.scheduled_time::time, a.status::text, a.service_type::text
    into v_date, v_start, v_status, v_service
  from public.appointments a where a.id = p_appointment_id;

  if not found or v_status <> 'confirmed'
    or v_service not in ('dog_grooming', 'cat_grooming', 'ala_carte') then
    raise exception 'A confirmed grooming or À La Carte appointment is required';
  end if;
  if v_start is null then
    raise exception 'The appointment has no scheduled time';
  end if;

  return query
  select ap.id, g.id, g.name::text
    from public.appointment_pets ap
    cross join public.groomers g
  where ap.appointment_id = p_appointment_id
    and g.status::text = 'active'
    and (
      -- À La Carte currently has no configured service-duration field.
      -- The staff availability guard still prevents concurrent active sessions.
      v_service = 'ala_carte'
      or public.happytails_groomer_is_free(
        g.id, v_date, v_start,
        coalesce(ap.grooming_duration_minutes, 30),
        p_appointment_id
      )
    )
    and not exists (
      select 1
      from public.appointment_pets busy
      join public.appointments current_session on current_session.id = busy.appointment_id
      where busy.groomer_id = g.id
        and current_session.id <> p_appointment_id
        and current_session.status::text = 'checked_in'
        and busy.status::text <> 'completed'
        and current_session.service_type::text in ('dog_grooming','cat_grooming','ala_carte')
    )
  order by ap.id, g.name;
end $$;

revoke all on function public.happytails_checkin_groomer_options(uuid) from public, anon;
grant execute on function public.happytails_checkin_groomer_options(uuid) to authenticated;

-- Replacement of the initial v2 function: retain all guards, and ensure
-- reassignment is not merely "not busy now" but also fits the full booked interval.
create or replace function public.happytails_checkin_grooming_v2(
  p_appointment_id uuid, p_assignments jsonb
)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  a record;
  v_count integer;
  v_item jsonb;
  v_pet uuid;
  v_groomer uuid;
  v_duration integer;
  v_recorded integer;
  v_ready boolean;
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role::text in ('admin', 'superadmin')
  ) then
    raise exception 'Staff access required' using errcode='42501';
  end if;

  select id, scheduled_date, scheduled_time, status, service_type, is_walk_in
    into a from public.appointments
    where id = p_appointment_id for update;

  if not found or a.status::text <> 'confirmed'
    or a.service_type::text not in ('dog_grooming','cat_grooming','ala_carte') then
    raise exception 'Only confirmed grooming or À La Carte appointments may be checked in';
  end if;
  if a.scheduled_time is null then
    raise exception 'The appointment has no start time';
  end if;

  if not a.is_walk_in and a.service_type::text in ('dog_grooming','cat_grooming') then
    if to_regprocedure('public.happytails_online_grooming_ready_for_checkin(uuid)') is null then
      raise exception 'Online grooming verification guard is not installed';
    end if;
    execute 'select public.happytails_online_grooming_ready_for_checkin($1)'
      into v_ready using p_appointment_id;
    if v_ready is distinct from true then
      raise exception 'Verify and approve the final grooming price before check-in';
    end if;
  end if;

  if p_assignments is null or jsonb_typeof(p_assignments) <> 'array'
     or jsonb_array_length(p_assignments) = 0 then
    raise exception 'Assign a groomer to every pet';
  end if;
  select count(*) into v_count from public.appointment_pets where appointment_id=p_appointment_id;
  if v_count <> jsonb_array_length(p_assignments) then
    raise exception 'Each appointment pet needs exactly one assignment';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_assignments) x
    group by x.value->>'appointment_pet_id' having count(*) > 1
  ) then raise exception 'Duplicate pet assignments'; end if;
  if exists (
    select 1 from jsonb_array_elements(p_assignments) x
    group by x.value->>'groomer_id' having count(*) > 1
  ) then raise exception 'One groomer cannot serve two pets at once'; end if;

  perform pg_advisory_xact_lock(hashtext('ht-grooming-day:'||a.scheduled_date::text));

  for v_item in select value from jsonb_array_elements(p_assignments) loop
    v_pet := (v_item->>'appointment_pet_id')::uuid;
    v_groomer := (v_item->>'groomer_id')::uuid;

    select coalesce(ap.grooming_duration_minutes, 30) into v_duration
    from public.appointment_pets ap
    where ap.id=v_pet and ap.appointment_id=p_appointment_id;

    if not found then raise exception 'Appointment pet not found'; end if;
    if v_groomer is null or not exists (
      select 1 from public.groomers
      where id=v_groomer and status::text='active'
    ) then raise exception 'Select an active groomer'; end if;

    if exists (
      select 1 from public.appointment_pets busy
      join public.appointments other on other.id=busy.appointment_id
      where busy.groomer_id=v_groomer
        and other.id<>p_appointment_id
        and other.status::text='checked_in'
        and busy.status::text <> 'completed'
        and other.service_type::text in ('dog_grooming','cat_grooming','ala_carte')
    ) then raise exception 'This groomer is already serving another pet'; end if;

    if a.service_type::text in ('dog_grooming','cat_grooming')
      and not public.happytails_groomer_is_free(
        v_groomer, a.scheduled_date, a.scheduled_time::time,
        v_duration, p_appointment_id
      ) then
      raise exception 'Groomer is reserved for another appointment or unavailable for this full service duration';
    end if;

    update public.appointment_pets
      set groomer_id = v_groomer
      where id = v_pet and appointment_id = p_appointment_id;
    get diagnostics v_recorded = row_count;
    if v_recorded <> 1 then raise exception 'Groomer assignment failed'; end if;
  end loop;

  update public.appointments set status = 'checked_in'
    where id = p_appointment_id and status::text='confirmed';
  get diagnostics v_recorded = row_count;
  if v_recorded <> 1 then raise exception 'Appointment check-in failed'; end if;
end $$;

revoke all on function public.happytails_checkin_grooming_v2(uuid,jsonb) from public,anon;
grant execute on function public.happytails_checkin_grooming_v2(uuid,jsonb) to authenticated;

commit;
