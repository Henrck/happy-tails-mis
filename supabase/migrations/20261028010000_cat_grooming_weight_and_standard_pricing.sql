-- HappyTails: Cat grooming weight/price verification compatibility.
-- Staging first. Idempotent; preserves every existing quoted price and appointment.
--
-- Context: Cat grooming uses only Small (up to 5 kg) and Large (above 5 kg).
-- Older cat packages may have only one flat "Standard" price row. That row
-- cannot be selected by a verification routine looking up Small/Large IDs.
-- Copy its SAME price into both existing Small and Large tiers, leaving the
-- original Standard row untouched for already-booked appointments.
-- No automatic increases or decreases are introduced by the migration.

begin;

do $$
declare
  v_small integer;
  v_large integer;
begin
  if to_regclass('public.pet_sizes') is null or
     to_regclass('public.packages') is null or
     to_regclass('public.package_pricing') is null then
    raise exception 'Cat verification requires pet_sizes, packages, and package_pricing';
  end if;

  select
    count(*) filter (where lower(btrim(s.label)) = 'small'),
    count(*) filter (where lower(btrim(s.label)) = 'large')
  into v_small, v_large
  from public.pet_sizes s
  where s.service_type::text = 'cat_grooming' and s.is_active = true;

  if v_small <> 1 or v_large <> 1 then
    raise exception 'Cat grooming requires exactly one active Small and one active Large size (found Small %, Large %). Check Service Management before applying.',
      v_small, v_large;
  end if;
end $$;

-- Align the stored guide with the existing customer-facing cat policy.
-- This also helps legacy DB-side verification functions using stored ranges.
update public.pet_sizes s
set weight_range = case lower(btrim(s.label))
  when 'small' then 'Up to 5 kg'
  when 'large' then 'Above 5 kg'
end
where s.service_type::text = 'cat_grooming'
  and s.is_active = true
  and lower(btrim(s.label)) in ('small', 'large')
  and s.weight_range is distinct from case lower(btrim(s.label))
    when 'small' then 'Up to 5 kg'
    when 'large' then 'Above 5 kg'
  end;

-- Migrate ONLY packages with exactly one legacy generic-price row.
-- A partial or complex pricing setup may reflect intentional price tiers;
-- never guess a missing price or overwrite an explicitly configured tier.
with single_generic_rate as (
  select r.package_id, max(r.price) as flat_price
  from public.package_pricing r
  join public.packages p on p.id = r.package_id
  where p.service_type::text = 'cat_grooming'
  group by r.package_id
  having count(*) = 1
    and bool_and(lower(btrim(r.size_label)) in
      ('standard', 'all sizes', 'all size', 'fixed', 'any size'))
), cat_sizes as (
  select s.id, s.label
  from public.pet_sizes s
  where s.service_type::text = 'cat_grooming'
    and s.is_active = true
    and lower(btrim(s.label)) in ('small', 'large')
)
insert into public.package_pricing
  (package_id, size_id, size_label, price, is_per_night, nights)
select r.package_id, s.id, s.label, r.flat_price, false, null
from single_generic_rate r
cross join cat_sizes s
where not exists (
  select 1 from public.package_pricing existing
  where existing.package_id = r.package_id
    and (existing.size_id = s.id or
         lower(btrim(existing.size_label)) = lower(btrim(s.label)))
);

-- Diagnostic notice for incomplete active packages that could still cause
-- a verification failure. No price is fabricated for such packages.
do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.packages p
  where p.service_type::text = 'cat_grooming' and p.is_active = true
    and exists (select 1 from public.package_pricing r where r.package_id = p.id)
    and exists (
      select 1 from public.pet_sizes s
      where s.service_type::text = 'cat_grooming'
        and s.is_active = true and lower(btrim(s.label)) in ('small', 'large')
        and not exists (
          select 1 from public.package_pricing r
          where r.package_id = p.id
            and (r.size_id = s.id or lower(btrim(r.size_label)) = lower(btrim(s.label)))
        )
    );
  if v_count > 0 then
    raise notice '% active cat grooming package(s) still lack a Small or Large rate. Review Service Management; no price was invented for them.', v_count;
  end if;
end $$;

commit;
