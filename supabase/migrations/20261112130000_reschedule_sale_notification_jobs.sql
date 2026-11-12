-- Keep queued sale notifications aligned when an existing sale is edited.
-- Sent notifications are never re-queued; pending/failed/cancelled jobs are refreshed.
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
       and status in ('pending', 'failed');
    return new;
  end if;

  insert into public.sale_notification_jobs(sale_id, event_type, scheduled_for)
  values (new.id, 'sale_started', new.starts_at)
  on conflict (sale_id, event_type) do update
    set scheduled_for = excluded.scheduled_for,
        status = case
          when public.sale_notification_jobs.status = 'sent' then 'sent'
          else 'pending'
        end,
        last_error = null,
        claimed_at = null;

  if new.ends_at - interval '24 hours' > new.starts_at then
    insert into public.sale_notification_jobs(sale_id, event_type, scheduled_for)
    values (new.id, 'sale_reminder', new.ends_at - interval '24 hours')
    on conflict (sale_id, event_type) do update
      set scheduled_for = excluded.scheduled_for,
          status = case
            when public.sale_notification_jobs.status = 'sent' then 'sent'
            else 'pending'
          end,
          last_error = null,
          claimed_at = null;
  else
    update public.sale_notification_jobs
       set status = 'cancelled'
     where sale_id = new.id
       and event_type = 'sale_reminder'
       and status in ('pending', 'failed');
  end if;

  if new.ends_at - interval '2 hours' > new.starts_at then
    insert into public.sale_notification_jobs(sale_id, event_type, scheduled_for)
    values (new.id, 'sale_ending_soon', new.ends_at - interval '2 hours')
    on conflict (sale_id, event_type) do update
      set scheduled_for = excluded.scheduled_for,
          status = case
            when public.sale_notification_jobs.status = 'sent' then 'sent'
            else 'pending'
          end,
          last_error = null,
          claimed_at = null;
  else
    update public.sale_notification_jobs
       set status = 'cancelled'
     where sale_id = new.id
       and event_type = 'sale_ending_soon'
       and status in ('pending', 'failed');
  end if;

  return new;
end;
$$;

drop trigger if exists brand_sales_schedule_notifications on public.brand_sales;
create trigger brand_sales_schedule_notifications
after insert or update of starts_at, ends_at, status on public.brand_sales
for each row execute function public.schedule_sale_notification_jobs();
