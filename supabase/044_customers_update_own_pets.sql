-- Root cause of "customer can't edit their own pet information": 026's
-- pets_write_superadmin policy only ever let superadmin insert/update/
-- delete. 032 patched the insert gap for the booking flow's "add a new
-- pet" step, but explicitly left update alone (see its comment) since
-- pet editing from the customer dashboard didn't exist yet.
--
-- Because RLS blocks silently — a `.update()` that matches zero rows
-- under RLS returns no error, just zero rows changed — the customer's
-- Pet Profile page has been showing "Pet profile updated successfully"
-- the whole time while actually saving nothing.
create policy "customers_update_own_pet" on public.pets
  for update
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());
