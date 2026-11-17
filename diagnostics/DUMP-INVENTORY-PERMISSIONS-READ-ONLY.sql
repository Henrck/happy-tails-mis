-- READ-ONLY. Run in the Supabase SQL editor and paste the result into the chat.
-- Shows who may change inventory and groomer settings today. Changes nothing.

-- 1) Row-level security policies
SELECT 'policy' AS kind, tablename || ' · ' || policyname AS name,
       cmd || ' ' || permissive || E'\nUSING: ' || coalesce(qual, '-') || E'\nCHECK: ' || coalesce(with_check, '-') AS definition
  FROM pg_policies
 WHERE schemaname = 'public'
   AND tablename IN ('products', 'product_batches', 'inventory_batch_movements', 'inventory_batch_expiry_audit',
                     'grooming_package_durations', 'ala_carte_service_durations', 'groomer_time_off', 'groomers')

UNION ALL

-- 2) Inventory and POS stock functions
SELECT 'function', p.proname::text, pg_get_functiondef(p.oid)
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND p.prokind = 'f'
   AND p.proname IN ('happytails_remove_inventory_batch_stock', 'happytails_set_inventory_batch_expiration',
                     'deduct_stock_fefo', 'happytails_checkout_pos')

UNION ALL

-- 3) Triggers on inventory tables
SELECT 'trigger', c.relname || '.' || t.tgname, pg_get_triggerdef(t.oid)
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
 WHERE c.relnamespace = 'public'::regnamespace AND NOT t.tgisinternal
   AND c.relname IN ('product_batches', 'products', 'inventory_batch_movements')

ORDER BY 1, 2;
