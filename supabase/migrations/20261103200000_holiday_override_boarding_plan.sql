-- HappyTails: make the boarding group planner obey Calendar Management
-- on EVERY official/custom closure, but permit dates explicitly reopened.
-- This modifies only the two hard-coded exceptional-closure predicates
-- in the existing planner; all sharing, pricing and occupancy rules survive.
DO $holiday_override$
DECLARE
  source_sql text;
  revised_sql text;
  pattern text := 'AND[[:space:]]+d\.category[[:space:]]*=[[:space:]]*''exceptional_closure''[[:space:]]+AND[[:space:]]+NOT[[:space:]]+d\.is_open_override';
BEGIN
  IF to_regprocedure('public.happytails_boarding_group_plan(date,time,jsonb)') IS NULL THEN
    RAISE EXCEPTION 'Boarding planner not installed: apply preceding boarding migrations first.';
  END IF;
  SELECT pg_get_functiondef('public.happytails_boarding_group_plan(date,time,jsonb)'::regprocedure)
    INTO source_sql;
  revised_sql := regexp_replace(source_sql, pattern, 'AND NOT d.is_open_override', 'gi');
  IF source_sql = revised_sql THEN
    -- Later versions may already check NOT is_open_override for every category.
    IF source_sql ~* 'booking_closed_dates' AND source_sql !~* 'exceptional_closure' THEN
      RAISE NOTICE 'Boarding group planner already appears to honor all store closures; no replacement needed.';
    ELSE
      RAISE EXCEPTION 'Boarding planner differs from the expected version. Its SQL was not changed; inspect pg_get_functiondef before applying a custom migration.';
    END IF;
  ELSE
    EXECUTE revised_sql;
    RAISE NOTICE 'Boarding group planner now uses is_open_override for all shop closure types.';
  END IF;
END $holiday_override$;

-- Read-only verification. Open overrides are shown and remain unchanged.
SELECT date, name, category, is_open_override
FROM public.booking_closed_dates
WHERE category IN ('regular_holiday','special_non_working')
ORDER BY date;
