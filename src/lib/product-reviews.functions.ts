import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const productInput = z.object({ productId: z.string().uuid() });
const reviewInput = productInput.extend({
  rating: z.number().int().min(1).max(5),
  displayName: z.string().trim().min(2).max(60),
  title: z.string().trim().min(3).max(100),
  body: z.string().trim().min(10).max(1500),
});
const publishableClient = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Product reviews are not configured yet.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
};

async function verifiedAccount(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error || !data.user) throw new Error("We could not verify your account. Please sign in again.");
  if (!data.user.email_confirmed_at || !data.user.email) {
    throw new Error("Confirm your email address before writing a review.");
  }
  return { user: data.user, email: data.user.email.trim().toLowerCase(), supabase: supabaseAdmin as any };
}

async function reviewEligibility(productId: string, userId: string) {
  const { user, email, supabase } = await verifiedAccount(userId);
  const { data: product, error: productError } = await supabase.from("brand_products")
    .select("id, status, brand_approved, brand_application_id")
    .eq("id", productId).maybeSingle();
  if (productError || !product || product.status !== "published" || !product.brand_approved) {
    return { canReview: false, reason: "This product is not available for reviews right now." };
  }
  const { data: brand } = await supabase.from("brand_applications")
    .select("status").eq("id", product.brand_application_id).maybeSingle();
  if (brand?.status !== "approved") {
    return { canReview: false, reason: "This product is not available for reviews right now." };
  }

  const [byUser, byEmail] = await Promise.all([
    supabase.from("brand_orders").select("id").eq("product_id", productId)
      .eq("status", "delivered").eq("customer_user_id", user.id).limit(1),
    supabase.from("brand_orders").select("id").eq("product_id", productId)
      .eq("status", "delivered").ilike("customer_email", email).limit(1),
  ]);
  if (byUser.error || byEmail.error) throw new Error("We could not check your delivered orders. Please try again.");
  const order = byUser.data?.[0] ?? byEmail.data?.[0];
  if (!order) return { canReview: false, reason: "You can review this item after its OFFFEED order is marked delivered." };

  const { data: existing, error: reviewError } = await supabase.from("product_reviews")
    .select("id").eq("product_id", productId).eq("customer_user_id", user.id).maybeSingle();
  if (reviewError && reviewError.code !== "42P01") throw new Error("We could not check your review status. Please try again.");
  if (existing) return { canReview: false, reason: "You have already reviewed this product." };
  return { canReview: true, reason: "", orderId: order.id };
}

export const getPublicProductReviews = createServerFn({ method: "GET" })
  .inputValidator((input) => productInput.parse(input))
  .handler(async ({ data }) => {
    const { data: reviews, error } = await (publishableClient() as any)
      .rpc("get_public_product_reviews", { p_product_id: data.productId });
    if (error) {
      console.error("[OFFFEED reviews] Public reviews could not be loaded:", error.message);
      throw new Error("Reviews are temporarily unavailable.");
    }
    return (reviews ?? []).map((review: any) => ({
      id: review.id as string,
      displayName: review.display_name as string,
      rating: Number(review.rating),
      title: review.title as string,
      body: review.body as string,
      verifiedPurchase: Boolean(review.verified_purchase),
      createdAt: review.created_at as string,
    }));
  });

export const getProductReviewEligibility = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => productInput.parse(input))
  .handler(async ({ data, context }) => reviewEligibility(data.productId, context.userId));

export const submitProductReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => reviewInput.parse(input))
  .handler(async ({ data, context }) => {
    const eligibility = await reviewEligibility(data.productId, context.userId);
    if (!eligibility.canReview || !eligibility.orderId) throw new Error(eligibility.reason || "This review cannot be submitted.");
    const { supabase } = await verifiedAccount(context.userId);
    const { data: review, error } = await supabase.from("product_reviews").insert({
      product_id: data.productId,
      brand_order_id: eligibility.orderId,
      customer_user_id: context.userId,
      display_name: data.displayName,
      rating: data.rating,
      title: data.title,
      body: data.body,
      status: "published",
    }).select("id").single();
    if (error) {
      if (error.code === "23505") throw new Error("You have already reviewed this product.");
      console.error("[OFFFEED reviews] Submission failed:", error.message);
      throw new Error("Your review could not be submitted. Please try again.");
    }
    return { id: review.id as string };
  });
