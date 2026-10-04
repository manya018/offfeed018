DROP POLICY "Public can view published products from approved brands" ON public.brand_products;
DROP POLICY "Shoppers can view published product photos" ON storage.objects;
DROP FUNCTION public.is_approved_brand_application(uuid);
GRANT SELECT (id, status) ON public.brand_applications TO anon, authenticated;
CREATE POLICY "Public can verify approved brand status" ON public.brand_applications FOR SELECT TO anon, authenticated USING (status = 'approved');
CREATE POLICY "Public can view published products from approved brands" ON public.brand_products FOR SELECT TO anon, authenticated USING (status = 'published' AND EXISTS (SELECT 1 FROM public.brand_applications a WHERE a.id = brand_application_id AND a.status = 'approved'));
CREATE POLICY "Shoppers can view published product photos" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'brand-product-images' AND EXISTS (SELECT 1 FROM public.brand_products p JOIN public.brand_applications a ON a.id = p.brand_application_id WHERE p.image_path = name AND p.status = 'published' AND a.status = 'approved'));