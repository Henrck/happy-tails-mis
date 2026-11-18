-- HappyTails: penalty points expire and can be reset
--
-- Before: penalty points never reset. A customer who reached 3/3 stayed at 3/3
-- forever, so every later violation (even after an admin lifted the
-- restriction) immediately triggered another 1-month restriction.
--
-- New rules
--   * Each penalty point expires 60 days after it was given.
--   * Fresh start: when a 3-point (1-month) restriction period ends, the
--     customer's points go back to 0/3. Lifting the restriction early does not
--     reset points; they reset when the original month would have ended.
--   * While a 3-point restriction is still running the count stays at 3/3.
--   * Super Admins can reset a customer's points to 0/3 (with a reason). This
--     also ends the automatic penalty restriction; a manual restriction set by
--     staff is left alone. History (penalty events) is kept.
--
-- Points are recalculated whenever a penalty is applied, when the customer
-- cancels, when the app loads penalty counts, and hourly when pg_cron is on.
-- Run once in the Supabase SQL editor. Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1) Where counting starts after a reset or a served month.
-- ---------------------------------------------------------------------------
ALTER TABLE public.customer_booking_penalties
  ADD COLUMN IF NOT EXISTS points_reset_at timestamptz;

-- Point expiry needs each event's time (no-op if the column already exists).
ALTER TABLE public.customer_booking_penalty_events
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

COMMENT ON COLUMN public.customer_booking_penalties.points_reset_at IS
  'Penalty points given before this moment no longer count (Super Admin reset, or the end of a served 1-month restriction).';

-- ---------------------------------------------------------------------------
-- 2) Allow the new event type in the penalty history.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_def text;
  v_allowed text[] := ARRAY['penalty_reset'];
BEGIN
  SELECT pg_get_constraintdef(oid) INTO v_def
  FROM pg_constraint
  WHERE conrelid = 'public.customer_booking_penalty_events'::regclass
    AND conname = 'customer_booking_penalty_events_event_type_check';
  IF v_def IS NOT NULL THEN
    v_allowed := v_allowed || ARRAY(SELECT m[1] FROM regexp_matches(v_def, '''([^'']+)''', 'g') AS m);
  END IF;
  v_allowed := v_allowed || ARRAY(SELECT DISTINCT event_type FROM public.customer_booking_penalty_events WHERE event_type IS NOT NULL);
  v_allowed := ARRAY(SELECT DISTINCT unnest(v_allowed) ORDER BY 1);
  ALTER TABLE public.customer_booking_penalty_events
    DROP CONSTRAINT IF EXISTS customer_booking_penalty_events_event_type_check;
  EXECUTE format(
    'ALTER TABLE public.customer_booking_penalty_events
       ADD CONSTRAINT customer_booking_penalty_events_event_type_check
       CHECK (event_type = ANY (%L::text[]))', v_allowed);
END $$;

-- ---------------------------------------------------------------------------
-- 3) Recalculate one customer's points from their penalty history.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.happytails_refresh_customer_penalty(p_customer_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_row public.customer_booking_penalties%rowtype;
  v_last_until timestamptz;
  v_reset timestamptz;
  v_count integer;
begin
  select * into v_row from public.customer_booking_penalties where customer_id = p_customer_id for update;
  if not found then return 0; end if;
  v_reset := v_row.points_reset_at;

  -- A 3-point restriction is always the latest point's restriction (1 month).
  -- Once that period is over, start counting again from its end.
  if v_row.penalty_count >= 3 then
    select restriction_until into v_last_until
    from public.customer_booking_penalty_events
    where customer_id = p_customer_id and points_added > 0
      and created_at > coalesce(v_reset, '-infinity'::timestamptz)
    order by created_at desc
    limit 1;
    if v_last_until is not null and v_last_until <= now() then
      v_reset := greatest(coalesce(v_reset, '-infinity'::timestamptz), v_last_until);
    end if;
  end if;

  if v_row.penalty_count >= 3 and v_reset is not distinct from v_row.points_reset_at
     and v_row.penalty_restricted_until > now() then
    -- Still serving the 3-point restriction: keep 3/3 even if a point ages out.
    v_count := 3;
  else
    select least(3, coalesce(sum(points_added), 0))::integer into v_count
    from public.customer_booking_penalty_events
    where customer_id = p_customer_id and points_added > 0
      and created_at > now() - interval '60 days'
      and created_at > coalesce(v_reset, '-infinity'::timestamptz);
  end if;

  if v_count is distinct from v_row.penalty_count or v_reset is distinct from v_row.points_reset_at then
    update public.customer_booking_penalties
    set penalty_count = v_count, points_reset_at = v_reset, updated_at = now()
    where customer_id = p_customer_id;
  end if;
  return v_count;
end;
$function$;

REVOKE ALL ON FUNCTION public.happytails_refresh_customer_penalty(uuid) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4) Called by the app before showing counts: a customer refreshes their own
--    row; staff refresh everyone (or one customer).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.happytails_refresh_penalty_counts(p_customer_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_staff boolean;
  v_id uuid;
  v_done integer := 0;
begin
  -- No signed-in user means the hourly database job (pg_cron) or the SQL editor.
  v_staff := v_uid is null or exists (
    select 1 from public.profiles where id = v_uid and role in ('admin', 'superadmin', 'manager', 'staff'));
  if p_customer_id is null and not v_staff then p_customer_id := v_uid; end if;
  if p_customer_id is not null and not v_staff and p_customer_id <> v_uid then
    raise exception 'You can only refresh your own penalty points.';
  end if;

  for v_id in
    select customer_id from public.customer_booking_penalties
    where (p_customer_id is null or customer_id = p_customer_id) and penalty_count > 0
  loop
    perform public.happytails_refresh_customer_penalty(v_id);
    v_done := v_done + 1;
  end loop;
  return v_done;
end;
$function$;

REVOKE ALL ON FUNCTION public.happytails_refresh_penalty_counts(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.happytails_refresh_penalty_counts(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5) Applying a penalty now counts only points that are still valid.
-- ---------------------------------------------------------------------------
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

  -- Drop expired points (and apply a served-month reset) before adding new ones.
  v_current := public.happytails_refresh_customer_penalty(p_customer_id);

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

REVOKE ALL ON FUNCTION public.happytails_apply_customer_booking_penalty(uuid, uuid, text, integer, text, uuid, interval) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6) Customer cancellation: same as 20261117_03, but refreshes the customer's
--    points before warning them.
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

  -- Expire old points first, so the warning shows the customer's current count.
  perform public.happytails_refresh_customer_penalty(v_customer_id);
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

-- ---------------------------------------------------------------------------
-- 7) Super Admin: reset a customer's penalty points.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.happytails_admin_reset_customer_penalties(p_customer_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_actor uuid := auth.uid();
  v_previous integer;
begin
  if not exists (select 1 from public.profiles where id = v_actor and role = 'superadmin') then
    raise exception 'Only a Super Admin can reset penalty points.';
  end if;
  if length(trim(coalesce(p_reason, ''))) < 5 or length(trim(p_reason)) > 500 then
    raise exception 'Enter a reason between 5 and 500 characters.';
  end if;

  insert into public.customer_booking_penalties(customer_id)
  values (p_customer_id)
  on conflict (customer_id) do nothing;

  select penalty_count into v_previous
  from public.customer_booking_penalties where customer_id = p_customer_id for update;

  update public.customer_booking_penalties
  set penalty_count = 0,
      points_reset_at = now(),
      penalty_restricted_until = null,
      updated_at = now()
  where customer_id = p_customer_id;

  insert into public.customer_booking_penalty_events(
    customer_id, appointment_id, event_type, points_added, reason, restriction_until, created_by
  ) values (
    p_customer_id, null, 'penalty_reset', 0,
    format('Penalty points reset from %s/3 to 0/3. %s', coalesce(v_previous, 0), trim(p_reason)), null, v_actor
  );

  return jsonb_build_object('ok', true, 'previous_count', coalesce(v_previous, 0), 'penalty_count', 0);
end;
$function$;

REVOKE ALL ON FUNCTION public.happytails_admin_reset_customer_penalties(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.happytails_admin_reset_customer_penalties(uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 8) Optional hourly refresh inside the database when pg_cron is enabled.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'happytails-penalty-expiry';
    PERFORM cron.schedule('happytails-penalty-expiry', '15 * * * *', 'select public.happytails_refresh_penalty_counts()');
  END IF;
END $$;

-- Bring every existing account up to date now.
SELECT public.happytails_refresh_penalty_counts() AS customers_refreshed;
