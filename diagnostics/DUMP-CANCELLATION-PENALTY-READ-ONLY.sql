-- READ-ONLY. Run in the Supabase SQL editor, then download the result as CSV
-- and save it in this folder as diagnostics/cancellation-penalty-dump.csv.
-- It only reads definitions (functions, triggers, table columns); it changes nothing.

-- 1) Functions related to cancellation, penalties, no-shows, restrictions and booking creation
SELECT 'function' AS kind, p.proname::text AS name, pg_get_functiondef(p.oid) AS definition
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
   AND p.prokind = 'f'
   AND (p.proname ILIKE '%cancel%'
     OR p.proname ILIKE '%penalt%'
     OR p.proname ILIKE '%no_show%'
     OR p.proname ILIKE '%restrict%'
     OR p.proname ILIKE '%create_appointment%'
     OR p.proname ILIKE '%booking%')

UNION ALL

-- 2) Triggers on the tables involved
SELECT 'trigger', c.relname || '.' || t.tgname, pg_get_triggerdef(t.oid)
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public'
   AND NOT t.tgisinternal
   AND (c.relname IN ('appointments', 'appointment_pets', 'customers') OR c.relname ILIKE '%penalt%')

UNION ALL

-- 3) Columns of penalty / cancellation / no-show / restriction tables
SELECT 'table', c.table_name::text,
       string_agg(c.column_name || ' ' || c.data_type || COALESCE(' default ' || c.column_default, ''), E'\n' ORDER BY c.ordinal_position)
  FROM information_schema.columns c
 WHERE c.table_schema = 'public'
   AND (c.table_name ILIKE '%penalt%' OR c.table_name ILIKE '%cancel%' OR c.table_name ILIKE '%no_show%' OR c.table_name ILIKE '%restrict%')
 GROUP BY c.table_name

ORDER BY 1, 2;

-- OPTIONAL (run separately; errors if pg_cron is not enabled, which is fine):
-- SELECT jobname, schedule, command FROM cron.job;
