-- OFFFEED Phase 2: private, account-scoped fashion preference profile.
create table if not exists public.customer_style_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  style_space text not null default 'her' check (style_space in ('her', 'him')),
  aesthetics text[] not null default '{}',
  colors text[] not null default '{}',
  fits text[] not null default '{}',
  categories text[] not null default '{}',
  occasions text[] not null default '{}',
  budget_min integer null check (budget_min is null or budget_min >= 0),
  budget_max integer null check (budget_max is null or budget_max >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_style_profiles_budget_range check (
    budget_min is null or budget_max is null or budget_min <= budget_max
  )
);

alter table public.customer_style_profiles enable row level security;

drop policy if exists "Users can view their own style profile" on public.customer_style_profiles;
create policy "Users can view their own style profile"
  on public.customer_style_profiles for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own style profile" on public.customer_style_profiles;
create policy "Users can create their own style profile"
  on public.customer_style_profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own style profile" on public.customer_style_profiles;
create policy "Users can update their own style profile"
  on public.customer_style_profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own style profile" on public.customer_style_profiles;
create policy "Users can delete their own style profile"
  on public.customer_style_profiles for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.customer_style_profiles to authenticated;
