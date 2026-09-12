-- Real sales ledger. Until now, POS checkout (sellProduct()) only
-- deducted stock via the FEFO function — it never recorded WHAT was
-- sold, at what price, or under what invoice number. That's why Sales
-- Reports had nothing real to read from. This adds a header + line-items
-- pair (same shape as appointments/appointment_pets already used
-- elsewhere in this project): one `sales` row per checkout (so a
-- multi-item cart shares one invoice number), one `sale_items` row per
-- product in that cart.

create sequence if not exists public.sales_invoice_seq start with 3001;

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique default ('INV-' || nextval('public.sales_invoice_seq')::text),
  sold_at timestamptz not null default now(),
  total_amount numeric(10,2) not null default 0,
  payment_method text not null default 'Cash',
  amount_paid numeric(10,2),
  created_at timestamptz not null default now()
);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null check (quantity > 0),
  -- Price snapshot at time of sale — if a product's price changes later,
  -- past sales reports should still show what was actually charged then.
  unit_price numeric(10,2) not null,
  line_amount numeric(10,2) not null,
  created_at timestamptz not null default now()
);

create index if not exists sale_items_sale_id_idx on public.sale_items (sale_id);
create index if not exists sale_items_product_id_idx on public.sale_items (product_id);
create index if not exists sales_sold_at_idx on public.sales (sold_at desc);

alter table public.sales enable row level security;
alter table public.sale_items enable row level security;

-- Matches the convention already used for gallery_photos (040): broad
-- "any authenticated staff member" access rather than superadmin-only —
-- POS checkout needs to work for regular admin/staff accounts, not just
-- the superadmin. Sales data is internal, so no public read policy.
drop policy if exists "Authenticated staff can manage sales" on public.sales;
create policy "Authenticated staff can manage sales"
  on public.sales for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated staff can manage sale_items" on public.sale_items;
create policy "Authenticated staff can manage sale_items"
  on public.sale_items for all
  to authenticated
  using (true)
  with check (true);
