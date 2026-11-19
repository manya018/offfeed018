-- Test-mode Razorpay checkout for prepaid orders.
-- Orders are created only after the server verifies a captured payment.
-- All payment-session writes are restricted to trusted server-side code.

alter table public.brand_orders
  add column if not exists payment_provider text not null default 'cash_on_delivery'
    check (payment_provider in ('cash_on_delivery', 'razorpay')),
  add column if not exists payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'paid', 'refunded')),
  add column if not exists payment_order_id text,
  add column if not exists payment_id text;

create unique index if not exists brand_orders_payment_id_unique
  on public.brand_orders(payment_id)
  where payment_id is not null;

create table if not exists public.offfeed_payment_sessions (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'created'
    check (status in ('created', 'paid', 'expired', 'failed')),
  amount_paise bigint not null check (amount_paise > 0),
  currency text not null default 'INR' check (currency = 'INR'),
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  delivery_address jsonb not null,
  destination_pin_code text not null check (destination_pin_code ~ '^[1-9][0-9]{5}$'),
  items jsonb not null check (jsonb_typeof(items) = 'array'),
  razorpay_order_id text unique,
  razorpay_payment_id text unique,
  order_ids uuid[] not null default '{}',
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

alter table public.offfeed_payment_sessions enable row level security;
revoke all on public.offfeed_payment_sessions from anon, authenticated;
grant all on public.offfeed_payment_sessions to service_role;

create or replace function public.prepare_offfeed_razorpay_session(
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_delivery_address jsonb,
  p_destination_pin_code text,
  p_items jsonb
)
returns table(session_id uuid, amount_paise bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  product_row record;
  session_items jsonb := '[]'::jsonb;
  new_session_id uuid := gen_random_uuid();
  item_quantity integer;
  requested_size text;
  requested_color text;
  final_unit_price numeric(12,2);
  amount_total numeric(12,2) := 0;
begin
  if char_length(trim(coalesce(p_customer_name,''))) not between 2 and 160 then raise exception 'Enter your full name.'; end if;
  if char_length(trim(coalesce(p_customer_email,''))) not between 3 and 254 or p_customer_email !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$' then raise exception 'Enter a valid email address.'; end if;
  if char_length(coalesce(p_customer_phone,'')) not between 7 and 30 then raise exception 'Enter a valid phone number.'; end if;
  if coalesce(p_destination_pin_code,'') !~ '^[1-9][0-9]{5}$' then raise exception 'Enter a valid 6-digit Indian PIN code.'; end if;
  if jsonb_typeof(p_delivery_address)<>'object' or char_length(trim(coalesce(p_delivery_address->>'line1','')))<4
     or char_length(trim(coalesce(p_delivery_address->>'city','')))<2 or char_length(trim(coalesce(p_delivery_address->>'state','')))<2 then
    raise exception 'Enter your complete delivery address.';
  end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 20 then raise exception 'Your bag must contain between 1 and 20 items.'; end if;

  for item in select value from jsonb_array_elements(p_items) loop
    item_quantity := (item->>'quantity')::integer;
    requested_size := left(coalesce(item->>'size',''),40);
    requested_color := left(coalesce(item->>'color',''),60);
    if item_quantity not between 1 and 10 then raise exception 'Quantity must be between 1 and 10.'; end if;

    select p.id as product_id,p.product_name,p.price,p.sizes,p.colors,
           a.id as brand_application_id,a.user_id as brand_user_id,a.brand_name
      into product_row
      from public.brand_products p
      join public.brand_applications a on a.id=p.brand_application_id
     where p.id=(item->>'productId')::uuid and p.status='published'
       and p.brand_approved=true and a.status='approved'
     limit 1;
    if not found then raise exception 'One of the products in your bag is no longer available. Please refresh your bag.'; end if;
    if requested_size<>'' and not(requested_size=any(product_row.sizes)) then raise exception 'A selected size is no longer available. Please review your bag.'; end if;
    if requested_color<>'' and not(requested_color=any(product_row.colors)) then raise exception 'A selected colour is no longer available. Please review your bag.'; end if;

    select case s.discount_type
             when 'percentage' then round(product_row.price*(1-s.discount_value/100),2)
             when 'fixed' then round(product_row.price-s.discount_value,2)
           end
      into final_unit_price
      from public.brand_sale_products sp
      join public.brand_sales s on s.id=sp.sale_id
     where sp.product_id=product_row.product_id and s.status<>'cancelled'
       and s.starts_at<=now() and s.ends_at>now()
     order by s.created_at desc
     limit 1;
    final_unit_price := greatest(0,coalesce(final_unit_price,product_row.price));
    if final_unit_price<=0 then raise exception 'This promotion creates an invalid product price. Please contact OFFFEED.'; end if;

    amount_total := amount_total + final_unit_price * item_quantity;
    session_items := session_items || jsonb_build_array(jsonb_build_object(
      'product_id', product_row.product_id,
      'product_name', product_row.product_name,
      'brand_application_id', product_row.brand_application_id,
      'brand_user_id', product_row.brand_user_id,
      'brand_name', product_row.brand_name,
      'quantity', item_quantity,
      'unit_price', final_unit_price,
      'selected_size', requested_size,
      'selected_color', requested_color
    ));
  end loop;

  if amount_total <= 0 then raise exception 'The order amount must be greater than zero.'; end if;
  insert into public.offfeed_payment_sessions(
    id, amount_paise, customer_name, customer_email, customer_phone,
    delivery_address, destination_pin_code, items
  ) values (
    new_session_id, round(amount_total * 100)::bigint, trim(p_customer_name),
    lower(trim(p_customer_email)), trim(p_customer_phone), p_delivery_address,
    p_destination_pin_code, session_items
  );

  session_id := new_session_id;
  amount_paise := round(amount_total * 100)::bigint;
  return next;
end;
$$;

create or replace function public.attach_offfeed_razorpay_order(
  p_session_id uuid,
  p_razorpay_order_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.offfeed_payment_sessions
     set razorpay_order_id = p_razorpay_order_id
   where id = p_session_id
     and status = 'created'
     and expires_at > now()
     and (razorpay_order_id is null or razorpay_order_id = p_razorpay_order_id);
  if not found then raise exception 'This checkout session is no longer available.'; end if;
end;
$$;

create or replace function public.complete_offfeed_razorpay_session(
  p_session_id uuid,
  p_razorpay_order_id text,
  p_razorpay_payment_id text
)
returns table(order_id uuid, order_number text, brand_name text, product_name text, quantity integer, line_total numeric, newly_created boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  payment_session public.offfeed_payment_sessions%rowtype;
  item jsonb;
  new_order_id uuid;
  new_order_number text;
  was_created boolean := false;
begin
  select * into payment_session
    from public.offfeed_payment_sessions
   where id = p_session_id
   for update;
  if not found then raise exception 'Payment session not found.'; end if;
  if payment_session.razorpay_order_id is distinct from p_razorpay_order_id then raise exception 'Payment order does not match this checkout.'; end if;

  if payment_session.status = 'paid' then
    if payment_session.razorpay_payment_id is distinct from p_razorpay_payment_id then raise exception 'A different payment was already recorded for this checkout.'; end if;
    for order_id, order_number, brand_name, product_name, quantity, line_total in
      select bo.id, bo.order_number, a.brand_name, bo.product_name, bo.quantity, bo.unit_price * bo.quantity
        from public.brand_orders bo
        join public.brand_applications a on a.id=bo.brand_application_id
       where bo.id = any(payment_session.order_ids)
       order by bo.created_at
    loop
      newly_created := false;
      return next;
    end loop;
    return;
  end if;

  if payment_session.status <> 'created' or payment_session.expires_at <= now() then raise exception 'Checkout has expired. Please start again.'; end if;

  for item in select value from jsonb_array_elements(payment_session.items) loop
    new_order_number := 'OFF-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
    insert into public.brand_orders(
      order_number, brand_application_id, brand_user_id, customer_user_id,
      customer_name, customer_email, customer_phone, delivery_address, destination_pin_code,
      product_id, product_name, selected_size, selected_color, quantity, unit_price, currency, status,
      payment_provider, payment_status, payment_order_id, payment_id
    ) values (
      new_order_number, (item->>'brand_application_id')::uuid, (item->>'brand_user_id')::uuid, null,
      payment_session.customer_name, payment_session.customer_email, payment_session.customer_phone,
      payment_session.delivery_address, payment_session.destination_pin_code,
      (item->>'product_id')::uuid, item->>'product_name', item->>'selected_size', item->>'selected_color',
      (item->>'quantity')::integer, (item->>'unit_price')::numeric, 'INR', 'pending',
      'razorpay', 'paid', p_razorpay_order_id, p_razorpay_payment_id
    ) returning id into new_order_id;

    payment_session.order_ids := array_append(payment_session.order_ids, new_order_id);
  end loop;

  update public.offfeed_payment_sessions
     set status='paid', razorpay_payment_id=p_razorpay_payment_id,
         order_ids=payment_session.order_ids, paid_at=now()
   where id=p_session_id;

  for order_id, order_number, brand_name, product_name, quantity, line_total in
    select bo.id, bo.order_number, a.brand_name, bo.product_name, bo.quantity, bo.unit_price * bo.quantity
      from public.brand_orders bo
      join public.brand_applications a on a.id=bo.brand_application_id
     where bo.id = any(payment_session.order_ids)
     order by bo.created_at
  loop
    newly_created := true;
    return next;
  end loop;
end;
$$;

revoke all on function public.prepare_offfeed_razorpay_session(text,text,text,jsonb,text,jsonb) from public, anon, authenticated;
revoke all on function public.attach_offfeed_razorpay_order(uuid,text) from public, anon, authenticated;
revoke all on function public.complete_offfeed_razorpay_session(uuid,text,text) from public, anon, authenticated;
grant execute on function public.prepare_offfeed_razorpay_session(text,text,text,jsonb,text,jsonb) to service_role;
grant execute on function public.attach_offfeed_razorpay_order(uuid,text) to service_role;
grant execute on function public.complete_offfeed_razorpay_session(uuid,text,text) to service_role;

-- Disable the legacy public COD order endpoint. Historical COD orders remain readable.
revoke all on function public.create_offfeed_cod_orders(text,text,text,jsonb,text,jsonb) from public, anon, authenticated;
