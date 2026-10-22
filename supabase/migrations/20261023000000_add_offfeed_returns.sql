-- OFFFEED return requests and commission decision audit.
-- Refunds are tracked only; this migration does not move money or mark a refund as paid.
CREATE TABLE IF NOT EXISTS public.order_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.brand_orders(id) ON DELETE RESTRICT,
  customer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  brand_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  reason text NOT NULL CHECK (reason IN ('defective_damaged','wrong_item_colour','not_as_described','size_fit','other')),
  customer_details text NOT NULL DEFAULT '' CHECK (char_length(customer_details) <= 2000),
  evidence_url text NOT NULL DEFAULT '' CHECK (char_length(evidence_url) <= 2048),
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','approved','rejected','return_shipped','received_by_brand','refund_pending','refunded','disputed','resolved')),
  brand_response text NOT NULL DEFAULT '' CHECK (char_length(brand_response) <= 2000),
  return_tracking_provider text NOT NULL DEFAULT '' CHECK (char_length(return_tracking_provider) <= 100),
  return_tracking_number text NOT NULL DEFAULT '' CHECK (char_length(return_tracking_number) <= 160),
  return_tracking_url text NOT NULL DEFAULT '' CHECK (char_length(return_tracking_url) <= 2048),
  commission_decision text CHECK (commission_decision IN ('retain_brand_fault','reverse_fit_return','pending_review')),
  commission_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (commission_amount >= 0),
  refund_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (refund_amount >= 0),
  refund_status text NOT NULL DEFAULT 'not_started' CHECK (refund_status IN ('not_started','pending','processed','failed')),
  refund_reference text NOT NULL DEFAULT '' CHECK (char_length(refund_reference) <= 200),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id)
);

CREATE INDEX IF NOT EXISTS order_returns_customer_created_idx ON public.order_returns(customer_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS order_returns_brand_created_idx ON public.order_returns(brand_user_id, created_at DESC);

ALTER TABLE public.order_returns ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.order_returns TO authenticated;
GRANT ALL ON public.order_returns TO service_role;

CREATE POLICY "Customers can view their return requests"
ON public.order_returns FOR SELECT TO authenticated
USING (customer_user_id = auth.uid());

CREATE POLICY "Brands can view return requests for their orders"
ON public.order_returns FOR SELECT TO authenticated
USING (brand_user_id = auth.uid());

-- Creation is via a security-definer RPC that checks order ownership and delivered status.
CREATE OR REPLACE FUNCTION public.request_offfeed_return(
  p_order_id uuid,
  p_reason text,
  p_details text DEFAULT '',
  p_evidence_url text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_row public.brand_orders%ROWTYPE;
  return_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to request a return.'; END IF;
  IF p_reason NOT IN ('defective_damaged','wrong_item_colour','not_as_described','size_fit','other') THEN
    RAISE EXCEPTION 'Choose a valid return reason.';
  END IF;
  IF char_length(coalesce(p_details,'')) > 2000 OR char_length(coalesce(p_evidence_url,'')) > 2048 THEN
    RAISE EXCEPTION 'Return details or evidence link is too long.';
  END IF;

  SELECT * INTO order_row FROM public.brand_orders
   WHERE id = p_order_id AND customer_user_id = auth.uid()
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found for your account.'; END IF;
  IF order_row.status <> 'delivered' THEN RAISE EXCEPTION 'A return can be requested after delivery.'; END IF;
  IF EXISTS (SELECT 1 FROM public.order_returns WHERE order_id = p_order_id) THEN
    RAISE EXCEPTION 'A return request already exists for this order.';
  END IF;

  INSERT INTO public.order_returns (
    order_id, customer_user_id, brand_user_id, reason, customer_details, evidence_url,
    commission_decision, commission_amount, refund_amount
  ) VALUES (
    order_row.id, auth.uid(), order_row.brand_user_id, p_reason, coalesce(p_details,''), coalesce(p_evidence_url,''),
    'pending_review', round(order_row.unit_price * order_row.quantity * 0.18, 2),
    round(order_row.unit_price * order_row.quantity, 2)
  ) RETURNING id INTO return_id;

  UPDATE public.brand_orders SET status = 'return_requested', updated_at = now() WHERE id = order_row.id;
  RETURN return_id;
END;
$$;

REVOKE ALL ON FUNCTION public.request_offfeed_return(uuid,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_offfeed_return(uuid,text,text,text) TO authenticated;

-- Brand decisions are performed through a constrained RPC, never direct table writes.
CREATE OR REPLACE FUNCTION public.review_offfeed_return(
  p_return_id uuid,
  p_decision text,
  p_response text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  return_row public.order_returns%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to review returns.'; END IF;
  IF p_decision NOT IN ('approved','rejected','disputed') THEN RAISE EXCEPTION 'Invalid return decision.'; END IF;
  IF char_length(coalesce(p_response,'')) > 2000 THEN RAISE EXCEPTION 'Response is too long.'; END IF;

  SELECT * INTO return_row FROM public.order_returns
   WHERE id = p_return_id AND brand_user_id = auth.uid()
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Return request not found for this brand.'; END IF;
  IF return_row.status <> 'requested' THEN RAISE EXCEPTION 'This request has already been reviewed.'; END IF;

  UPDATE public.order_returns
     SET status = p_decision, brand_response = coalesce(p_response,''),
         commission_decision = CASE
           WHEN p_decision <> 'approved' THEN 'pending_review'
           WHEN reason IN ('defective_damaged','wrong_item_colour','not_as_described') THEN 'retain_brand_fault'
           WHEN reason = 'size_fit' THEN 'reverse_fit_return'
           ELSE 'pending_review'
         END,
         refund_status = CASE WHEN p_decision = 'approved' THEN 'pending' ELSE 'not_started' END,
         updated_at = now()
   WHERE id = p_return_id;
  IF p_decision = 'rejected' THEN
    UPDATE public.brand_orders SET status = 'delivered', updated_at = now() WHERE id = return_row.order_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.review_offfeed_return(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_offfeed_return(uuid,text,text) TO authenticated;
