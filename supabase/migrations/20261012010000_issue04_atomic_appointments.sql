-- HappyTails Issue #4: atomic creation of every appointment, its pets and add-ons.
-- One RPC call = one PostgreSQL transaction. Any exception rolls back ALL
-- appointment/appointment_pets/appointment_addons inserts in this request.
--
-- IMPORTANT: SECURITY INVOKER preserves current RLS policies. Do not change
-- this to SECURITY DEFINER to bypass RLS. Review policies in your test DB.
-- This function DOES NOT change existing records or service-report ID triggers.
-- Apply the Report Management service-code migration first if your application
-- uses G01/B01/A01 report codes.

begin;

do $$
begin
  if to_regclass('public.appointments') is null
    or to_regclass('public.appointment_pets') is null
    or to_regclass('public.appointment_addons') is null
    or to_regclass('public.profiles') is null
    or to_regclass('public.pets') is null then
    raise exception 'Issue #4 requires public.appointments, appointment_pets, appointment_addons, profiles and pets';
  end if;
end $$;

create or replace function public.happytails_create_appointments_atomic(p_appointments jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_role text;
  v_entry jsonb;
  v_pet_entry jsonb;
  v_addon_id_text text;
  v_appointment public.appointments%rowtype;
  v_saved_appointment public.appointments%rowtype;
  v_pet public.appointment_pets%rowtype;
  v_appointment_pet_id uuid;
  v_is_walk_in boolean;
  v_total numeric;
  v_number_of_appointments integer;
  v_number_of_pets integer;
  v_result jsonb := '[]'::jsonb;
begin
  if v_actor_id is null then
    raise exception 'You must be signed in to create an appointment' using errcode = '42501';
  end if;

  if p_appointments is null or jsonb_typeof(p_appointments) is distinct from 'array' then
    raise exception 'Appointment request must be an array';
  end if;

  v_number_of_appointments := jsonb_array_length(p_appointments);
  if v_number_of_appointments < 1 or v_number_of_appointments > 30 then
    raise exception 'A booking must contain between 1 and 30 appointments';
  end if;

  select p.role::text into v_actor_role
    from public.profiles p where p.id = v_actor_id;

  for v_entry in select value from jsonb_array_elements(p_appointments)
  loop
    if jsonb_typeof(v_entry) is distinct from 'object' then
      raise exception 'Each appointment must be an object';
    end if;
    if jsonb_typeof(v_entry->'is_walk_in') is distinct from 'boolean' then
      raise exception 'Booking source (Walk-in or Online) must be explicit';
    end if;
    v_is_walk_in := (v_entry->>'is_walk_in')::boolean;

    if v_entry->>'service_type' not in
       ('dog_grooming', 'cat_grooming', 'boarding', 'ala_carte')
       or v_entry->>'service_type' is null then
      raise exception 'Unknown service type';
    end if;

    if coalesce(btrim(v_entry->>'owner_name'), '') = ''
       or coalesce(v_entry->>'scheduled_date', '') = '' then
      raise exception 'Owner name and scheduled date are required';
    end if;

    if jsonb_typeof(v_entry->'pet_selections') is distinct from 'array' then
      raise exception 'Appointment pet selections must be an array';
    end if;
    v_number_of_pets := jsonb_array_length(v_entry->'pet_selections');
    if v_number_of_pets < 1 or v_number_of_pets > 30 then
      raise exception 'Each appointment must have between 1 and 30 pets';
    end if;

    -- Convert JSON to the table's real column types, including an enum
    -- service_type if the project's database uses one. We explicitly
    -- choose every field below; no client-supplied ID/status is accepted.
    v_appointment := jsonb_populate_record(null::public.appointments,
      jsonb_build_object(
        'service_type', v_entry->'service_type',
        'customer_id', v_entry->'customer_id',
        'owner_name', v_entry->'owner_name',
        'owner_contact', v_entry->'owner_contact',
        'owner_address', v_entry->'owner_address',
        'is_walk_in', v_entry->'is_walk_in',
        'scheduled_date', v_entry->'scheduled_date',
        'scheduled_time', v_entry->'scheduled_time',
        'drop_off_at', v_entry->'drop_off_at',
        'pick_up_at', v_entry->'pick_up_at',
        'special_requests', v_entry->'special_requests'
      )
    );

    -- Prevent an online customer from impersonating another account;
    -- allow walk-in creation only by authorized POS staff.
    if v_is_walk_in then
      if v_actor_role is null or v_actor_role not in ('admin', 'superadmin') then
        raise exception 'Only POS staff can create walk-in appointments' using errcode = '42501';
      end if;
    elsif v_appointment.customer_id is distinct from v_actor_id then
      raise exception 'Online appointments must belong to the signed-in customer' using errcode = '42501';
    end if;

    v_total := 0;
    for v_pet_entry in select value from jsonb_array_elements(v_entry->'pet_selections')
    loop
      if jsonb_typeof(v_pet_entry) is distinct from 'object' then
        raise exception 'Each pet selection must be an object';
      end if;
      if jsonb_typeof(v_pet_entry->'addon_ids') is distinct from 'array' then
        raise exception 'Pet add-ons must be an array';
      end if;

      v_pet := jsonb_populate_record(null::public.appointment_pets,
        jsonb_build_object(
          'pet_id', v_pet_entry->'pet_id',
          'package_id', v_pet_entry->'package_id',
          'package_pricing_id', v_pet_entry->'package_pricing_id',
          'size_id', v_pet_entry->'size_id',
          'kennel_id', v_pet_entry->'kennel_id',
          'groomer_id', v_pet_entry->'groomer_id',
          'line_amount', v_pet_entry->'line_amount'
        )
      );

      if v_pet.pet_id is null or v_pet.line_amount is null
         or v_pet.line_amount < 0 then
        raise exception 'Each pet must have a valid ID and non-negative service amount';
      end if;

      if not v_is_walk_in then
        perform 1 from public.pets p
          where p.id = v_pet.pet_id and p.customer_id = v_actor_id;
        if not found then
          raise exception 'A selected pet does not belong to this customer' using errcode = '42501';
        end if;
      end if;

      v_total := v_total + v_pet.line_amount;
    end loop;

    insert into public.appointments (
      service_type, customer_id, owner_name, owner_contact, owner_address,
      is_walk_in, scheduled_date, scheduled_time, drop_off_at, pick_up_at,
      special_requests, total_amount
    ) values (
      v_appointment.service_type, v_appointment.customer_id,
      v_appointment.owner_name, v_appointment.owner_contact,
      v_appointment.owner_address, v_is_walk_in,
      v_appointment.scheduled_date, v_appointment.scheduled_time,
      v_appointment.drop_off_at, v_appointment.pick_up_at,
      v_appointment.special_requests, v_total
    ) returning * into v_saved_appointment;

    for v_pet_entry in select value from jsonb_array_elements(v_entry->'pet_selections')
    loop
      v_pet := jsonb_populate_record(null::public.appointment_pets,
        jsonb_build_object(
          'pet_id', v_pet_entry->'pet_id',
          'package_id', v_pet_entry->'package_id',
          'package_pricing_id', v_pet_entry->'package_pricing_id',
          'size_id', v_pet_entry->'size_id',
          'kennel_id', v_pet_entry->'kennel_id',
          'groomer_id', v_pet_entry->'groomer_id',
          'line_amount', v_pet_entry->'line_amount'
        )
      );

      insert into public.appointment_pets (
        appointment_id, pet_id, package_id, package_pricing_id,
        size_id, kennel_id, groomer_id, line_amount
      ) values (
        v_saved_appointment.id, v_pet.pet_id, v_pet.package_id,
        v_pet.package_pricing_id, v_pet.size_id, v_pet.kennel_id,
        v_pet.groomer_id, v_pet.line_amount
      ) returning id into v_appointment_pet_id;

      for v_addon_id_text in
        select value from jsonb_array_elements_text(v_pet_entry->'addon_ids')
      loop
        -- Preserve existing application behavior: addon price is saved
        -- as 0; the selected service's line_amount already includes it.
        insert into public.appointment_addons (
          appointment_pet_id, addon_id, price
        ) values (
          v_appointment_pet_id, v_addon_id_text::uuid, 0
        );
      end loop;
    end loop;

    v_result := v_result || jsonb_build_array(to_jsonb(v_saved_appointment));
  end loop;

  return v_result;
end;
$$;

-- Only signed-in users can call the RPC. Table-level RLS still applies.
revoke all on function public.happytails_create_appointments_atomic(jsonb) from public, anon;
grant execute on function public.happytails_create_appointments_atomic(jsonb) to authenticated;

commit;
