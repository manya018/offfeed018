DROP POLICY IF EXISTS "Order parties can view evidence files" ON storage.objects;
CREATE POLICY "Order parties can view exact evidence files"
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
              FROM jsonb_array_elements(CASE WHEN jsonb_typeof(de.photos) = 'array' THEN de.photos ELSE '[]'::jsonb END) AS item(photo)
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
            FROM jsonb_array_elements(CASE WHEN jsonb_typeof(re.photos) = 'array' THEN re.photos ELSE '[]'::jsonb END) AS item(photo)
            WHERE item.photo->>'path' = storage.objects.name
          )
      )
    )
  );
DROP POLICY IF EXISTS "Owners can remove their own evidence files" ON storage.objects;
DROP POLICY IF EXISTS "Brands manage dispatch evidence for their orders" ON public.dispatch_evidence;
DROP POLICY IF EXISTS "Customers can view dispatch evidence for their orders" ON public.dispatch_evidence;
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
      SELECT 1 FROM public.brand_orders bo
      JOIN public.brand_applications a ON a.id = bo.brand_application_id
      WHERE bo.id = dispatch_evidence.order_id
        AND bo.brand_user_id = auth.uid()
        AND a.user_id = auth.uid()
        AND a.status = 'approved'
    )
  );
DROP POLICY IF EXISTS "Customers manage return evidence for their own returns" ON public.return_evidence;
DROP POLICY IF EXISTS "Brands can view return evidence for their orders" ON public.return_evidence;
CREATE POLICY "Order parties can view return evidence"
  ON public.return_evidence FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.order_returns r
    JOIN public.brand_orders bo ON bo.id = r.order_id AND bo.id = return_evidence.order_id
    WHERE r.id = return_evidence.return_id
      AND (bo.brand_user_id = auth.uid() OR bo.customer_user_id = auth.uid())
  ));
REVOKE INSERT, UPDATE, DELETE ON public.dispatch_evidence FROM authenticated;
GRANT INSERT (order_id, brand_user_id, photos, video_path, packing_note) ON public.dispatch_evidence TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.return_evidence FROM authenticated;
GRANT SELECT ON public.dispatch_evidence TO authenticated;
GRANT SELECT ON public.return_evidence TO authenticated;
GRANT ALL ON public.dispatch_evidence TO service_role;
GRANT ALL ON public.return_evidence TO service_role;
CREATE UNIQUE INDEX IF NOT EXISTS dispatch_evidence_one_per_order_idx ON public.dispatch_evidence(order_id);
CREATE UNIQUE INDEX IF NOT EXISTS return_evidence_one_per_return_idx ON public.return_evidence(return_id);
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
  return_id uuid;
  photo_count integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to request a return.'; END IF;
  IF p_reason NOT IN ('defective_damaged','wrong_item_colour','not_as_described','size_fit','other') THEN
    RAISE EXCEPTION 'Choose a valid return reason.';
  END IF;
  IF char_length(coalesce(p_details,'')) > 2000 OR char_length(coalesce(p_evidence_url,'')) > 2048 THEN
    RAISE EXCEPTION 'Return details or evidence link is too long.';
  END IF;
  IF jsonb_typeof(p_photo_paths) <> 'array' THEN RAISE EXCEPTION 'Add at least two return photos.'; END IF;
  photo_count := jsonb_array_length(p_photo_paths);
  IF photo_count NOT BETWEEN 2 AND 6 THEN RAISE EXCEPTION 'Add between two and six return photos.'; END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements_text(p_photo_paths) AS submitted(path)
    WHERE submitted.path !~ ('^' || auth.uid()::text || '/[^/]+\\.(jpg|jpeg|png|webp)$')
       OR submitted.path LIKE '%..%'
       OR NOT EXISTS (
         SELECT 1 FROM storage.objects obj
         WHERE obj.bucket_id = 'order-evidence' AND obj.name = submitted.path AND obj.owner = auth.uid()
       )
  ) THEN RAISE EXCEPTION 'A return photo is missing or does not belong to your account.'; END IF;

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

  INSERT INTO public.return_evidence (return_id, order_id, customer_user_id, photos, notes)
  SELECT return_id, order_row.id, auth.uid(),
    jsonb_agg(jsonb_build_object('path', submitted.path, 'kind', 'return_proof')),
    coalesce(p_details, '')
  FROM jsonb_array_elements_text(p_photo_paths) AS submitted(path);

  UPDATE public.brand_orders SET status = 'return_requested', updated_at = now() WHERE id = order_row.id;
  RETURN return_id;
END;
$$;
REVOKE ALL ON FUNCTION public.request_offfeed_return_with_evidence(uuid,text,text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_offfeed_return_with_evidence(uuid,text,text,text,jsonb) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.request_offfeed_return(uuid,text,text,text) FROM authenticated;