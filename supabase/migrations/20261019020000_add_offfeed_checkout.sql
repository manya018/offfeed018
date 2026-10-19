ALTER TABLE public.brand_orders
  ADD COLUMN IF NOT EXISTS selected_size text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS selected_color text NOT NULL DEFAULT '';

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

REVOKE ALL ON FUNCTION public.create_offfeed_cod_orders(text, text, text, jsonb, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_offfeed_cod_orders(text, text, text, jsonb, text, jsonb) TO anon, authenticated;
