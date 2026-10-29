-- Secure brand payout onboarding and settlement ledger.
-- Do not store bank account numbers, IFSC codes, OTPs, passwords, or raw provider payloads here.
-- A verified payout provider should own bank-detail collection and return only a provider account reference.

create table if not exists public.brand_payout_profiles (
  id uuid primary key default gen_random_uuid(),
  brand_application_id uuid not null unique references public.brand_applications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'razorpay_route',
  provider_account_ref text,
  onboarding_status text not null default 'pending'
    check (onboarding_status in ('pending', 'in_progress', 'needs_information', 'verified', 'restricted', 'rejected')),
  payout_currency text not null default 'INR' check (payout_currency = 'INR'),
  verified_at timestamptz,
  last_provider_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists brand_payout_profiles_user_id_idx
  on public.brand_payout_profiles(user_id);

alter table public.brand_payout_profiles enable row level security;

drop policy if exists "Brands can view their own payout setup" on public.brand_payout_profiles;
create policy "Brands can view their own payout setup"
  on public.brand_payout_profiles
  for select
  to authenticated
  using (user_id = auth.uid());

-- Intentionally no authenticated insert/update/delete policies. Provider onboarding webhooks
-- and trusted server functions should write this table using a service-role client.

create table if not exists public.brand_settlement_ledger (
  id uuid primary key default gen_random_uuid(),
  brand_application_id uuid not null references public.brand_applications(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  brand_order_id uuid references public.brand_orders(id) on delete set null,
  order_number text,
  currency text not null default 'INR' check (currency = 'INR'),
  product_subtotal numeric(12,2) not null default 0 check (product_subtotal >= 0),
  commission_rate numeric(6,5) not null default 0.18 check (commission_rate >= 0 and commission_rate <= 1),
  commission_amount numeric(12,2) not null default 0 check (commission_amount >= 0),
  shipping_cost numeric(12,2) not null default 0 check (shipping_cost >= 0),
  refund_amount numeric(12,2) not null default 0 check (refund_amount >= 0),
  adjustment_amount numeric(12,2) not null default 0,
  net_payout numeric(12,2) not null default 0,
  payout_status text not null default 'pending'
    check (payout_status in ('pending', 'eligible', 'processing', 'paid', 'failed', 'on_hold', 'reversed')),
  provider_payout_ref text,
  payout_note text,
  eligible_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists brand_settlement_ledger_brand_created_idx
  on public.brand_settlement_ledger(brand_application_id, created_at desc);
create index if not exists brand_settlement_ledger_user_status_idx
  on public.brand_settlement_ledger(user_id, payout_status);

alter table public.brand_settlement_ledger enable row level security;

drop policy if exists "Brands can view their own settlement ledger" on public.brand_settlement_ledger;
create policy "Brands can view their own settlement ledger"
  on public.brand_settlement_ledger
  for select
  to authenticated
  using (user_id = auth.uid());

-- No client write policies: trusted server-side order/settlement jobs only.
comment on table public.brand_payout_profiles is 'Stores provider reference and onboarding state only; never store bank details or credentials.';
comment on table public.brand_settlement_ledger is 'Auditable brand settlement ledger; write access is reserved for trusted server-side processes.';
