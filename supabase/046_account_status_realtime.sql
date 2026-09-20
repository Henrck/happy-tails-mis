-- Same gotcha hit before with appointments/appointment_pets (028) and
-- pets (035): postgres_changes subscriptions only fire for tables
-- explicitly added to the supabase_realtime publication — RLS alone
-- doesn't enable this. Needed now so an already-logged-in session can
-- detect its own account being deactivated live, without a refresh.
alter publication supabase_realtime add table public.customers;
alter publication supabase_realtime add table public.staff_profiles;
