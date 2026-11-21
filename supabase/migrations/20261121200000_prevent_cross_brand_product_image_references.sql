-- Prevent an approved brand from pointing its product record at another
-- brand's private object. This is enforced in PostgreSQL, not only in the UI.
CREATE OR REPLACE FUNCTION public.offfeed_assert_product_image_owner(
  p_path text,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
  IF p_path IS NULL OR btrim(p_path) = '' THEN
    RETURN;
  END IF;

  -- Shopify-hosted catalog images are the only external image references
  -- accepted by the product listing flow.
  IF p_path ~* '^https://(cdn\.shopify\.com|[a-z0-9-]+\.myshopify\.com|[a-z0-9-]+\.shopifycdn\.net)/' THEN
    RETURN;
  END IF;

  -- All private Storage objects must live in this brand's UID folder and
  -- the Storage metadata must confirm the same uploader.
  IF (storage.foldername(p_path))[1] IS DISTINCT FROM p_user_id::text
     OR NOT EXISTS (
       SELECT 1
       FROM storage.objects o
       WHERE o.bucket_id = 'brand-product-images'
         AND o.name = p_path
         AND o.owner_id = p_user_id::text
     ) THEN
    RAISE EXCEPTION 'Product images must belong to the signed-in brand account.'
      USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.offfeed_validate_brand_product_image_ownership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  image_path_item text;
BEGIN
  PERFORM public.offfeed_assert_product_image_owner(NEW.image_path, NEW.user_id);

  IF NEW.image_paths IS NOT NULL THEN
    FOREACH image_path_item IN ARRAY NEW.image_paths LOOP
      PERFORM public.offfeed_assert_product_image_owner(image_path_item, NEW.user_id);
    END LOOP;
  END IF;

  PERFORM public.offfeed_assert_product_image_owner(NEW.ar_image_path, NEW.user_id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS offfeed_validate_brand_product_image_ownership ON public.brand_products;
CREATE TRIGGER offfeed_validate_brand_product_image_ownership
BEFORE INSERT OR UPDATE OF user_id, image_path, image_paths, ar_image_path
ON public.brand_products
FOR EACH ROW
EXECUTE FUNCTION public.offfeed_validate_brand_product_image_ownership();

REVOKE ALL ON FUNCTION public.offfeed_assert_product_image_owner(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.offfeed_validate_brand_product_image_ownership() FROM PUBLIC, anon, authenticated;
