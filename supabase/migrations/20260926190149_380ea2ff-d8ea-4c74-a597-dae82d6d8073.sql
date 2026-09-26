CREATE TABLE public.brand_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  contact_name text NOT NULL CHECK (char_length(contact_name) BETWEEN 1 AND 120),
  email text NOT NULL CHECK (char_length(email) <= 255),
  brand_name text NOT NULL CHECK (char_length(brand_name) BETWEEN 1 AND 120),
  category text NOT NULL CHECK (char_length(category) BETWEEN 1 AND 80),
  brand_description text NOT NULL CHECK (char_length(brand_description) BETWEEN 20 AND 1000),
  website_url text NOT NULL CHECK (char_length(website_url) <= 2048),
  social_handle text CHECK (social_handle IS NULL OR char_length(social_handle) <= 120),
  logo_path text NOT NULL,
  cover_path text NOT NULL,
  proof_path text,
  status text NOT NULL DEFAULT 'under_review' CHECK (status IN ('under_review', 'approved', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.brand_applications TO authenticated;
GRANT ALL ON public.brand_applications TO service_role;
ALTER TABLE public.brand_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Applicants can view their own application" ON public.brand_applications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Applicants can submit their own application" ON public.brand_applications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND status = 'under_review');
CREATE POLICY "Applicants can edit their own pending application" ON public.brand_applications FOR UPDATE TO authenticated USING (auth.uid() = user_id AND status = 'under_review') WITH CHECK (auth.uid() = user_id AND status = 'under_review');
CREATE POLICY "Applicants can view their own brand application files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'brand-applications' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Applicants can upload their own brand application files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'brand-applications' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Applicants can update their own brand application files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'brand-applications' AND (storage.foldername(name))[1] = auth.uid()::text) WITH CHECK (bucket_id = 'brand-applications' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE OR REPLACE FUNCTION public.set_brand_application_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER set_brand_application_updated_at BEFORE UPDATE ON public.brand_applications FOR EACH ROW EXECUTE FUNCTION public.set_brand_application_updated_at();