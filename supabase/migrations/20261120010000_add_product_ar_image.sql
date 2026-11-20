-- Optional transparent product cutout used only for the jewellery AR overlay.
-- Existing product photos remain unchanged and continue to power storefront cards.
ALTER TABLE public.brand_products
  ADD COLUMN IF NOT EXISTS ar_image_path text;

-- Keep AR cutouts private by default; shoppers receive short-lived signed URLs
-- only for approved, published products through the server-side catalog functions.
