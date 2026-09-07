-- Correction: groomer_id was placed on appointments (one groomer per
-- whole booking), but the actual grooming Selection screen picks a
-- groomer per PET, not once for the whole appointment — a booking with
-- 2 dogs could reasonably want 2 different groomers. Moving it to
-- appointment_pets, where package_id/size_id/kennel_id already live,
-- matches every other per-pet choice on that same screen.
--
-- Caught before any real bookings existed to migrate, so this is a
-- clean structural fix, not a data migration.

alter table public.appointments drop column if exists groomer_id;
drop index if exists idx_appointments_groomer_date;

alter table public.appointment_pets add column if not exists groomer_id uuid references public.groomers(id) on delete set null;

create index if not exists idx_appointment_pets_groomer on public.appointment_pets(groomer_id);
