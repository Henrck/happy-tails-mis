-- HappyTails: daily cancellation limit now PENALISES instead of blocking.
--
-- Run AFTER 20261117_01_cancellation_penalty_rules_v2.sql and
-- 20261117_02_staff_cancellation_notifications.sql.
--
-- Rules after this migration:
--  * The first 3 cancellations in a Philippine calendar day follow the normal
--    rules (3+ calendar days before = free; 0-2 days before = late).
--  * The 4th and every later cancellation that same day is allowed, but adds
--    1 penalty point and a 12-hour booking restriction (like a late cancellation).
--  * A cancellation that is BOTH late and over the daily limit still adds only
--    1 point (one penalty per cancellation).
--  * 3 points -> 1-month restriction (unchanged).

CREATE OR REPLACE FUNCTION public.happytails_cancel_customer_appointment_with_limiter(
  p_appointment_id uuid,
  p_reason text,
  p_penalty_confirmed boolean DEFAULT false,
  p_confirmed_penalty_count integer DEFAULT NULL::integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_customer_id uuid := auth.uid();
  v_appointment public.appointments%rowtype;
  v_scheduled_at timestamptz;
  v_scheduled_day date;
  v_today date := (now() at time zone 'Asia/Manila')::date;
  v_days_before integer;
  v_is_late boolean;
  v_today_count integer := 0;
  v_over_limit boolean;
  v_points integer := 0;
  v_current_points integer := 0;
  v_new_points integer := 0;
  v_restriction interval := interval '12 hours';
  v_why text;
  v_penalty jsonb := '{}'::jsonb;
begin
  if v_customer_id is null then raise exception 'Sign in required'; end if;
  if length(trim(coalesce(p_reason, ''))) < 5 or length(trim(p_reason)) > 500 then
    raise exception 'Please provide a cancellation reason between 5 and 500 characters.';
  end if;

  select * into v_appointment
  from public.appointments
  where id = p_appointment_id and customer_id = v_customer_id
  for update;
  if not found then raise exception 'Appointment not found or you do not have permission to cancel it.'; end if;
  if v_appointment.status not in ('pending', 'confirmed') then
    raise exception 'This appointment can no longer be cancelled.';
  end if;

  -- Serialize cancellations for this customer so simultaneous requests cannot
  -- slip past the daily count.
  perform 1 from public.customers where id = v_customer_id for update;

  if v_appointment.service_type = 'boarding' and v_appointment.drop_off_at is not null then
    v_scheduled_at := v_appointment.drop_off_at;
  else
    v_scheduled_at := ((v_appointment.scheduled_date::text || ' ' || coalesce(v_appointment.scheduled_time::text, '00:00'))::timestamp at time zone 'Asia/Manila');
  end if;
  v_scheduled_day := (v_scheduled_at at time zone 'Asia/Manila')::date;
  v_days_before := v_scheduled_day - v_today;
  v_is_late := v_days_before < 3;

  select count(*)::integer into v_today_count
  from public.customer_cancellation_tracking
  where customer_id = v_customer_id
    and (cancelled_at at time zone 'Asia/Manila')::date = v_today;
  v_over_limit := v_today_count >= 3;

  v_current_points := coalesce((select penalty_count from public.customer_booking_penalties where customer_id = v_customer_id), 0);

  if v_is_late or v_over_limit then
    v_points := 1;
    v_new_points := least(3, v_current_points + v_points);
    v_why := case
      when v_over_limit and v_is_late then 'This is your ' || public.happytails_ordinal(v_today_count + 1) || ' cancellation today and the appointment is less than 3 days away.'
      when v_over_limit then 'You have already cancelled 3 appointments today. This is your ' || public.happytails_ordinal(v_today_count + 1) || ' cancellation today.'
      else 'This appointment is less than 3 days away.' end;

    if not p_penalty_confirmed or p_confirmed_penalty_count is distinct from v_new_points then
      return jsonb_build_object(
        'ok', false,
        'requires_confirmation', true,
        'is_late', v_is_late,
        'over_daily_limit', v_over_limit,
        'days_before', v_days_before,
        'cancellation_number', v_today_count + 1,
        'daily_limit', 3,
        'points_added', v_points,
        'penalty_count', v_new_points,
        'restriction_label', public.happytails_restriction_label(case when v_new_points >= 3 then interval '1 month' else v_restriction end),
        'message', v_why || case when v_new_points >= 3
          then ' Cancelling now adds 1 penalty point, reaching the 3-point limit, and restricts new bookings for one month.'
          else ' Cancelling now adds 1 penalty point and restricts new bookings for 12 hours.' end
      );
    end if;
  end if;

  perform public.happytails_cancel_customer_appointment(p_appointment_id, trim(p_reason));

  insert into public.customer_cancellation_tracking(
    appointment_id, customer_id, scheduled_at, is_late, late_cancellation_number, reason
  ) values (
    p_appointment_id, v_customer_id, v_scheduled_at, v_is_late, v_today_count + 1, trim(p_reason)
  );

  if v_points > 0 then
    v_penalty := public.happytails_apply_customer_booking_penalty(
      v_customer_id, p_appointment_id,
      case when v_over_limit then 'daily_cancellation_limit' else 'late_cancellation' end,
      1,
      case
        when v_over_limit and v_is_late then format('Cancellation #%s today (over the daily limit of 3) and %s day(s) before the appointment.', v_today_count + 1, v_days_before)
        when v_over_limit then format('Cancellation #%s today, over the daily limit of 3.', v_today_count + 1)
        else format('Cancelled %s day(s) before the appointment (less than the 3-day grace period).', v_days_before) end,
      v_customer_id, v_restriction
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'requires_confirmation', false,
    'is_late', v_is_late,
    'over_daily_limit', v_over_limit,
    'days_before', v_days_before,
    'cancellation_number', v_today_count + 1,
    'daily_limit', 3,
    'points_added', coalesce((v_penalty->>'points_added')::integer, 0),
    'penalty_count', coalesce((v_penalty->>'penalty_count')::integer, v_current_points),
    'restriction_label', v_penalty->>'restriction_label',
    'restriction_until', v_penalty->>'restriction_until'
  );
end;
$function$;

-- "1st", "2nd", "3rd", "4th", ... "11th", "12th", "13th", "21st"
CREATE OR REPLACE FUNCTION public.happytails_ordinal(p_n integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $function$
  select p_n::text || case
    when p_n % 100 between 11 and 13 then 'th'
    when p_n % 10 = 1 then 'st'
    when p_n % 10 = 2 then 'nd'
    when p_n % 10 = 3 then 'rd'
    else 'th' end
$function$;

-- Staff notification: also say when the daily limit caused the penalty.
-- The tracking row for THIS cancellation is inserted after the trigger fires,
-- so 3 or more earlier rows today means this one is over the limit.
CREATE OR REPLACE FUNCTION public.happytails_notify_staff_customer_cancellation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_appt public.appointments%rowtype;
  v_customer uuid;
  v_scheduled_at timestamptz;
  v_days_before integer;
  v_is_late boolean;
  v_today_count integer;
  v_over_limit boolean;
  v_pets text;
  v_service text;
  v_when text;
  v_penalty_note text := '';
begin
  select * into v_appt from public.appointments where id = new.appointment_id;
  if not found then return new; end if;
  v_customer := coalesce(new.customer_id, v_appt.customer_id);

  if v_appt.service_type::text = 'boarding' and v_appt.drop_off_at is not null then
    v_scheduled_at := v_appt.drop_off_at;
  else
    v_scheduled_at := ((v_appt.scheduled_date::text || ' ' || coalesce(v_appt.scheduled_time::text, '00:00'))::timestamp at time zone 'Asia/Manila');
  end if;
  v_days_before := (v_scheduled_at at time zone 'Asia/Manila')::date - (now() at time zone 'Asia/Manila')::date;
  v_is_late := v_days_before < 3;

  select count(*)::integer into v_today_count
  from public.customer_cancellation_tracking
  where customer_id = v_customer
    and (cancelled_at at time zone 'Asia/Manila')::date = (now() at time zone 'Asia/Manila')::date;
  v_over_limit := coalesce(v_today_count, 0) >= 3;

  select string_agg(p.name, ', ' order by p.name) into v_pets
  from public.appointment_pets ap join public.pets p on p.id = ap.pet_id
  where ap.appointment_id = v_appt.id;

  v_service := case v_appt.service_type::text
    when 'dog_grooming' then 'Dog Grooming' when 'cat_grooming' then 'Cat Grooming'
    when 'boarding' then 'Boarding' when 'ala_carte' then 'À La Carte'
    else initcap(replace(v_appt.service_type::text, '_', ' ')) end;
  v_when := to_char(v_scheduled_at at time zone 'Asia/Manila', 'Mon FMDD, YYYY "at" FMHH12:MI AM');

  if v_over_limit and v_is_late then
    v_penalty_note := format(' %s cancellation today (over the daily limit) and %s day%s before the appointment; 1 penalty point applied.',
      public.happytails_ordinal(v_today_count + 1), greatest(v_days_before, 0), case when v_days_before = 1 then '' else 's' end);
  elsif v_over_limit then
    v_penalty_note := format(' %s cancellation today (over the daily limit of 3); 1 penalty point applied.', public.happytails_ordinal(v_today_count + 1));
  elsif v_is_late then
    v_penalty_note := format(' Cancelled %s day%s before the appointment; 1 penalty point applied.', greatest(v_days_before, 0), case when v_days_before = 1 then '' else 's' end);
  end if;

  insert into public.staff_notifications(kind, appointment_id, customer_id, title, message, details)
  values (
    'customer_cancellation',
    v_appt.id,
    v_customer,
    case when v_over_limit then 'Customer exceeded the daily cancellation limit'
         when v_is_late then 'Late cancellation by customer'
         else 'Customer cancelled an appointment' end,
    format('%s cancelled %s for %s scheduled %s.', v_appt.owner_name, v_service, coalesce(v_pets, 'their pet'), v_when)
      || v_penalty_note
      || ' Reason: ' || left(coalesce(new.reason, 'Not provided'), 300),
    jsonb_build_object(
      'is_late', v_is_late or v_over_limit,
      'late_by_days', v_is_late,
      'over_daily_limit', v_over_limit,
      'cancellation_number', v_today_count + 1,
      'days_before', v_days_before,
      'reason', new.reason,
      'service_type', v_appt.service_type,
      'scheduled_at', v_scheduled_at,
      'owner_name', v_appt.owner_name,
      'pet_names', v_pets
    )
  );
  return new;
exception when others then
  raise warning 'Staff cancellation notification failed for appointment %: %', new.appointment_id, sqlerrm;
  return new;
end;
$function$;
