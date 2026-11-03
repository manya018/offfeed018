alter table public.brand_products
  add column if not exists size_chart jsonb;

comment on column public.brand_products.size_chart is
  'Brand-authored product-specific size guide: columns, measurement rows, and optional unit.';
