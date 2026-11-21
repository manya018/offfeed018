-- OFFFEED security hardening: notification ownership and brand return decisions.
-- Service-side notification functions use the service role and explicitly scope every
-- customer query by the authenticated context.userId. Direct client table access stays revoked.

alter table public.customer_notification_preferences enable row level security;
alter table public.customer_notification_preferences force row level security;
alter table public.customer_push_subscriptions enable row level security;
alter table public.customer_push_subscriptions force row level security;
alter table public.customer_notifications enable row level security;
alter table public.customer_notifications force row level security;
alter table public.sale_notification_jobs enable row level security;
alter table public.sale_notification_jobs force row level security;

drop policy if exists "Customers manage own notification preferences" on public.customer_notification_preferences;
create policy "Customers manage own notification preferences"
on public.customer_notification_preferences
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "Customers manage own push subscriptions" on public.customer_push_subscriptions;
create policy "Customers manage own push subscriptions"
on public.customer_push_subscriptions
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "Customers read own notifications" on public.customer_notifications;
create policy "Customers read own notifications"
on public.customer_notifications
for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Customers update own notifications" on public.customer_notifications;
create policy "Customers update own notifications"
on public.customer_notifications
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- No direct table writes or reads from browser sessions. The authenticated server
-- handlers use the service role only after requiring Supabase auth and scope by user_id.
revoke all on public.customer_notification_preferences, public.customer_push_subscriptions,
  public.customer_notifications, public.sale_notification_jobs from anon, authenticated;
grant all on public.customer_notification_preferences, public.customer_push_subscriptions,
  public.customer_notifications, public.sale_notification_jobs to service_role;

-- Brands may approve a return or refer it to OFFFEED for review. A brand's "reject"
-- action is retained for UI compatibility but is recorded as disputed, never rejected.
create or replace function public.review_offfeed_return(
  p_return_id uuid,
  p_decision text,
  p_response text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  return_row public.order_returns%rowtype;
  final_decision text;
begin
  if auth.uid() is null then
    raise exception 'Sign in to review returns.';
  end if;
  if p_decision not in ('approved','rejected','disputed') then
    raise exception 'Invalid return decision.';
  end if;
  if char_length(coalesce(p_response,'')) > 2000 then
    raise exception 'Response is too long.';
  end if;

  select * into return_row
  from public.order_returns
  where id = p_return_id and brand_user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Return request not found for this brand.';
  end if;
  if return_row.status <> 'requested' then
    raise exception 'This request has already been reviewed.';
  end if;

  final_decision := case when p_decision = 'rejected' then 'disputed' else p_decision end;

  update public.order_returns
  set status = final_decision,
      brand_response = coalesce(p_response,''),
      commission_decision = case
        when final_decision <> 'approved' then 'pending_review'
        when reason in ('defective_damaged','wrong_item_colour','not_as_described') then 'retain_brand_fault'
        when reason = 'size_fit' then 'reverse_fit_return'
        else 'pending_review'
      end,
      refund_status = case when final_decision = 'approved' then 'pending' else 'not_started' end,
      updated_at = now()
  where id = p_return_id;

  -- Do not restore the order to delivered for a brand rejection. The disputed
  -- request remains visible to OFFFEED admin for an independent decision.
end;
$$;

revoke all on function public.review_offfeed_return(uuid,text,text) from public;
grant execute on function public.review_offfeed_return(uuid,text,text) to authenticated;
