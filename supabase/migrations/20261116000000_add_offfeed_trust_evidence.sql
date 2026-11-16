-- OFFFEED Trust: reconcile evidence schema and access controls into the normal
-- Supabase/Lovable migration stream. Safe to re-run: objects/policies are guarded
-- or replaced; existing evidence rows are never deleted or rewritten.
--
-- Apply only after reviewing the live managed schema. This migration intentionally
-- fails rather than deleting duplicate evidence rows when enforcing one proof set
-- per order/return.

ALTER TABLE public.brand_shipping_profiles
  ADD COLUMN IF NOT EXISTS pickup_contact_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pickup_phone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pickup_address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS return_address text,
  ADD COLUMN IF NOT EXISTS gstin text,
  ADD COLUMN IF NOT EXISTS parcel_weight_grams integer NOT NULL DEFAULT 500,
  ADD COLUMN IF NOT EXISTS parcel_length_cm numeric NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS parcel_width_cm numeric NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS parcel_height_cm numeric NOT NULL DEFAULT 5;

CREATE TABLE IF NOT EXISTS public.dispatch_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.brand_orders(id) ON DELETE CASCADE,
  brand_user_id uuid NOT NULL,
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  video_path text NOT NULL DEFAULT '',
  packing_note text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'verified', 'flagged')),
  ai_report jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.return_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id uuid NOT NULL REFERENCES public.order_returns(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.brand_orders(id) ON DELETE CASCADE,
  customer_user_id uuid NOT NULL,
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'verified', 'flagged')),
  ai_report jsonb,
  trust_score numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dispatch_evidence_order_idx
  ON public.dispatch_evidence(order_id);
CREATE INDEX IF NOT EXISTS return_evidence_return_idx
  ON public.return_evidence(return_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.dispatch_evidence GROUP BY order_id HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'OFFFEED Trust: duplicate dispatch_evidence rows exist; reconcile them before applying the one-per-order constraint.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.return_evidence GROUP BY return_id HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'OFFFEED Trust: duplicate return_evidence rows exist; reconcile them before applying the one-per-return constraint.';
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS dispatch_evidence_one_per_order_idx
  ON public.dispatch_evidence(order_id);
CREATE UNIQUE INDEX IF NOT EXISTS return_evidence_one_per_return_idx
  ON public.return_evidence(return_id);

ALTER TABLE public.dispatch_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_evidence ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.dispatch_evidence FROM PUBLIC, anon;
REVOKE ALL ON public.return_evidence FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE ON public.dispatch_evidence FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.return_evidence FROM authenticated;
GRANT SELECT ON public.dispatch_evidence TO authenticated;
GRANT SELECT ON public.return_evidence TO authenticated;
GRANT INSERT (order_id, brand_user_id, photos, video_path, packing_note)
  ON public.dispatch_evidence TO authenticated;
GRANT ALL ON public.dispatch_evidence TO service_role;
GRANT ALL ON public.return_evidence TO service_role;

DROP POLICY IF EXISTS "Brands manage dispatch evidence for their orders" ON public.dispatch_evidence;
DROP POLICY IF EXISTS "Customers can view dispatch evidence for their orders" ON public.dispatch_evidence;
DROP POLICY IF EXISTS "Order parties can view dispatch evidence" ON public.dispatch_evidence;
DROP POLICY IF EXISTS "Approved brands can submit dispatch evidence once" ON public.dispatch_evidence;
CREATE POLICY "Order parties can view dispatch evidence"
  ON public.dispatch_evidence FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.brand_orders bo
    WHERE bo.id = dispatch_evidence.order_id
      AND (bo.brand_user_id = auth.uid() OR bo.customer_user_id = auth.uid())
  ));
CREATE POLICY "Approved brands can submit dispatch evidence once"
  ON public.dispatch_evidence FOR INSERT TO authenticated
  WITH CHECK (
    brand_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.brand_orders bo
      JOIN public.brand_applications a ON a.id = bo.brand_application_id
      WHERE bo.id = dispatch_evidence.order_id
        AND bo.brand_user_id = auth.uid()
        AND a.user_id = auth.uid()
        AND a.status = 'approved'
    )
  );

DROP POLICY IF EXISTS "Customers manage return evidence for their own returns" ON public.return_evidence;
DROP POLICY IF EXISTS "Brands can view return evidence for their orders" ON public.return_evidence;
DROP POLICY IF EXISTS "Order parties can view return evidence" ON public.return_evidence;
CREATE POLICY "Order parties can view return evidence"
  ON public.return_evidence FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.order_returns r
    JOIN public.brand_orders bo
      ON bo.id = r.order_id AND bo.id = return_evidence.order_id
    WHERE r.id = return_evidence.return_id
      AND (bo.brand_user_id = auth.uid() OR bo.customer_user_id = auth.uid())
  ));

-- The evidence bucket must remain private. Do not overwrite an existing bucket's
-- limits or MIME settings; create it only when it does not exist.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'order-evidence',
  'order-evidence',
  false,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Order parties can upload their own evidence files" ON storage.objects;
DROP POLICY IF EXISTS "Order parties can view evidence files" ON storage.objects;
DROP POLICY IF EXISTS "Owners can remove their own evidence files" ON storage.objects;
DROP POLICY IF EXISTS "Order parties can view exact evidence files" ON storage.objects;
DROP POLICY IF EXISTS "OFFFEED evidence owners can upload" ON storage.objects;
DROP POLICY IF EXISTS "OFFFEED order parties can view exact evidence" ON storage.objects;
CREATE POLICY "OFFFEED evidence owners can upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'order-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "OFFFEED order parties can view exact evidence"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'order-evidence'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1
        FROM public.dispatch_evidence de
        JOIN public.brand_orders bo ON bo.id = de.order_id
        WHERE (bo.brand_user_id = auth.uid() OR bo.customer_user_id = auth.uid())
          AND (
            de.video_path = storage.objects.name
            OR EXISTS (
              SELECT 1
              FROM jsonb_array_elements(
                CASE WHEN jsonb_typeof(de.photos) = 'array' THEN de.photos ELSE '[]'::jsonb END
              ) AS item(photo)
              WHERE item.photo->>'path' = storage.objects.name
            )
          )
      )
      OR EXISTS (
        SELECT 1
        FROM public.return_evidence re
        JOIN public.order_returns r ON r.id = re.return_id AND r.order_id = re.order_id
        JOIN public.brand_orders bo ON bo.id = re.order_id
        WHERE (bo.brand_user_id = auth.uid() OR bo.customer_user_id = auth.uid())
          AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements(
              CASE WHEN jsonb_typeof(re.photos) = 'array' THEN re.photos ELSE '[]'::jsonb END
            ) AS item(photo)
            WHERE item.photo->>'path' = storage.objects.name
          )
      )
    )
  );

CREATE OR REPLACE FUNCTION public.request_offfeed_return_with_evidence(
  p_order_id uuid,
  p_reason text,
  p_details text DEFAULT '',
  p_evidence_url text DEFAULT '',
  p_photo_paths jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  order_row public.brand_orders%ROWTYPE;
  new_return_id uuid;
  photo_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in to request a return.';
  END IF;
  IF p_reason NOT IN ('defective_damaged', 'wrong_item_colour', 'not_as_described', 'size_fit', 'other') THEN
    RAISE EXCEPTION 'Choose a valid return reason.';
  END IF;
  IF char_length(coalesce(p_details, '')) > 2000
     OR char_length(coalesce(p_evidence_url, '')) > 2048 THEN
    RAISE EXCEPTION 'Return details or evidence link is too long.';
  END IF;
  IF jsonb_typeof(p_photo_paths) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Add at least two return photos.';
  END IF;
  photo_count := jsonb_array_length(p_photo_paths);
  IF photo_count NOT BETWEEN 2 AND 6 THEN
    RAISE EXCEPTION 'Add between two and six return photos.';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(p_photo_paths) AS submitted(path)
    WHERE submitted.path !~ ('^' || auth.uid()::text || '/[^/]+\.(jpg|jpeg|png|webp)$')
       OR submitted.path LIKE '%..%'
       OR NOT EXISTS (
         SELECT 1
         FROM storage.objects obj
         WHERE obj.bucket_id = 'order-evidence'
           AND obj.name = submitted.path
           AND obj.owner = auth.uid()::text
       )
  ) THEN
    RAISE EXCEPTION 'A return photo is missing or does not belong to your account.';
  END IF;

  SELECT * INTO order_row
  FROM public.brand_orders
  WHERE id = p_order_id AND customer_user_id = auth.uid()
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found for your account.';
  END IF;
  IF order_row.status <> 'delivered' THEN
    RAISE EXCEPTION 'A return can be requested after delivery.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.order_returns WHERE order_id = p_order_id) THEN
    RAISE EXCEPTION 'A return request already exists for this order.';
  END IF;

  INSERT INTO public.order_returns (
    order_id, customer_user_id, brand_user_id, reason, customer_details, evidence_url,
    commission_decision, commission_amount, refund_amount
  ) VALUES (
    order_row.id, auth.uid(), order_row.brand_user_id, p_reason,
    coalesce(p_details, ''), coalesce(p_evidence_url, ''),
    'pending_review',
    round(order_row.unit_price * order_row.quantity * 0.18, 2),
    round(order_row.unit_price * order_row.quantity, 2)
  ) RETURNING id INTO new_return_id;

  INSERT INTO public.return_evidence (
    return_id, order_id, customer_user_id, photos, notes
  )
  SELECT
    new_return_id, order_row.id, auth.uid(),
    jsonb_agg(jsonb_build_object('path', submitted.path, 'kind', 'return_proof')),
    coalesce(p_details, '')
  FROM jsonb_array_elements_text(p_photo_paths) AS submitted(path);

  UPDATE public.brand_orders
  SET status = 'return_requested', updated_at = now()
  WHERE id = order_row.id;

  RETURN new_return_id;
END;
$$;

REVOKE ALL ON FUNCTION public.request_offfeed_return_with_evidence(uuid, text, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_offfeed_return_with_evidence(uuid, text, text, text, jsonb) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.request_offfeed_return(uuid, text, text, text) FROM authenticated;

COMMENT ON TABLE public.dispatch_evidence IS
  'OFFFEED Trust: immutable brand packing evidence recorded before dispatch.';
COMMENT ON TABLE public.return_evidence IS
  'OFFFEED Trust: customer return proof and advisory forensic analysis.';
