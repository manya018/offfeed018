import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const OWNER_EMAIL = "manyagupta018@gmail.com";
function requireOwner(context: { claims: Record<string, unknown> }) {
 const email = typeof context.claims.email === "string" ? context.claims.email.toLowerCase() : "";
 if (email !== OWNER_EMAIL) throw new Error("Forbidden: OFFFEED owner access is required.");
}
const dbFor = async () => { const { supabaseAdmin } = await import("@/integrations/supabase/client.server"); return supabaseAdmin; };

export const getMyNotifications = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
 const db = await dbFor();
 const { data, error } = await db.from("customer_notifications").select("id,title,body,href,read_at,created_at,notification_type").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(40);
 if (error) throw new Error("Notifications could not be loaded.");
 return data ?? [];
});

export const markMyNotificationRead = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(v => z.object({ id: z.string().uuid() }).parse(v)).handler(async ({ context, data }) => {
 const db = await dbFor();
 const { error } = await db.from("customer_notifications").update({ read_at: new Date().toISOString() }).eq("id", data.id).eq("user_id", context.userId);
 if (error) throw new Error("Notification could not be marked as read.");
 return { success: true };
});

export const getOwnerSaleNotificationCampaigns = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
 requireOwner(context);
 const db = await dbFor();
 const { data, error } = await db.from("sale_notification_campaigns").select("id,sale_id,event_key,scheduled_at,status,sent_at,recipient_count,error_message,brand_sales(name,brand_application_id,brand_applications(brand_name))").order("scheduled_at", { ascending: false }).limit(200);
 if (error) throw new Error("Notification campaigns could not be loaded. Apply the sale notification migration first.");
 return data ?? [];
});

export const runDueSaleNotificationCampaigns = createServerFn({ method: "POST" }).inputValidator(v => z.object({ secret: z.string().min(1) }).parse(v)).handler(async ({ data }) => {
 const expected = process.env["LOVABLE_CRON_SECRET"];
 if (!expected || data.secret !== expected) throw new Error("Unauthorized scheduled task.");
 const db = await dbFor();
 const { data: count, error } = await db.rpc("deliver_due_sale_notifications", { p_limit: 100 });
 if (error) throw new Error("Due sale notifications could not be delivered.");
 return { insertedNotifications: Number(count ?? 0) };
});
