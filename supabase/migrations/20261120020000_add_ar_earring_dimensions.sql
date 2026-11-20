-- Physical dimensions for one earring, used to scale the product overlay in AR.
ALTER TABLE public.brand_products
  ADD COLUMN IF NOT EXISTS ar_width_mm numeric(7,2),
  ADD COLUMN IF NOT EXISTS ar_height_mm numeric(7,2);

COMMENT ON COLUMN public.brand_products.ar_width_mm IS 'Physical width in millimetres for one earring, used for AR scale.';
COMMENT ON COLUMN public.brand_products.ar_height_mm IS 'Physical height in millimetres for one earring, used for AR scale.';
