create table if not exists public.brand_sales (
 id uuid primary key default gen_random_uuid(),
 brand_application_id uuid not null references public.brand_applications(id),
 user_id uuid not null references auth.users(id),
 name text not null check(char_length(name) between 2 and 100),
 product_scope text not null check(product_scope in ('collection','selected')),
 discount_type text not null check(discount_type in ('percentage','fixed')),
 discount_value numeric(12,2) not null check(discount_value > 0),
 starts_at timestamptz not null, ends_at timestamptz not null,
 status text not null default 'scheduled' check(status in ('scheduled','active','ended','cancelled')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint brand_sales_valid_period check(ends_at > starts_at),
 constraint brand_sales_discount_limit check(
  (discount_type='percentage' and discount_value<=70) or
  (discount_type='fixed' and discount_value<=10000000))
);
create table if not exists public.brand_sale_products (
 sale_id uuid not null references public.brand_sales(id),
 product_id uuid not null references public.brand_products(id),
 primary key(sale_id,product_id)
);
create index if not exists brand_sales_brand_idx on public.brand_sales(user_id,created_at desc);
create index if not exists brand_sales_schedule_idx on public.brand_sales(status,starts_at,ends_at);
create index if not exists brand_sale_products_product_idx on public.brand_sale_products(product_id);
alter table public.brand_sales enable row level security;
alter table public.brand_sale_products enable row level security;
create policy "Brands can view their own sales" on public.brand_sales
 for select to authenticated using(user_id=auth.uid());
create policy "Brands can view their own sale products" on public.brand_sale_products
 for select to authenticated using(exists(select 1 from public.brand_sales s where s.id=sale_id and s.user_id=auth.uid()));
grant select on public.brand_sales,public.brand_sale_products to authenticated;
grant all on public.brand_sales,public.brand_sale_products to service_role;
