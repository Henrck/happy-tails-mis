-- Root cause of "boarding pick-up date always shows 1 day/night
-- regardless of the chosen duration tier": BoardingScheduleStep's
-- nightsFromFixedTier() parses rate.size_detail with a regex expecting
-- "X Days & Y Nights" — but PackageFormModal's boarding duration rows
-- only ever write size_label (the free-text tier name, e.g. "4 Days &
-- 3 Nights"), never size_detail. size_detail is always null for every
-- boarding pricing row that's ever been created through the admin
-- form, so the regex has been matching against an empty string and
-- silently falling back to 1 every time — not a parsing edge case, the
-- primary path was broken for every row.
--
-- The real fix is a structured field instead of parsing display text
-- at all, so this can't silently break again on a differently-worded
-- duration label.
alter table public.package_pricing
  add column if not exists nights integer;
