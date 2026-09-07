-- Enables Supabase Realtime for the appointments tables. Realtime
-- subscriptions (postgres_changes) only fire for tables explicitly
-- added to the supabase_realtime publication — RLS policies alone
-- don't enable this, it's a separate switch. Without this, the
-- Appointment Management page's live subscription would silently never
-- receive any events, even though the query/RLS side works fine.
alter publication supabase_realtime add table public.appointments;
alter publication supabase_realtime add table public.appointment_pets;
