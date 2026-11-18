-- HappyTails: consistent grooming price rows.
--
-- 1) Every grooming price row should be labelled by its size (Small, Medium,
--    Large, Extra Large, 2X Extra Large / cats: Small, Large). Weight text such
--    as "below 5 kilograms" was stored as a description on Dog Premium; sizes
--    already carry their weight ranges, so the description is cleared.
-- 2) Rows not linked to a size are linked when their label names one
--    (e.g. "2 Extra Large" -> 2X Extra Large).
-- 3) Leftover "Standard" rows on cat packages are removed (the shop has only
--    Small and Large cats).
--
-- Rows used by existing appointments are NOT changed: the database guard
-- happytails_preserve_referenced_rate_identity keeps booked price tiers
-- intact for history. The app displays those rows by size name anyway
-- (e.g. "2 Extra Large" is shown as "2X Extra Large"). Skipped rows are
-- listed at the end.

-- Normalise a size name for matching: "2 Extra Large", "2X Extra Large", "2XL" -> "2xextralarge".
CREATE OR REPLACE FUNCTION pg_temp.size_key(p text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  select regexp_replace(
           regexp_replace(lower(coalesce(p, '')), '[^a-z0-9]', '', 'g'),
           '^(2|2x|xx)(extralarge|xl)$|^2xl$|^xxl$', '2xextralarge')
$$;

-- (2) Link unsized grooming rows whose label names a size of the same service,
--     unless that size already has its own row in the package.
UPDATE public.package_pricing pp
SET size_id = s.id, size_label = s.label
FROM public.packages pk, public.pet_sizes s
WHERE pk.id = pp.package_id
  AND pk.service_type IN ('dog_grooming', 'cat_grooming')
  AND pp.size_id IS NULL
  AND s.service_type = pk.service_type
  AND pg_temp.size_key(s.label) = pg_temp.size_key(pp.size_label)
  AND NOT EXISTS (SELECT 1 FROM public.package_pricing other
                  WHERE other.package_id = pp.package_id AND other.size_id = s.id)
  AND NOT EXISTS (SELECT 1 FROM public.appointment_pets ap WHERE ap.package_pricing_id = pp.id);

-- (1) Size-linked grooming rows: label = size name, no weight description.
UPDATE public.package_pricing pp
SET size_label = s.label, size_detail = NULL
FROM public.packages pk, public.pet_sizes s
WHERE pk.id = pp.package_id
  AND pk.service_type IN ('dog_grooming', 'cat_grooming')
  AND s.id = pp.size_id
  AND (pp.size_label IS DISTINCT FROM s.label OR pp.size_detail IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM public.appointment_pets ap WHERE ap.package_pricing_id = pp.id);

-- (3) Remove unreferenced "Standard" rows from cat packages that have sized rows.
DELETE FROM public.package_pricing pp
USING public.packages pk
WHERE pk.id = pp.package_id
  AND pk.service_type = 'cat_grooming'
  AND pp.size_id IS NULL
  AND lower(btrim(pp.size_label)) = 'standard'
  AND EXISTS (SELECT 1 FROM public.package_pricing sized WHERE sized.package_id = pp.package_id AND sized.size_id IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM public.appointment_pets ap WHERE ap.package_pricing_id = pp.id);

-- Report: grooming rows left as they were because bookings use them.
SELECT pk.service_type, pk.name AS package, pp.size_label, pp.size_detail, pp.price,
       (SELECT count(*) FROM public.appointment_pets ap WHERE ap.package_pricing_id = pp.id) AS bookings
FROM public.package_pricing pp
JOIN public.packages pk ON pk.id = pp.package_id
LEFT JOIN public.pet_sizes s ON s.id = pp.size_id
WHERE pk.service_type IN ('dog_grooming', 'cat_grooming')
  AND (pp.size_id IS NULL OR pp.size_detail IS NOT NULL OR pp.size_label IS DISTINCT FROM s.label)
ORDER BY 1, 2;
