-- Make username login work for both customers and staff accounts.
-- Staff accounts are stored in staff_profiles, while their auth email lives
-- in auth.users. This function intentionally returns only the matching email.

create or replace function public.email_for_username(lookup_username text)
returns text
language sql
security definer
set search_path = public, auth
as $$
  select email
  from (
    select email
    from public.customers
    where username = lookup_username

    union all

    select u.email
    from public.staff_profiles sp
    join auth.users u on u.id = sp.id
    where sp.username = lookup_username
  ) matches
  limit 1;
$$;

grant execute on function public.email_for_username(text) to anon, authenticated;

notify pgrst, 'reload schema';
