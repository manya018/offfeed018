import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const OWNER_EMAIL = "manyagupta018@gmail.com";
const audienceSchema = z.enum(["her", "him", "home"]);

export const getSpotlightAvailability = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    audience: audienceSchema,
    durationDays: z.union([z.literal(7), z.literal(14), z.literal(28)]),
  }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const now = new Date();
    const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const day = monday.getUTCDay();
    monday.setUTCDate(monday.getUTCDate() - ((day + 6) % 7) + 7);
    const makeWeeks = (rows: any[] = [], setupRequired = false) => Array.from({ length: 12 }, (_, index) => {
      const start = new Date(monday);
      start.setUTCDate(start.getUTCDate() + index * 7);
      const weekDate = start.toISOString().slice(0, 10);
      const weeks = data.durationDays / 7;
      const weeklyCounts = Array.from({ length: weeks }, (_, weekIndex) => {
        const target = new Date(start);
        target.setUTCDate(target.getUTCDate() + weekIndex * 7);
        const targetDate = target.toISOString().slice(0, 10);
        const brands = new Set(rows.filter((row: any) => {
          if (row.audience !== data.audience || !row.scheduled_week) return false;
          const rowEnd = new Date(row.scheduled_week + "T00:00:00Z");
          rowEnd.setUTCDate(rowEnd.getUTCDate() + row.duration_days);
          return row.scheduled_week <= targetDate && rowEnd.toISOString().slice(0, 10) > targetDate
            && !["rejected", "cancelled"].includes(row.status);
        }).map((row: any) => row.brand_application_id));
        return brands.size;
      });
      const slotsLeft = Math.max(0, 10 - Math.max(...weeklyCounts));
      const alreadyBookedThisMonth = rows.some((row: any) =>
        row.brand_application_id === context.userId && row.scheduled_week?.slice(0, 7) === weekDate.slice(0, 7)
        && !["rejected", "cancelled"].includes(row.status));
      return { startWeek: weekDate, slotsLeft, available: !setupRequired && slotsLeft > 0 && !alreadyBookedThisMonth, weeklyCounts, alreadyBookedThisMonth, setupRequired };
    });
    const { data: myBrand, error: brandError } = await db.from("brand_applications")
      .select("id").eq("user_id", context.userId).eq("status", "approved").maybeSingle();
    if (brandError) throw new Error("Your approved brand account could not be verified.");
    const { data: rows, error } = await db.from("spotlight_campaigns")
      .select("brand_application_id, audience, scheduled_week, duration_days, status")
      .not("scheduled_week", "is", null);
    if (error) {
      // A missing scheduled_week column means the SQL migration has not yet been applied.
      if (error.code === "42703" || /scheduled_week.*(does not exist|schema cache)|column.*scheduled_week/i.test(error.message ?? "")) {
        return { weeks: makeWeeks(), setupRequired: true };
      }
      throw new Error("Spotlight availability could not be loaded. Please try again.");
    }
    const brandId = myBrand?.id;
    const enrichedRows = (rows ?? []).map((row: any) => ({ ...row, _currentBrand: brandId }));
    const weeks = makeWeeks(enrichedRows);
    return { weeks: weeks.map((week: any) => ({
      ...week,
      alreadyBookedThisMonth: (rows ?? []).some((row: any) => row.brand_application_id === brandId
        && row.scheduled_week?.slice(0, 7) === week.startWeek.slice(0, 7)
        && !["rejected", "cancelled"].includes(row.status)),
      available: week.available && !(rows ?? []).some((row: any) => row.brand_application_id === brandId
        && row.scheduled_week?.slice(0, 7) === week.startWeek.slice(0, 7)
        && !["rejected", "cancelled"].includes(row.status)),
    })), setupRequired: false };
  });

export const submitSpotlightCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    audience: audienceSchema,
    durationDays: z.union([z.literal(7), z.literal(14), z.literal(28)]),
    startWeek: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/),
  }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data: bookingId, error } = await db.rpc("create_spotlight_booking", {
      p_audience: data.audience, p_duration_days: data.durationDays,
      p_start_week: data.startWeek, p_user_id: context.userId,
    });
    if (error || !bookingId) throw new Error(error?.message || "Your Spotlight slot could not be reserved.");
    return { id: bookingId, status: "submitted" as const, startWeek: data.startWeek };
  });

export const submitSpotlightProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    campaignId: z.string().uuid(),
    productIds: z.array(z.string().uuid()).min(2).max(4),
  }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data: campaign, error: campaignError } = await db.from("spotlight_campaigns")
      .select("id, brand_application_id, audience, status, payment_status").eq("id", data.campaignId)
      .eq("user_id", context.userId).maybeSingle();
    if (campaignError || !campaign) throw new Error("Spotlight application not found.");
    if (campaign.status !== "approved" || !["paid", "waived"].includes(campaign.payment_status)) throw new Error("Product selection unlocks only after OFFFEED approves the booking and confirms payment.");
    const { data: existing, error: existingError } = await db.from("spotlight_campaign_products")
      .select("product_id").eq("campaign_id", campaign.id);
    if (existingError) throw new Error("Existing Spotlight products could not be checked.");
    if ((existing ?? []).length) throw new Error("Products have already been submitted for this Spotlight campaign.");
    const uniqueIds = [...new Set(data.productIds)];
    if (uniqueIds.length < 2 || uniqueIds.length > 4) throw new Error("Choose between two and four products.");
    const { data: products, error: productsError } = await db.from("brand_products")
      .select("id").eq("brand_application_id", campaign.brand_application_id).eq("status", "published")
      .contains("audience", [campaign.audience]).in("id", uniqueIds);
    if (productsError || (products ?? []).length !== uniqueIds.length) {
      throw new Error("Choose only published products from your own collection that match this campaign audience.");
    }
    const { error: insertError } = await db.from("spotlight_campaign_products").insert(
      uniqueIds.map((productId, position) => ({ campaign_id: campaign.id, product_id: productId, position }))
    );
    if (insertError) throw new Error("Your selected Spotlight products could not be submitted.");
    return { campaignId: campaign.id, productCount: uniqueIds.length };
  });

export const getMySpotlightCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data, error } = await db.from("spotlight_campaigns")
      .select("id, audience, duration_days, status, payment_status, campaign_price, scheduled_week, starts_at, ends_at, admin_note, created_at, spotlight_campaign_products(product_id, position, brand_products(id, product_name, price))")
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
      .select("id, brand_application_id, audience, duration_days, status, payment_status, campaign_price, payment_reference, scheduled_week, starts_at, ends_at, admin_note, created_at, brand_applications(brand_name,email), spotlight_campaign_products(product_id, position, brand_products(id, product_name, price, status))")
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
      .select("id, duration_days, status, audience, brand_application_id").eq("id", data.campaignId).maybeSingle();
    if (readError || !current) throw new Error("Spotlight campaign not found.");
    if (data.status === "active" && !["paid", "waived"].includes(data.paymentStatus)) {
      throw new Error("A campaign can only be activated after payment is confirmed or waived.");
    }
    if (data.status === "active" && !data.startsAt) throw new Error("Set a campaign start date before activating it.");
    const startsAt = data.status === "active" ? new Date(data.startsAt!).toISOString() : null;
    const endsAt = startsAt ? new Date(new Date(startsAt).getTime() + current.duration_days * 86400000).toISOString() : null;
    if (data.status === "active" && startsAt && endsAt) {
      const { data: overlapping, error: capacityError } = await db.from("spotlight_campaigns")
        .select("brand_application_id, starts_at, ends_at")
        .eq("audience", current.audience).eq("status", "active").in("payment_status", ["paid", "waived"])
        .neq("brand_application_id", current.brand_application_id);
      if (capacityError) throw new Error("Spotlight capacity could not be checked. Please try again.");
      const overlappingBrands = new Set((overlapping ?? [])
        .filter((item: any) => item.starts_at && item.ends_at
          && new Date(item.starts_at).getTime() < new Date(endsAt).getTime()
          && new Date(item.ends_at).getTime() > new Date(startsAt).getTime())
        .map((item: any) => item.brand_application_id));
      if (overlappingBrands.size >= 10) {
        throw new Error("This audience has reached its limit of 10 Spotlight brands for the selected dates. Choose another campaign period.");
      }
    }
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
      .eq("audience", data.audience).eq("status", "active").in("payment_status", ["paid", "waived"])
      .lte("starts_at", now).gt("ends_at", now).order("starts_at", { ascending: false }).limit(30);
    if (error) throw new Error("Spotlight features could not be loaded.");
    const rows = (campaigns ?? []).flatMap((campaign: any) => {
      const brand = campaign.brand_applications;
      const selected = (campaign.spotlight_campaign_products ?? [])
        .filter((item: any) => item.brand_products?.status === "published")
        .sort((a: any, b: any) => a.position - b.position)
        .map((item: any) => ({ ...item.brand_products, brand }));
      if (!brand?.public_handle || selected.length < 2) return [];
      const week = Math.floor(Date.now() / 604800000);
      const offset = week % selected.length;
      const rotated = [...selected.slice(offset), ...selected.slice(0, offset)];
      return [{ id: campaign.id, brandApplicationId: brand.id, brandName: brand.brand_name, brandHandle: brand.public_handle, audience: campaign.audience, products: rotated.slice(0, 4) }];
    });
    // One row per brand; show at most ten distinct brands in each audience.
    const seenBrands = new Set<string>();
    const cappedRows = rows.filter((campaign: any) => {
      if (seenBrands.has(campaign.brandApplicationId)) return false;
      if (seenBrands.size >= 10) return false;
      seenBrands.add(campaign.brandApplicationId);
      return true;
    });
    const paths = [...new Set(cappedRows.flatMap((campaign: any) => campaign.products.flatMap((product: any) =>
      [product.image_path, ...(product.image_paths ?? [])].filter((path: unknown): path is string => typeof path === "string" && !path.startsWith("https://"))
    )))];
    const { data: signed, error: signError } = paths.length
      ? await db.storage.from("brand-product-images").createSignedUrls(paths, 3600)
      : { data: [], error: null };
    if (signError) throw new Error("Spotlight product images could not be loaded.");
    const signedMap = new Map((signed ?? []).map((item: any) => [item.path, item.signedUrl]));
    return cappedRows.map((campaign: any) => ({
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


export const recordSpotlightEvent = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({
    campaignId: z.string().uuid(), productId: z.string().uuid(),
    eventType: z.enum(["view", "click", "save"]),
    visitorId: z.string().min(8).max(100),
  }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const now = new Date().toISOString();
    const { data: campaign, error } = await db.from("spotlight_campaigns")
      .select("id").eq("id", data.campaignId).eq("status", "active").eq("payment_status", "paid")
      .lte("starts_at", now).gt("ends_at", now).maybeSingle();
    if (error || !campaign) return { recorded: false };
    const { data: selected } = await db.from("spotlight_campaign_products").select("product_id")
      .eq("campaign_id", data.campaignId).eq("product_id", data.productId).maybeSingle();
    if (!selected) return { recorded: false };
    await db.from("spotlight_analytics_events").insert({
      campaign_id: data.campaignId, product_id: data.productId, event_type: data.eventType,
      visitor_id: data.visitorId,
    });
    return { recorded: true };
  });

export const getMySpotlightPerformance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    const { data: campaigns, error: campaignError } = await db.from("spotlight_campaigns")
      .select("id, audience, duration_days, status, payment_status, starts_at, ends_at, created_at")
      .eq("user_id", context.userId).order("created_at", { ascending: false }).limit(50);
    if (campaignError) throw new Error("Your Spotlight campaigns could not be loaded.");

    if (!campaigns?.length) return [];

    const ids = campaigns.map((item: any) => item.id);
    const { data: selectedProducts, error: selectedError } = await db.from("spotlight_campaign_products")
      .select("campaign_id, product_id, position").in("campaign_id", ids).order("position");
    if (selectedError) throw new Error("Your Spotlight campaign products could not be loaded.");

    const productIds = [...new Set((selectedProducts ?? []).map((item: any) => item.product_id))];
    const { data: productRows } = productIds.length
      ? await db.from("brand_products").select("id, product_name").in("id", productIds)
      : { data: [], error: null };
    const productNames = new Map((productRows ?? []).map((item: any) => [item.id, item.product_name]));

    // Optional engagement table: the report still loads with zeros until its migration is applied.
    const { data: eventRows, error: eventError } = await db.from("spotlight_analytics_events")
      .select("campaign_id, product_id, event_type, visitor_id, created_at").in("campaign_id", ids);
    const analyticsReady = !eventError;
    const events = eventRows ?? [];

    // Orders are matched to the selected campaign products and campaign dates.
    const { data: orderRows, error: orderError } = productIds.length
      ? await db.from("brand_orders").select("product_id, quantity, created_at, status")
          .eq("brand_user_id", context.userId).in("product_id", productIds).neq("status", "cancelled")
      : { data: [], error: null };
    const orders = orderError ? [] : (orderRows ?? []);

    return campaigns.map((campaign: any) => {
      const campaignProducts = (selectedProducts ?? []).filter((item: any) => item.campaign_id === campaign.id);
      const campaignProductIds = new Set(campaignProducts.map((item: any) => item.product_id));
      const campaignEvents = events.filter((event: any) => event.campaign_id === campaign.id);
      const start = campaign.starts_at ? new Date(campaign.starts_at).getTime() : Infinity;
      const end = campaign.ends_at ? new Date(campaign.ends_at).getTime() : -Infinity;
      const inCampaign = (date: string) => {
        const value = new Date(date).getTime();
        return value >= start && value <= end;
      };
      const uniqueCount = (rows: any[], type: string) => new Set(
        rows.filter((event: any) => event.event_type === type)
          .map((event: any) => event.visitor_id + ":" + event.product_id)
      ).size;
      const purchases = orders.filter((order: any) => campaignProductIds.has(order.product_id) && inCampaign(order.created_at));
      const weeklyReports = campaign.starts_at ? Array.from({ length: campaign.duration_days / 7 }, (_, index) => {
        const weekStart = start + index * 7 * 86400000;
        const weekEnd = Math.min(weekStart + 7 * 86400000, end);
        const inWeek = (date: string) => {
          const value = new Date(date).getTime();
          return value >= weekStart && value < weekEnd;
        };
        const weekEvents = campaignEvents.filter((event: any) => inWeek(event.created_at));
        const weekOrders = purchases.filter((order: any) => inWeek(order.created_at));
        return {
          week: index + 1,
          views: uniqueCount(weekEvents, "view"),
          clicks: uniqueCount(weekEvents, "click"),
          saves: uniqueCount(weekEvents, "save"),
          purchases: weekOrders.reduce((sum: number, order: any) => sum + Number(order.quantity || 0), 0),
        };
      }) : [];
      return {
        id: campaign.id, audience: campaign.audience, durationDays: campaign.duration_days,
        status: campaign.status, paymentStatus: campaign.payment_status,
        startsAt: campaign.starts_at, endsAt: campaign.ends_at,
        productNames: campaignProducts.map((item: any) => productNames.get(item.product_id)).filter(Boolean),
        views: uniqueCount(campaignEvents, "view"),
        clicks: uniqueCount(campaignEvents, "click"),
        saves: uniqueCount(campaignEvents, "save"),
        purchases: purchases.reduce((sum: number, order: any) => sum + Number(order.quantity || 0), 0),
        weeklyReports, analyticsReady, purchaseDataReady: !orderError,
      };
    });
  });
