-- READ-ONLY. Run in the Supabase SQL editor, then download the result as CSV
-- (or copy it) and paste it into the chat. It changes nothing.
-- Shows how products.product_code is generated and what references it.

-- 1) Triggers on products (and their functions)
SELECT 'trigger' AS kind, t.tgname::text AS name, pg_get_triggerdef(t.oid) AS definition
  FROM pg_trigger t
 WHERE t.tgrelid = 'public.products'::regclass AND NOT t.tgisinternal

UNION ALL

SELECT 'function', p.proname::text, pg_get_functiondef(p.oid)
  FROM pg_trigger t
  JOIN pg_proc p ON p.oid = t.tgfoid
 WHERE t.tgrelid = 'public.products'::regclass AND NOT t.tgisinternal

UNION ALL

-- 2) Any other function that mentions product_code (generators, helpers)
SELECT 'function', p.proname::text, pg_get_functiondef(p.oid)
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND p.prokind = 'f'
   AND pg_get_functiondef(p.oid) ILIKE '%product_code%'

UNION ALL

-- 3) Column defaults / constraints on products
SELECT 'column', column_name::text, data_type || COALESCE(' default ' || column_default, '')
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'products'

UNION ALL

SELECT 'constraint', conname::text, pg_get_constraintdef(oid)
  FROM pg_constraint
 WHERE conrelid = 'public.products'::regclass

UNION ALL

-- 4) Sequences that look related
SELECT 'sequence', sequence_name::text, start_value || ' / increment ' || increment
  FROM information_schema.sequences
 WHERE sequence_schema = 'public' AND (sequence_name ILIKE '%product%' OR sequence_name ILIKE '%code%')

UNION ALL

-- 5) Current codes per category, to see the numbering pattern
SELECT 'sample', category::text, string_agg(product_code, ', ' ORDER BY product_code)
  FROM public.products
 GROUP BY category

ORDER BY 1, 2;
