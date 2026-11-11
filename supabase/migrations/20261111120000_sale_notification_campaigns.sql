create table if not exists public.sale_notification_campaigns (
 id uuid primary key default gen_random_uuid(),
 sale_id uuid not null references public.brand_sales(id) on delete cascade,
 event_key text not null check(event_key in ('launch','midway','24h','3h','ended')),
 scheduled_at timestamptz not null,
 status text not null default 'scheduled' check(status in ('scheduled','processing','sent','cancelled','failed')),
 sent_at timestamptz,
 recipient_count integer not null default 0,
 error_message text,
 created_at timestamptz not null default now(),
 unique(sale_id,event_key)
);
create table if not exists public.customer_notifications (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 campaign_id uuid references public.sale_notification_campaigns(id) on delete set null,
 sale_id uuid references public.brand_sales(id) on delete set null,
 title text not null,
 body text not null,
 href text not null default '/discover',
 notification_type text not null default 'sale',
 read_at timestamptz,
 created_at timestamptz not null default now(),
 unique(user_id,campaign_id)
);
create index if not exists sale_notification_due_idx on public.sale_notification_campaigns(status,scheduled_at);
create index if not exists customer_notifications_user_created_idx on public.customer_notifications(user_id,created_at desc);
alter table public.sale_notification_campaigns enable row level security;
alter table public.customer_notifications enable row level security;
create policy "Customers read own notifications" on public.customer_notifications
 for select to authenticated using(user_id=auth.uid());
create policy "Customers update own notifications" on public.customer_notifications
 for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
grant select on public.customer_notifications to authenticated;
grant update(read_at) on public.customer_notifications to authenticated;
grant all on public.sale_notification_campaigns,public.customer_notifications to service_role;

create or replace function public.schedule_sale_notification_campaigns()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
 insert into public.sale_notification_campaigns(sale_id,event_key,scheduled_at)
 values
 (new.id,'launch',new.starts_at),
 (new.id,'midway',new.starts_at + ((new.ends_at-new.starts_at)/2)),
 (new.id,'24h',new.ends_at - interval '24 hours'),
 (new.id,'3h',new.ends_at - interval '3 hours')
 on conflict(sale_id,event_key) do update set scheduled_at=excluded.scheduled_at
 where sale_notification_campaigns.status in ('scheduled','cancelled');
 return new;
end $$;
drop trigger if exists brand_sales_schedule_notifications on public.brand_sales;
create trigger brand_sales_schedule_notifications after insert or update of starts_at,ends_at on public.brand_sales
 for each row when (new.status <> 'cancelled') execute function public.schedule_sale_notification_campaigns();

create or replace function public.cancel_sale_notification_campaigns()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
 if new.status='cancelled' then
  update public.sale_notification_campaigns set status='cancelled'
   where sale_id=new.id and status='scheduled';
 end if;
 return new;
end $$;
drop trigger if exists brand_sales_cancel_notifications on public.brand_sales;
create trigger brand_sales_cancel_notifications after update of status on public.brand_sales
 for each row execute function public.cancel_sale_notification_campaigns();

create or replace function public.deliver_due_sale_notifications(p_limit integer default 50)
returns integer language plpgsql security definer set search_path=public
as $$
declare campaign record; sale record; inserted_count integer; total integer:=0;
begin
 for campaign in
  select * from public.sale_notification_campaigns
  where status='scheduled' and scheduled_at<=now()
  order by scheduled_at asc limit greatest(1,least(p_limit,200))
  for update skip locked
 loop
  update public.sale_notification_campaigns set status='processing' where id=campaign.id;
  select s.*,a.brand_name into sale from public.brand_sales s
   join public.brand_applications a on a.id=s.brand_application_id where s.id=campaign.sale_id;
  if not found or sale.status='cancelled' or (campaign.event_key<>'ended' and sale.ends_at<=now()) then
   update public.sale_notification_campaigns set status='cancelled' where id=campaign.id;
   continue;
  end if;
  insert into public.customer_notifications(user_id,campaign_id,sale_id,title,body,href)
  select u.id,campaign.id,sale.id,
   case campaign.event_key when 'launch' then sale.brand_name||' sale is live'
    when 'midway' then 'A sale worth revisiting'
    when '24h' then 'Sale ends tomorrow'
    when '3h' then 'Last chance to shop this sale' else 'Sale has ended' end,
   case campaign.event_key when 'launch' then sale.name||' is now live. Discover the offers from '||sale.brand_name||'.'
    when 'midway' then sale.name||' from '||sale.brand_name||' is still on. Take another look.'
    when '24h' then sale.name||' from '||sale.brand_name||' ends in 24 hours.'
    when '3h' then sale.name||' from '||sale.brand_name||' ends in 3 hours.'
    else sale.name||' from '||sale.brand_name||' has ended.' end,
   '/brand/'||coalesce((select public_handle from public.brand_applications where id=sale.brand_application_id), '')
  from auth.users u
  where u.deleted_at is null
    and not exists (select 1 from public.brand_applications ba where ba.user_id=u.id)
  on conflict(user_id,campaign_id) do nothing;
  get diagnostics inserted_count=row_count;
  update public.sale_notification_campaigns set status='sent',sent_at=now(),recipient_count=inserted_count where id=campaign.id;
  total:=total+inserted_count;
 end loop;
 return total;
end $$;
grant execute on function public.deliver_due_sale_notifications(integer) to service_role;
