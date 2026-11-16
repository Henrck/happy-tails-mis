-- HappyTails: allow the penalty event types used by the v2 cancellation rules.
--
-- Fixes: new row for relation "customer_booking_penalty_events" violates
--        check constraint "customer_booking_penalty_events_event_type_check"
--
-- The original constraint only knew the old event names. The new rules record:
--   late_cancellation         cancelled 0-2 calendar days before the appointment
--   daily_cancellation_limit  4th+ cancellation in one Philippine calendar day
-- Existing values (and any already stored in the table) are kept.

DO $$
DECLARE
  v_allowed text[] := ARRAY[
    'late_cancellation',
    'daily_cancellation_limit',
    'late_cancellation_limit',
    'no_show',
    'manual_restriction',
    'manual_lift'
  ];
  v_old_def text;
BEGIN
  -- Keep every value the old constraint allowed (quoted literals in its definition).
  SELECT pg_get_constraintdef(oid) INTO v_old_def
  FROM pg_constraint
  WHERE conrelid = 'public.customer_booking_penalty_events'::regclass
    AND conname = 'customer_booking_penalty_events_event_type_check';
  IF v_old_def IS NOT NULL THEN
    v_allowed := v_allowed || ARRAY(SELECT m[1] FROM regexp_matches(v_old_def, '''([^'']+)''', 'g') AS m);
  END IF;

  -- Keep every value already stored, so the new constraint validates.
  v_allowed := v_allowed || ARRAY(SELECT DISTINCT event_type FROM public.customer_booking_penalty_events WHERE event_type IS NOT NULL);
  v_allowed := ARRAY(SELECT DISTINCT unnest(v_allowed) ORDER BY 1);

  ALTER TABLE public.customer_booking_penalty_events
    DROP CONSTRAINT IF EXISTS customer_booking_penalty_events_event_type_check;
  EXECUTE format(
    'ALTER TABLE public.customer_booking_penalty_events
       ADD CONSTRAINT customer_booking_penalty_events_event_type_check
       CHECK (event_type = ANY (%L::text[]))',
    v_allowed
  );
  RAISE NOTICE 'Allowed penalty event types: %', v_allowed;
END $$;
