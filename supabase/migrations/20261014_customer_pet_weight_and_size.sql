-- REQUIRED: Run once in Supabase SQL Editor BEFORE using updated customer forms.
-- Older pets remain valid; customers can add weight on their next profile edit.
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS weight_kg numeric(8,2);
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS pet_size_id uuid;
ALTER TABLE public.pets DROP CONSTRAINT IF EXISTS pets_weight_kg_positive;
ALTER TABLE public.pets ADD CONSTRAINT pets_weight_kg_positive CHECK (weight_kg IS NULL OR weight_kg > 0);
-- Explicit relationship to Service Management's pet_sizes guide.
-- PostgreSQL normally generates UUID IDs for pet_sizes; verify the ID type if customized.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pets_pet_size_id_fkey' AND conrelid = 'public.pets'::regclass) THEN
    ALTER TABLE public.pets ADD CONSTRAINT pets_pet_size_id_fkey FOREIGN KEY (pet_size_id) REFERENCES public.pet_sizes(id) ON DELETE SET NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS pets_pet_size_id_idx ON public.pets(pet_size_id);
