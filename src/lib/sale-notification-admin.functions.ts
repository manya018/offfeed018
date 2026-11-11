import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const OWNER_EMAIL = "manyagupta018@gmail.com";
export const getOwnerSaleNotificationOverview = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const email = typeof context.claims.email === "string" ? context.claims.email.toLowerCase() : "";
  if (email !== OWNER_EMAIL) throw new Error("Forbidden: OFFFEED owner access is required.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [pending, failed, sent, subscribers, recent] = await Promise.all([
    supabaseAdmin.from("sale_notification_jobs").select("id", { count: "exact", head: true }).in("status", ["pending", "processing"]),
    supabaseAdmin.from("sale_notification_jobs").select("id", { count: "exact", head: true }).eq("status", "failed"),
    supabaseAdmin.from("sale_notification_jobs").select("id", { count: "exact", head: true }).eq("status", "sent"),
    supabaseAdmin.from("customer_notification_preferences").select("user_id", { count: "exact", head: true }).eq("in_app_enabled", true),
    supabaseAdmin.from("sale_notification_jobs").select("id,event_type,status,scheduled_for,sent_at,attempts,last_error,brand_sales(name)").order("created_at", { ascending: false }).limit(30),
  ]);
  const error = [pending.error, failed.error, sent.error, subscribers.error, recent.error].find(Boolean);
  if (error) throw new Error("Sale notification operations could not be loaded.");
  return { pending: pending.count ?? 0, failed: failed.count ?? 0, sent: sent.count ?? 0, inAppCustomers: subscribers.count ?? 0, recent: recent.data ?? [] };
});
