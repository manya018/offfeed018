-- Public product reviews from verified, delivered OFFFEED orders.
-- Review submissions are server-only; visitors can read the narrowly filtered public RPC.

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.brand_products(id) on delete cascade,
  brand_order_id uuid not null unique references public.brand_orders(id) on delete cascade,
  customer_user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 2 and 60),
  rating smallint not null check (rating between 1 and 5),
  title text not null check (char_length(trim(title)) between 3 and 100),
  body text not null check (char_length(trim(body)) between 10 and 1500),
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_at timestamptz not null default now(),
  constraint product_reviews_one_per_customer unique (product_id, customer_user_id)
);

create index if not exists product_reviews_product_public_created_idx
  on public.product_reviews(product_id, created_at desc)
  where status = 'published';

alter table public.product_reviews enable row level security;
revoke all on public.product_reviews from anon, authenticated;
grant all on public.product_reviews to service_role;

create or replace function public.get_public_product_reviews(p_product_id uuid)
returns table(
  id uuid,
  product_id uuid,
  display_name text,
  rating smallint,
  title text,
  body text,
  verified_purchase boolean,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.product_id, r.display_name, r.rating, r.title, r.body,
         true as verified_purchase, r.created_at
    from public.product_reviews r
    join public.brand_products p on p.id = r.product_id
    join public.brand_applications a on a.id = p.brand_application_id
   where r.product_id = p_product_id
     and r.status = 'published'
     and p.status = 'published'
     and p.brand_approved = true
     and a.status = 'approved'
   order by r.created_at desc
   limit 50;
$$;

revoke all on function public.get_public_product_reviews(uuid) from public;
grant execute on function public.get_public_product_reviews(uuid) to anon, authenticated;
