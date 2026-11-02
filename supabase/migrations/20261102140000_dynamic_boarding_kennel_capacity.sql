-- HappyTails: allow physical kennel expansion without a fixed 6 Small / 2 Big cap.
-- No current or historical kennel or appointment records are changed.
BEGIN;
DO $$
BEGIN
  IF to_regclass('public.kennels') IS NULL THEN
    RAISE EXCEPTION 'Kennel table missing; apply existing boarding migrations first.';
  END IF;
  IF to_regprocedure('public.happytails_boarding_kennel_physical_limit()') IS NULL THEN
    RAISE EXCEPTION 'Existing kennel guard missing; apply the earlier boarding migrations first.';
  END IF;
END $$;

-- Preserve the trigger and its concurrency lock, but remove the obsolete
-- hard-coded count. Booking reservation/overlap and kennel deactivation guards
-- are separate functions and are deliberately untouched.
CREATE OR REPLACE FUNCTION public.happytails_boarding_kennel_physical_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.size::text NOT IN ('small', 'big') THEN
    RAISE EXCEPTION 'Unknown kennel size: %', NEW.size USING errcode = '23514';
  END IF;
  IF NEW.is_active THEN
    PERFORM pg_advisory_xact_lock(786533,2601);
  END IF;
  RETURN NEW;
END;
$$;
COMMIT;
