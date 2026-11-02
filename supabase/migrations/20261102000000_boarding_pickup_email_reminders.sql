-- Prevent duplicate boarding reminder sends, with an auditable outcome.
create table if not exists public.boarding_pickup_email_reminders (
  appointment_pet_id uuid not null references public.appointment_pets(id) on delete cascade,
  pickup_at timestamptz not null,
  status text not null default 'claimed' check (status in ('claimed','sent','failed','no_email')),
  claimed_at timestamptz not null default now(),
  sent_at timestamptz,
  error_message text,
  primary key (appointment_pet_id, pickup_at)
);
alter table public.boarding_pickup_email_reminders enable row level security;
-- Only the server-side Supabase service-role client may access this table.
revoke all on public.boarding_pickup_email_reminders from anon, authenticated;
