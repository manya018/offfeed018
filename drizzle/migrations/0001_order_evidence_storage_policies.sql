CREATE POLICY "Order parties can upload their own evidence files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'order-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Order parties can view evidence files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'order-evidence'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.dispatch_evidence de
        JOIN public.brand_orders bo ON bo.id = de.order_id
        WHERE bo.brand_user_id = auth.uid() OR bo.customer_user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.return_evidence re
        JOIN public.brand_orders bo ON bo.id = re.order_id
        WHERE bo.brand_user_id = auth.uid() OR bo.customer_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Owners can remove their own evidence files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'order-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );