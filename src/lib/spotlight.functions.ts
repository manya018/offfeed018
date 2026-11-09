import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const OWNER_EMAIL = "manyagupta018@gmail.com";
const audienceSchema = z.enum(["her", "him", "home"]);

export const submitSpotlightCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    audience: audienceSchema,
    durationDays: z.union([z.literal(7), z.literal(14), z.literal(28)]),
    productIds: z.array(z.string().uuid()).min(2).max(20),
  }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data: brand, error: brandError } = await db.from("brand_applications")
      .select("id, brand_name, audience, status").eq("user_id", context.userId).eq("status", "approved").maybeSingle();
    if (brandError || !brand) throw new Error("An approved OFFFEED brand workspace is required to apply.");
    if (!brand.audience?.includes(data.audience)) throw new Error("This audience is not enabled for your brand.");
    const uniqueIds = [...new Set(data.productIds)];
    if (uniqueIds.length < 2) throw new Error("Choose at least two different products for your Spotlight feature.");
    const { data: products, error: productsError } = await db.from("brand_products")
      .select("id").eq("brand_application_id", brand.id).eq("status", "published")
      .eq("brand_approved", true).contains("audience", [data.audience]).in("id", uniqueIds);
    if (productsError || (products ?? []).length !== uniqueIds.length) {
      throw new Error("Choose only published, approved products available in the selected audience.");
    }
    const { data: campaign, error: campaignError } = await db.from("spotlight_campaigns").insert({
      brand_application_id: brand.id, user_id: context.userId, audience: data.audience,
      duration_days: data.durationDays, status: "submitted", payment_status: "pending",
    }).select("id").single();
    if (campaignError || !campaign) throw new Error("Your Spotlight application could not be submitted.");
    const { error: productError } = await db.from("spotlight_campaign_products").insert(
      uniqueIds.map((productId, position) => ({ campaign_id: campaign.id, product_id: productId, position }))
    );
    if (productError) {
      await db.from("spotlight_campaigns").delete().eq("id", campaign.id);
      throw new Error("The selected products could not be attached to your application.");
    }
    return { id: campaign.id, brandName: brand.brand_name, status: "submitted" as const };
  });

export const getMySpotlightCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data, error } = await db.from("spotlight_campaigns")
      .select("id, audience, duration_days, status, payment_status, campaign_price, starts_at, ends_at, admin_note, created_at, spotlight_campaign_products(product_id, position, brand_products(id, product_name, price))")
      .eq("user_id", context.userId).order("created_at", { ascending: false }).limit(30);
    if (error) throw new Error("Your Spotlight applications could not be loaded.");
    return data ?? [];
  });

export const getOwnerSpotlightCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = typeof context.claims.email === "string" ? context.claims.email.toLowerCase() : "";
    if (email !== OWNER_EMAIL) throw new Error("Forbidden: OFFFEED owner access is required.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data, error } = await db.from("spotlight_campaigns")
      .select("id, brand_application_id, audience, duration_days, status, payment_status, campaign_price, payment_reference, starts_at, ends_at, admin_note, created_at, brand_applications(brand_name,email), spotlight_campaign_products(product_id, position, brand_products(id, product_name, price, status, brand_approved))")
      .order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error("Spotlight applications could not be loaded.");
    return data ?? [];
  });

export const updateOwnerSpotlightCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    campaignId: z.string().uuid(),
    status: z.enum(["approved", "active", "rejected", "completed"]),
    paymentStatus: z.enum(["pending", "paid", "refunded", "waived"]),
    campaignPrice: z.number().min(0).max(10000000),
    paymentReference: z.string().max(180).optional().default(""),
    startsAt: z.string().datetime().optional(),
    adminNote: z.string().max(2000).optional().default(""),
  }).parse(input))
  .handler(async ({ context, data }) => {
    const email = typeof context.claims.email === "string" ? context.claims.email.toLowerCase() : "";
    if (email !== OWNER_EMAIL) throw new Error("Forbidden: OFFFEED owner access is required.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data: current, error: readError } = await db.from("spotlight_campaigns")
      .select("id, duration_days, status").eq("id", data.campaignId).maybeSingle();
    if (readError || !current) throw new Error("Spotlight campaign not found.");
    if (data.status === "active" && !["paid", "waived"].includes(data.paymentStatus)) {
      throw new Error("A campaign can only be activated after payment is confirmed or waived.");
    }
    if (data.status === "active" && !data.startsAt) throw new Error("Set a campaign start date before activating it.");
    const startsAt = data.status === "active" ? new Date(data.startsAt!).toISOString() : null;
    const endsAt = startsAt ? new Date(new Date(startsAt).getTime() + current.duration_days * 86400000).toISOString() : null;
    const { error } = await db.from("spotlight_campaigns").update({
      status: data.status, payment_status: data.paymentStatus, campaign_price: data.campaignPrice,
      payment_reference: data.paymentReference || null, starts_at: startsAt, ends_at: endsAt,
      admin_note: data.adminNote, updated_at: new Date().toISOString(),
    }).eq("id", data.campaignId);
    if (error) throw new Error("Spotlight campaign could not be updated.");
    return { id: data.campaignId, status: data.status, paymentStatus: data.paymentStatus, startsAt, endsAt };
  });

export const getActiveSpotlightCampaigns = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ audience: audienceSchema }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const now = new Date().toISOString();
    const { data: campaigns, error } = await db.from("spotlight_campaigns")
      .select("id, audience, duration_days, starts_at, ends_at, brand_applications(id, brand_name, public_handle, category), spotlight_campaign_products(product_id, position, brand_products(id, product_name, description, category, price, product_url, image_path, image_paths, sizes, size_chart, colors, tags, audience, created_at, status, brand_approved))")
      .eq("audience", data.audience).eq("status", "active").eq("payment_status", "paid")
      .lte("starts_at", now).gt("ends_at", now).order("starts_at", { ascending: false }).limit(30);
    if (error) throw new Error("Spotlight features could not be loaded.");
    const rows = (campaigns ?? []).flatMap((campaign: any) => {
      const brand = campaign.brand_applications;
      const selected = (campaign.spotlight_campaign_products ?? [])
        .filter((item: any) => item.brand_products?.status === "published" && item.brand_products?.brand_approved)
        .sort((a: any, b: any) => a.position - b.position)
        .map((item: any) => ({ ...item.brand_products, brand }));
      if (!brand?.public_handle || selected.length < 2) return [];
      const week = Math.floor(Date.now() / 604800000);
      const offset = week % selected.length;
      const rotated = [...selected.slice(offset), ...selected.slice(0, offset)];
      return [{ id: campaign.id, brandName: brand.brand_name, brandHandle: brand.public_handle, audience: campaign.audience, products: rotated }];
    });
    const paths = [...new Set(rows.flatMap((campaign: any) => campaign.products.flatMap((product: any) =>
      [product.image_path, ...(product.image_paths ?? [])].filter((path: unknown): path is string => typeof path === "string" && !path.startsWith("https://"))
    ))];
    const { data: signed, error: signError } = paths.length
      ? await db.storage.from("brand-product-images").createSignedUrls(paths, 3600)
      : { data: [], error: null };
    if (signError) throw new Error("Spotlight product images could not be loaded.");
    const signedMap = new Map((signed ?? []).map((item: any) => [item.path, item.signedUrl]));
    return rows.map((campaign: any) => ({
      ...campaign,
      products: campaign.products.map((product: any) => ({
        id: product.id, productName: product.product_name, description: product.description,
        category: product.category, price: Number(product.price), productUrl: product.product_url,
        imageUrl: product.image_path?.startsWith("https://") ? product.image_path : signedMap.get(product.image_path) ?? null,
        imageUrls: (product.image_paths?.length ? product.image_paths : product.image_path ? [product.image_path] : [])
          .map((path: string) => path.startsWith("https://") ? path : signedMap.get(path)).filter(Boolean),
        sizes: product.sizes ?? [], sizeChart: product.size_chart ?? null, colors: product.colors ?? [],
        tags: product.tags ?? [], audience: product.audience ?? [], createdAt: product.created_at,
        brand: { name: campaign.brandName, handle: campaign.brandHandle, category: product.category },
      })),
    }));
  });
