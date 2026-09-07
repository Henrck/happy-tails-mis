-- Adds username-based login on top of the existing email login.
-- Supabase Auth's signInWithPassword only accepts an email, not a
-- username — there's no native username login. The real pattern: if
-- what's typed looks like a username (not an email), resolve it to the
-- matching email FIRST via a direct lookup, then sign in with that
-- email normally. That lookup has to work for a person who isn't
-- logged in yet, which is the tricky part — it can't just piggyback on
-- the existing authenticated-read policy.
--
-- The real risk with a naive "let anon read customers" policy is that
-- it would expose every customer's full profile (phone, address, email)
-- to anyone, logged in or not — a customer directory leak. The fix:
-- a SECURITY DEFINER function that returns ONLY the email for a given
-- username, nothing else, callable by anon. That's the narrowest
-- possible surface — enough to make username login work, nothing a
-- scraper could turn into a customer list.
--
-- customers.email is used directly (not a join through profiles/
-- auth.users) since it's already a confirmed real column on that table.

alter table public.customers add column if not exists username text unique;

create or replace function public.email_for_username(lookup_username text)
returns text
language sql
security definer
set search_path = public
as $$
  select email
  from public.customers
  where username = lookup_username
  limit 1;
$$;

-- Anyone (including anonymous, pre-login users) can call this function
-- — but the function itself only ever returns one email string, never
-- a row, never other columns. That's the actual security boundary.
grant execute on function public.email_for_username(text) to anon, authenticated;

-- Username availability check at sign-up time — same narrow shape,
-- returns a boolean, not customer data.
create or replace function public.is_username_taken(check_username text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(select 1 from public.customers where username = check_username);
$$;

grant execute on function public.is_username_taken(text) to anon, authenticated;

-- Customers previously had NO way to write to their own row at all —
-- the existing write policy is superadmin-only. That's correct for
-- fields like status/archived_at (account-management, not something a
-- customer should touch), but wrong for their own personal info.
--
-- RLS policies can only restrict which ROWS an UPDATE touches, not
-- which COLUMNS — "using/with check (auth.uid() = id)" alone would let
-- a customer change their own status or customer_id too, which is NOT
-- "only their personal information." A trigger enforces the actual
-- column-level boundary: it silently keeps status/archived_at/
-- customer_id/registered_at pinned to their existing values on any
-- update coming from a non-superadmin, regardless of what the request
-- tries to send.
create policy "customers_update_own_profile" on public.customers
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.protect_customer_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
begin
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'superadmin') into is_admin;
  if not is_admin then
    new.status := old.status;
    new.archived_at := old.archived_at;
    new.customer_id := old.customer_id;
    new.registered_at := old.registered_at;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_customer_admin_fields_trigger on public.customers;
create trigger protect_customer_admin_fields_trigger
  before update on public.customers
  for each row execute function public.protect_customer_admin_fields();
