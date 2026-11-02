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

CREATE TABLE public.dispatch_evidence (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.brand_orders(id) on delete cascade,
  brand_user_id uuid not null,
  photos jsonb not null default '[]'::jsonb,
  video_path text not null default '',
  packing_note text not null default '',
  status text not null default 'submitted',
  ai_report jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dispatch_evidence_status_check check (status in ('submitted','verified','flagged'))
);

CREATE TABLE public.return_evidence (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references public.order_returns(id) on delete cascade,
  order_id uuid not null references public.brand_orders(id) on delete cascade,
  customer_user_id uuid not null,
  photos jsonb not null default '[]'::jsonb,
  notes text not null default '',
  status text not null default 'submitted',
  ai_report jsonb,
  trust_score numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint return_evidence_status_check check (status in ('submitted','verified','flagged'))
);

GRANT SELECT, INSERT, UPDATE ON public.dispatch_evidence TO authenticated;
GRANT ALL ON public.dispatch_evidence TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.return_evidence TO authenticated;
GRANT ALL ON public.return_evidence TO service_role;

ALTER TABLE public.dispatch_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brands manage dispatch evidence for their orders"
  ON public.dispatch_evidence FOR ALL TO authenticated
  USING (brand_user_id = auth.uid())
  WITH CHECK (
    brand_user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.brand_orders bo WHERE bo.id = order_id AND bo.brand_user_id = auth.uid())
  );

CREATE POLICY "Customers can view dispatch evidence for their orders"
  ON public.dispatch_evidence FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.brand_orders bo WHERE bo.id = order_id AND bo.customer_user_id = auth.uid()));

CREATE POLICY "Customers manage return evidence for their own returns"
  ON public.return_evidence FOR ALL TO authenticated
  USING (customer_user_id = auth.uid())
  WITH CHECK (
    customer_user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.brand_orders bo WHERE bo.id = order_id AND bo.customer_user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.order_returns r WHERE r.id = return_id AND r.customer_user_id = auth.uid())
  );

CREATE POLICY "Brands can view return evidence for their orders"
  ON public.return_evidence FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.brand_orders bo WHERE bo.id = order_id AND bo.brand_user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS dispatch_evidence_order_idx ON public.dispatch_evidence(order_id);
CREATE INDEX IF NOT EXISTS return_evidence_return_idx ON public.return_evidence(return_id);

COMMENT ON TABLE public.dispatch_evidence IS 'Anti-fraud vault: brand packing photos and video recorded before dispatch.';
COMMENT ON TABLE public.return_evidence IS 'Anti-fraud vault: customer return proof photos with AI forensics report.';