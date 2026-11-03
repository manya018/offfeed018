ALTER TABLE public.brand_products ADD COLUMN IF NOT EXISTS image_paths text[] NOT NULL DEFAULT '{}'::text[];
UPDATE public.brand_products SET image_paths = ARRAY[image_path] WHERE image_path IS NOT NULL AND cardinality(image_paths) = 0;
