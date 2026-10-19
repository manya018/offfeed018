CREATE TABLE public.brand_shipping_profiles (
  brand_application_id uuid PRIMARY KEY REFERENCES public.brand_applications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  origin_pin_code text NOT NULL CHECK (origin_pin_code ~ '^[1-9][0-9]{5}$'),
  processing_days_min integer NOT NULL DEFAULT 1 CHECK (processing_days_min BETWEEN 0 AND 30),
  processing_days_max integer NOT NULL DEFAULT 2 CHECK (processing_days_max BETWEEN processing_days_min AND 45),
  shipping_note text NOT NULL DEFAULT '' CHECK (char_length(shipping_note) <= 500),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.brand_shipping_profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.brand_shipping_profiles TO authenticated;
GRANT SELECT ON public.brand_shipping_profiles TO anon;
GRANT ALL ON public.brand_shipping_profiles TO service_role;

CREATE POLICY "Approved brands manage their own shipping profile"
ON public.brand_shipping_profiles
FOR ALL TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.brand_applications a
    WHERE a.id = brand_application_id
      AND a.user_id = auth.uid()
      AND a.status = 'approved'
  )
)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.brand_applications a
    WHERE a.id = brand_application_id
      AND a.user_id = auth.uid()
      AND a.status = 'approved'
  )
);

CREATE POLICY "Public can read shipping profiles of approved brands"
ON public.brand_shipping_profiles
FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.brand_applications a
    WHERE a.id = brand_application_id
      AND a.status = 'approved'
  )
);

CREATE OR REPLACE FUNCTION public.set_brand_shipping_profile_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_brand_shipping_profile_updated_at
BEFORE UPDATE ON public.brand_shipping_profiles
FOR EACH ROW EXECUTE FUNCTION public.set_brand_shipping_profile_updated_at();
