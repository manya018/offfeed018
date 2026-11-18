-- OFFFEED sale discovery notifications: launch, halfway, 24-hour and 3-hour reminders.
-- Existing sent notifications remain sent; pending jobs are recalculated on sale edits.
alter table public.customer_notifications
  drop constraint if exists customer_notifications_notification_type_check;
alter table public.customer_notifications
  add constraint customer_notifications_notification_type_check
  check (notification_type in ('sale_started','sale_midway','sale_reminder','sale_ending_soon'));

alter table public.sale_notification_jobs
  drop constraint if exists sale_notification_jobs_event_type_check;
alter table public.sale_notification_jobs
  add constraint sale_notification_jobs_event_type_check
  check (event_type in ('sale_started','sale_midway','sale_reminder','sale_ending_soon'));

create or replace function public.schedule_sale_notification_jobs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'cancelled' then
    update public.sale_notification_jobs
       set status = 'cancelled'
     where sale_id = new.id
       and status in ('pending', 'failed', 'processing');
    return new;
  end if;

  insert into public.sale_notification_jobs(sale_id, event_type, scheduled_for)
  values (new.id, 'sale_started', new.starts_at)
  on conflict (sale_id, event_type) do update
    set scheduled_for = excluded.scheduled_for,
        status = case when public.sale_notification_jobs.status = 'sent' then 'sent' else 'pending' end,
        last_error = null, claimed_at = null;

  if new.ends_at - new.starts_at > interval '2 hours' then
    insert into public.sale_notification_jobs(sale_id, event_type, scheduled_for)
    values (new.id, 'sale_midway', new.starts_at + ((new.ends_at - new.starts_at) / 2))
    on conflict (sale_id, event_type) do update
      set scheduled_for = excluded.scheduled_for,
          status = case when public.sale_notification_jobs.status = 'sent' then 'sent' else 'pending' end,
          last_error = null, claimed_at = null;
  else
    update public.sale_notification_jobs set status = 'cancelled'
     where sale_id = new.id and event_type = 'sale_midway' and status in ('pending','failed');
  end if;

  if new.ends_at - interval '24 hours' > new.starts_at then
    insert into public.sale_notification_jobs(sale_id, event_type, scheduled_for)
    values (new.id, 'sale_reminder', new.ends_at - interval '24 hours')
    on conflict (sale_id, event_type) do update
      set scheduled_for = excluded.scheduled_for,
          status = case when public.sale_notification_jobs.status = 'sent' then 'sent' else 'pending' end,
          last_error = null, claimed_at = null;
  else
    update public.sale_notification_jobs set status = 'cancelled'
     where sale_id = new.id and event_type = 'sale_reminder' and status in ('pending','failed');
  end if;

  if new.ends_at - interval '3 hours' > new.starts_at then
    insert into public.sale_notification_jobs(sale_id, event_type, scheduled_for)
    values (new.id, 'sale_ending_soon', new.ends_at - interval '3 hours')
    on conflict (sale_id, event_type) do update
      set scheduled_for = excluded.scheduled_for,
          status = case when public.sale_notification_jobs.status = 'sent' then 'sent' else 'pending' end,
          last_error = null, claimed_at = null;
  else
    update public.sale_notification_jobs set status = 'cancelled'
     where sale_id = new.id and event_type = 'sale_ending_soon' and status in ('pending','failed');
  end if;

  return new;
end;
$$;

drop trigger if exists brand_sales_schedule_notifications on public.brand_sales;
create trigger brand_sales_schedule_notifications
after insert or update of starts_at, ends_at, status on public.brand_sales
for each row execute function public.schedule_sale_notification_jobs();

-- Bring existing unsent jobs onto the new schedule without duplicating sent events.
insert into public.sale_notification_jobs(sale_id,event_type,scheduled_for)
select id,'sale_started',starts_at from public.brand_sales where status <> 'cancelled'
on conflict (sale_id,event_type) do update
  set scheduled_for=excluded.scheduled_for,
      status=case when public.sale_notification_jobs.status='sent' then 'sent' else 'pending' end,
      last_error=null,claimed_at=null;

insert into public.sale_notification_jobs(sale_id,event_type,scheduled_for)
select id,'sale_midway',starts_at + ((ends_at-starts_at)/2)
from public.brand_sales where status <> 'cancelled' and ends_at-starts_at > interval '2 hours'
on conflict (sale_id,event_type) do update
  set scheduled_for=excluded.scheduled_for,
      status=case when public.sale_notification_jobs.status='sent' then 'sent' else 'pending' end,
      last_error=null,claimed_at=null;

insert into public.sale_notification_jobs(sale_id,event_type,scheduled_for)
select id,'sale_reminder',ends_at - interval '24 hours'
from public.brand_sales where status <> 'cancelled' and ends_at - interval '24 hours' > starts_at
on conflict (sale_id,event_type) do update
  set scheduled_for=excluded.scheduled_for,
      status=case when public.sale_notification_jobs.status='sent' then 'sent' else 'pending' end,
      last_error=null,claimed_at=null;

insert into public.sale_notification_jobs(sale_id,event_type,scheduled_for)
select id,'sale_ending_soon',ends_at - interval '3 hours'
from public.brand_sales where status <> 'cancelled' and ends_at - interval '3 hours' > starts_at
on conflict (sale_id,event_type) do update
  set scheduled_for=excluded.scheduled_for,
      status=case when public.sale_notification_jobs.status='sent' then 'sent' else 'pending' end,
      last_error=null,claimed_at=null;
