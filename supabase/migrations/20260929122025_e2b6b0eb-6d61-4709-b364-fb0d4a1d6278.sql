ALTER TABLE public.brand_applications
  ADD COLUMN commission_rate numeric(5,4) NOT NULL DEFAULT 0.1800,
  ADD COLUMN commission_agreed_at timestamptz;

ALTER TABLE public.brand_applications
  ADD CONSTRAINT brand_applications_commission_rate_check CHECK (commission_rate = 0.1800);

GRANT SELECT, INSERT, UPDATE ON public.brand_applications TO authenticated;
GRANT ALL ON public.brand_applications TO service_role;