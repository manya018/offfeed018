-- Store server-verified Shiprocket quotes against prepaid checkout sessions.
-- The rate quote is requested only by trusted server code; browser totals are never trusted.

ALTER TABLE public.offfeed_payment_sessions
  ADD COLUMN IF NOT EXISTS customer_shipping_paise bigint NOT NULL DEFAULT 0
    CHECK (customer_shipping_paise >= 0),
  ADD COLUMN IF NOT EXISTS shiprocket_quotes jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(shiprocket_quotes) = 'array');

CREATE OR REPLACE FUNCTION public.attach_offfeed_shiprocket_quotes(
  p_session_id uuid,
  p_quotes jsonb
)
RETURNS TABLE(amount_paise bigint, customer_shipping_paise bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  checkout_session public.offfeed_payment_sessions%rowtype;
  quote_total_paise bigint;
  product_subtotal_paise bigint;
  charge_to_customer bigint;
BEGIN
  IF jsonb_typeof(p_quotes) <> 'array' OR jsonb_array_length(p_quotes) NOT BETWEEN 1 AND 20 THEN
    RAISE EXCEPTION 'Shiprocket could not quote every brand parcel. Please try again.';
  END IF;

  SELECT * INTO checkout_session
    FROM public.offfeed_payment_sessions
   WHERE id = p_session_id
   FOR UPDATE;
  IF NOT FOUND OR checkout_session.status <> 'created' OR checkout_session.expires_at <= now()
     OR checkout_session.razorpay_order_id IS NOT NULL THEN
    RAISE EXCEPTION 'This checkout session is no longer available. Please start checkout again.';
  END IF;

  SELECT round(sum((item->>'unit_price')::numeric * (item->>'quantity')::integer) * 100)::bigint
    INTO product_subtotal_paise
    FROM jsonb_array_elements(checkout_session.items) AS item;
  SELECT coalesce(sum((quote->>'rate_paise')::bigint), 0)
    INTO quote_total_paise
    FROM jsonb_array_elements(p_quotes) AS quote;

  IF quote_total_paise < 0 OR EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_quotes) AS quote
     WHERE coalesce(quote->>'brand_application_id','') !~* '^[0-9a-f-]{36}$'
        OR coalesce(quote->>'rate_paise','') !~ '^[0-9]+$'
        OR coalesce(quote->>'courier_company_id','') !~ '^[0-9]+$'
        OR char_length(coalesce(quote->>'courier_name','')) NOT BETWEEN 1 AND 160
  ) THEN
    RAISE EXCEPTION 'Shiprocket returned an invalid shipping quote. Please try again.';
  END IF;

  -- OFFFEED's existing policy: customer pays actual courier rates below ₹999;
  -- at ₹999 or more the customer gets free shipping and brands bear parcel costs.
  charge_to_customer := CASE WHEN product_subtotal_paise < 99900 THEN quote_total_paise ELSE 0 END;

  UPDATE public.offfeed_payment_sessions
     SET shiprocket_quotes = p_quotes,
         customer_shipping_paise = charge_to_customer,
         amount_paise = product_subtotal_paise + charge_to_customer
   WHERE id = p_session_id;

  amount_paise := product_subtotal_paise + charge_to_customer;
  customer_shipping_paise := charge_to_customer;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.attach_offfeed_shiprocket_quotes(uuid,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.attach_offfeed_shiprocket_quotes(uuid,jsonb) TO service_role;
