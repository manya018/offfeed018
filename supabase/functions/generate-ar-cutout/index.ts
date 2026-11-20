import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Please sign in again." }, 401);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const removeBgKey = Deno.env.get("REMOVE_BG_API_KEY");
    if (!supabaseUrl || !anonKey || !removeBgKey) {
      console.error("AR background removal is missing server configuration.");
      return json({ error: "Automatic AR image processing is not configured yet." }, 503);
    }

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Your sign-in has expired. Please sign in again." }, 401);

    const body = await request.json();
    const productId = typeof body.productId === "string" ? body.productId : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productId)) {
      return json({ error: "Invalid product." }, 400);
    }

    const { data: product, error: productError } = await supabase
      .from("brand_products")
      .select("id,user_id,image_path,category,product_name,brand_application_id")
      .eq("id", productId)
      .eq("user_id", user.id)
      .single();
    if (productError || !product) return json({ error: "Product not found in your brand account." }, 404);
    if (!/earring|stud|hoop|jhumka|drop/i.test(product.category + " " + product.product_name)) {
      return json({ error: "Automatic AR cutouts are currently available for earrings only." }, 400);
    }
    const { data: application } = await supabase
      .from("brand_applications")
      .select("id,status")
      .eq("id", product.brand_application_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!application || application.status !== "approved") {
      return json({ error: "Only approved brand accounts can process product images." }, 403);
    }

    let sourceBlob: Blob;
    if (product.image_path.startsWith(user.id + "/")) {
      const { data, error } = await supabase.storage.from("brand-product-images").download(product.image_path);
      if (error || !data) return json({ error: "The original product photo could not be found." }, 422);
      sourceBlob = data;
    } else if (/^https:\/\/(cdn\.shopify\.com|[^/]+\.myshopify\.com|[^/]+\.shopifycdn\.net)\//i.test(product.image_path)) {
      const imageResponse = await fetch(product.image_path, { signal: AbortSignal.timeout(15000) });
      if (!imageResponse.ok) return json({ error: "The original Shopify photo could not be downloaded." }, 422);
      sourceBlob = await imageResponse.blob();
    } else {
      return json({ error: "This product photo source cannot be processed." }, 422);
    }
    if (sourceBlob.size > 12 * 1024 * 1024) return json({ error: "The product photo must be 12 MB or smaller." }, 413);
    if (!sourceBlob.type.startsWith("image/")) return json({ error: "The product photo is not a supported image." }, 415);

    const form = new FormData();
    form.append("image_file", sourceBlob, "product-image");
    form.append("size", "auto");
    const removeResponse = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: { "X-Api-Key": removeBgKey },
      body: form,
      signal: AbortSignal.timeout(45000),
    });
    if (!removeResponse.ok) {
      const providerMessage = (await removeResponse.text()).slice(0, 300);
      console.error("remove.bg processing failed:", removeResponse.status, providerMessage);
      return json({ error: removeResponse.status === 402 || removeResponse.status === 403
        ? "The background-removal service has no available credits or needs billing attention."
        : "The background could not be removed. Please retry or upload a transparent PNG manually." }, 502);
    }

    const cutout = await removeResponse.blob();
    if (cutout.size > 8 * 1024 * 1024 || cutout.type !== "image/png") {
      return json({ error: "The processed AR image was not a valid PNG under 8 MB." }, 502);
    }
    const path = user.id + "/" + crypto.randomUUID() + "-ar.png";
    const { error: uploadError } = await supabase.storage.from("brand-product-images").upload(path, cutout, {
      contentType: "image/png", cacheControl: "3600", upsert: false,
    });
    if (uploadError) return json({ error: "The transparent image could not be saved. Please retry." }, 500);

    const { error: updateError } = await supabase.from("brand_products")
      .update({ ar_image_path: path })
      .eq("id", productId)
      .eq("user_id", user.id);
    if (updateError) {
      await supabase.storage.from("brand-product-images").remove([path]);
      return json({ error: "The AR image was created but could not be linked to the product." }, 500);
    }
    return json({ success: true, message: "Transparent AR cutout created and saved." }, 200);
  } catch (error) {
    console.error("AR background removal error:", error);
    return json({ error: "Image processing failed. Please retry in a moment." }, 500);
  }
});

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
