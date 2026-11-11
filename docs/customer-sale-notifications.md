# OFFFEED customer sale notifications

## What this branch adds
- Customer inbox rows and read state in Supabase.
- Per-customer in-app, sale-email and browser-push preferences.
- Browser push subscription storage and a service worker at /sw.js.
- A sale notification queue that schedules launch, 24-hour reminder (only for sufficiently long sales), and two-hour ending-soon events.
- A protected Supabase Edge Function that dispatches due jobs.

## Required deployment configuration
1. Apply the migration in `supabase/migrations/20261111120000_customer_sale_notifications.sql`.
2. Deploy `supabase/functions/sale-notification-dispatch` with `supabase/config.toml` configured to disable platform JWT verification for this endpoint; the function validates its own bearer secret.
3. Set Edge Function secrets: `SALE_NOTIFICATION_CRON_SECRET`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `SITE_URL`, `LOVABLE_API_KEY`, and `GOOGLE_MAIL_API_KEY`. Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions.
4. Generate a VAPID key pair with `npx web-push generate-vapid-keys`. Use the public key as the deployment build variable `VITE_VAPID_PUBLIC_KEY`; keep the private key only in Edge Function secrets.
5. Add GitHub Actions repository secrets `SUPABASE_URL` and `SALE_NOTIFICATION_CRON_SECRET`. The workflow `.github/workflows/dispatch-sale-notifications.yml` invokes the dispatcher every five minutes.
6. Rebuild/redeploy the web app so the customer notification page and header link are published.

The five-minute GitHub schedule only runs after this workflow is present on the repository's default branch. Keep the PR unmerged until the database migration, Edge Function and customer delivery paths have been validated; after merge, confirm the scheduled workflow is running.

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
