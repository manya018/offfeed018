# OFFFEED TRUST deployment and verification

This module uses the existing order-evidence schema and the `order-evidence` Storage bucket. Do not create a second bucket or replace the existing evidence tables.

## Required database migrations

Confirm these existing Drizzle migrations have been applied to the connected Supabase database, in order:

1. `drizzle/migrations/0000_brand_fraud_evidence.sql`
2. `drizzle/migrations/0001_order_evidence_storage_policies.sql`
3. `drizzle/migrations/0005_secure_order_evidence.sql`

The third migration is important: it locks evidence rows against direct client writes and introduces `request_offfeed_return_with_evidence`, which atomically creates a return request and its customer photo evidence. The customer return form now calls that RPC through the authenticated server function.

The repository's Supabase migration folder does not currently contain these three Drizzle migrations. Verify the live database migration history before applying anything; do not blindly replay them against a database where they already ran.

## Trusted analysis persistence

Return forensic analysis is persisted inside authenticated TanStack Start server functions using the existing server-only Supabase admin client. The browser must never be given the service-role key or a callable endpoint that accepts a client-supplied trust score/report.

Keep the service-role key in the existing server environment only. Verify the deployed server runtime has the existing `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` secrets configured. Do not create a second backend or a separate analysis Edge Function.

## Acceptance checks

- A signed-in customer can request a return only for their own delivered order.
- The customer must upload 2–6 JPG, PNG, or WebP photos (maximum 12 MB each).
- Uploads are stored under the customer's own folder in the private `order-evidence` bucket.
- Return creation and evidence-row creation succeed together through `request_offfeed_return_with_evidence`.
- A brand can view only evidence associated with its own orders.
- Only the responsible brand can run and persist a return forensic re-analysis.
- The analysis is advisory. A low or high score must not automatically approve, reject, or refund a return.
- Dispatch evidence is submitted once per order; corrections require an audited support process rather than an unrestricted client-side update.
- Refunds remain manual/tracked until a separately tested payment-provider refund integration is implemented.
