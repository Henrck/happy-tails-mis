-- My Pets (customer dashboard) was a one-time server-side fetch with no
-- live updates — a pet added via the walk-in flow, or the booking
-- wizard's own Add Pet modal from a DIFFERENT tab/session, wouldn't
-- show up until the page was manually reloaded. Making it react live
-- needs a Realtime subscription on pets, same pattern as Appointment
-- Management — but that requires the table to be explicitly added to
-- the replication publication first; RLS policies alone don't enable
-- this, it's a separate switch (same gotcha hit once before with
-- appointments/appointment_pets in 028).
alter publication supabase_realtime add table public.pets;
