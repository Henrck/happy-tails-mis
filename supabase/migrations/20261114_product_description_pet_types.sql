-- HappyTails product suitability metadata
-- Keeps product_code/category generation and all existing product rows intact.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pet_types text[] NOT NULL DEFAULT '{}';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.products'::regclass
      AND conname = 'products_pet_types_allowed'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_pet_types_allowed
      CHECK (pet_types <@ ARRAY['dog', 'cat']::text[]);
  END IF;
END $$;

-- Replace the SuperAdmin-only management policy with Admin + SuperAdmin.
DROP POLICY IF EXISTS "Only superadmin can manage products" ON public.products;

CREATE POLICY "Admins and superadmins can manage products"
ON public.products
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
  )
);

-- Existing public SELECT policies are intentionally left unchanged.
