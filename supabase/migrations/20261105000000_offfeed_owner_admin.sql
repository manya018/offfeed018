-- OFFFEED Owner HQ: allow the verified owner account to administer marketplace records.
-- All policies are additive; existing brand/customer policies remain in place.
DO $$
DECLARE
  table_name text;
  policy_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'brand_applications',
    'brand_products',
    'brand_orders',
    'brand_shipping_profiles',
    'brand_size_guides',
    'order_returns',
    'dispatch_evidence',
    'return_evidence'
  ]
  LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);

      policy_name := table_name || '_owner_admin_select';
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = table_name AND policyname = policy_name
      ) THEN
        EXECUTE format(
          'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (lower(coalesce(auth.jwt() ->> ''email'', '''')) = ''manyagupta018@gmail.com'')',
          policy_name, table_name
        );
      END IF;
    END IF;
  END LOOP;
END $$;

-- Brand application decisions are made only through the owner-guarded server action.
DO $$
BEGIN
  IF to_regclass('public.brand_applications') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'brand_applications' AND policyname = 'brand_applications_owner_admin_update'
  ) THEN
    CREATE POLICY brand_applications_owner_admin_update
      ON public.brand_applications
      FOR UPDATE TO authenticated
      USING (lower(coalesce(auth.jwt() ->> 'email', '')) = 'manyagupta018@gmail.com')
      WITH CHECK (lower(coalesce(auth.jwt() ->> 'email', '')) = 'manyagupta018@gmail.com');
  END IF;
END $$;

-- Keep product moderation available for the owner when that workflow is enabled.
DO $$
BEGIN
  IF to_regclass('public.brand_products') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'brand_products' AND policyname = 'brand_products_owner_admin_update'
  ) THEN
    CREATE POLICY brand_products_owner_admin_update
      ON public.brand_products
      FOR UPDATE TO authenticated
      USING (lower(coalesce(auth.jwt() ->> 'email', '')) = 'manyagupta018@gmail.com')
      WITH CHECK (lower(coalesce(auth.jwt() ->> 'email', '')) = 'manyagupta018@gmail.com');
  END IF;
END $$;

-- Return decisions remain owner-only; SELECT access is granted above.
DO $$
BEGIN
  IF to_regclass('public.order_returns') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'order_returns' AND policyname = 'order_returns_owner_admin_update'
  ) THEN
    CREATE POLICY order_returns_owner_admin_update
      ON public.order_returns
      FOR UPDATE TO authenticated
      USING (lower(coalesce(auth.jwt() ->> 'email', '')) = 'manyagupta018@gmail.com')
      WITH CHECK (lower(coalesce(auth.jwt() ->> 'email', '')) = 'manyagupta018@gmail.com');
  END IF;
END $$;
