-- HappyTails: pets must be at least 3 months old.
--
-- Same rule as lib/utils/pet-age.ts (meetsMinimumPetAge):
--   12+ weeks, 3+ months or 1+ years.
--  * New pets: age is required and must meet the minimum.
--  * Existing pets: an age that is changed must meet the minimum; editing other
--    fields of an older record is not blocked, and clearing the age is allowed.
-- Ages are stored as pets.age_text ("12 weeks", "6 months", "2 years") and,
-- for whole years, pets.age.

CREATE OR REPLACE FUNCTION public.happytails_pet_meets_minimum_age(p_age_text text, p_age integer)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $function$
declare
  v_match text[];
  v_amount integer;
begin
  v_match := regexp_match(lower(btrim(coalesce(p_age_text, ''))), '^(\d+) (week|month|year)s?$');
  if v_match is not null then
    v_amount := v_match[1]::integer;
    return case v_match[2]
      when 'week' then v_amount >= 12
      when 'month' then v_amount >= 3
      else v_amount >= 1 end;
  end if;
  -- Legacy numeric age is whole years.
  if p_age is not null then return p_age >= 1; end if;
  return false;
end;
$function$;

CREATE OR REPLACE FUNCTION public.happytails_enforce_pet_minimum_age()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
begin
  if TG_OP = 'INSERT' then
    if coalesce(btrim(NEW.age_text), '') = '' and NEW.age is null then
      raise exception 'Enter the pet''s age. HappyTails accepts pets that are at least 3 months old.'
        using errcode = 'P0001', hint = 'PET_AGE_REQUIRED';
    end if;
  else
    -- Only check when the age itself changes, and allow clearing it.
    if (NEW.age_text is not distinct from OLD.age_text and NEW.age is not distinct from OLD.age)
       or (coalesce(btrim(NEW.age_text), '') = '' and NEW.age is null) then
      return NEW;
    end if;
  end if;

  if not public.happytails_pet_meets_minimum_age(NEW.age_text, NEW.age) then
    raise exception 'HappyTails accepts pets that are at least 3 months old (12 weeks). Entered age: %.',
      coalesce(nullif(btrim(NEW.age_text), ''), NEW.age::text || ' years')
      using errcode = 'P0001', hint = 'PET_UNDER_MINIMUM_AGE';
  end if;
  return NEW;
end;
$function$;

DROP TRIGGER IF EXISTS happytails_enforce_pet_minimum_age ON public.pets;
CREATE TRIGGER happytails_enforce_pet_minimum_age
  BEFORE INSERT OR UPDATE OF age, age_text ON public.pets
  FOR EACH ROW EXECUTE FUNCTION public.happytails_enforce_pet_minimum_age();

-- Read-only check: existing pets recorded as younger than 3 months (not changed
-- by this migration; staff/owners will be asked for a valid age when they edit it).
SELECT pet_number, name, age_text, age, created_at
FROM public.pets
WHERE (coalesce(btrim(age_text), '') <> '' OR age IS NOT NULL)
  AND NOT public.happytails_pet_meets_minimum_age(age_text, age)
ORDER BY created_at;
