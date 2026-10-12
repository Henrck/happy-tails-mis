-- HappyTails Issue #6: protect pre-login username -> email lookup.
-- Requires existing public.email_for_username(lookup_username) and
-- public.is_username_taken(check_username) RPCs from the original schema.
-- Apply in TEST/STAGING before copying the new TypeScript files.
-- This migration removes the old anonymous lookup ability; DO NOT deploy
-- it alone to production before the new /api/auth/login route is deployed.

begin;

do $$
begin
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'email_for_username' and p.pronargs = 1
  ) then
    raise exception 'Issue #6: public.email_for_username (1 parameter) is missing';
  end if;
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'is_username_taken' and p.pronargs = 1
  ) then
    raise exception 'Issue #6: public.is_username_taken (1 parameter) is missing';
  end if;
end;
$$;

-- Durable, per-IP hashed request counters. No IPs, usernames, or passwords
-- are saved in this table. Limit windows automatically reset after 15 min.
create table if not exists public.sec006_auth_rate_limits (
  scope text not null check (scope in ('login', 'availability')),
  ip_hash text not null check (ip_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  primary key (scope, ip_hash)
);
alter table public.sec006_auth_rate_limits enable row level security;
revoke all on table public.sec006_auth_rate_limits from PUBLIC, anon, authenticated;

-- Single atomic INSERT ... ON CONFLICT prevents concurrent requests from
-- bypassing limits. Only service_role may call this function.
create or replace function public.sec006_take_auth_slot(p_scope text, p_ip_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  max_attempts integer;
  counted integer;
begin
  if p_scope = 'login' then
    max_attempts := 20;
  elsif p_scope = 'availability' then
    max_attempts := 60;
  else
    return false;
  end if;
  if p_ip_hash is null or p_ip_hash !~ '^[0-9a-f]{64}$' then
    return false;
  end if;

  insert into public.sec006_auth_rate_limits as existing
    (scope, ip_hash, window_started_at, request_count)
  values (p_scope, p_ip_hash, clock_timestamp(), 1)
  on conflict (scope, ip_hash) do update
    set request_count = case
      when existing.window_started_at <= clock_timestamp() - interval '15 minutes'
        then 1 else existing.request_count + 1 end,
    window_started_at = case
      when existing.window_started_at <= clock_timestamp() - interval '15 minutes'
        then clock_timestamp() else existing.window_started_at end
  returning request_count into counted;

  return counted <= max_attempts;
end;
$$;
revoke all on function public.sec006_take_auth_slot(text, text) from PUBLIC, anon, authenticated;
grant execute on function public.sec006_take_auth_slot(text, text) to service_role;

-- Protect EVERY overload of the existing two RPC names. PostgreSQL grants
-- PUBLIC function execute by default, so revoking only anon is insufficient.
do $$
declare
  proc_signature text;
begin
  for proc_signature in
    select p.oid::regprocedure::text
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('email_for_username', 'is_username_taken')
  loop
    execute format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', proc_signature);
    execute format('GRANT EXECUTE ON FUNCTION %s TO service_role', proc_signature);
  end loop;
end;
$$;

commit;
