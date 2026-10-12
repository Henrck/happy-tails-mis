-- HAPPYTAILS ISSUE #6: READ-ONLY superadmin login diagnostic.
-- Run this in Supabase SQL Editor on the SAME project your local app uses.
-- Replace the placeholder email locally. Do not share your password or
-- paste sensitive account IDs/email addresses into chat.
-- This query does not modify any account or permission.
WITH matched AS (
  SELECT id FROM auth.users
  WHERE lower(email) = lower('REPLACE_WITH_SUPERADMIN_EMAIL')
)
SELECT
  (u.id IS NOT NULL) AS auth_account_exists,
  COALESCE(p.role::text, 'MISSING') AS profile_role,
  CASE WHEN s.id IS NULL THEN 'MISSING' ELSE COALESCE(s.status::text, 'MISSING') END AS staff_status
FROM (SELECT true AS one_row) AS anchor
LEFT JOIN matched AS u ON true
LEFT JOIN public.profiles AS p ON p.id = u.id
LEFT JOIN public.staff_profiles AS s ON s.id = u.id;
