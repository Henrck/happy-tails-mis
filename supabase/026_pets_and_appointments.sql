-- Real pets + appointments schema. Replaces two disconnected mocks
-- (Pet's Record's pet-records-mock.ts AND the walk-in flow's need for
-- pet data) with one shared table, and creates the first real booking
-- record in the whole system — nothing has ever actually saved an
-- appointment before this.
--
-- Design notes:
-- * pets.customer_id is NULLABLE on purpose. A walk-in customer without
--   an account still needs a pet record to attach to their appointment,
--   but has no real customers row to link to (customers are only ever
--   created via real signup — see lib/supabase/users.ts, nothing here
--   ever inserts into customers directly, and this migration doesn't
--   either).
-- * appointments carries owner_name/owner_contact/owner_address
--   directly, alongside a nullable customer_id. For an existing
--   customer these are redundant with their account, but storing them
--   ensures a completed appointment record stays fully meaningful even
--   if the customer's account is later edited or archived — the booking
--   is a historical record, not a live join.
-- * appointment_pets is the real multi-pet junction: one appointment
--   can have several pets (a family booking 2 dogs at once, or 2 small
--   dogs sharing one kennel). kennel_id lives here, not on the
--   appointment itself, because kennel assignment is per-pet, not
--   per-booking — matches the agreed capacity rule (small kennel = max
--   2 small dogs, big = 1 large OR 1 medium+1 small OR 3 small).
-- * appointment_addons is per-pet, not per-appointment, since add-ons
--   like nail clipping are chosen per pet, not once for the whole visit.
-- * No online-booking-specific columns yet (e.g. is_online, groomer
--   no-show fields) — deliberately out of scope. The agreed fix for
--   groomer-absence risk (1 online booking per timeslot, remaining
--   groomer capacity reserved for walk-ins) is a booking-time rule for
--   the future online system, not a column this table needs today.

create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  name text not null,
  species text not null check (species in ('Dog', 'Cat')),
  breed text not null,
  size_label text not null, -- e.g. "Small", "12kg" — free text, matches how pet_sizes.label works elsewhere; not FK'd to pet_sizes since a pet's size is a fact about the pet, not tied to one service's size tiers
  sex text check (sex in ('Male', 'Female')),
  age integer,
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  service_type text not null check (service_type in ('dog_grooming', 'cat_grooming', 'boarding', 'ala_carte')),
  customer_id uuid references public.customers(id) on delete set null,
  owner_name text not null,
  owner_contact text not null,
  owner_address text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'checked_in', 'completed', 'cancelled')),
  is_walk_in boolean not null default true,
  groomer_id uuid references public.groomers(id) on delete set null,
  scheduled_date date not null,
  scheduled_time time, -- grooming: the appointment time slot. null for boarding, which uses drop_off_at/pick_up_at instead.
  drop_off_at timestamptz, -- boarding only
  pick_up_at timestamptz,  -- boarding only
  special_requests text,
  total_amount numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.appointment_pets (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  package_id uuid references public.packages(id) on delete set null, -- null = Ala Carte (no package chosen)
  size_id uuid references public.pet_sizes(id) on delete set null,
  kennel_id uuid references public.kennels(id) on delete set null, -- boarding only; per-pet so kennel-sharing works
  line_amount numeric(10, 2) not null default 0
);

create table if not exists public.appointment_addons (
  id uuid primary key default gen_random_uuid(),
  appointment_pet_id uuid not null references public.appointment_pets(id) on delete cascade,
  addon_id uuid not null references public.addons(id) on delete set null,
  price numeric(10, 2) not null default 0
);

-- RLS: same pattern as groomers/kennels (025) — anyone signed in can
-- read, only superadmin can write. Walk-in booking happens exclusively
-- from the admin POS screen (superadmin-only area per app/(admin)/layout.tsx),
-- so this is correctly restrictive for how appointments get created today.
alter table public.pets enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_pets enable row level security;
alter table public.appointment_addons enable row level security;

create policy "pets_select_authenticated" on public.pets
  for select using (auth.role() = 'authenticated');
create policy "pets_write_superadmin" on public.pets
  for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'superadmin'));

create policy "appointments_select_authenticated" on public.appointments
  for select using (auth.role() = 'authenticated');
create policy "appointments_write_superadmin" on public.appointments
  for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'superadmin'));

create policy "appointment_pets_select_authenticated" on public.appointment_pets
  for select using (auth.role() = 'authenticated');
create policy "appointment_pets_write_superadmin" on public.appointment_pets
  for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'superadmin'));

create policy "appointment_addons_select_authenticated" on public.appointment_addons
  for select using (auth.role() = 'authenticated');
create policy "appointment_addons_write_superadmin" on public.appointment_addons
  for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'superadmin'));

create index if not exists idx_pets_customer on public.pets(customer_id);
create index if not exists idx_appointments_groomer_date on public.appointments(groomer_id, scheduled_date);
create index if not exists idx_appointment_pets_appointment on public.appointment_pets(appointment_id);
create index if not exists idx_appointment_pets_kennel on public.appointment_pets(kennel_id);
