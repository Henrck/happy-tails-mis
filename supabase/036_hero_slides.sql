-- Hero carousel: replaces the single `hero_background` site_settings key
-- with a real admin-manageable table. site_settings could only ever hold
-- one image per key, which can't represent an ordered set of rotating
-- slides — this is a genuinely different shape of data (a list of
-- slides with order + active state), not just a style upgrade.
--
-- superadmin manages slides from Website Management (add / reorder /
-- toggle active / delete). The public site only ever reads active
-- slides, ordered by sort_order.

create table if not exists public.hero_slides (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  image_width int,
  image_height int,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hero_slides_sort_order_idx on public.hero_slides (sort_order);

alter table public.hero_slides enable row level security;

-- Public (anon + authenticated) can read active slides only — same
-- openness as the rest of the marketing-facing content.
create policy "hero_slides_read_active" on public.hero_slides
  for select using (active = true);

-- Superadmin can read everything (including inactive slides, for the
-- admin manager list) and is the only role that can write.
create policy "hero_slides_read_all_superadmin" on public.hero_slides
  for select using (exists (select 1 from public.profiles where id = auth.uid() and role = 'superadmin'));

create policy "hero_slides_write_superadmin" on public.hero_slides
  for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'superadmin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'superadmin'));

-- Carry forward whatever hero image was already set via site_settings so
-- the homepage doesn't go blank the moment this migration runs.
insert into public.hero_slides (image_url, image_width, image_height, sort_order, active)
select image_url, image_width, image_height, 0, true
from public.site_settings
where key = 'hero_background' and image_url is not null
on conflict do nothing;
