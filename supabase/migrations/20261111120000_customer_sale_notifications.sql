-- OFFFEED customer sale notification foundation.
create table if not exists public.customer_notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  in_app_enabled boolean not null default true,
  sale_email_enabled boolean not null default false,
  push_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.customer_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists customer_push_subscriptions_user_idx on public.customer_push_subscriptions(user_id);
create table if not exists public.customer_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_type text not null check (notification_type in ('sale_started','sale_reminder','sale_ending_soon')),
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  dedupe_key text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id,dedupe_key)
);
create index if not exists customer_notifications_inbox_idx on public.customer_notifications(user_id,created_at desc);
create table if not exists public.sale_notification_jobs (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.brand_sales(id) on delete cascade,
  event_type text not null check (event_type in ('sale_started','sale_reminder','sale_ending_soon')),
  scheduled_for timestamptz not null,
  status text not null default 'pending' check(status in ('pending','processing','sent','failed','cancelled')),
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique(sale_id,event_type)
);
create index if not exists sale_notification_jobs_due_idx on public.sale_notification_jobs(status,scheduled_for);

create or replace function public.sync_customer_notification_preferences()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  insert into public.customer_notification_preferences(user_id,email)
  values(new.id,new.email)
  on conflict(user_id) do update set email=excluded.email,updated_at=now();
  return new;
end;
$$;
drop trigger if exists on_auth_user_notification_preferences on auth.users;
create trigger on_auth_user_notification_preferences
after insert or update of email on auth.users
for each row execute function public.sync_customer_notification_preferences();
insert into public.customer_notification_preferences(user_id,email)
select id,email from auth.users
on conflict(user_id) do update set email=excluded.email,updated_at=now();

create or replace function public.schedule_sale_notification_jobs()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  if new.status <> 'cancelled' then
    insert into public.sale_notification_jobs(sale_id,event_type,scheduled_for)
    values(new.id,'sale_started',new.starts_at)
    on conflict(sale_id,event_type) do nothing;
    if new.ends_at - interval '24 hours' > new.starts_at then
      insert into public.sale_notification_jobs(sale_id,event_type,scheduled_for)
      values(new.id,'sale_reminder',new.ends_at - interval '24 hours')
      on conflict(sale_id,event_type) do nothing;
    end if;
    if new.ends_at - interval '2 hours' > new.starts_at then
      insert into public.sale_notification_jobs(sale_id,event_type,scheduled_for)
      values(new.id,'sale_ending_soon',new.ends_at - interval '2 hours')
      on conflict(sale_id,event_type) do nothing;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists brand_sales_schedule_notifications on public.brand_sales;
create trigger brand_sales_schedule_notifications
after insert on public.brand_sales
for each row execute function public.schedule_sale_notification_jobs();

create or replace function public.claim_due_sale_notification_jobs(p_limit integer default 20)
returns setof public.sale_notification_jobs
language sql security definer set search_path=public
as $$
  with due as (
    select id from public.sale_notification_jobs
    where status='pending' and scheduled_for <= now()
    order by scheduled_for
    for update skip locked
    limit greatest(1,least(p_limit,100))
  )
  update public.sale_notification_jobs j
  set status='processing',attempts=j.attempts+1
  from due where j.id=due.id
  returning j.*;
$$;
revoke all on function public.claim_due_sale_notification_jobs(integer) from public,anon,authenticated;
grant execute on function public.claim_due_sale_notification_jobs(integer) to service_role;

alter table public.customer_notification_preferences enable row level security;
alter table public.customer_push_subscriptions enable row level security;
alter table public.customer_notifications enable row level security;
alter table public.sale_notification_jobs enable row level security;
drop policy if exists "Customers manage own notification preferences" on public.customer_notification_preferences;
create policy "Customers manage own notification preferences" on public.customer_notification_preferences
for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists "Customers manage own push subscriptions" on public.customer_push_subscriptions;
create policy "Customers manage own push subscriptions" on public.customer_push_subscriptions
for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists "Customers read own notifications" on public.customer_notifications;
create policy "Customers read own notifications" on public.customer_notifications
for select to authenticated using(user_id=auth.uid());
drop policy if exists "Customers update own notifications" on public.customer_notifications;
create policy "Customers update own notifications" on public.customer_notifications
for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
grant select,insert,update,delete on public.customer_notification_preferences,public.customer_push_subscriptions to authenticated;
grant select,update on public.customer_notifications to authenticated;
grant all on public.customer_notification_preferences,public.customer_push_subscriptions,public.customer_notifications,public.sale_notification_jobs to service_role;

-- Optional scheduler: configure the Vault secrets sale_notification_function_url and
-- sale_notification_cron_secret, then schedule the sale-notification-dispatch Edge Function.
-- Email marketing is opt-in (false by default); in-app notifications are enabled by default.
