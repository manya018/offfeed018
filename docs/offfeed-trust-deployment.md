# OFFFEED TRUST deployment and verification

OFFFEED uses its existing Lovable Cloud-managed backend. The backend is managed through the OFFFEED project in Lovable; it is not expected to appear as a separately owned project in the user's Supabase dashboard.

Do not create a second backend, connect a replacement database, or create a separate evidence bucket for this module.

## Required database migrations

These existing Drizzle migrations define the OFFFEED Trust database changes and must be present in the managed backend:

1. `drizzle/migrations/0000_brand_fraud_evidence.sql`
2. `drizzle/migrations/0001_order_evidence_storage_policies.sql`
3. `drizzle/migrations/0005_secure_order_evidence.sql`

The third migration locks evidence rows against direct client writes and introduces `request_offfeed_return_with_evidence`, which atomically creates a return request and its customer photo evidence. The customer return form calls that RPC through the authenticated server function.

The repository's `supabase/migrations` directory does not contain these three Drizzle migrations. They must not be blindly replayed: migrations 0000 and 0001 include non-idempotent table and policy creation. Confirm the deployed schema in the OFFFEED project's Lovable Cloud database interface before any manual application or repair.

## Database verification limitation

Lovable Cloud manages the underlying database and does not expose a direct PostgreSQL connection URL or service-role credentials through the user's separate Supabase dashboard. Therefore, a GitHub Actions job that expects `SUPABASE_DB_URL` cannot verify this managed database. Do not create or populate that secret as a workaround, and do not treat its absence as a database deployment failure.

The GitHub workflow `.github/workflows/verify-offfeed-trust-database.yml` now performs repository-only validation of the Trust migration assets. A successful run confirms the SQL files and expected definitions are present in Git; it does **not** prove those migrations are deployed to Lovable Cloud.

Live deployment must be confirmed in the OFFFEED project's Lovable Cloud database interface by checking the evidence tables, policies, private `order-evidence` bucket, and secure return RPC. If a required object is absent, reconcile the actual schema before applying any migration. Never replay 0000 or 0001 blindly.

## Trusted analysis persistence

Return forensic analysis is persisted inside authenticated TanStack Start server functions using the existing server-only Supabase admin client. The browser must never be given the service-role key or a callable endpoint that accepts a client-supplied trust score/report.

Keep any runtime credentials in the existing Lovable Cloud server environment only. The server-side client expects `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; do not add these to browser-exposed variables or GitHub secrets. Verify their availability through the existing Lovable Cloud environment configuration if this server-side operation is enabled.

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
