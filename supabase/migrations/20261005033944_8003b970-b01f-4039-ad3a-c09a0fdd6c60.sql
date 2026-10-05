DROP POLICY "Public can verify approved brand status" ON public.brand_applications;
REVOKE SELECT (id, status) ON public.brand_applications FROM anon, authenticated;
ALTER TABLE public.brand_products ADD COLUMN brand_approved boolean NOT NULL DEFAULT false;
CREATE OR REPLACE FUNCTION public.set_brand_product_approval() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN SELECT (a.status = 'approved') INTO NEW.brand_approved FROM public.brand_applications a WHERE a.id = NEW.brand_application_id AND a.user_id = NEW.user_id; IF NOT FOUND THEN RAISE EXCEPTION 'Brand application does not match the product owner'; END IF; RETURN NEW; END; $$;
CREATE TRIGGER set_brand_product_approval BEFORE INSERT OR UPDATE OF brand_application_id, user_id, status ON public.brand_products FOR EACH ROW EXECUTE FUNCTION public.set_brand_product_approval();
DROP POLICY "Public can view published products from approved brands" ON public.brand_products;
CREATE POLICY "Public can view published products from approved brands" ON public.brand_products FOR SELECT TO anon, authenticated USING (status = 'published' AND brand_approved);
DROP POLICY "Shoppers can view published product photos" ON storage.objects;
CREATE POLICY "Shoppers can view published product photos" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'brand-product-images' AND EXISTS (SELECT 1 FROM public.brand_products p WHERE p.image_path = name AND p.status = 'published' AND p.brand_approved));