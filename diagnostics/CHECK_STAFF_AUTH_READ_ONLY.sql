-- HAPPYTAILS STAFF ACCOUNT DIAGNOSTIC — READ ONLY
-- Use the staff member's UID from Supabase > Authentication > Users.
-- Do not share the UID, email address, or secrets in screenshots.
WITH target AS (
  SELECT id, email FROM auth.users
  WHERE id = 'PASTE_EXISTING_STAFF_AUTH_UID_HERE'::uuid
)
SELECT
  (t.id IS NOT NULL) AS auth_account_exists,
  COALESCE(p.role::text, 'MISSING') AS profile_role,
  CASE WHEN s.id IS NULL THEN 'MISSING'
       ELSE COALESCE(s.status::text, 'MISSING') END AS staff_status,
  CASE WHEN s.id IS NULL OR NULLIF(btrim(s.username), '') IS NULL
       THEN 'MISSING' ELSE 'PRESENT' END AS staff_username,
  CASE WHEN t.email IS NULL OR btrim(t.email) = ''
       THEN 'MISSING' ELSE 'PRESENT' END AS auth_email
FROM (SELECT 1) anchor
LEFT JOIN target t ON true
LEFT JOIN public.profiles p ON p.id = t.id
LEFT JOIN public.staff_profiles s ON s.id = t.id;
