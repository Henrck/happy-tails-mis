-- Same class of gap as the customers SELECT fix (031) — pets_write_
-- superadmin (026) only lets superadmin insert/update/delete pets,
-- which was correct for the admin-only screens that existed at the
-- time (Pet's Record, walk-in POS). Now that customers can add their
-- own pets directly from the booking flow, they need real insert
-- access — but scoped tightly: only inserting a pet where customer_id
-- matches their own id, never on someone else's account, never with
-- customer_id left pointing at another customer.
create policy "customers_insert_own_pet" on public.pets
  for insert
  with check (customer_id = auth.uid());
