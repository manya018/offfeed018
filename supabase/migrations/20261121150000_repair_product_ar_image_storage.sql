-- Reconcile AR cutout storage permissions and columns for the connected database.
-- A cutout is a private PNG owned by the brand account that uploaded it.
alter table public.brand_products
  add column if not exists ar_image_path text,
  add column if not exists ar_width_mm numeric(7,2),
  add column if not exists ar_height_mm numeric(7,2);

update storage.buckets
set file_size_limit = greatest(coalesce(file_size_limit, 0), 12582912)
where id = 'brand-product-images';

drop policy if exists "Brands can view their own product photos" on storage.objects;
create policy "Brands can view their own product photos"
on storage.objects for select to authenticated
using (bucket_id = 'brand-product-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Brands can upload their own product photos" on storage.objects;
create policy "Brands can upload their own product photos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'brand-product-images'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1 from public.brand_applications a
    where a.user_id = auth.uid() and a.status = 'approved'
  )
);
