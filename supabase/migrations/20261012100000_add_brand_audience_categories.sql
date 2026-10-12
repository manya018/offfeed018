ALTER TABLE public.brand_applications
  ADD COLUMN audience_categories jsonb NOT NULL DEFAULT '{"her":[],"him":[]}'::jsonb;

ALTER TABLE public.brand_applications
  ADD CONSTRAINT brand_applications_audience_categories_is_object
  CHECK (jsonb_typeof(audience_categories) = 'object');
