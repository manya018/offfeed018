create table if not exists public.spotlight_analytics_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.spotlight_campaigns(id) on delete cascade,
  product_id uuid not null references public.brand_products(id) on delete cascade,
  event_type text not null check (event_type in ('view','click','save')),
  visitor_id text not null check (char_length(visitor_id) between 8 and 100),
  created_at timestamptz not null default now()
);
create index if not exists spotlight_analytics_campaign_event_idx
  on public.spotlight_analytics_events (campaign_id, event_type, created_at desc);
alter table public.spotlight_analytics_events enable row level security;
grant all on public.spotlight_analytics_events to service_role;
