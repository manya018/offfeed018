import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const profileInput = z.object({ brandHandle: z.string().trim().min(1).max(180) });
const shopInput = z.object({
  audience: z.enum(["her", "him"]),
  aesthetic: z.string().trim().min(1).max(80),
});

type Audience = "her" | "him";

type ProductWithBrand = {
  id: string;
  productName: string;
  description: string;
  category: string;
  price: number;
  productUrl: string | null;
  imageUrl: string | null;
  sizes: string[];
  colors: string[];
  tags: string[];
  audience: string[];
  createdAt: string;
  brand: {
    name: string;
    handle: string;
    category: string;
  };
};

function createPublicClient(url: string, key: string) {
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
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
}

function getImageUrl(path: string | null, signedUrls: Map<string, string>) {
  if (!path) return null;
  if (!path.startsWith("https://")) return signedUrls.get(path) ?? null;
  try {
    const host = new URL(path).hostname.toLowerCase();
    return host === "cdn.shopify.com" || host.endsWith(".myshopify.com") || host.endsWith(".shopifycdn.net")
      ? path
      : null;
  } catch {
    return null;
  }
}

function relevanceScore(product: ProductWithBrand, aesthetic: string) {
  const tokens = aesthetic.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2);
  const searchable = [product.productName, product.category, product.description, ...product.tags]
    .join(" ")
    .toLowerCase();
  return tokens.reduce((score, token) => score + (searchable.includes(token) ? 1 : 0), 0);
}

export const getPublicBrandProfile = createServerFn({ method: "GET" })
  .inputValidator((input) => profileInput.parse(input))
  .handler(async ({ data }) => {
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) throw new Error("The brand storefront is temporarily unavailable.");
    const supabase = createPublicClient(url, key);

    const { data: brand, error } = await supabase
      .from("brand_applications")
      .select("id, public_handle, brand_name, category, brand_description, website_url, social_handle, logo_path, cover_path, audience")
      .eq("public_handle", data.brandHandle)
      .eq("status", "approved")
      .maybeSingle();
    if (error) throw new Error("This brand storefront could not be loaded.");
    if (!brand?.public_handle) return null;

    const { data: rows, error: productsError } = await supabase
      .from("brand_products")
      .select("id, product_name, description, category, price, product_url, image_path, sizes, colors, tags, audience, created_at")
      .eq("brand_application_id", brand.id)
      .eq("status", "published")
      .eq("brand_approved", true)
      .order("created_at", { ascending: false })
      .limit(120);
    if (productsError) throw new Error("This brand’s products could not be loaded.");

    const productPaths = [...new Set((rows ?? []).map((row) => row.image_path).filter((path): path is string => Boolean(path && !path.startsWith("https://"))))];
    const brandPaths = [...new Set([brand.logo_path, brand.cover_path])];
    const [productFiles, brandFiles] = await Promise.all([
      productPaths.length ? supabase.storage.from("brand-product-images").createSignedUrls(productPaths, 3600) : Promise.resolve({ data: [], error: null }),
      supabase.storage.from("brand-applications").createSignedUrls(brandPaths, 604800),
    ]);
    if (productFiles.error || brandFiles.error) throw new Error("Some brand photos could not be loaded.");
    const productSigned = new Map((productFiles.data ?? []).flatMap((file) => file.path && file.signedUrl ? [[file.path, file.signedUrl] as const] : []));
    const brandSigned = new Map((brandFiles.data ?? []).flatMap((file) => file.path && file.signedUrl ? [[file.path, file.signedUrl] as const] : []));

    return {
      brand: {
        id: brand.id,
        handle: brand.public_handle,
        name: brand.brand_name,
        category: brand.category,
        description: brand.brand_description,
        website: brand.website_url,
        socialHandle: brand.social_handle,
        audience: brand.audience.filter((item): item is Audience => item === "her" || item === "him"),
        logoUrl: brandSigned.get(brand.logo_path) ?? null,
        coverUrl: brandSigned.get(brand.cover_path) ?? null,
      },
      products: (rows ?? []).map((row) => ({
        id: row.id,
        productName: row.product_name,
        description: row.description,
        category: row.category,
        price: Number(row.price),
        productUrl: row.product_url,
        imageUrl: getImageUrl(row.image_path, productSigned),
        sizes: row.sizes,
        colors: row.colors,
        tags: row.tags,
        audience: row.audience,
        createdAt: row.created_at,
      })),
    };
  });

export const getShopTheLookProducts = createServerFn({ method: "GET" })
  .inputValidator((input) => shopInput.parse(input))
  .handler(async ({ data }) => {
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) throw new Error("Shop the Look is temporarily unavailable.");
    const supabase = createPublicClient(url, key);

    const { data: rows, error } = await supabase
      .from("brand_products")
      .select("id, brand_application_id, product_name, description, category, price, product_url, image_path, sizes, colors, tags, audience, created_at")
      .eq("status", "published")
      .eq("brand_approved", true)
      .contains("audience", [data.audience])
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw new Error("Products for this edit could not be loaded.");
    const applicationIds = [...new Set((rows ?? []).map((row) => row.brand_application_id))];
    if (!applicationIds.length) return [] as ProductWithBrand[];

    const { data: brands, error: brandsError } = await supabase
      .from("brand_applications")
      .select("id, public_handle, brand_name, category")
      .in("id", applicationIds)
      .eq("status", "approved");
    if (brandsError) throw new Error("Brand details for this edit could not be loaded.");
    const brandById = new Map((brands ?? []).filter((brand) => brand.public_handle).map((brand) => [brand.id, brand]));
    const productPaths = [...new Set((rows ?? []).map((row) => row.image_path).filter((path): path is string => Boolean(path && !path.startsWith("https://"))))];
    const { data: signedFiles, error: signedError } = productPaths.length
      ? await supabase.storage.from("brand-product-images").createSignedUrls(productPaths, 3600)
      : { data: [], error: null };
    if (signedError) throw new Error("Product photos for this edit could not be loaded.");
    const signedUrls = new Map((signedFiles ?? []).flatMap((file) => file.path && file.signedUrl ? [[file.path, file.signedUrl] as const] : []));

    const products: ProductWithBrand[] = (rows ?? []).flatMap((row) => {
      const brand = brandById.get(row.brand_application_id);
      if (!brand?.public_handle) return [];
      return [{
        id: row.id,
        productName: row.product_name,
        description: row.description,
        category: row.category,
        price: Number(row.price),
        productUrl: row.product_url,
        imageUrl: getImageUrl(row.image_path, signedUrls),
        sizes: row.sizes,
        colors: row.colors,
        tags: row.tags,
        audience: row.audience,
        createdAt: row.created_at,
        brand: { name: brand.brand_name, handle: brand.public_handle, category: brand.category },
      }];
    });
    return products
      .map((product) => ({ product, score: relevanceScore(product, data.aesthetic) }))
      .sort((left, right) => right.score - left.score)
      .slice(0, 8)
      .map(({ product }) => product);
  });

export type { ProductWithBrand };