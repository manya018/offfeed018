create table if not exists public.brand_size_guides (
  id uuid primary key default gen_random_uuid(),
  brand_application_id uuid not null references public.brand_applications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (char_length(category) between 1 and 120),
  size_chart jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brand_size_guides_brand_category_unique unique (brand_application_id, category)
);

alter table public.brand_size_guides enable row level security;

drop policy if exists "Brands can read their own size guides" on public.brand_size_guides;
create policy "Brands can read their own size guides"
  on public.brand_size_guides for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Brands can insert their own size guides" on public.brand_size_guides;
create policy "Brands can insert their own size guides"
  on public.brand_size_guides for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Brands can update their own size guides" on public.brand_size_guides;
create policy "Brands can update their own size guides"
  on public.brand_size_guides for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Brands can delete their own size guides" on public.brand_size_guides;
create policy "Brands can delete their own size guides"
  on public.brand_size_guides for delete to authenticated
  using (user_id = auth.uid());

create index if not exists brand_size_guides_user_category_idx
  on public.brand_size_guides (user_id, category);

comment on table public.brand_size_guides is
  'Reusable category-level size guides. A non-null brand_products.size_chart remains a product-specific override.';
