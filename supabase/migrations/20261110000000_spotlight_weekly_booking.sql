-- Weekly Spotlight booking calendar and capacity enforcement.
alter table public.spotlight_campaigns
  add column if not exists scheduled_week date;

create index if not exists spotlight_campaigns_week_capacity_idx
  on public.spotlight_campaigns (audience, scheduled_week, duration_days, status);

create or replace function public.create_spotlight_booking(
  p_audience text,
  p_duration_days integer,
  p_start_week date,
  p_user_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_brand public.brand_applications%rowtype;
  v_campaign_id uuid;
  v_week date;
  v_slots integer;
begin
  if p_audience not in ('her','him','home') then
    raise exception 'Choose a valid OFFFEED audience.';
  end if;
  if p_duration_days not in (7,14,28) then
    raise exception 'Choose a 1, 2 or 4 week package.';
  end if;
  if extract(isodow from p_start_week) <> 1 then
    raise exception 'Spotlight campaigns must start on a Monday.';
  end if;
  if p_start_week < (date_trunc('week', current_date)::date + 7) then
    raise exception 'Choose a Monday at least one week in advance.';
  end if;

  select * into v_brand
  from public.brand_applications
  where user_id = p_user_id and status = 'approved'
  limit 1;
  if v_brand.id is null then
    raise exception 'An approved OFFFEED brand workspace is required.';
  end if;
  if not (v_brand.audience @> array[p_audience]::text[]) then
    raise exception 'This audience is not enabled for your brand.';
  end if;

  -- One campaign per brand at a time; overlapping paid periods are not allowed.
  if exists (
    select 1 from public.spotlight_campaigns c
    where c.brand_application_id = v_brand.id
      and c.status not in ('rejected','cancelled')
      and c.scheduled_week is not null
      and daterange(c.scheduled_week, c.scheduled_week + (c.duration_days / 7) * 7, '[)')
          && daterange(p_start_week, p_start_week + (p_duration_days / 7) * 7, '[)')
  ) then
    raise exception 'Your brand already has a Spotlight booking during those weeks.';
  end if;

  -- Lock capacity per audience/week to prevent concurrent bookings exceeding ten.
  for v_week in
    select generate_series(p_start_week, p_start_week + ((p_duration_days / 7) - 1) * 7, interval '7 days')::date
  loop
    perform pg_advisory_xact_lock(hashtext(p_audience || ':' || v_week::text));
    select count(distinct c.brand_application_id) into v_slots
    from public.spotlight_campaigns c
    where c.audience = p_audience
      and c.status not in ('rejected','cancelled')
      and c.scheduled_week is not null
      and c.scheduled_week <= v_week
      and c.scheduled_week + (c.duration_days / 7) * 7 > v_week;
    if v_slots >= 10 then
      raise exception 'The % audience is fully booked for the week beginning %. Choose another available week.', upper(p_audience), v_week;
    end if;
  end loop;

  insert into public.spotlight_campaigns (
    brand_application_id, user_id, audience, duration_days, status,
    payment_status, campaign_price, scheduled_week,
    starts_at, ends_at, admin_note
  ) values (
    v_brand.id, p_user_id, p_audience, p_duration_days, 'submitted',
    'pending',
    case p_duration_days when 7 then 1499 when 14 then 2499 else 3999 end,
    p_start_week,
    p_start_week::timestamptz,
    (p_start_week + (p_duration_days / 7) * 7)::timestamptz,
    'Weekly slot reserved; payment provider integration pending.'
  ) returning id into v_campaign_id;

  return v_campaign_id;
end;
$$;

revoke all on function public.create_spotlight_booking(text, integer, date, uuid) from public;
grant execute on function public.create_spotlight_booking(text, integer, date) to service_role;

comment on column public.spotlight_campaigns.scheduled_week is 'Monday edition start date reserved by this Spotlight booking.';
