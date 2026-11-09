create table if not exists public.spotlight_campaigns (
  id uuid primary key default gen_random_uuid(),
  brand_application_id uuid not null references public.brand_applications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  audience text not null check (audience in ('her','him','home')),
  duration_days integer not null check (duration_days in (7,14,28)),
  status text not null default 'submitted' check (status in ('submitted','approved','active','completed','rejected','cancelled')),
  payment_status text not null default 'pending' check (payment_status in ('pending','paid','refunded','waived')),
  campaign_price numeric(12,2) not null default 0 check (campaign_price >= 0),
  payment_reference text,
  starts_at timestamptz,
  ends_at timestamptz,
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is not null and ends_at > starts_at)
);

create table if not exists public.spotlight_campaign_products (
  campaign_id uuid not null references public.spotlight_campaigns(id) on delete cascade,
  product_id uuid not null references public.brand_products(id) on delete cascade,
  position integer not null default 0 check (position >= 0),
  primary key (campaign_id, product_id)
);

create index if not exists spotlight_campaigns_public_idx
  on public.spotlight_campaigns (audience, status, starts_at, ends_at);
create index if not exists spotlight_campaigns_brand_idx
  on public.spotlight_campaigns (user_id, created_at desc);

alter table public.spotlight_campaigns enable row level security;
alter table public.spotlight_campaign_products enable row level security;

create policy "Brands can view their own Spotlight campaigns"
  on public.spotlight_campaigns for select to authenticated
  using (user_id = auth.uid());
create policy "Brands can view their own Spotlight campaign products"
  on public.spotlight_campaign_products for select to authenticated
  using (exists (
    select 1 from public.spotlight_campaigns c
    where c.id = campaign_id and c.user_id = auth.uid()
  ));

grant select on public.spotlight_campaigns, public.spotlight_campaign_products to authenticated;
grant all on public.spotlight_campaigns, public.spotlight_campaign_products to service_role;

comment on table public.spotlight_campaigns is 'OFFFEED Spotlight brand campaign applications and owner-controlled campaign/payment lifecycle.';
comment on table public.spotlight_campaign_products is 'Products selected by a brand for a Spotlight campaign; display rotates during the campaign.';
