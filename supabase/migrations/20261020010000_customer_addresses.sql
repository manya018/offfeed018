create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Home',
  line1 text not null,
  line2 text,
  city text not null,
  state text not null,
  landmark text,
  pin_code text not null check (pin_code ~ '^[1-9][0-9]{5}$'),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists customer_addresses_user_id_idx on public.customer_addresses(user_id);
alter table public.customer_addresses enable row level security;
drop policy if exists "Customers manage their own addresses" on public.customer_addresses;
create policy "Customers manage their own addresses" on public.customer_addresses
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.customer_addresses to authenticated;
