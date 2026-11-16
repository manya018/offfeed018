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
      throw new Error("Marketplace overview could not be loaded. Check the Supabase server configuration and database connectivity.");
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


export const getAdminProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    requireOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: products, error: productsError }, { data: applications, error: applicationsError }] = await Promise.all([
      supabaseAdmin
        .from("brand_products")
        .select("id, brand_application_id, product_name, description, category, price, currency, image_path, image_paths, sizes, colors, audience, source, status, created_at, product_url")
        .order("created_at", { ascending: false })
        .limit(500),
      supabaseAdmin.from("brand_applications").select("id, brand_name, email"),
    ]);
    if (productsError || applicationsError) {
      console.error("[admin-products] Failed to load marketplace listings", { productsError, applicationsError });
      throw new Error("Products and looks could not be loaded.");
    }

    const brandById = new Map((applications ?? []).map((brand) => [brand.id, brand]));
    const imagePaths = [...new Set((products ?? []).flatMap((product) => [
      product.image_path,
      ...(product.image_paths ?? []),
    ]).filter((path): path is string => Boolean(path && !path.startsWith("https://"))))];
    const { data: signedFiles, error: signedError } = imagePaths.length
      ? await supabaseAdmin.storage.from("brand-product-images").createSignedUrls(imagePaths, 3600)
      : { data: [], error: null };
    if (signedError) console.error("[admin-products] Failed to sign product images", signedError);
    const imageUrlByPath = new Map((signedFiles ?? []).map((file) => [file.path, file.signedUrl]));

    return (products ?? []).map((product) => {
      const imagePath = product.image_path ?? product.image_paths?.[0] ?? null;
      const imageUrl = imagePath
        ? imagePath.startsWith("https://")
          ? imagePath
          : imageUrlByPath.get(imagePath) ?? null
        : null;
      const brand = brandById.get(product.brand_application_id);
      return {
        id: product.id,
        product_name: product.product_name,
        description: product.description,
        category: product.category,
        price: product.price,
        currency: product.currency,
        imageUrl,
        sizes: product.sizes ?? [],
        colors: product.colors ?? [],
        audience: product.audience ?? [],
        source: product.source,
        status: product.status,
        created_at: product.created_at,
        product_url: product.product_url,
        brand_name: brand?.brand_name ?? "Unknown brand",
        brand_email: brand?.email ?? "",
      };
    });
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


export const getAdminReturns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    requireOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: returns, error } = await supabaseAdmin
      .from("order_returns")
      .select("id, order_id, customer_user_id, brand_user_id, reason, customer_details, evidence_url, status, brand_response, return_tracking_provider, return_tracking_number, return_tracking_url, commission_decision, commission_amount, refund_amount, refund_status, refund_reference, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      console.error("[admin-returns] Failed to load return requests", error);
      throw new Error("Return requests could not be loaded. Confirm the returns migration is applied.");
    }
    const orderIds = [...new Set((returns ?? []).map((item) => item.order_id))];
    const [{ data: orders, error: ordersError }, { data: brands, error: brandsError }] = await Promise.all([
      orderIds.length ? supabaseAdmin.from("brand_orders").select("id, order_number, product_name, quantity, unit_price, currency, status, customer_name, customer_email").in("id", orderIds) : Promise.resolve({ data: [], error: null }),
      supabaseAdmin.from("brand_applications").select("user_id, brand_name, email"),
    ]);
    if (ordersError || brandsError) throw new Error("Return request details could not be loaded.");
    const orderById = new Map((orders ?? []).map((order) => [order.id, order]));
    const brandByUserId = new Map((brands ?? []).map((brand) => [brand.user_id, brand]));
    return (returns ?? []).map((item) => ({
      ...item,
      order: orderById.get(item.order_id) ?? null,
      brand: brandByUserId.get(item.brand_user_id) ?? null,
    }));
  });

export const getAdminTrustCases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    requireOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: dispatchRows, error: dispatchError }, { data: returnRows, error: returnError }] = await Promise.all([
      supabaseAdmin.from("dispatch_evidence").select("id, order_id, brand_user_id, photos, video_path, packing_note, status, ai_report, created_at").order("created_at", { ascending: false }).limit(200),
      supabaseAdmin.from("return_evidence").select("id, return_id, order_id, customer_user_id, photos, notes, status, trust_score, ai_report, created_at").order("created_at", { ascending: false }).limit(200),
    ]);
    if (dispatchError || returnError) {
      console.error("[admin-trust] Failed to load evidence", { dispatchError, returnError });
      throw new Error("OFFFEED Trust evidence could not be loaded. Apply the Trust database migration first.");
    }
    const orderIds = [...new Set([...(dispatchRows ?? []).map((item) => item.order_id), ...(returnRows ?? []).map((item) => item.order_id)])];
    const { data: orders, error: ordersError } = orderIds.length
      ? await supabaseAdmin.from("brand_orders").select("id, order_number, product_name, status, customer_name, customer_email, brand_user_id").in("id", orderIds)
      : { data: [], error: null };
    if (ordersError) throw new Error("Trust order details could not be loaded.");
    const orderById = new Map((orders ?? []).map((order) => [order.id, order]));
    const paths = [...new Set([
      ...(dispatchRows ?? []).flatMap((item) => [item.video_path, ...((item.photos as Array<{ path?: string }> | null) ?? []).map((photo) => photo.path ?? "")]),
      ...(returnRows ?? []).flatMap((item) => ((item.photos as Array<{ path?: string }> | null) ?? []).map((photo) => photo.path ?? "")),
    ].filter(Boolean))];
    const { data: signedFiles, error: signedError } = paths.length
      ? await supabaseAdmin.storage.from("order-evidence").createSignedUrls(paths, 3600)
      : { data: [], error: null };
    if (signedError) console.error("[admin-trust] Evidence URL signing failed", signedError);
    const urlByPath = new Map((signedFiles ?? []).map((file) => [file.path, file.signedUrl ?? ""]));
    const withUrls = (photos: unknown) => ((photos as Array<{ path: string; kind?: string }> | null) ?? []).map((photo) => ({ ...photo, url: urlByPath.get(photo.path) ?? "" }));
    return {
      dispatch: (dispatchRows ?? []).map((item) => ({ ...item, photos: withUrls(item.photos), videoUrl: urlByPath.get(item.video_path) ?? "", order: orderById.get(item.order_id) ?? null })),
      returns: (returnRows ?? []).map((item) => ({ ...item, photos: withUrls(item.photos), order: orderById.get(item.order_id) ?? null })),
    };
  });
