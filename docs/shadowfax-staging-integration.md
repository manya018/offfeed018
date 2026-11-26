# Shadowfax staging integration (initial serviceability step)

This branch adds a server-side staging-only serviceability gateway at
`supabase/functions/shadowfax-staging/index.ts`.

## Security and configuration

- Configure `SHADOWFAX_TEST_TOKEN` as a Supabase/Lovable Cloud Edge Function secret.
- The token is read only with `Deno.env.get`; it is never returned to the browser or logged.
- The function verifies the caller's Supabase access token with Auth before contacting Shadowfax.
- The endpoint is staging-only: `https://dale.staging.shadowfax.in/api`.
- Production credentials and production URLs are intentionally not supported.

## Request

Invoke the `shadowfax-staging` Edge Function with an authenticated Supabase session:

```json
{
  "pickupPinCode": "248007",
  "deliveryPinCode": "142027"
}
```

The function checks the two forward-logistics legs separately:

- `seller_pickup` for the brand pickup PIN.
- `customer_delivery` for the customer delivery PIN.

It returns the exact service tiers reported by Shadowfax. It deliberately does not decide that a route is serviceable merely because a PIN appears in a response: Shadowfax configures Regular and Surface supply-chain tiers per client account. Confirm the account's tier with Shadowfax before enabling booking.

## Deployment note

Committing this function and registering it in `supabase/config.toml` does not deploy it to the managed Lovable Cloud backend. The existing project's function deployment mechanism must publish it, and the secret must exist in that Edge Function environment. No separate Supabase project is created by this change.

## Not included yet

This first safe step does not create shipments, generate AWBs, calculate shipping charges, or update customer orders. Those operations need the account's supply-chain tier and the exact order payload/return-address requirements confirmed before implementation.
