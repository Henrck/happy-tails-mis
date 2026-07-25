-- Run this once in the Supabase Dashboard: Project > SQL Editor > New query.
-- Sets up role-based access with THREE tiers:
--   - "superadmin": the owner. Exactly one account. Full system access.
--     Never created via public sign-up (see step 4 below).
--   - "admin": staff. Not built yet — Josh will provide direction on this
--     later. Also never created via public sign-up; will eventually be
--     created by the superadmin through an in-dashboard "User Management"
--     flow (matches the sidebar item already in the admin design).
--   - "customer": the default for anyone who signs up normally.

-- 1. The profiles table itself.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'customer' check (role in ('customer', 'admin', 'superadmin')),
  created_at timestamptz not null default now()
);

-- 2. Row Level Security: users can read their own profile, but the "role"
-- column can only ever be set by the trusted trigger below — never
-- directly by a logged-in user. This is the important security boundary:
-- nobody can edit their own row to grant themselves admin/superadmin.
alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own name only"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));
-- The "with check" clause blocks a user from changing their own role via
-- an update, even if they try to send role: 'superadmin' in a request —
-- the database rejects it because the new role must match the existing one.

-- 3. Auto-create a profile (as "customer") whenever someone signs up.
-- Runs as a trusted database trigger, not client code, so it can't be
-- bypassed or spoofed from the browser.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'customer');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. ONE-TIME STEP (do this after you've signed up your own account through
-- the site's normal sign-up form): promote your account to superadmin.
-- Replace the email below with your real one, then run just this line:
--
-- update public.profiles set role = 'superadmin' where id = (
--   select id from auth.users where email = 'you@example.com'
-- );
--
-- There is intentionally no equivalent self-serve path for "admin" — that
-- gets built later as a superadmin-only "create staff account" feature.
