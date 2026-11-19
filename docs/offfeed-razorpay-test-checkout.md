# OFFFEED Razorpay prepaid checkout (test mode)

This integration accepts **online prepaid payments only**. Cash on Delivery and Pay After Delivery are not offered.

## Server settings

Add these values to the existing Lovable Cloud server environment:

- `RAZORPAY_MODE=test`
- `RAZORPAY_KEY_ID=rzp_test_...`
- `RAZORPAY_KEY_SECRET=...`

Use Razorpay **Test Mode** credentials. The server refuses to start checkout unless the mode is exactly `test` and the Key ID starts with `rzp_test_`. Never put the Secret in browser code, a public environment variable, GitHub, or a chat.

The integration also uses the existing server settings `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

## Database and payment flow

1. Apply `supabase/migrations/20261119010000_add_razorpay_prepaid_checkout.sql` to the existing Supabase project.
2. The server asks the database to validate the cart and snapshot current product, sale, brand, customer, address, and amount data into a private payment session.
3. The server creates a Razorpay Order using that server-calculated amount.
4. Razorpay Checkout collects the test payment.
5. The server verifies the HMAC signature, checks the payment against Razorpay's API, captures an authorized payment if needed, and compares the captured amount with the saved session.
6. Only then does the database create brand-visible orders and the app notify the customer and brand.

The old public COD order RPC is revoked by the migration. Existing historical order rows remain intact.

## Test checklist

- Successful prepaid test payment creates one OFFFEED brand order per cart item and sends the normal order emails.
- Cancel or fail checkout: no brand order is created and the cart remains.
- Change the cart total in browser tools: the server-calculated amount must still be charged.
- Alter the payment signature: verification must fail and no brand order may be created.
- Repeat verification for the same successful payment: it must return the already-created orders without duplicates.

## Current scope and live-launch requirements

- This PR is deliberately locked to Razorpay Test Mode. Do not change the mode guard or add Live credentials until OFFFEED's legal entity, settlement bank account, Razorpay account activation, and marketplace settlement approach are confirmed.
- This flow currently charges the product subtotal. OFFFEED's live Shiprocket rate calculation and automatic shipping-cost settlement are not connected.
- Refunds and customer-return decisions remain manual.
- A verified Razorpay webhook is still needed to recover automatically if a payment succeeds but the customer closes the browser before the callback reaches OFFFEED. Do not enable live payments until webhook delivery, signature validation, and reconciliation are added and verified.
