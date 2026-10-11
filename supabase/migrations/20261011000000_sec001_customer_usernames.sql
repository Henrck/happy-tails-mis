-- HappyTails SEC-001: username available before first sign-in.
-- This migration changes the Supabase database, not GitHub.
-- REVIEW before running and use your test/staging Supabase project first.

begin;

do $$
begin
  if to_regclass('public.customers') is null then
    raise exception 'SEC-001: public.customers does not exist';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'customers'
      and column_name = 'username'
  ) then
    raise exception 'SEC-001: public.customers.username does not exist';
  end if;
  if exists (
    select 1 from public.customers
    where username is not null and btrim(username) <> ''
    group by lower(btrim(username))
    having count(*) > 1
  ) then
    raise exception 'SEC-001: existing usernames conflict ignoring case; resolve them first';
  end if;
end
$$;

-- Prevent two customers from reserving the same username, ignoring case.
create unique index if not exists customers_username_ci_unique_idx
  on public.customers (lower(btrim(username)))
  where username is not null and btrim(username) <> '';

-- Supabase Auth creates an auth.users record during signup, including the
-- supplied metadata, before sending the confirmation email. When an existing
-- trigger inserts customers, copy the username into that row immediately.
create or replace function public.sec001_copy_signup_username()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text;
begin
  -- Never replace an already nonblank username.
  if new.username is not null and btrim(new.username) <> '' then
    return new;
  end if;

  select btrim(coalesce(u.raw_user_meta_data ->> 'username', ''))
    into requested_username
  from auth.users as u
  where u.id = new.id;

  -- HappyTails validates 3-20 chars: letters, numbers, period, underscore.
  if requested_username ~ '^[A-Za-z0-9_.]{3,20}$' then
    new.username := requested_username;
  end if;
  return new;
end;
$$;

revoke all on function public.sec001_copy_signup_username() from public, anon, authenticated;

drop trigger if exists sec001_copy_signup_username_on_customer on public.customers;
create trigger sec001_copy_signup_username_on_customer
before insert or update of username on public.customers
for each row execute function public.sec001_copy_signup_username();

-- Repair previous accounts with NULL username when valid username metadata
-- exists. Preserve nonblank existing usernames; skip duplicate claims.
with candidates as (
  select c.id,
         btrim(u.raw_user_meta_data ->> 'username') as requested_username,
         row_number() over (
           partition by lower(btrim(u.raw_user_meta_data ->> 'username'))
           order by u.created_at, u.id
         ) as claim_order
  from public.customers c
  join auth.users u on u.id = c.id
  where (c.username is null or btrim(c.username) = '')
    and btrim(coalesce(u.raw_user_meta_data ->> 'username', ''))
      ~ '^[A-Za-z0-9_.]{3,20}$'
)
update public.customers c
set username = candidate.requested_username
from candidates candidate
where c.id = candidate.id
  and candidate.claim_order = 1
  and (c.username is null or btrim(c.username) = '')
  and not exists (
    select 1 from public.customers existing
    where existing.id <> c.id
      and lower(btrim(existing.username)) = lower(candidate.requested_username)
  );

commit;
