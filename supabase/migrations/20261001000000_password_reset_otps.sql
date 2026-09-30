create table if not exists public.password_reset_otps (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  user_id uuid not null,
  otp_hash text not null,
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  verified_at timestamptz,
  reset_token_hash text,
  reset_token_expires_at timestamptz,
  used_at timestamptz
);

create index if not exists password_reset_otps_email_created_idx
  on public.password_reset_otps (email, created_at desc);

create index if not exists password_reset_otps_reset_token_hash_idx
  on public.password_reset_otps (reset_token_hash);

alter table public.password_reset_otps enable row level security;

-- The table is intentionally not exposed to browser clients.
-- Only the server-side service-role client used by the password-reset routes can access it.

drop policy if exists "No direct access to password reset OTPs" on public.password_reset_otps;

-- Keep old reset records from accumulating. The application also replaces active codes.
delete from public.password_reset_otps
where created_at < now() - interval '1 day';
