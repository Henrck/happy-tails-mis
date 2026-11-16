-- HappyTails cancellation & penalty rules (v2)
--
--  * Free cancellation: 3 or more CALENDAR days before the appointment date
--    (Asia/Manila). Customers may cancel at most 3 appointments per Philippine
--    calendar day (all cancellations count); the 4th is refused with a message
--    to contact the shop.
--  * Late cancellation: fewer than 3 calendar days before (0, 1 or 2 days) adds
--    1 penalty point and a 12-hour booking restriction from that moment.
--  * No-show: a pending/confirmed appointment with no pet checked in 24 hours
--    after its scheduled start is cancelled automatically. If it was CONFIRMED
--    and booked online by a customer account, it adds 2 penalty points and a
--    2-day booking restriction.
--  * Reaching 3 penalty points restricts new bookings for 1 month (replacing any
--    shorter restriction). Points are never reset automatically.
--
-- Replaces: happytails_apply_customer_booking_penalty,
--           happytails_cancel_customer_appointment_with_limiter,
--           happytails_record_customer_no_show
-- Adds:     happytails_process_overdue_no_shows (+ optional hourly pg_cron job)

-- ---------------------------------------------------------------------------
-- 1) Penalty helper: restriction length is now passed in by the caller.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.happytails_apply_customer_booking_penalty(uuid, uuid, text, integer, text, uuid);

CREATE OR REPLACE FUNCTION public.happytails_apply_customer_booking_penalty(
  p_customer_id uuid,
  p_appointment_id uuid,
  p_event_type text,
  p_points integer,
  p_reason text,
  p_actor_id uuid,
  p_restriction interval DEFAULT interval '1 day'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_current integer;
  v_new integer;
  v_restriction interval;
  v_until timestamptz;
begin
  if p_points not between 1 and 3 then
    raise exception 'Invalid penalty points';
  end if;

  insert into public.customer_booking_penalties(customer_id)
  values (p_customer_id)
  on conflict (customer_id) do nothing;

  select penalty_count into v_current
  from public.customer_booking_penalties
  where customer_id = p_customer_id
  for update;

  v_new := least(3, coalesce(v_current, 0) + p_points);
  v_restriction := case when v_new >= 3 then interval '1 month' else p_restriction end;
  v_until := now() + v_restriction;

  update public.customer_booking_penalties
  set penalty_count = v_new,
      penalty_restricted_until = greatest(coalesce(penalty_restricted_until, '-infinity'::timestamptz), v_until),
      updated_at = now()
  where customer_id = p_customer_id;

  insert into public.customer_booking_penalty_events(
    customer_id, appointment_id, event_type, points_added, reason, restriction_until, created_by
  ) values (
    p_customer_id, p_appointment_id, p_event_type, p_points, p_reason, v_until, p_actor_id
  );

  return jsonb_build_object(
    'penalty_count', v_new,
    'points_added', p_points,
    'restriction_label', public.happytails_restriction_label(v_restriction),
    'restriction_until', v_until
  );
end;
$function$;

-- Only other database functions may apply penalties; clients must not call this directly.
REVOKE ALL ON FUNCTION public.happytails_apply_customer_booking_penalty(uuid, uuid, text, integer, text, uuid, interval) FROM PUBLIC, anon, authenticated;

-- "12 hours", "2 days", "1 month" for messages and the app.
CREATE OR REPLACE FUNCTION public.happytails_restriction_label(p_restriction interval)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $function$
  select case
    when p_restriction >= interval '1 month' then '1 month'
    when extract(epoch from p_restriction) < 86400 then
      (extract(epoch from p_restriction) / 3600)::integer || ' hours'
    when (extract(epoch from p_restriction) / 86400)::integer = 1 then '1 day'
    else (extract(epoch from p_restriction) / 86400)::integer || ' days'
  end
$function$;

-- ---------------------------------------------------------------------------
-- 2) Customer cancellation with the new limiter.
-- ---------------------------------------------------------------------------
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
  v_points integer := 0;
  v_current_points integer := 0;
  v_new_points integer := 0;
  v_restriction interval := interval '12 hours';
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
  -- bypass the daily limit.
  perform 1 from public.customers where id = v_customer_id for update;

  if v_appointment.service_type = 'boarding' and v_appointment.drop_off_at is not null then
    v_scheduled_at := v_appointment.drop_off_at;
  else
    v_scheduled_at := ((v_appointment.scheduled_date::text || ' ' || coalesce(v_appointment.scheduled_time::text, '00:00'))::timestamp at time zone 'Asia/Manila');
  end if;
  v_scheduled_day := (v_scheduled_at at time zone 'Asia/Manila')::date;

  -- Calendar days: e.g. cancelling on the 17th for the 20th is 3 days = free.
  v_days_before := v_scheduled_day - v_today;
  v_is_late := v_days_before < 3;

  -- At most 3 customer cancellations per Philippine calendar day.
  select count(*)::integer into v_today_count
  from public.customer_cancellation_tracking
  where customer_id = v_customer_id
    and (cancelled_at at time zone 'Asia/Manila')::date = v_today;
  if v_today_count >= 3 then
    raise exception 'DAILY_CANCELLATION_LIMIT: You have reached the limit of 3 cancellations today. To cancel this appointment, please message HappyTails on our Facebook page.'
      using errcode = 'P0001';
  end if;

  v_current_points := coalesce((select penalty_count from public.customer_booking_penalties where customer_id = v_customer_id), 0);

  if v_is_late then
    v_points := 1;
    v_new_points := least(3, v_current_points + v_points);
    if not p_penalty_confirmed or p_confirmed_penalty_count is distinct from v_new_points then
      return jsonb_build_object(
        'ok', false,
        'requires_confirmation', true,
        'is_late', true,
        'days_before', v_days_before,
        'cancellation_number', v_today_count + 1,
        'daily_limit', 3,
        'points_added', v_points,
        'penalty_count', v_new_points,
        'restriction_label', public.happytails_restriction_label(case when v_new_points >= 3 then interval '1 month' else v_restriction end),
        'message', case when v_new_points >= 3
          then 'This appointment is less than 3 days away. Cancelling now adds 1 penalty point, reaching the 3-point limit, and restricts new bookings for one month.'
          else 'This appointment is less than 3 days away. Cancelling now adds 1 penalty point and restricts new bookings for 12 hours.' end
      );
    end if;
  end if;

  -- Existing cancellation function keeps its own records and status checks.
  -- Any error rolls back this whole transaction.
  perform public.happytails_cancel_customer_appointment(p_appointment_id, trim(p_reason));

  insert into public.customer_cancellation_tracking(
    appointment_id, customer_id, scheduled_at, is_late, late_cancellation_number, reason
  ) values (
    p_appointment_id, v_customer_id, v_scheduled_at, v_is_late, v_today_count + 1, trim(p_reason)
  );

  if v_points > 0 then
    v_penalty := public.happytails_apply_customer_booking_penalty(
      v_customer_id, p_appointment_id, 'late_cancellation', 1,
      format('Cancelled %s day(s) before the appointment (less than the 3-day grace period).', v_days_before),
      v_customer_id, v_restriction
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'requires_confirmation', false,
    'is_late', v_is_late,
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

-- ---------------------------------------------------------------------------
-- 3) Manual no-show (kept for database use; the staff button is removed).
--    Same penalty as the automatic no-show: 2 points, 2-day restriction.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.happytails_record_customer_no_show(
  p_appointment_id uuid,
  p_reason text DEFAULT 'Customer did not arrive for the scheduled appointment.'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_actor uuid := auth.uid();
  v_role text;
  v_appointment public.appointments%rowtype;
  v_scheduled_at timestamptz;
  v_result jsonb;
begin
  select role into v_role from public.profiles where id = v_actor;
  if coalesce(v_role, '') not in ('admin', 'superadmin', 'manager', 'staff') then
    raise exception 'Staff access required to record a no-show.';
  end if;

  select * into v_appointment from public.appointments where id = p_appointment_id for update;
  if not found then raise exception 'Appointment not found.'; end if;
  if v_appointment.customer_id is null then raise exception 'This appointment is not linked to a customer account.'; end if;
  if length(trim(coalesce(p_reason, ''))) < 5 or length(trim(p_reason)) > 500 then raise exception 'Enter a no-show note between 5 and 500 characters.'; end if;
  if v_appointment.status <> 'confirmed' then raise exception 'Only confirmed appointments can be marked as no-show.'; end if;

  if v_appointment.service_type = 'boarding' and v_appointment.drop_off_at is not null then
    v_scheduled_at := v_appointment.drop_off_at;
  else
    v_scheduled_at := ((v_appointment.scheduled_date::text || ' ' || coalesce(v_appointment.scheduled_time::text, '00:00'))::timestamp at time zone 'Asia/Manila');
  end if;
  if v_scheduled_at > now() then raise exception 'A no-show can only be recorded after the scheduled start time.'; end if;

  if exists(select 1 from public.customer_booking_penalty_events where appointment_id = p_appointment_id and event_type = 'no_show') then
    raise exception 'This appointment has already been recorded as a no-show.';
  end if;

  v_result := public.happytails_apply_customer_booking_penalty(
    v_appointment.customer_id, p_appointment_id, 'no_show', 2,
    left(trim(coalesce(p_reason, 'Customer did not arrive for the scheduled appointment.')), 500), v_actor,
    interval '2 days'
  );
  return jsonb_build_object('ok', true, 'event_type', 'no_show') || v_result;
end;
$function$;

-- ---------------------------------------------------------------------------
-- 4) Automatic no-show processing. Idempotent; safe to call often.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.happytails_process_overdue_no_shows()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_row record;
  v_reason constant text := 'Automatically cancelled as a no-show: no pet was checked in within 24 hours of the scheduled time.';
  v_count integer := 0;
begin
  for v_row in
    select a.id, a.customer_id, a.is_walk_in, a.status::text as status, a.service_type::text as service_type
    from public.appointments a
    where a.status in ('pending', 'confirmed')
      and case
            when a.service_type = 'boarding' and a.drop_off_at is not null then a.drop_off_at
            else ((a.scheduled_date::text || ' ' || coalesce(a.scheduled_time::text, '00:00'))::timestamp at time zone 'Asia/Manila')
          end <= now() - interval '24 hours'
      -- Never touch a booking where any pet is already in service or done.
      and not exists (
        select 1 from public.appointment_pets ap
        where ap.appointment_id = a.id
          and coalesce(ap.status::text, 'pending') not in ('pending', 'confirmed')
      )
    order by a.id
    for update of a skip locked
  loop
   -- Each appointment runs in its own sub-transaction: if one fails (e.g. a
   -- guard trigger), it is rolled back, left open for the next run, and the
   -- rest are still processed.
   begin
    update public.appointments set status = 'cancelled' where id = v_row.id;
    update public.appointment_pets set status = 'cancelled'
      where appointment_id = v_row.id and coalesce(status::text, 'pending') in ('pending', 'confirmed');

    -- Shown to the customer as the cancellation reason.
    begin
      insert into public.appointment_staff_cancellations(appointment_id, reason, cancelled_by)
      values (v_row.id, v_reason, null)
      on conflict (appointment_id) do nothing;
    exception when not_null_violation or foreign_key_violation then
      null; -- cancelled_by is required in this database; the notification still explains it.
    end;

    -- Penalise only confirmed online bookings that belong to a customer account.
    if v_row.status = 'confirmed' and v_row.customer_id is not null and not coalesce(v_row.is_walk_in, false)
       and not exists (select 1 from public.customer_booking_penalty_events
                       where appointment_id = v_row.id and event_type = 'no_show') then
      perform public.happytails_apply_customer_booking_penalty(
        v_row.customer_id, v_row.id, 'no_show', 2, v_reason, null, interval '2 days'
      );
    end if;

    -- The status trigger creates a generic notification; explain why.
    if v_row.customer_id is not null then
      update public.notifications n set
        title = 'Appointment Cancelled (No-show)',
        message = 'Your ' || replace(v_row.service_type, '_', ' ') || ' appointment was cancelled automatically because no pet was checked in within 24 hours of the scheduled time.'
          || case when v_row.status = 'confirmed' and not coalesce(v_row.is_walk_in, false)
                  then ' This adds 2 penalty points and a 2-day booking restriction.' else '' end
      where n.id = (
        select id from public.notifications
        where appointment_id = v_row.id and customer_id = v_row.customer_id
          and (lower(title) like '%cancel%' or lower(message) like '%cancel%')
        order by created_at desc limit 1
      );
    end if;

    v_count := v_count + 1;
   exception when others then
    raise warning 'Automatic no-show for appointment % skipped: %', v_row.id, sqlerrm;
   end;
  end loop;
  return v_count;
end;
$function$;

-- Called by the app (staff/customer pages) and the Vercel cron route.
REVOKE ALL ON FUNCTION public.happytails_process_overdue_no_shows() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.happytails_process_overdue_no_shows() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5) Optional: run hourly inside the database when pg_cron is enabled
--    (Supabase Dashboard > Database > Extensions > pg_cron). Skipped otherwise.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'happytails-overdue-no-shows';
    PERFORM cron.schedule('happytails-overdue-no-shows', '5 * * * *', 'select public.happytails_process_overdue_no_shows()');
  END IF;
END $$;
