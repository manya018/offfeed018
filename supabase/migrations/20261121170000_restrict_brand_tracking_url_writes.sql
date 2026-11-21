-- Customer-facing tracking links must only be written by the validated server function.
-- The function uses the service role after checking the authenticated brand owner
-- and validating the courier hostname, so direct PostgREST writes are not needed.
REVOKE UPDATE (tracking_url) ON TABLE public.brand_orders FROM authenticated;
