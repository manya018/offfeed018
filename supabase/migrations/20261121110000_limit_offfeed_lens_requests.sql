-- Server-side rate limit for paid OFFFEED Lens requests.
create table if not exists public.offfeed_lens_request_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists offfeed_lens_request_usage_created_idx
  on public.offfeed_lens_request_usage(created_at);
create index if not exists offfeed_lens_request_usage_user_created_idx
  on public.offfeed_lens_request_usage(user_id, created_at);

alter table public.offfeed_lens_request_usage enable row level security;
revoke all on public.offfeed_lens_request_usage from public, anon, authenticated;
grant all on public.offfeed_lens_request_usage to service_role;

create or replace function public.consume_offfeed_lens_request(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  user_request_count integer;
  global_request_count integer;
begin
  if p_user_id is null then return false; end if;
  perform pg_advisory_xact_lock(hashtext('offfeed_lens_global_hourly_limit'));
  perform pg_advisory_xact_lock(hashtext('offfeed_lens_user:' || p_user_id::text));
  select count(*) into user_request_count from public.offfeed_lens_request_usage
    where user_id = p_user_id and created_at > now() - interval '1 hour';
  if user_request_count >= 15 then return false; end if;
  select count(*) into global_request_count from public.offfeed_lens_request_usage
    where created_at > now() - interval '1 hour';
  if global_request_count >= 120 then return false; end if;
  insert into public.offfeed_lens_request_usage(user_id) values (p_user_id);
  delete from public.offfeed_lens_request_usage where created_at < now() - interval '2 days';
  return true;
end;
$$;
revoke all on function public.consume_offfeed_lens_request(uuid) from public, anon, authenticated;
grant execute on function public.consume_offfeed_lens_request(uuid) to service_role;
