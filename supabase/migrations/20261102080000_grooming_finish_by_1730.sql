-- HappyTails: protect the 5:30 PM grooming FINISH cutoff for Customer and POS.
-- Staging first. Existing bookings and data are not deleted or rescheduled.
-- Requires public.grooming_package_durations from the grooming capacity migration.
-- This migration supplements (does not replace) the existing planner/overlap guards.
BEGIN;

DO $$
BEGIN
  IF to_regclass('public.appointments') IS NULL OR
     to_regclass('public.appointment_pets') IS NULL OR
     to_regclass('public.package_pricing') IS NULL OR
     to_regclass('public.grooming_package_durations') IS NULL THEN
    RAISE EXCEPTION 'Grooming cutoff migration requires appointments, appointment_pets, package_pricing, and grooming_package_durations.';
  END IF;
END $$;

-- Called only by database triggers. A package duration must be verified:
-- if a package needs 60 minutes, starting at 5:00 PM is NOT permitted.
CREATE OR REPLACE FUNCTION public.happytails_assert_grooming_finish_by_1730(
  p_appointment_id uuid,
  p_package_pricing_id uuid,
  p_groomer_id uuid,
  p_start_override time DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_service text;
  v_status text;
  v_start time;
  v_duration integer;
  v_verified boolean;
  v_start_minutes integer;
BEGIN
  -- Groomer allocation may legitimately be cleared on pet checkout.
  IF p_groomer_id IS NULL THEN RETURN; END IF;

  SELECT a.service_type::text, a.status::text,
         COALESCE(p_start_override, a.scheduled_time::time)
    INTO v_service, v_status, v_start
  FROM public.appointments a
  WHERE a.id = p_appointment_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Grooming appointment not found.' USING ERRCODE='23514'; END IF;
  IF v_service NOT IN ('dog_grooming', 'cat_grooming') OR v_status IN ('completed', 'cancelled') THEN
    RETURN;
  END IF;
  IF v_start IS NULL OR p_package_pricing_id IS NULL THEN
    RAISE EXCEPTION 'Grooming start time or package rate is missing.' USING ERRCODE='23514';
  END IF;

  SELECT d.duration_minutes, d.verified
    INTO v_duration, v_verified
  FROM public.package_pricing pp
  LEFT JOIN public.grooming_package_durations d ON d.package_id = pp.package_id
  WHERE pp.id = p_package_pricing_id;

  IF NOT FOUND OR v_verified IS DISTINCT FROM TRUE OR v_duration IS NULL
     OR v_duration < 30 OR v_duration > 480 OR v_duration % 30 <> 0 THEN
    RAISE EXCEPTION 'This grooming package needs a verified 30-minute-increment duration before booking.' USING ERRCODE='23514';
  END IF;

  v_start_minutes := EXTRACT(HOUR FROM v_start)::integer * 60
                   + EXTRACT(MINUTE FROM v_start)::integer;
  IF EXTRACT(SECOND FROM v_start) <> 0 OR
     v_start_minutes < 540 OR v_start_minutes % 30 <> 0 OR
     v_start_minutes + v_duration > 1050 THEN
    RAISE EXCEPTION 'Grooming must finish by 5:30 PM. A % minute treatment cannot start at %.',
      v_duration, v_start USING ERRCODE='23514';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.happytails_assert_grooming_finish_by_1730(uuid,uuid,uuid,time)
  FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.happytails_grooming_cutoff_pet_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  -- Do not run a booking-time validator on a simple checkout/status edit.
  PERFORM public.happytails_assert_grooming_finish_by_1730(
    NEW.appointment_id, NEW.package_pricing_id, NEW.groomer_id, NULL
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS happytails_grooming_cutoff_pet_guard ON public.appointment_pets;
CREATE TRIGGER happytails_grooming_cutoff_pet_guard
  AFTER INSERT OR UPDATE OF appointment_id, package_pricing_id, groomer_id
  ON public.appointment_pets FOR EACH ROW
  EXECUTE FUNCTION public.happytails_grooming_cutoff_pet_guard();

CREATE OR REPLACE FUNCTION public.happytails_grooming_cutoff_schedule_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_pet record;
BEGIN
  IF NEW.service_type::text NOT IN ('dog_grooming', 'cat_grooming') OR
     NEW.status::text IN ('completed', 'cancelled') THEN
    RETURN NEW;
  END IF;
  IF NEW.scheduled_time IS NULL AND EXISTS (
    SELECT 1 FROM public.appointment_pets ap
    WHERE ap.appointment_id = NEW.id AND ap.groomer_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Grooming appointments with assigned groomers require a start time.' USING ERRCODE='23514';
  END IF;
  FOR v_pet IN
    SELECT ap.package_pricing_id, ap.groomer_id
    FROM public.appointment_pets ap
    WHERE ap.appointment_id = NEW.id AND ap.groomer_id IS NOT NULL
  LOOP
    PERFORM public.happytails_assert_grooming_finish_by_1730(
      NEW.id, v_pet.package_pricing_id, v_pet.groomer_id, NEW.scheduled_time::time
    );
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS happytails_grooming_cutoff_schedule_guard ON public.appointments;
CREATE TRIGGER happytails_grooming_cutoff_schedule_guard
  BEFORE UPDATE OF scheduled_time, service_type
  ON public.appointments FOR EACH ROW
  EXECUTE FUNCTION public.happytails_grooming_cutoff_schedule_guard();

COMMIT;
