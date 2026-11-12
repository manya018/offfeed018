# OFFFEED customer sale notifications

## What this branch adds
- Customer inbox rows and read state in Supabase.
- Per-customer in-app, sale-email and browser-push preferences.
- Browser push subscription storage and a service worker at /sw.js.
- A sale notification queue that schedules launch, 24-hour reminder (only for sufficiently long sales), and two-hour ending-soon events.
- A protected Supabase Edge Function that dispatches due jobs.

## Required deployment configuration
1. Apply migrations in order: `supabase/migrations/20261111120000_customer_sale_notifications.sql`, then `supabase/migrations/20261112130000_reschedule_sale_notification_jobs.sql` (the second keeps pending jobs aligned when a brand edits or cancels a sale).
2. Deploy `supabase/functions/sale-notification-dispatch` with `supabase/config.toml` configured to disable platform JWT verification for this endpoint; the function validates its own bearer secret.
3. Set Edge Function secrets: `SALE_NOTIFICATION_CRON_SECRET`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `SITE_URL`, `LOVABLE_API_KEY`, and `GOOGLE_MAIL_API_KEY`. Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions.
4. Generate a VAPID key pair with `npx web-push generate-vapid-keys`. Use the public key as the deployment build variable `VITE_VAPID_PUBLIC_KEY`; keep the private key only in Edge Function secrets.
5. Add GitHub Actions repository secrets `SUPABASE_URL` and `SALE_NOTIFICATION_CRON_SECRET`. The workflow is currently manual-only (`workflow_dispatch`); do not restore its five-minute schedule until the Edge Function is deployed, secrets are verified, and test delivery succeeds.
6. Rebuild/redeploy the web app so the customer notification page and header link are published.

Live delivery is intentionally fail-closed. Keep `SALE_NOTIFICATION_LIVE_SEND_ENABLED` unset/false during testing and set `SALE_NOTIFICATION_TEST_USER_ID` to the approved test account. Only enable live sending after in-app, email consent, push consent, duplicate prevention, cancellation, and rescheduling tests pass. The current dispatcher has not yet been deployed to Lovable Cloud.

## Customer consent and audience
- In-app alerts are enabled by default for registered customer accounts.
- Sale email is opt-in and disabled by default. Do not send promotional email to a customer who has not enabled it.
- Browser push requires the customer to enable it on each device/browser.
- The current OFFFEED checkout supports guest orders. Guest checkout email addresses are not automatically enrolled in promotional messaging; account creation and explicit email opt-in are required before sale emails are sent.

## Operational checks
- Create a test sale with a start time a few minutes ahead and verify a notification row, email (only for opted-in test account), and push delivery.
- Verify reminder and ending-soon jobs for a multi-day test sale.
- Check `sale_notification_jobs` for failed jobs and `customer_notifications` for inbox records.
- Confirm the approved Gmail sender is still `offfeeed@gmail.com`.


## Automated build validation
The pull request is checked by the GitHub Actions workflow `.github/workflows/pull-request-build.yml`, which installs dependencies from `bun.lock` and runs the production build. A successful build does not replace Lovable Cloud deployment or end-to-end notification delivery tests.
