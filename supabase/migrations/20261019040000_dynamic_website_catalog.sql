-- Run once in Supabase SQL Editor BEFORE deploying the associated application files.
-- Does not alter booking/appointments/package schema or existing data.
begin;
create table if not exists public.website_services (
 id uuid primary key default gen_random_uuid(),
 slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 title text not null check (length(btrim(title)) between 2 and 100),
 description text not null default '',
 image_url text,
 icon_key text not null default 'paw',
 sort_order integer not null default 100,
 published boolean not null default true,
 booking_service_type text check (booking_service_type in ('dog_grooming','cat_grooming','boarding')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.website_text (
 key text primary key check (length(key) between 2 and 100),
 value text not null default '',
 updated_at timestamptz not null default now()
);
create table if not exists public.website_package_media (
 package_id uuid primary key references public.packages(id) on delete cascade,
 image_url text,
 description text not null default '',
 published boolean not null default true,
 updated_at timestamptz not null default now()
);
create index if not exists website_services_display_idx on public.website_services(published,sort_order);
alter table public.website_services enable row level security;
alter table public.website_text enable row level security;
alter table public.website_package_media enable row level security;
-- Unpublished items cannot be read anonymously, but authenticated customers may read
-- only published items. Super Admin can view all content for editing.
create policy website_services_read on public.website_services for select to anon, authenticated using (
 published or exists (select 1 from public.profiles where id=(select auth.uid()) and role::text='superadmin')
);
create policy website_text_read on public.website_text for select to anon, authenticated using (true);
create policy website_package_media_read on public.website_package_media for select to anon, authenticated using (
 published or exists (select 1 from public.profiles where id=(select auth.uid()) and role::text='superadmin')
);
create policy website_services_manage on public.website_services for all to authenticated using (
 exists (select 1 from public.profiles where id=(select auth.uid()) and role::text='superadmin')
) with check (exists (select 1 from public.profiles where id=(select auth.uid()) and role::text='superadmin'));
create policy website_text_manage on public.website_text for all to authenticated using (
 exists (select 1 from public.profiles where id=(select auth.uid()) and role::text='superadmin')
) with check (exists (select 1 from public.profiles where id=(select auth.uid()) and role::text='superadmin'));
create policy website_package_media_manage on public.website_package_media for all to authenticated using (
 exists (select 1 from public.profiles where id=(select auth.uid()) and role::text='superadmin')
) with check (exists (select 1 from public.profiles where id=(select auth.uid()) and role::text='superadmin'));
-- Existing landing-page service cards become editable rows, without duplication.
insert into public.website_services (slug,title,description,icon_key,sort_order,booking_service_type) values
('pet-grooming','Pet Grooming','Where care meets comfort. Give your pet a soothing grooming experience with our trained professionals — from refreshing baths to tidy trims and stylish finishes.','bath',10,'dog_grooming'),
('pet-boarding','Pet Boarding','A safe stay they’ll enjoy. Our welcoming boarding spaces are designed for relaxation and play, giving your pet plenty of room to move and rest comfortably.','home',20,'boarding'),
('pet-spa','Pet Spa','Pet Spa Ayurveda is a holistic pet grooming and wellness service inspired by Ayurvedic principles, using natural herbal products and gentle, chemical-free treatments.','sparkles',30,null)
on conflict (slug) do nothing;
insert into public.website_text(key,value) values
('services_heading','Our Pet Services'),('services_subheading','Everything your pet needs for a happy, healthy life.'),
('gallery_heading','Happy Tails, Happy Pets'),('gallery_subheading','A few before-and-afters from our grooming table.'),
('grooming_heading','Grooming Services'),('grooming_subheading','Care tailored to your pet’s needs. Clean, happy, and ready to shine!'),
('boarding_heading','Boarding Kennels'),('boarding_subheading','A safe, clean, and comfy home away from home for your furry friend.'),
('about_heading','About Us'),
('about_description','Happy Tails Pet Grooming Cafe is dedicated to providing a safe, caring, and enjoyable environment for pets and their owners. We offer professional pet grooming, comfortable boarding services, and quality pet supplies to ensure every pet receives the best care possible. Our goal is to create a place where pets feel loved and owners can trust that their companions are happy, clean, and well taken care of.'),
('grooming_banner_description','Because your pet means everything. We provide gentle, stress-free care focused on comfort and happiness.'),
('boarding_banner_description','A safe and comfortable stay for your pet.'),
('spa_banner_description','Natural herbal products, gentle massages, and chemical-free treatments for pet wellness.'),
('products_heading','Our Products'),('products_subheading','Browse what’s available at our shop — visit us in person to purchase')
on conflict (key) do nothing;
commit;
