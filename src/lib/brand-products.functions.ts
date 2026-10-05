import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const audienceValues = ["her", "him"] as const;
const productSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().min(10).max(2000),
  category: z.string().trim().min(1).max(80),
  price: z.number().positive().max(100000000),
  productUrl: z.string().url().max(2048).optional().nullable(),
  imagePath: z.string().min(1).max(2048),
  sizes: z.array(z.string().trim().min(1).max(40)).max(30),
  colors: z.array(z.string().trim().min(1).max(60)).max(30),
  tags: z.array(z.string().trim().min(1).max(40)).max(30),
  audience: z.array(z.enum(audienceValues)).min(1),
});

const importSchema = z.object({ website: z.string().url().max(2048) });
const importedProductsSchema = z.object({
  audience: z.array(z.enum(audienceValues)).min(1),
  products: z.array(z.object({
    name: z.string().trim().min(2).max(160),
    description: z.string().trim().min(10).max(2000),
    category: z.string().trim().min(1).max(80),
    price: z.number().positive().max(100000000),
    productUrl: z.string().url().max(2048),
    imageUrl: z.string().url().max(2048),
    sizes: z.array(z.string().trim().min(1).max(40)).max(30),
    colors: z.array(z.string().trim().min(1).max(60)).max(30),
  })).min(1).max(25),
});
const shopifyFeedSchema = z.object({
  products: z.array(z.object({
    id: z.union([z.string(), z.number()]),
    title: z.string(),
    handle: z.string(),
    body_html: z.string().nullable().optional(),
    images: z.array(z.object({ src: z.string() })).optional(),
    options: z.array(z.object({ name: z.string(), values: z.array(z.string()) })).optional(),
    variants: z.array(z.object({
      price: z.string(),
      available: z.boolean().optional(),
      option1: z.string().nullable().optional(),
      option2: z.string().nullable().optional(),
      option3: z.string().nullable().optional(),
    })).optional(),
  })).max(100),
});

type ShopifyProduct = z.infer<typeof shopifyFeedSchema>["products"][number];

async function getApprovedApplication(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("brand_applications")
    .select("id, brand_name, status, audience, commission_rate, website_url")
    .eq("user_id", context.userId)
    .maybeSingle();
  if (error || !data) throw new Error("We couldn't find your brand application.");
  if (data.status !== "approved") throw new Error("Product listing opens after your brand is approved.");
  return data;
}

function normalizedHost(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) {
    throw new Error("Use your registered HTTPS store address to import products.");
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (!host.includes(".") || host === "localhost" || /^\d+(\.\d+){3}$/.test(host) || host.includes(":")) {
    throw new Error("That store address can't be used for importing.");
  }
  return { host, origin: url.origin };
}

async function readLimitedJson(response: Response) {
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > 5_000_000) throw new Error("The product feed is too large to import safely.");
  if (!response.body) throw new Error("The store returned an empty product feed.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > 5_000_000) {
      await reader.cancel();
      throw new Error("The product feed is too large to import safely.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
}

function cleanDescription(value: string | null | undefined) {
  return (value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 2000);
}

function mapShopifyProduct(product: ShopifyProduct, origin: string) {
  const variants = product.variants ?? [];
  const variant = variants.find((item) => item.available !== false && Number.isFinite(Number(item.price)) && Number(item.price) > 0)
    ?? variants.find((item) => Number.isFinite(Number(item.price)) && Number(item.price) > 0);
  const price = Number(variant?.price);
  if (!Number.isFinite(price) || price <= 0) return null;

  const options = product.options ?? [];
  const collectOption = (terms: RegExp) => {
    const optionIndex = options.findIndex((option) => terms.test(option.name));
    if (optionIndex < 0) return [];
    const key = `option${optionIndex + 1}` as "option1" | "option2" | "option3";
    return [...new Set(variants.map((item) => item[key]?.trim()).filter((value): value is string => Boolean(value && value.toLowerCase() !== "default title")))].slice(0, 30);
  };
  const image = product.images?.find((item) => item.src.startsWith("https://") && (() => {
    try {
      const host = new URL(item.src).hostname.toLowerCase();
      return host === "cdn.shopify.com" || host.endsWith(".myshopify.com") || host.endsWith(".shopifycdn.net");
    } catch { return false; }
  })())?.src ?? null;

  return {
    externalId: String(product.id),
    name: product.title.trim().slice(0, 160),
    description: cleanDescription(product.body_html) || "Imported from the brand's Shopify catalog. Add a product description before publishing.",
    price,
    productUrl: `${origin}/products/${encodeURIComponent(product.handle)}`,
    imagePath: image,
    sizes: collectOption(/size/i),
    colors: collectOption(/colou?r/i),
    category: "Fashion",
  };
}

export const getBrandWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: application, error } = await context.supabase
      .from("brand_applications")
      .select("id, brand_name, status, audience, commission_rate, website_url")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error || !application) throw new Error("No brand application is connected to this account.");

    const { data: products, error: productError } = application.status === "approved"
      ? await context.supabase.from("brand_products").select("id, product_name, description, category, price, product_url, image_path, sizes, colors, tags, audience, source, status, created_at").eq("user_id", context.userId).order("created_at", { ascending: false })
      : { data: [], error: null };
    if (productError) throw new Error("Your product list couldn't be loaded.");
    return { application, products: products ?? [] };
  });

export const importShopifyCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => importSchema.parse(input))
  .handler(async ({ context, data }) => {
    const application = await getApprovedApplication(context);
    const registered = normalizedHost(application.website_url);
    const requested = normalizedHost(data.website);
    if (registered.host !== requested.host) throw new Error("For your safety, import only works with the website on your approved brand application.");

    const collected = new Map<string, NonNullable<ReturnType<typeof mapShopifyProduct>>>();
    for (let page = 1; page <= 10; page += 1) {
      const feedUrl = new URL("/products.json", requested.origin);
      feedUrl.searchParams.set("limit", "100");
      feedUrl.searchParams.set("page", String(page));
      let response: Response;
      try {
        response = await fetch(feedUrl, { headers: { Accept: "application/json" }, redirect: "manual", signal: AbortSignal.timeout(8000) });
      } catch {
        throw new Error("We couldn't reach the store's product feed. Check the website address and try again.");
      }
      if (!response.ok || response.status >= 300) {
        if (page > 1 && response.status === 404) break;
        throw new Error("This store doesn't expose a Shopify product catalog. You can list products manually instead.");
      }
      if (!(response.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) {
        throw new Error("The store's product feed isn't available as Shopify catalog data. Use manual listing instead.");
      }
      let parsed: ReturnType<typeof shopifyFeedSchema.safeParse>;
      try { parsed = shopifyFeedSchema.safeParse(await readLimitedJson(response)); }
      catch { throw new Error("The store's product feed couldn't be read. Use manual listing instead."); }
      if (!parsed.success) throw new Error("The store returned an unsupported product feed. Use manual listing instead.");
      for (const item of parsed.data.products) collected.set(String(item.id), mapShopifyProduct(item, requested.origin));
      if (parsed.data.products.length < 100) break;
    }
    const products = [...collected.values()].filter((product): product is NonNullable<typeof product> => product !== null);
    return { products, truncated: products.length >= 1000 };
  });

export const createBrandProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => productSchema.parse(input))
  .handler(async ({ context, data }) => {
    const application = await getApprovedApplication(context);
    if (data.audience.some((audience) => !application.audience.includes(audience))) throw new Error("Choose only the audience saved on your brand application.");
    const remoteImage = data.imagePath.startsWith("https://") && data.imagePath.length <= 2048;
    const ownedImage = data.imagePath.startsWith(`${context.userId}/`);
    if (!remoteImage && !ownedImage) throw new Error("The selected product image couldn't be verified.");
    if (remoteImage && !data.imagePath.match(/^https:\/\/(cdn\.shopify\.com|[^/]+\.myshopify\.com|[^/]+\.shopifycdn\.net)\//i)) throw new Error("Choose an image from the verified Shopify catalog.");

    const { data: product, error } = await context.supabase.from("brand_products").insert({
      brand_application_id: application.id,
      user_id: context.userId,
      product_name: data.name,
      description: data.description,
      category: data.category,
      price: data.price,
      product_url: data.productUrl ?? null,
      image_path: data.imagePath,
      sizes: data.sizes,
      colors: data.colors,
      tags: data.tags,
      audience: data.audience,
      source: remoteImage ? "shopify" : "manual",
      status: "draft",
    }).select("id, product_name, status").single();
    if (error || !product) throw new Error("This product couldn't be saved. Please check the details and try again.");
    return product;
  });

export const saveImportedShopifyProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => importedProductsSchema.parse(input))
  .handler(async ({ context, data }) => {
    const application = await getApprovedApplication(context);
    const registered = normalizedHost(application.website_url);
    if (data.audience.some((audience) => !application.audience.includes(audience))) throw new Error("Choose only the audience saved on your brand application.");
    const productOrigin = new URL(data.products[0]?.productUrl ?? "").origin;
    if (normalizedHost(productOrigin).host !== registered.host) throw new Error("The catalog products don't match your registered store.");

    const { data: currentRows, error: listError } = await context.supabase
      .from("brand_products").select("product_url").eq("user_id", context.userId).eq("source", "shopify");
    if (listError) throw new Error("Your existing catalog couldn't be checked.");
    const existingUrls = new Set((currentRows ?? []).map((row: { product_url: string | null }) => row.product_url));
    const inserted: Array<{ id: string; product_name: string; status: string }> = [];

    for (const product of data.products) {
      const productUrl = new URL(product.productUrl);
      if (productUrl.origin !== registered.origin || existingUrls.has(productUrl.toString())) continue;
      const imageUrl = new URL(product.imageUrl);
      const imageHost = imageUrl.hostname.toLowerCase();
      if (imageUrl.protocol !== "https:" || !(imageHost === "cdn.shopify.com" || imageHost.endsWith(".myshopify.com") || imageHost.endsWith(".shopifycdn.net"))) continue;

      let imageResponse: Response;
      try { imageResponse = await fetch(imageUrl, { redirect: "manual", signal: AbortSignal.timeout(8000) }); }
      catch { continue; }
      const contentType = (imageResponse.headers.get("content-type") ?? "").split(";")[0]?.toLowerCase();
      if (!imageResponse.ok || imageResponse.status >= 300 || !["image/jpeg", "image/png", "image/webp"].includes(contentType ?? "")) continue;
      const declaredSize = Number(imageResponse.headers.get("content-length") ?? 0);
      if (declaredSize > 20 * 1024 * 1024) continue;
      const imageBytes = new Uint8Array(await imageResponse.arrayBuffer());
      if (!imageBytes.byteLength || imageBytes.byteLength > 20 * 1024 * 1024) continue;

      const extension = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
      const imagePath = `${context.userId}/${crypto.randomUUID()}-catalog.${extension}`;
      const { error: uploadError } = await context.supabase.storage.from("brand-product-images").upload(imagePath, imageBytes, { contentType, upsert: false, cacheControl: "3600" });
      if (uploadError) continue;

      const { data: saved, error } = await context.supabase.from("brand_products").insert({
        brand_application_id: application.id,
        user_id: context.userId,
        product_name: product.name,
        description: product.description,
        category: product.category,
        price: product.price,
        product_url: productUrl.toString(),
        image_path: imagePath,
        sizes: product.sizes,
        colors: product.colors,
        tags: [],
        audience: data.audience,
        source: "shopify",
        status: "draft",
      }).select("id, product_name, status").single();
      if (error || !saved) {
        await context.supabase.storage.from("brand-product-images").remove([imagePath]);
        continue;
      }
      inserted.push(saved);
      existingUrls.add(productUrl.toString());
    }
    return { imported: inserted.length, products: inserted };
  });

export const updateBrandProductStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), status: z.enum(["draft", "published"]) }).parse(input))
  .handler(async ({ context, data }) => {
    await getApprovedApplication(context);
    const { data: product, error } = await context.supabase.from("brand_products").update({ status: data.status }).eq("id", data.id).eq("user_id", context.userId).select("id, status").single();
    if (error || !product) throw new Error("That product couldn't be updated.");
    return product;
  });