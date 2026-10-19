CREATE TABLE public.brand_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  brand_application_id uuid NOT NULL REFERENCES public.brand_applications(id) ON DELETE RESTRICT,
  brand_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  customer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name text NOT NULL CHECK (char_length(customer_name) BETWEEN 1 AND 160),
  customer_email text NOT NULL CHECK (char_length(customer_email) BETWEEN 3 AND 254),
  customer_phone text NOT NULL DEFAULT '' CHECK (char_length(customer_phone) <= 30),
  delivery_address jsonb NOT NULL DEFAULT '{}'::jsonb,
  destination_pin_code text NOT NULL CHECK (destination_pin_code ~ '^[1-9][0-9]{5}$'),
  product_id uuid REFERENCES public.brand_products(id) ON DELETE SET NULL,
  product_name text NOT NULL CHECK (char_length(product_name) BETWEEN 1 AND 200),
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 100),
  unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0),
  currency text NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','processing','shipped','out_for_delivery','delivered','cancelled','return_requested','returned')),
  tracking_provider text NOT NULL DEFAULT '' CHECK (char_length(tracking_provider) <= 100),
  tracking_number text NOT NULL DEFAULT '' CHECK (char_length(tracking_number) <= 160),
  tracking_url text NOT NULL DEFAULT '' CHECK (char_length(tracking_url) <= 2048),
  estimated_delivery_start date,
  estimated_delivery_end date,
  dispatched_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT brand_orders_delivery_window_valid CHECK (
    estimated_delivery_start IS NULL OR estimated_delivery_end IS NULL OR estimated_delivery_end >= estimated_delivery_start
  )
);

CREATE INDEX brand_orders_brand_created_idx ON public.brand_orders (brand_application_id, created_at DESC);
CREATE INDEX brand_orders_customer_created_idx ON public.brand_orders (customer_user_id, created_at DESC);
CREATE INDEX brand_orders_status_idx ON public.brand_orders (status);

ALTER TABLE public.brand_orders ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.brand_orders TO authenticated;
GRANT UPDATE (status, tracking_provider, tracking_number, tracking_url, estimated_delivery_start, estimated_delivery_end, dispatched_at, delivered_at, updated_at) ON public.brand_orders TO authenticated;
GRANT ALL ON public.brand_orders TO service_role;

CREATE POLICY "Customers can view their own orders"
ON public.brand_orders FOR SELECT TO authenticated
USING (customer_user_id = auth.uid());

CREATE POLICY "Brands can view their own orders"
ON public.brand_orders FOR SELECT TO authenticated
USING (
  brand_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.brand_applications a
    WHERE a.id = brand_application_id AND a.user_id = auth.uid() AND a.status = 'approved'
  )
);

CREATE POLICY "Brands can update delivery fields on their own orders"
ON public.brand_orders FOR UPDATE TO authenticated
USING (
  brand_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.brand_applications a
    WHERE a.id = brand_application_id AND a.user_id = auth.uid() AND a.status = 'approved'
  )
)
WITH CHECK (
  brand_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.brand_applications a
    WHERE a.id = brand_application_id AND a.user_id = auth.uid() AND a.status = 'approved'
  )
);

CREATE TRIGGER set_brand_orders_updated_at
BEFORE UPDATE ON public.brand_orders
FOR EACH ROW EXECUTE FUNCTION public.set_brand_shipping_profile_updated_at();
