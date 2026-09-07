-- Walk-in-only pets (customer_id is null) previously had no way to show
-- an owner name/contact unless you traced back through an appointment
-- that pet happened to be part of — a pet record shouldn't depend on a
-- booking existing to know who it belongs to. Adding these directly so
-- Pet's Record's "Walk-in Only" tab always has something real to show.
--
-- Both are nullable and only meaningful when customer_id is null — for
-- pets WITH an account, owner info comes from the real customers row
-- via customer_id, not duplicated here.
alter table public.pets add column if not exists owner_name text;
alter table public.pets add column if not exists owner_contact text;
