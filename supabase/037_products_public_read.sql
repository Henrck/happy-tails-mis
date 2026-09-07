-- The `products` table (POS/inventory) previously had no read policy for
-- logged-out visitors — reasonable for an internal inventory table, but
-- the homepage "Our Products" carousel and the public /products catalog
-- page both need to show real POS products to anyone browsing, logged in
-- or not. This adds a narrowly-scoped public read policy: active
-- products only, and only the columns already exposed by `select *` on
-- this table (no stock/batch quantities — those live in the separate
-- product_batches table, which this policy does NOT touch).
create policy "products_read_active_public" on public.products
  for select using (status = 'active');
