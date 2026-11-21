-- Tie storage access to the authenticated uploader, not only a caller-chosen path.
-- Supabase populates storage.objects.owner_id for authenticated uploads.
-- Existing published product/storefront images remain publicly readable only
-- when the object owner matches the owning brand account.

-- Brand application documents and storefront assets
DROP POLICY IF EXISTS "Applicants can view their own brand application files" ON storage.objects;
DROP POLICY IF EXISTS "Applicants can upload their own brand application files" ON storage.objects;
DROP POLICY IF EXISTS "Applicants can update their own brand application files" ON storage.objects;
DROP POLICY IF EXISTS "Applicants can remove their own brand application files" ON storage.objects;
DROP POLICY IF EXISTS "Public can view approved brand storefront images" ON storage.objects;

CREATE POLICY "Applicants can view their own brand application files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'brand-applications'
  AND owner_id = auth.uid()::text
  AND (storage.foldername(name))[1] = auth.uid()::text
);
CREATE POLICY "Applicants can upload their own brand application files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'brand-applications'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
CREATE POLICY "Applicants can update their own brand application files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'brand-applications'
  AND owner_id = auth.uid()::text
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'brand-applications'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
CREATE POLICY "Applicants can remove their own brand application files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'brand-applications'
  AND owner_id = auth.uid()::text
  AND (storage.foldername(name))[1] = auth.uid()::text
);
CREATE POLICY "Public can view approved brand storefront images"
ON storage.objects FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'brand-applications'
  AND EXISTS (
    SELECT 1 FROM public.brand_applications a
    WHERE a.status = 'approved'
      AND (a.logo_path = storage.objects.name OR a.cover_path = storage.objects.name)
      AND (storage.foldername(storage.objects.name))[1] = a.user_id::text
      AND storage.objects.owner_id = a.user_id::text
  )
);

-- Brand product images: private originals/AR images belong to their uploader;
-- public catalogue images are exposed only for published products owned by that uploader.
DROP POLICY IF EXISTS "Brands can view their own product photos" ON storage.objects;
DROP POLICY IF EXISTS "Brands can upload their own product photos" ON storage.objects;
DROP POLICY IF EXISTS "Brands can update their own product photos" ON storage.objects;
DROP POLICY IF EXISTS "Brands can remove their own product photos" ON storage.objects;
DROP POLICY IF EXISTS "Shoppers can view published product photos" ON storage.objects;

CREATE POLICY "Brands can view their own product photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'brand-product-images'
  AND owner_id = auth.uid()::text
  AND (storage.foldername(name))[1] = auth.uid()::text
);
CREATE POLICY "Brands can upload their own product photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'brand-product-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM public.brand_applications a
    WHERE a.user_id = auth.uid() AND a.status = 'approved'
  )
);
CREATE POLICY "Brands can update their own product photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'brand-product-images'
  AND owner_id = auth.uid()::text
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'brand-product-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
CREATE POLICY "Brands can remove their own product photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'brand-product-images'
  AND owner_id = auth.uid()::text
  AND (storage.foldername(name))[1] = auth.uid()::text
);
CREATE POLICY "Shoppers can view published product photos"
ON storage.objects FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'brand-product-images'
  AND EXISTS (
    SELECT 1 FROM public.brand_products p
    WHERE p.image_path = storage.objects.name
      AND p.status = 'published'
      AND p.brand_approved = true
      AND (storage.foldername(storage.objects.name))[1] = p.user_id::text
      AND storage.objects.owner_id = p.user_id::text
  )
);

-- Order evidence is private. An uploader can access their own files; the other
-- party to an order can view only evidence explicitly attached to that order.
DROP POLICY IF EXISTS "Order parties can upload their own evidence files" ON storage.objects;
DROP POLICY IF EXISTS "Order parties can view evidence files" ON storage.objects;
DROP POLICY IF EXISTS "Owners can remove their own evidence files" ON storage.objects;
DROP POLICY IF EXISTS "Order parties can view exact evidence files" ON storage.objects;
DROP POLICY IF EXISTS "OFFFEED evidence owners can upload" ON storage.objects;
DROP POLICY IF EXISTS "OFFFEED order parties can view exact evidence" ON storage.objects;

CREATE POLICY "OFFFEED evidence owners can upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'order-evidence'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
CREATE POLICY "OFFFEED order parties can view exact evidence"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'order-evidence'
  AND owner_id IS NOT NULL
  AND (
    (owner_id = auth.uid()::text AND (storage.foldername(name))[1] = auth.uid()::text)
    OR EXISTS (
      SELECT 1
      FROM public.dispatch_evidence de
      JOIN public.brand_orders bo ON bo.id = de.order_id
      WHERE (bo.brand_user_id = auth.uid() OR bo.customer_user_id = auth.uid())
        AND (
          de.video_path = storage.objects.name
          OR EXISTS (
            SELECT 1
            FROM jsonb_array_elements(
              CASE WHEN jsonb_typeof(de.photos) = 'array' THEN de.photos ELSE '[]'::jsonb END
            ) AS item(photo)
            WHERE item.photo->>'path' = storage.objects.name
          )
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.return_evidence re
      JOIN public.order_returns r ON r.id = re.return_id AND r.order_id = re.order_id
      JOIN public.brand_orders bo ON bo.id = re.order_id
      WHERE (bo.brand_user_id = auth.uid() OR bo.customer_user_id = auth.uid())
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements(
            CASE WHEN jsonb_typeof(re.photos) = 'array' THEN re.photos ELSE '[]'::jsonb END
          ) AS item(photo)
          WHERE item.photo->>'path' = storage.objects.name
        )
    )
  )
);
CREATE POLICY "OFFFEED evidence owners can remove their own files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'order-evidence'
  AND owner_id = auth.uid()::text
  AND (storage.foldername(name))[1] = auth.uid()::text
);
