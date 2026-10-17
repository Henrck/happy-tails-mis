-- Permanent, human-readable appointment numbers: 1, 2, 3, ...
-- Existing appointments receive numbers in creation order, starting at 1.
-- UUID primary keys, foreign keys, appointment-pet rows, and service codes remain unchanged.
-- Apply once through Supabase SQL Editor or the project's migration process.
BEGIN;

-- Serialize writes during backfill, so new appointments cannot take numbers
-- between existing historical appointments.
LOCK TABLE public.appointments IN ACCESS EXCLUSIVE MODE;

CREATE SEQUENCE IF NOT EXISTS public.happytails_appointment_number_seq AS bigint START WITH 1;

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS appointment_number bigint;

ALTER TABLE public.appointments
  ALTER COLUMN appointment_number SET DEFAULT nextval('public.happytails_appointment_number_seq'::regclass);

-- If migrating a database where the column already has values, preserve them.
-- Advance the sequence beyond those values before allocating missing numbers.
SELECT setval(
  'public.happytails_appointment_number_seq'::regclass,
  GREATEST(1, COALESCE((SELECT MAX(appointment_number) FROM public.appointments), 0)),
  (SELECT COUNT(*) > 0 FROM public.appointments WHERE appointment_number IS NOT NULL)
);

DO $$
DECLARE item record;
BEGIN
  FOR item IN
    SELECT id FROM public.appointments
    WHERE appointment_number IS NULL
    ORDER BY created_at ASC NULLS LAST, id ASC
  LOOP
    UPDATE public.appointments
      SET appointment_number = nextval('public.happytails_appointment_number_seq'::regclass)
      WHERE id = item.id;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS appointments_appointment_number_unique_idx
  ON public.appointments (appointment_number);

ALTER TABLE public.appointments
  ALTER COLUMN appointment_number SET NOT NULL;

-- An issued number must not be modified by normal application updates.
CREATE OR REPLACE FUNCTION public.happytails_protect_appointment_number()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.appointment_number IS DISTINCT FROM OLD.appointment_number THEN
    RAISE EXCEPTION 'Appointment numbers are permanent';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS happytails_protect_appointment_number ON public.appointments;
CREATE TRIGGER happytails_protect_appointment_number
  BEFORE UPDATE OF appointment_number ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.happytails_protect_appointment_number();

COMMIT;
