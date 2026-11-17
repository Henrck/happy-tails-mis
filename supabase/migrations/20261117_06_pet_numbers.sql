-- HappyTails: human-friendly Pet IDs.
--
-- pets.id stays the internal UUID. pets.pet_number is a permanent number
-- starting from 1, shown in the app as PET-0001.
--  * Existing pets are numbered oldest first (created_at, then id).
--  * New pets get the next number automatically (no app code inserts it).
--  * The number can never be changed or reused.

CREATE SEQUENCE IF NOT EXISTS public.pet_number_seq AS bigint START 1;

ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS pet_number bigint;

-- Backfill existing pets in creation order.
WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY created_at NULLS LAST, id) AS n
  FROM public.pets
  WHERE pet_number IS NULL
)
UPDATE public.pets p
SET pet_number = ordered.n + COALESCE((SELECT max(pet_number) FROM public.pets), 0)
FROM ordered
WHERE p.id = ordered.id;

-- Continue numbering after the highest assigned number.
SELECT setval('public.pet_number_seq', GREATEST(COALESCE((SELECT max(pet_number) FROM public.pets), 0), 1),
              (SELECT max(pet_number) FROM public.pets) IS NOT NULL);

ALTER TABLE public.pets ALTER COLUMN pet_number SET DEFAULT nextval('public.pet_number_seq');
ALTER SEQUENCE public.pet_number_seq OWNED BY public.pets.pet_number;
ALTER TABLE public.pets ALTER COLUMN pet_number SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.pets'::regclass AND conname = 'pets_pet_number_key') THEN
    ALTER TABLE public.pets ADD CONSTRAINT pets_pet_number_key UNIQUE (pet_number);
  END IF;
END $$;

-- Pet numbers are permanent: ignore any attempt to set or change them.
CREATE OR REPLACE FUNCTION public.happytails_protect_pet_number()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
begin
  if TG_OP = 'INSERT' then
    NEW.pet_number := nextval('public.pet_number_seq');
  else
    NEW.pet_number := OLD.pet_number;
  end if;
  return NEW;
end;
$function$;

DROP TRIGGER IF EXISTS happytails_protect_pet_number ON public.pets;
CREATE TRIGGER happytails_protect_pet_number
  BEFORE INSERT OR UPDATE OF pet_number ON public.pets
  FOR EACH ROW EXECUTE FUNCTION public.happytails_protect_pet_number();

-- Check: first and latest numbers.
SELECT pet_number, name, created_at FROM public.pets ORDER BY pet_number LIMIT 5;
