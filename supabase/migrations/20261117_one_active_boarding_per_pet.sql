-- HappyTails: a pet may hold only ONE unfinished boarding booking at a time.
--
-- "Unfinished" = the boarding appointment is pending, confirmed or checked_in,
-- and that pet has not been checked out (appointment_pets.status <> 'completed'
-- and actual_checkout_at IS NULL). Cancelled/completed bookings free the pet.
--
-- The app hides Boarding for such pets (lib/supabase/active-boarding.ts); this
-- trigger is the server-side guarantee for stale pages, two tabs, or direct API use.
--
-- The trigger is DEFERRABLE INITIALLY DEFERRED, so it checks at COMMIT. A
-- reschedule that inserts the new booking and cancels the old one inside the
-- same transaction is therefore allowed. A per-pet advisory lock serialises
-- simultaneous bookings for the same pet.

CREATE OR REPLACE FUNCTION public.happytails_enforce_one_active_boarding_per_pet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_is_active boolean;
  clash_appointment uuid;
  pet_name text;
BEGIN
  -- Only an unfinished boarding row for this pet needs checking.
  SELECT a.service_type = 'boarding'
         AND a.status IN ('pending', 'confirmed', 'checked_in')
         AND COALESCE(ap.status, '') <> 'completed'
         AND ap.actual_checkout_at IS NULL
    INTO new_is_active
    FROM public.appointment_pets ap
    JOIN public.appointments a ON a.id = ap.appointment_id
   WHERE ap.id = NEW.id;

  IF NOT COALESCE(new_is_active, false) OR NEW.pet_id IS NULL THEN
    RETURN NULL;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('happytails_boarding_pet:' || NEW.pet_id::text));

  SELECT ap.appointment_id
    INTO clash_appointment
    FROM public.appointment_pets ap
    JOIN public.appointments a ON a.id = ap.appointment_id
   WHERE ap.pet_id = NEW.pet_id
     AND ap.id <> NEW.id
     AND ap.appointment_id <> NEW.appointment_id
     AND a.service_type = 'boarding'
     AND a.status IN ('pending', 'confirmed', 'checked_in')
     AND COALESCE(ap.status, '') <> 'completed'
     AND ap.actual_checkout_at IS NULL
   LIMIT 1;

  IF clash_appointment IS NOT NULL THEN
    SELECT name INTO pet_name FROM public.pets WHERE id = NEW.pet_id;
    RAISE EXCEPTION '% is already booked for boarding. A new boarding booking can be made after that stay is completed or cancelled.', COALESCE(pet_name, 'This pet')
      USING ERRCODE = 'P0001',
            DETAIL = format('Existing boarding appointment: %s', clash_appointment),
            HINT = 'PET_ALREADY_BOARDING';
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS happytails_one_active_boarding_per_pet ON public.appointment_pets;

CREATE CONSTRAINT TRIGGER happytails_one_active_boarding_per_pet
  AFTER INSERT OR UPDATE OF pet_id, appointment_id ON public.appointment_pets
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION public.happytails_enforce_one_active_boarding_per_pet();

-- Read-only check to run BEFORE applying, to find pets that already break the rule
-- (existing duplicates are not removed by this migration; staff should cancel one):
--
-- SELECT ap.pet_id, p.name, array_agg(a.id ORDER BY a.drop_off_at) AS appointments
--   FROM public.appointment_pets ap
--   JOIN public.appointments a ON a.id = ap.appointment_id
--   JOIN public.pets p ON p.id = ap.pet_id
--  WHERE a.service_type = 'boarding'
--    AND a.status IN ('pending', 'confirmed', 'checked_in')
--    AND COALESCE(ap.status, '') <> 'completed'
--    AND ap.actual_checkout_at IS NULL
--  GROUP BY ap.pet_id, p.name
-- HAVING count(DISTINCT a.id) > 1;
