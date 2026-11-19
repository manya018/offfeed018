# OFFFEED customer sale notifications

OFFFEED uses Lovable Cloud for its managed backend. Its database and Edge Functions use Supabase technology underneath, but OFFFEED does not need a separately created Supabase account or project.

## What the code provides

- Customer inbox notifications and read state.
- Per-customer in-app, sale-email and browser-push preferences.
- Push subscription storage and a service worker at `/sw.js`.
- A sale notification queue for launch, 24-hour reminder (for sufficiently long sales), and ending-soon events.
- A protected Edge Function at `supabase/functions/sale-notification-dispatch` that sends due notifications.
- Sale create/edit triggers that populate or reschedule queue rows.

## Lovable Cloud setup

Use the OFFFEED project’s built-in Cloud controls:

1. Open **More → Database → Manage → SQL editor**. Check that migrations `20261111120000_customer_sale_notifications.sql` and `20261112130000_reschedule_sale_notification_jobs.sql` are applied. The tables `customer_notification_preferences`, `customer_push_subscriptions`, `customer_notifications`, and `sale_notification_jobs` should be present.
2. Open **More → Database → Manage → Edge functions** and deploy `sale-notification-dispatch` from the project’s synced code.
3. Add the backend values under **More → Settings → Secrets**:
   - `SALE_NOTIFICATION_CRON_SECRET`: a strong random secret used only by the scheduled dispatcher.
   - `SITE_URL`: `https://offfeed018.lovable.app`.
   - `LOVABLE_API_KEY` and `GOOGLE_MAIL_API_KEY`: use the values provided by the connected OFFFEED Gmail integration.
   - For browser push, set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` (for example `mailto:offfeeed@gmail.com`). Keep the private key only in backend secrets.
   - Leave `SALE_NOTIFICATION_LIVE_SEND_ENABLED` unset while privately verifying the flow. The function will not dispatch until a test user is configured with `SALE_NOTIFICATION_TEST_USER_ID` or live sending is explicitly enabled after verification.
4. Set the frontend build variable `VITE_VAPID_PUBLIC_KEY` to the matching public VAPID key and rebuild/publish the app. This value is public; never put the private key in a `VITE_` variable.
5. In **More → Database → Manage → Jobs**, create a recurring job to POST to the deployed `sale-notification-dispatch` function every five minutes, with the `Authorization: Bearer <SALE_NOTIFICATION_CRON_SECRET>` header and JSON body `{}`. Confirm the job appears in the Jobs list and check Edge Function logs after a run.

Lovable Cloud’s Jobs panel currently has no scheduled job for the dispatcher, so notifications are not yet automatic until step 5 is completed. If the project’s Cloud UI requires an AI action to create or deploy the job, Lovable credits must be available; GitHub code sync alone does not deploy backend functions or schedule recurring jobs.

## Consent and audience

- In-app alerts are enabled by default for registered customer accounts.
- Sale email is opt-in and disabled by default. Only send to customers who explicitly enabled it.
- Browser push requires permission and a subscription on each device/browser.
- Guest checkout email addresses are not enrolled in promotional messaging.

## Operational verification

Use a dedicated test account and a test sale. Verify launch, reminder, ending-soon, cancellation, rescheduling, duplicate prevention, in-app delivery, opted-in email, and push delivery. Check `sale_notification_jobs`, `customer_notifications`, and the Edge Function logs. Do not enable live sending until private delivery checks pass. Confirm the approved Gmail sender is `offfeeed@gmail.com`.

The GitHub pull-request build checks code compilation; a successful build does not confirm Lovable Cloud deployment or end-to-end message delivery.
