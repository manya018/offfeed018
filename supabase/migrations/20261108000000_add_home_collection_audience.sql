-- Add HOME as a first-class collection audience for brand applications and products.
ALTER TABLE public.brand_applications
  DROP CONSTRAINT IF EXISTS brand_applications_audience_check;

ALTER TABLE public.brand_applications
  ADD CONSTRAINT brand_applications_audience_check
  CHECK (cardinality(audience) > 0 AND audience <@ ARRAY['her', 'him', 'home']::text[]);

ALTER TABLE public.brand_products
  DROP CONSTRAINT IF EXISTS brand_products_audience_check;

ALTER TABLE public.brand_products
  ADD CONSTRAINT brand_products_audience_check
  CHECK (cardinality(audience) > 0 AND audience <@ ARRAY['her', 'him', 'home']::text[]);

ALTER TABLE public.brand_applications
  ALTER COLUMN audience_categories
  SET DEFAULT '{"her": [], "him": [], "home": []}'::jsonb;
