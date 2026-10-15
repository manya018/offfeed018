ALTER TABLE public.brand_applications
  ADD COLUMN IF NOT EXISTS audience_categories jsonb NOT NULL
  DEFAULT '{"her": [], "him": []}'::jsonb;
