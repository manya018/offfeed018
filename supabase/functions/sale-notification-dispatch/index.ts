import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const reply = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const escapeHtml = (s: string) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const base64 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));

async function sendEmail(to: string, subject: string, title: string, body: string, url: string) {
  const key = Deno.env.get("LOVABLE_API_KEY"), connection = Deno.env.get("GOOGLE_MAIL_API_KEY");
  if (!key || !connection) throw new Error("OFFFEED Gmail connection is not configured.");
  const gateway = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";
  const profile = await fetch(gateway + "/users/me/profile", { headers: { Authorization: "Bearer " + key, "X-Connection-Api-Key": connection } });
  if (!profile.ok) throw new Error("Could not verify OFFFEED email sender.");
  const sender = await profile.json() as { emailAddress?: string };
  if ((sender.emailAddress ?? "").toLowerCase() !== "offfeeed@gmail.com") throw new Error("Connected Gmail sender is not the approved OFFFEED address.");
  const boundary = "offfeed-sale-boundary";
  const manageUrl = new URL(url).origin + "/notifications";
  const text = title + "\n\n" + body + "\n\nExplore the sale: " + url + "\nManage email preferences: " + manageUrl + "\n\nOFFFEED";
  const html = '<div style="font-family:Arial,sans-serif;line-height:1.7;color:#302824"><h2>' + escapeHtml(title) + '</h2><p>' + escapeHtml(body) + '</p><p><a href="' + url + '" style="background:#76534b;color:#fff;padding:12px 18px;text-decoration:none;border-radius:6px">Explore the sale</a></p><p style="font-size:12px;color:#8a7b72">You received this because you opted in to OFFFEED sale emails. <a href="' + manageUrl + '">Manage notification preferences</a>.</p><p>With care,<br>OFFFEED</p></div>';
  const message = ["To: " + to, "Subject: " + subject, "List-Unsubscribe: <" + manageUrl + ">", "MIME-Version: 1.0", 'Content-Type: multipart/alternative; boundary="' + boundary + '"', "", "--" + boundary, 'Content-Type: text/plain; charset="UTF-8"', "", text, "", "--" + boundary, 'Content-Type: text/html; charset="UTF-8"', "", html, "", "--" + boundary + "--", ""].join("\r\n");
  const raw = base64(message).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
  const sent = await fetch(gateway + "/users/me/messages/send", { method: "POST", headers: { Authorization: "Bearer " + key, "X-Connection-Api-Key": connection, "Content-Type": "application/json" }, body: JSON.stringify({ raw }) });
  if (!sent.ok) throw new Error("Gmail send failed [" + sent.status + "].");
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  const secret = Deno.env.get("SALE_NOTIFICATION_CRON_SECRET");
  if (!secret || request.headers.get("authorization") !== "Bearer " + secret) return reply({ error: "Unauthorized" }, 401);
  // Fail closed during rollout: only the configured test account receives notifications
  // until an operator explicitly enables live customer delivery.
  const liveSendingEnabled = Deno.env.get("SALE_NOTIFICATION_LIVE_SEND_ENABLED") === "true";
  const testUserId = Deno.env.get("SALE_NOTIFICATION_TEST_USER_ID");
  if (!liveSendingEnabled && !testUserId) {
    return reply({ error: "Notification dispatch is locked: set SALE_NOTIFICATION_TEST_USER_ID for private testing, or explicitly enable live sending after validation." }, 423);
  }
  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY"), vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
  if (vapidPublic && vapidPrivate) webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT") ?? "mailto:offfeeed@gmail.com", vapidPublic, vapidPrivate);
  const { data: jobs, error: claimError } = await db.rpc("claim_due_sale_notification_jobs", { p_limit: 20 });
  if (claimError) return reply({ error: "Could not claim due jobs" }, 500);
  const result = { claimed: jobs?.length ?? 0, inApp: 0, email: 0, push: 0, failed: 0, deliveryErrors: 0 };
  for (const job of jobs ?? []) {
    try {
      const { data: sale, error } = await db.from("brand_sales").select("id,name,starts_at,ends_at,status,brand_applications(brand_name)").eq("id", job.sale_id).maybeSingle();
      if (error) throw error;
      if (!sale || sale.status === "cancelled" || new Date(sale.ends_at).getTime() <= Date.now()) {
        await db.from("sale_notification_jobs").update({ status: "cancelled" }).eq("id", job.id);
        continue;
      }
      const brand = (sale.brand_applications as { brand_name?: string } | null)?.brand_name ?? "An OFFFEED brand";
      let title = "", body = "", subject = "";
      if (job.event_type === "sale_started") {
        title = brand + "'s sale is live"; body = sale.name + " has started. Discover the offer on OFFFEED."; subject = brand + "'s sale is now live on OFFFEED";
      } else if (job.event_type === "sale_reminder") {
        title = "A sale worth revisiting"; body = sale.name + " from " + brand + " is still on. Take another look before it ends."; subject = "A reminder: " + sale.name + " on OFFFEED";
      } else {
        title = "Last call: " + sale.name; body = brand + "'s sale is ending soon. Explore it before time runs out."; subject = "Ending soon: " + sale.name + " on OFFFEED";
      }
      const siteUrl = Deno.env.get("SITE_URL") ?? "https://offfeed018.lovable.app";
      const destination = siteUrl + "/discover";
      const { data: prefs, error: prefError } = await db.from("customer_notification_preferences").select("user_id,email,account_type,in_app_enabled,sale_email_enabled,push_enabled").or("in_app_enabled.eq.true,sale_email_enabled.eq.true,push_enabled.eq.true");
      if (prefError) throw prefError;
      const recipients = (prefs ?? []).filter((p) => p.account_type === "customer" && (liveSendingEnabled || p.user_id === testUserId));
      const inbox = recipients.filter((p) => p.in_app_enabled).map((p) => ({ user_id: p.user_id, notification_type: job.event_type, title, body, data: { saleId: sale.id, url: destination }, dedupe_key: sale.id + ":" + job.event_type }));
      if (inbox.length) {
        const { error: inboxError } = await db.from("customer_notifications").upsert(inbox, { onConflict: "user_id,dedupe_key", ignoreDuplicates: true });
        if (inboxError) throw inboxError;
        result.inApp += inbox.length;
      }
      let recipientDeliveryErrors = 0;
      let jobEmail = 0;
      let jobPush = 0;
      for (const p of recipients.filter((p) => p.sale_email_enabled && p.email)) {
        try { await sendEmail(p.email, subject, title, body, destination); result.email++; jobEmail++; }
        catch (mailError) { recipientDeliveryErrors++; result.deliveryErrors++; console.error("OFFFEED sale email failed", p.user_id, mailError); }
      }
      if (vapidPublic && vapidPrivate) {
        const pushIds = recipients.filter((p) => p.push_enabled).map((p) => p.user_id);
        if (pushIds.length) {
          const { data: subscriptions } = await db.from("customer_push_subscriptions").select("id,user_id,endpoint,p256dh,auth").in("user_id", pushIds);
          for (const sub of subscriptions ?? []) {
            try {
              await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify({ title, body, url: destination, tag: sale.id + "-" + job.event_type }));
              result.push++; jobPush++;
            } catch (pushError) {
              const status = (pushError as { statusCode?: number })?.statusCode;
              if (status === 404 || status === 410) await db.from("customer_push_subscriptions").delete().eq("id", sub.id);
              recipientDeliveryErrors++; result.deliveryErrors++;
              console.error("OFFFEED sale push failed", sub.user_id, pushError);
            }
          }
        }
      }
      const delivered = inbox.length + jobEmail + jobPush;
      const deliveryStatus = delivered > 0 ? "sent" : "failed";
      await db.from("sale_notification_jobs").update({ status: deliveryStatus, sent_at: deliveryStatus === "sent" ? new Date().toISOString() : null, last_error: recipientDeliveryErrors ? "One or more email or push deliveries failed; see Edge Function logs." : (deliveryStatus === "failed" ? "No eligible customer delivery channel succeeded." : null) }).eq("id", job.id);
      if (deliveryStatus === "failed") result.failed++;
    } catch (jobError) {
      result.failed++;
      await db.from("sale_notification_jobs").update({ status: "failed", last_error: String(jobError).slice(0, 1000) }).eq("id", job.id);
      console.error("OFFFEED sale notification job failed", job.id, jobError);
    }
  }
  return reply(result);
});
