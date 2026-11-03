-- Self-reported pet vaccination status. Defaults to uncertain for existing pets.
-- This field is not a veterinary record or proof of vaccination.
ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS vaccination_status text;

UPDATE public.pets
   SET vaccination_status = 'not_sure'
 WHERE vaccination_status IS NULL;

ALTER TABLE public.pets
  ALTER COLUMN vaccination_status SET DEFAULT 'not_sure',
  ALTER COLUMN vaccination_status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.pets'::regclass
       AND conname = 'pets_vaccination_status_check'
  ) THEN
    ALTER TABLE public.pets
      ADD CONSTRAINT pets_vaccination_status_check
      CHECK (vaccination_status IN ('vaccinated', 'not_vaccinated', 'not_sure'));
  END IF;
END $$;
COMMENT ON COLUMN public.pets.vaccination_status IS
  'Customer-reported vaccination status; not staff verified or proof of vaccination.';
