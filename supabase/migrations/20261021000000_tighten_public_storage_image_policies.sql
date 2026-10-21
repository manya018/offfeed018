-- Keep public storefront/product images publicly readable only when the object path
-- is owned by the matching application/product owner and the asset is approved/published.
-- This preserves intended public imagery while tying each storage object to its owner.

DROP POLICY IF EXISTS "Public can view approved brand storefront images" ON storage.objects;
CREATE POLICY "Public can view approved brand storefront images"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'brand-applications'
  AND EXISTS (
    SELECT 1
    FROM public.brand_applications a
    WHERE a.status = 'approved'
      AND (a.logo_path = storage.objects.name OR a.cover_path = storage.objects.name)
      AND (storage.foldername(storage.objects.name))[1] = a.user_id::text
  )
);

DROP POLICY IF EXISTS "Shoppers can view published product photos" ON storage.objects;
CREATE POLICY "Shoppers can view published product photos"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'brand-product-images'
  AND EXISTS (
    SELECT 1
    FROM public.brand_products p
    WHERE p.image_path = storage.objects.name
      AND p.status = 'published'
      AND p.brand_approved = true
      AND (storage.foldername(storage.objects.name))[1] = p.user_id::text
  )
);
