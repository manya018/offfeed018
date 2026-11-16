# OFFFEED TRUST deployment and verification

OFFFEED uses its existing Lovable Cloud-managed backend. Do not create a second backend, connect a replacement database, or create a separate evidence bucket.

## Reconciled migration

The Trust schema is now packaged in the normal Supabase migration stream:

- `supabase/migrations/20261116000000_add_offfeed_trust_evidence.sql`

This migration consolidates the intended changes from the older Drizzle assets:

- Adds the shipping-profile parcel/pickup fields used by Trust.
- Creates dispatch and return evidence tables if absent.
- Adds one-evidence-row-per-order/return unique indexes. It deliberately stops if duplicate rows already exist; it never deletes evidence.
- Restricts direct authenticated writes to evidence records. Brands can submit dispatch evidence once; return evidence is created only by the secure RPC.
- Replaces the broad evidence-file read policy with exact-path access for the customer or brand on the associated order.
- Creates the private `order-evidence` bucket only if it does not already exist. Existing bucket configuration is not overwritten.
- Installs `request_offfeed_return_with_evidence`, which validates ownership, delivered status, 2–6 customer-owned photo paths, and atomically creates the return plus evidence row.

The original Drizzle files remain as historical source assets; do not replay them separately after applying the consolidated migration.

## Important live-deployment boundary

The migration is committed to GitHub, but a GitHub commit does not apply SQL to Lovable Cloud. Apply the new migration once through the existing OFFFEED project's managed database SQL interface when that interface is available. Do not run it against a different Supabase project.

Before applying, inspect the live schema. The migration is idempotent for its table/policy/function setup and preserves existing evidence, but it intentionally fails if duplicate evidence rows prevent the one-per-order/return guarantees. Resolve any such duplicates through an audited process; do not delete them automatically.

After application, verify:

1. `dispatch_evidence` and `return_evidence` exist and RLS is enabled.
2. The `order-evidence` bucket exists and is private. If it existed already, confirm its file-size and MIME settings are appropriate for images and packing videos.
3. The policies permit owner-folder uploads and exact evidence reads only by the customer/brand on the order.
4. `request_offfeed_return_with_evidence` exists and is executable by authenticated users, not anon/public.
5. A test customer can submit a return for their own delivered order with 2–6 photos; another customer cannot.
6. The responsible brand can view the evidence; unrelated brands/customers cannot.
7. Dispatch evidence can be submitted once per order, and direct client updates/deletes are denied.

## Trusted analysis persistence

Return forensic analysis is persisted inside authenticated TanStack Start server functions using the existing server-only Supabase admin client. The browser must never receive the service-role key or a callable endpoint that accepts a client-supplied trust score/report.

The existing server-side client expects `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Keep both only in the existing Lovable Cloud server environment. Do not add them to browser-exposed variables or GitHub secrets. Confirm both are configured there before testing report persistence. Initial AI analysis is best-effort: a successful return submission remains successful even if analysis persistence is temporarily unavailable. Brand-triggered re-analysis must save its report successfully.

## Remaining non-database work

- Test a real customer return and brand dispute-view flow in the live project.
- Confirm the existing AI gateway can analyze evidence and that the server-side report write succeeds.
- Refunds remain manual/tracked. No automated Razorpay refund is implemented by this Trust migration.

## Validation

`.github/workflows/verify-offfeed-trust-database.yml` validates the committed migration source and expected security definitions. A passing run proves the repository assets are present; it does not prove the live Lovable Cloud database has applied them.
