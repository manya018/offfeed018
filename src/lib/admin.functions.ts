import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const OWNER_EMAIL = "manyagupta018@gmail.com";

function requireOwner(context: { claims: Record<string, unknown> }) {
  const email = typeof context.claims.email === "string" ? context.claims.email.toLowerCase() : "";
  if (email !== OWNER_EMAIL) {
    throw new Error("Forbidden: OFFFEED owner access is required.");
  }
}

export const verifyAdminAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    requireOwner(context);
    return { authorized: true as const, email: OWNER_EMAIL };
  });

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    requireOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [brands, pendingBrands, products, orders, returns] = await Promise.all([
      supabaseAdmin.from("brand_applications").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("brand_applications").select("id", { count: "exact", head: true }).eq("status", "under_review"),
      supabaseAdmin.from("brand_products").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("brand_orders").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("order_returns").select("id", { count: "exact", head: true }),
    ]);
    const errors = [brands.error, pendingBrands.error, products.error, orders.error, returns.error].filter(Boolean);
    if (errors.length) {
      console.error("[admin-overview] Failed to load marketplace counts", errors);
      throw new Error("Marketplace overview could not be loaded. Check that the OFFFEED admin database migration has been applied.");
    }
    return {
      totalBrands: brands.count ?? 0,
      pendingBrands: pendingBrands.count ?? 0,
      totalProducts: products.count ?? 0,
      totalOrders: orders.count ?? 0,
      openReturns: returns.count ?? 0,
    };
  });

export const getAdminBrands = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    requireOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("brand_applications")
      .select("id, brand_name, contact_name, email, category, social_handle, website_url, status, audience, created_at, public_handle")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      console.error("[admin-brands] Failed to load applications", error);
      throw new Error("Brand applications could not be loaded.");
    }
    return data ?? [];
  });

export const updateAdminBrandStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    brandId: z.string().uuid(),
    status: z.enum(["approved", "declined", "under_review"]),
  }).parse(input))
  .handler(async ({ context, data }) => {
    requireOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: current, error: readError } = await supabaseAdmin
      .from("brand_applications")
      .select("id, brand_name, email, status, commission_rate")
      .eq("id", data.brandId)
      .maybeSingle();
    if (readError || !current) throw new Error("This brand application could not be found.");

    if (current.status !== data.status) {
      const { error } = await supabaseAdmin
        .from("brand_applications")
        .update({ status: data.status, updated_at: new Date().toISOString() })
        .eq("id", data.brandId);
      if (error) {
        console.error("[admin-brand-status] Failed to update application", error);
        throw new Error("The brand status could not be updated.");
      }
    }

    let emailSent = true;
    if (data.status === "approved" || data.status === "declined") {
      try {
        const { sendBrandDecisionEmail } = await import("./brand-notification.server");
        await sendBrandDecisionEmail({
          brandName: current.brand_name,
          email: current.email,
          approved: data.status === "approved",
          commissionRate: current.commission_rate,
        });
      } catch (notifyError) {
        emailSent = false;
        console.error("[admin-brand-status] Status saved but decision email failed", notifyError);
      }
    }
    return { id: current.id, brand_name: current.brand_name, status: data.status, emailSent };
  });
