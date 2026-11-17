-- HappyTails: package inclusions cannot also be booked as add-ons / À La Carte.
--
-- A grooming package inclusion (e.g. "Ear Clean") is linked to the add-on and
-- À La Carte items that are the same service (e.g. "Ear Cleaning"). Links are
-- keyed by the inclusion NAME, so one link covers every package that includes
-- it and survives package edits. Super Admin manages links in Service Management.
--
-- Enforcement: a deferred check on appointment_addons rejects an add-on that is
-- covered by the same pet's grooming package in the same appointment, or in
-- another grooming appointment for the same pet on the same date (a booking's
-- services can be saved in any order, so the check runs at commit).

CREATE OR REPLACE FUNCTION public.happytails_inclusion_key(p_label text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $function$
  select lower(regexp_replace(btrim(coalesce(p_label, '')), '\s+', ' ', 'g'))
$function$;

CREATE TABLE IF NOT EXISTS public.package_inclusion_addon_links (
  inclusion_key text NOT NULL CHECK (inclusion_key <> ''),
  addon_id uuid NOT NULL REFERENCES public.addons(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (inclusion_key, addon_id)
);

ALTER TABLE public.package_inclusion_addon_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read inclusion links" ON public.package_inclusion_addon_links;
CREATE POLICY "Anyone can read inclusion links" ON public.package_inclusion_addon_links
  FOR SELECT USING (true);
-- No write policies: changes go through the Super Admin RPC below.

-- Replace all links for one inclusion name (Super Admin only).
CREATE OR REPLACE FUNCTION public.happytails_set_inclusion_addon_links(p_inclusion_label text, p_addon_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_key text := public.happytails_inclusion_key(p_inclusion_label);
  v_count integer;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'superadmin') then
    raise exception 'Only a Super Admin can change inclusion links.' using errcode = '42501';
  end if;
  if v_key = '' then raise exception 'Choose an inclusion.'; end if;
  delete from public.package_inclusion_addon_links where inclusion_key = v_key;
  insert into public.package_inclusion_addon_links(inclusion_key, addon_id)
  select v_key, a.id from public.addons a where a.id = any(coalesce(p_addon_ids, '{}'::uuid[]))
  on conflict do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$function$;
REVOKE ALL ON FUNCTION public.happytails_set_inclusion_addon_links(text, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.happytails_set_inclusion_addon_links(text, uuid[]) TO authenticated;

-- Seed the obvious matches from the current catalog (safe to re-run).
INSERT INTO public.package_inclusion_addon_links(inclusion_key, addon_id)
SELECT pair.inclusion_key, a.id
FROM (VALUES
  ('ear clean', 'ear cleaning'),
  ('ear clean', 'ear clean'),
  ('nail trim', 'nail clipping'),
  ('nail trim', 'nail trim'),
  ('anal sac', 'anal sac expression'),
  ('anal sac', 'anal sac'),
  ('sanitary trim', 'sanitary trim'),
  ('bath & dry', 'bath & dry'),
  ('deep conditioning', 'applied conditioner'),
  ('deep conditioning', 'conditioner')
) AS pair(inclusion_key, addon_name)
JOIN public.addons a ON public.happytails_inclusion_key(a.name) = pair.addon_name
ON CONFLICT DO NOTHING;

-- Deferred guard on add-ons.
CREATE OR REPLACE FUNCTION public.happytails_reject_included_addon()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_pet_id uuid;
  v_date date;
  v_addon text;
  v_pet text;
  v_package text;
begin
  -- Row may have been removed later in the same transaction.
  if not exists (select 1 from public.appointment_addons where appointment_pet_id = NEW.appointment_pet_id and addon_id = NEW.addon_id) then return null; end if;

  select ap.pet_id, a.scheduled_date into v_pet_id, v_date
  from public.appointment_pets ap
  join public.appointments a on a.id = ap.appointment_id
  where ap.id = NEW.appointment_pet_id and a.status::text <> 'cancelled';
  if v_pet_id is null then return null; end if;

  -- Covered by the same pet's grooming package: same appointment pet, or any
  -- grooming appointment for that pet on the same date.
  select pk.name into v_package
  from public.appointment_pets gp
  join public.appointments ga on ga.id = gp.appointment_id
  join public.packages pk on pk.id = gp.package_id
  join public.package_inclusions inc on inc.package_id = pk.id
  join public.package_inclusion_addon_links l
    on l.inclusion_key = public.happytails_inclusion_key(inc.label) and l.addon_id = NEW.addon_id
  where gp.pet_id = v_pet_id
    and ga.status::text <> 'cancelled'
    and coalesce(gp.status::text, '') <> 'cancelled'
    and pk.service_type::text in ('dog_grooming', 'cat_grooming')
    and (gp.id = NEW.appointment_pet_id or ga.scheduled_date = v_date)
  limit 1;

  if v_package is not null then
    select name into v_addon from public.addons where id = NEW.addon_id;
    select name into v_pet from public.pets where id = v_pet_id;
    raise exception '"%" is already included in %''s % grooming package. Remove it from the add-ons or À La Carte items.',
      coalesce(v_addon, 'This service'), coalesce(v_pet, 'this pet'), v_package
      using errcode = 'P0001', hint = 'ADDON_INCLUDED_IN_PACKAGE';
  end if;
  return null;
end;
$function$;

DROP TRIGGER IF EXISTS happytails_reject_included_addon ON public.appointment_addons;
CREATE CONSTRAINT TRIGGER happytails_reject_included_addon
  AFTER INSERT ON public.appointment_addons
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.happytails_reject_included_addon();

-- Show the seeded links.
SELECT l.inclusion_key, a.name AS addon, c.name AS category
FROM public.package_inclusion_addon_links l
JOIN public.addons a ON a.id = l.addon_id
LEFT JOIN public.addon_categories c ON c.id = a.category_id
ORDER BY 1, 3, 2;
