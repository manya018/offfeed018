import { getActiveSaleProducts, type ProductWithBrand } from "@/lib/public-brand.functions";

const audiences = ["her", "him", "home"] as const;

export async function getAllActiveSaleProducts(): Promise<ProductWithBrand[]> {
  const feeds = await Promise.all(
    audiences.map((audience) => getActiveSaleProducts({ data: { audience } })),
  );
  const unique = new Map<string, ProductWithBrand>();
  for (const product of feeds.flat()) unique.set(product.id, product);
  return [...unique.values()].sort((a, b) => getSaleDiscountPercent(b) - getSaleDiscountPercent(a));
}

export function getSaleDiscountPercent(product: ProductWithBrand): number {
  if (product.salePrice == null || product.price <= 0) return 0;
  return Math.round(((product.price - product.salePrice) / product.price) * 100);
}
