-- HappyTails: enforce Calendar Management shop closures for every new booking.
-- Existing appointments are not rewritten or cancelled by this migration.
-- This is an INSERT-only guard; routine status changes to booked appointments
-- are intentionally unaffected even if the shop later marks the day closed.

-- Booking dates must be readable to authenticated customers and staff so that
-- customer, POS, Grooming, and Boarding calendars show the same closure flags.
GRANT SELECT ON TABLE public.booking_closed_dates TO authenticated;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'booking_closed_dates'
      AND policyname = 'happytails_booking_calendar_authenticated_read_v1'
  ) THEN
    CREATE POLICY happytails_booking_calendar_authenticated_read_v1
      ON public.booking_closed_dates FOR SELECT TO authenticated USING (true);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.happytails_block_closed_booking_dates_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_reason text;
  v_pickup_day date;
BEGIN
  IF NEW.scheduled_date IS NOT NULL THEN
    SELECT c.name INTO v_reason
    FROM public.booking_closed_dates AS c
    WHERE c.date = NEW.scheduled_date
      AND NOT c.is_open_override
    LIMIT 1;

    IF v_reason IS NOT NULL THEN
      RAISE EXCEPTION 'Calendar Management: % is closed for new bookings (%). Choose an open date.',
        NEW.scheduled_date, v_reason USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF NEW.service_type = 'boarding' AND NEW.pick_up_at IS NOT NULL THEN
    v_pickup_day := (NEW.pick_up_at AT TIME ZONE 'Asia/Manila')::date;
    v_reason := NULL;
    SELECT c.name INTO v_reason
    FROM public.booking_closed_dates AS c
    WHERE c.date = v_pickup_day
      AND NOT c.is_open_override
    LIMIT 1;
    IF v_reason IS NOT NULL THEN
      RAISE EXCEPTION 'Calendar Management: Boarding pickup on % is closed (%). Select a different stay.',
        v_pickup_day, v_reason USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.happytails_block_closed_booking_dates_v1() FROM PUBLIC;
DROP TRIGGER IF EXISTS happytails_booking_closed_date_guard_v1 ON public.appointments;
CREATE TRIGGER happytails_booking_closed_date_guard_v1
  BEFORE INSERT ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.happytails_block_closed_booking_dates_v1();
