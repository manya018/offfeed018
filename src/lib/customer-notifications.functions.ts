import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const dbFor = async () => { const { supabaseAdmin } = await import("@/integrations/supabase/client.server"); return supabaseAdmin as any; };

export const getCustomerNotifications = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const db = await dbFor();
  const [{ data: notifications, error }, { data: preferences }] = await Promise.all([
    db.from("customer_notifications").select("id,notification_type,title,body,data,read_at,created_at").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(50),
    db.from("customer_notification_preferences").select("in_app_enabled,sale_email_enabled,push_enabled").eq("user_id", context.userId).maybeSingle(),
  ]);
  if (error) throw new Error("Your notifications could not be loaded.");
  return { notifications: notifications ?? [], preferences: preferences ?? { in_app_enabled: true, sale_email_enabled: false, push_enabled: false } };
});

export const updateCustomerNotificationPreferences = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((v) => z.object({ inAppEnabled: z.boolean(), saleEmailEnabled: z.boolean(), pushEnabled: z.boolean() }).parse(v)).handler(async ({ context, data }) => {
  const db = await dbFor();
  const { data: user } = await db.auth.admin.getUserById(context.userId);
  const { error } = await db.from("customer_notification_preferences").upsert({ user_id: context.userId, email: user.user?.email ?? null, in_app_enabled: data.inAppEnabled, sale_email_enabled: data.saleEmailEnabled, push_enabled: data.pushEnabled, updated_at: new Date().toISOString() });
  if (error) throw new Error("Notification preferences could not be saved.");
  return { success: true };
});

export const markCustomerNotificationRead = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((v) => z.object({ notificationId: z.string().uuid() }).parse(v)).handler(async ({ context, data }) => {
  const db = await dbFor();
  const { error } = await db.from("customer_notifications").update({ read_at: new Date().toISOString() }).eq("id", data.notificationId).eq("user_id", context.userId);
  if (error) throw new Error("Notification could not be marked as read.");
  return { success: true };
});

export const saveCustomerPushSubscription = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((v) => z.object({ endpoint: z.string().url().max(2048), p256dh: z.string().min(20).max(256), auth: z.string().min(10).max(256), userAgent: z.string().max(500).optional() }).parse(v)).handler(async ({ context, data }) => {
  const db = await dbFor();
  const { error } = await db.from("customer_push_subscriptions").upsert({ user_id: context.userId, endpoint: data.endpoint, p256dh: data.p256dh, auth: data.auth, user_agent: data.userAgent ?? null, updated_at: new Date().toISOString() }, { onConflict: "endpoint" });
  if (error) throw new Error("This device could not be registered for push notifications.");
  await db.from("customer_notification_preferences").upsert({ user_id: context.userId, push_enabled: true, updated_at: new Date().toISOString() });
  return { success: true };
});

export const removeCustomerPushSubscription = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((v) => z.object({ endpoint: z.string().url().max(2048) }).parse(v)).handler(async ({ context, data }) => {
  const db = await dbFor();
  const { error } = await db.from("customer_push_subscriptions").delete().eq("user_id", context.userId).eq("endpoint", data.endpoint);
  if (error) throw new Error("Push notifications could not be disabled on this device.");
  const { count } = await db.from("customer_push_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", context.userId);
  if (!count) await db.from("customer_notification_preferences").update({ push_enabled: false, updated_at: new Date().toISOString() }).eq("user_id", context.userId);
  return { success: true };
});
