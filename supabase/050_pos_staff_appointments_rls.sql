-- Allow operational admin/staff accounts to use the POS appointment flow.
--
-- The admin workspace intentionally allows profiles.role = 'admin' to use
-- day-to-day operations (POS, appointments, pet services, pet records),
-- while configuration/management routes remain superadmin-only.
--
-- Migration 026 originally restricted these booking tables to superadmin,
-- which made the POS UI and its RLS policy disagree: an admin could open
-- the walk-in boarding flow but the final INSERT into appointments was
-- rejected by RLS. Keep RLS enabled and grant only the existing operational
-- roles write access; customers/anonymous users still cannot write here.

-- `USING` on a FOR ALL policy also supplies the WITH CHECK condition when
-- no explicit WITH CHECK is present. Spell both out here so INSERT/UPDATE
-- authorization is unambiguous and future policy edits cannot accidentally
-- broaden the check condition.

drop policy if exists "pets_write_superadmin" on public.pets;
create policy "pets_write_staff_or_superadmin" on public.pets
  for all
  using (
    exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role in ('admin', 'superadmin')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role in ('admin', 'superadmin')
    )
  );

drop policy if exists "appointments_write_superadmin" on public.appointments;
create policy "appointments_write_staff_or_superadmin" on public.appointments
  for all
  using (
    exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role in ('admin', 'superadmin')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role in ('admin', 'superadmin')
    )
  );

drop policy if exists "appointment_pets_write_superadmin" on public.appointment_pets;
create policy "appointment_pets_write_staff_or_superadmin" on public.appointment_pets
  for all
  using (
    exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role in ('admin', 'superadmin')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role in ('admin', 'superadmin')
    )
  );

drop policy if exists "appointment_addons_write_superadmin" on public.appointment_addons;
create policy "appointment_addons_write_staff_or_superadmin" on public.appointment_addons
  for all
  using (
    exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role in ('admin', 'superadmin')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role in ('admin', 'superadmin')
    )
  );
