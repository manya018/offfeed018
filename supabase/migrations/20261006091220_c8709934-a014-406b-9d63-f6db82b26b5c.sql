ALTER TABLE public.brand_applications ADD COLUMN public_handle text;

CREATE OR REPLACE FUNCTION public.assign_approved_brand_handle() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved' OR NEW.public_handle IS NULL OR NEW.public_handle = '') THEN
    NEW.public_handle := trim(both '-' from regexp_replace(lower(NEW.brand_name), '[^a-z0-9]+', '-', 'g')) || '-' || substr(NEW.id::text, 1, 8);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER assign_approved_brand_handle BEFORE UPDATE OF status ON public.brand_applications FOR EACH ROW EXECUTE FUNCTION public.assign_approved_brand_handle();

UPDATE public.brand_applications SET public_handle = trim(both '-' from regexp_replace(lower(brand_name), '[^a-z0-9]+', '-', 'g')) || '-' || substr(id::text, 1, 8) WHERE status = 'approved' AND (public_handle IS NULL OR public_handle = '');

CREATE UNIQUE INDEX brand_applications_public_handle_unique ON public.brand_applications(public_handle) WHERE public_handle IS NOT NULL;
GRANT SELECT (id, brand_name, category, brand_description, website_url, social_handle, logo_path, cover_path, audience, status, public_handle) ON public.brand_applications TO anon;
CREATE POLICY "Public can view approved brand profiles" ON public.brand_applications FOR SELECT TO anon USING (status = 'approved' AND public_handle IS NOT NULL);

REVOKE SELECT ON public.brand_products FROM anon;
GRANT SELECT (id, brand_application_id, product_name, description, category, price, currency, product_url, image_path, sizes, colors, tags, audience, status, brand_approved, created_at) ON public.brand_products TO anon;