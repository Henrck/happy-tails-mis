-- Before/after gallery managed from Website Management.
create table if not exists public.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  title text,
  service text not null default 'grooming'
    check (service in ('grooming','boarding','dental','ear_cleaning','nail_trimming','other')),
  before_url text not null,
  after_url text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gallery_photos_active_order_idx
  on public.gallery_photos (active, sort_order, created_at desc);

alter table public.gallery_photos enable row level security;

drop policy if exists "Public can view active gallery photos" on public.gallery_photos;
create policy "Public can view active gallery photos"
  on public.gallery_photos for select
  using (active = true);

drop policy if exists "Authenticated staff can manage gallery photos" on public.gallery_photos;
create policy "Authenticated staff can manage gallery photos"
  on public.gallery_photos for all
  to authenticated
  using (true)
  with check (true);

-- The existing site-images bucket is reused; no new storage bucket is required.
