-- READ-ONLY. Run in the Supabase SQL editor, download the result as CSV and
-- save it as diagnostics/boarding-closure-dump.csv (or paste it in the chat).
-- Shows every database function that checks shop closures or plans boarding
-- availability. Changes nothing.

SELECT p.proname::text AS name, pg_get_functiondef(p.oid) AS definition
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
   AND p.prokind = 'f'
   AND (pg_get_functiondef(p.oid) ILIKE '%booking_closed_dates%'
        OR p.proname ILIKE '%boarding%'
        OR p.proname ILIKE '%closed%'
        OR p.proname ILIKE '%reschedule%')
 ORDER BY 1;
