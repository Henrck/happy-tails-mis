-- SEC-001: Allow username sign-in immediately after email verification.
--
-- Supabase Auth creates auth.users before the verification email is clicked.
-- The existing auth.users -> public.customers trigger may insert a customer
-- without copying raw_user_meta_data.username. Fill it at INSERT time.
--
-- Apply to the correct Supabase project only, after reviewing existing
-- customer username duplicates. This migration NEVER overwrites usernames.

begin;

do $$
begin
  if to_regclass('public.customers') is null then
    raise exception 'SEC-001: public.customers does not exist';
  end if;
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'customers'
      and column_name = 'username'
  ) then
    raise exception 'SEC-001: public.customers.username does not exist';
  end if;

  -- Stop rather than silently changing existing usernames to resolve a clash.
  if exists (
    select 1 from public.customers
    where username is not null and btrim(username) <> ''
    group by lower(btrim(username))
    having count(*) > 1
  ) then
    raise exception 'SEC-001: duplicate existing usernames (case-insensitive); resolve them before migrating';
  end if;
end
$$;

-- Enforce case-insensitive uniqueness, including simultaneous signups.
-- Existing NULL usernames are allowed until migrated or recovered.
create unique index if not exists customers_username_ci_unique_idx
  on public.customers (lower(btrim(username)))
  where username is not null and btrim(username) <> '';

create or replace function public.sec001_copy_signup_username()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text;
begin
  -- Do not overwrite a value already set by staff, admins, or the customer.
  if new.username is not null and btrim(new.username) <> '' then
    return new;
  end if;

  -- A username is only taken from this exact auth user's signup metadata.
  select btrim(coalesce(u.raw_user_meta_data ->> 'username', ''))
  into requested_username
  from auth.users as u
  where u.id = new.id;

  -- Match the actual HappyTails signup rules (3-20, A-Z, 0-9, . and _).
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

-- One-time repair for existing accounts where username was stored in Auth
-- metadata but the corresponding customers.username was left NULL.
-- If two accounts claimed the same username, only the oldest eligible one
-- is migrated; leave the other for manual resolution without data loss.
with candidates as (
  select
    c.id,
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
