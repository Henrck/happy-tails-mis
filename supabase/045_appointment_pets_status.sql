-- Per-pet completion status. Until now `status` only existed on
-- `appointments` (the whole booking), so a multi-pet boarding
-- appointment had no way to represent "pet A is done, pet B isn't
-- yet". Decision from Josh: the appointment itself stays "checked_in"
-- until every one of its pets is individually completed; each pet can
-- be marked done on its own in the meantime.

alter table public.appointment_pets
  add column if not exists status text not null default 'pending'
  check (status in ('pending','confirmed','checked_in','completed','cancelled'));

-- Backfill existing rows to match their parent appointment so nothing
-- currently in progress looks freshly "pending".
update public.appointment_pets ap
set status = a.status
from public.appointments a
where a.id = ap.appointment_id;

-- Keep pets in sync when the whole appointment advances (pending ->
-- confirmed -> checked_in, or cancelled) — this is the existing
-- single-button status stepper in Appointment Management, unchanged.
-- Pets already individually completed or cancelled are left alone so
-- this can't un-complete a pet that already finished.
create or replace function public.sync_appointment_pets_status()
returns trigger as $$
begin
  if new.status is distinct from old.status then
    update public.appointment_pets
    set status = new.status
    where appointment_id = new.id
      and status not in ('completed','cancelled');
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_sync_appointment_pets_status on public.appointments;
create trigger trg_sync_appointment_pets_status
  after update of status on public.appointments
  for each row execute function public.sync_appointment_pets_status();

-- The other direction: once every pet under a checked_in appointment is
-- individually completed, complete the appointment itself.
create or replace function public.maybe_complete_appointment()
returns trigger as $$
declare
  remaining int;
begin
  if new.status = 'completed' and (old.status is distinct from 'completed') then
    select count(*) into remaining
    from public.appointment_pets
    where appointment_id = new.appointment_id
      and status <> 'completed';

    if remaining = 0 then
      update public.appointments
      set status = 'completed'
      where id = new.appointment_id
        and status = 'checked_in';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_maybe_complete_appointment on public.appointment_pets;
create trigger trg_maybe_complete_appointment
  after update of status on public.appointment_pets
  for each row execute function public.maybe_complete_appointment();
