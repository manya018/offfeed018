-- Manual availability control for brand-listed products.
ALTER TABLE public.brand_products
  ADD COLUMN IF NOT EXISTS in_stock boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.brand_products.in_stock IS
  'Whether the brand currently has this product available to order.';

CREATE OR REPLACE FUNCTION public.create_offfeed_cod_orders(
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_delivery_address jsonb,
  p_destination_pin_code text,
  p_items jsonb
)
RETURNS TABLE(order_id uuid, order_number text, brand_name text, product_name text, quantity integer, line_total numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item jsonb;
  product_row record;
  new_order_id uuid;
  new_order_number text;
  item_quantity integer;
  requested_size text;
  requested_color text;
BEGIN
  IF char_length(trim(coalesce(p_customer_name, ''))) NOT BETWEEN 2 AND 160 THEN
    RAISE EXCEPTION 'Enter your full name.';
  END IF;
  IF char_length(trim(coalesce(p_customer_email, ''))) NOT BETWEEN 3 AND 254
     OR p_customer_email !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$' THEN
    RAISE EXCEPTION 'Enter a valid email address.';
  END IF;
  IF char_length(coalesce(p_customer_phone, '')) NOT BETWEEN 7 AND 30 THEN
    RAISE EXCEPTION 'Enter a valid phone number.';
  END IF;
  IF coalesce(p_destination_pin_code, '') !~ '^[1-9][0-9]{5}$' THEN
    RAISE EXCEPTION 'Enter a valid 6-digit Indian PIN code.';
  END IF;
  IF jsonb_typeof(p_delivery_address) <> 'object'
     OR char_length(trim(coalesce(p_delivery_address->>'line1', ''))) < 4
     OR char_length(trim(coalesce(p_delivery_address->>'city', ''))) < 2
     OR char_length(trim(coalesce(p_delivery_address->>'state', ''))) < 2 THEN
    RAISE EXCEPTION 'Enter your complete delivery address.';
  END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 20 THEN
    RAISE EXCEPTION 'Your bag must contain between 1 and 20 items.';
  END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    item_quantity := (item->>'quantity')::integer;
    requested_size := left(coalesce(item->>'size', ''), 40);
    requested_color := left(coalesce(item->>'color', ''), 60);

    IF item_quantity NOT BETWEEN 1 AND 10 THEN
      RAISE EXCEPTION 'Quantity must be between 1 and 10.';
    END IF;

    SELECT p.id AS product_id, p.product_name, p.price, p.sizes, p.colors,
           a.id AS brand_application_id, a.user_id AS brand_user_id, a.brand_name
      INTO product_row
      FROM public.brand_products p
      JOIN public.brand_applications a ON a.id = p.brand_application_id
     WHERE p.id = (item->>'productId')::uuid
       AND p.status = 'published'
       AND p.in_stock = true
       AND p.brand_approved = true
       AND a.status = 'approved'
     LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'One of the products in your bag is no longer available. Please refresh your bag.';
    END IF;
    IF requested_size <> '' AND NOT (requested_size = ANY(product_row.sizes)) THEN
      RAISE EXCEPTION 'A selected size is no longer available. Please review your bag.';
    END IF;
    IF requested_color <> '' AND NOT (requested_color = ANY(product_row.colors)) THEN
      RAISE EXCEPTION 'A selected colour is no longer available. Please review your bag.';
    END IF;

    new_order_number := 'OFF-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
    INSERT INTO public.brand_orders (
      order_number, brand_application_id, brand_user_id,
      customer_user_id, customer_name, customer_email, customer_phone,
      delivery_address, destination_pin_code, product_id, product_name,
      selected_size, selected_color, quantity, unit_price, currency, status
    ) VALUES (
      new_order_number, product_row.brand_application_id, product_row.brand_user_id,
      auth.uid(), trim(p_customer_name), lower(trim(p_customer_email)), trim(p_customer_phone),
      p_delivery_address, p_destination_pin_code, product_row.product_id, product_row.product_name,
      requested_size, requested_color, item_quantity, product_row.price, 'INR', 'pending'
    ) RETURNING id INTO new_order_id;

    order_id := new_order_id;
    order_number := new_order_number;
    brand_name := product_row.brand_name;
    product_name := product_row.product_name;
    quantity := item_quantity;
    line_total := product_row.price * item_quantity;
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.create_offfeed_cod_orders(text, text, text, jsonb, text, jsonb) FROM PUBLIC, anon, authenticated;

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
       and p.in_stock = true
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

REVOKE ALL ON FUNCTION public.prepare_offfeed_razorpay_session(text, text, text, jsonb, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_offfeed_razorpay_session(text, text, text, jsonb, text, jsonb) TO service_role;
