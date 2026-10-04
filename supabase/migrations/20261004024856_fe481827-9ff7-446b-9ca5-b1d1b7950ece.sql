ALTER TABLE public.brand_applications ADD COLUMN audience text[] NOT NULL DEFAULT ARRAY['her']::text[] CHECK (cardinality(audience) > 0 AND audience <@ ARRAY['her', 'him']::text[]);

CREATE TABLE public.brand_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_application_id uuid NOT NULL REFERENCES public.brand_applications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  product_name text NOT NULL CHECK (char_length(product_name) BETWEEN 2 AND 160),
  description text NOT NULL CHECK (char_length(description) BETWEEN 10 AND 2000),
  category text NOT NULL CHECK (char_length(category) BETWEEN 1 AND 80),
  price numeric(12,2) NOT NULL CHECK (price > 0),
  currency text NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  product_url text CHECK (product_url IS NULL OR char_length(product_url) <= 2048),
  image_path text,
  sizes text[] NOT NULL DEFAULT ARRAY[]::text[],
  colors text[] NOT NULL DEFAULT ARRAY[]::text[],
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  audience text[] NOT NULL CHECK (cardinality(audience) > 0 AND audience <@ ARRAY['her', 'him']::text[]),
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'shopify')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT brand_products_owner_application_unique UNIQUE (id, brand_application_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_products TO authenticated;
GRANT SELECT ON public.brand_products TO anon;
GRANT ALL ON public.brand_products TO service_role;
ALTER TABLE public.brand_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Brands manage own products after approval" ON public.brand_products FOR ALL TO authenticated USING (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.brand_applications a WHERE a.id = brand_application_id AND a.user_id = auth.uid() AND a.status = 'approved')) WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.brand_applications a WHERE a.id = brand_application_id AND a.user_id = auth.uid() AND a.status = 'approved'));
CREATE POLICY "Public can view published products from approved brands" ON public.brand_products FOR SELECT TO anon, authenticated USING (status = 'published' AND EXISTS (SELECT 1 FROM public.brand_applications a WHERE a.id = brand_application_id AND a.status = 'approved'));

CREATE OR REPLACE FUNCTION public.set_brand_product_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER set_brand_product_updated_at BEFORE UPDATE ON public.brand_products FOR EACH ROW EXECUTE FUNCTION public.set_brand_product_updated_at();