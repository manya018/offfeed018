# OFFFEED customer sale notifications

## What this branch adds
- Customer inbox rows and read state in Supabase.
- Per-customer in-app, sale-email and browser-push preferences.
- Browser push subscription storage and a service worker at /sw.js.
- A sale notification queue that schedules launch, 24-hour reminder (only for sufficiently long sales), and two-hour ending-soon events.
- A protected Supabase Edge Function that dispatches due jobs.

## Required deployment configuration
1. Apply migrations in order: `supabase/migrations/20261111120000_customer_sale_notifications.sql`, then `supabase/migrations/20261112130000_reschedule_sale_notification_jobs.sql`. Confirm both are applied before enabling dispatch.
2. Add the GitHub Actions secret `SUPABASE_ACCESS_TOKEN`. The `Deploy OFFFEED sale notification dispatcher` workflow deploys the Edge Function when its code changes on `main`; run it manually once for the initial deployment. It uses project ref `wrqkpxvbbdsvfgvisyte`.
3. Set Edge Function secrets: `SALE_NOTIFICATION_CRON_SECRET`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `SITE_URL`, `LOVABLE_API_KEY`, and `GOOGLE_MAIL_API_KEY`. Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY) to Edge Functions.
4. Generate a VAPID key pair with `npx web-push generate-vapid-keys`. Set the public key as the web app build variable `VITE_VAPID_PUBLIC_KEY`; keep the private key only in Edge Function secrets. Rebuild/redeploy the web app after setting it.
5. Add GitHub Actions secrets `SUPABASE_URL` and `SALE_NOTIFICATION_CRON_SECRET`. The dispatch workflow runs every five minutes after the repository variable `SALE_NOTIFICATION_AUTOMATION_ENABLED` is set to `true`; it can also be run manually.
6. For private testing, set Edge Function secret `SALE_NOTIFICATION_TEST_USER_ID` to the test account and leave `SALE_NOTIFICATION_LIVE_SEND_ENABLED) unset. After verifying in-app, opted-in email, push, duplicate prevention, cancellation, and rescheduling behavior, set `SALE_NOTIFICATION_LIVE_SEND_ENABLED=true` to enable delivery to customers who opted into each channel.

The schedule is guarded by the repository variable so it remains idle until deployment and validation are complete. Sale email remains opt-in, in-app notifications use the saved preference, and browser push only goes to devices that have granted permission and registered a subscription.

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
