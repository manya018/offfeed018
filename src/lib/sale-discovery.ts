import { getShopTheLookProducts } from "@/lib/public-brand.functions";

type SaleProduct = Awaited<ReturnType<typeof getShopTheLookProducts>>[number];

const audiences = ["her", "him", "home"] as const;

/**
 * Reuse the existing published-product query and authoritative active-sale
 * pricing. This keeps the sale landing page aligned with storefront and checkout
 * pricing rather than introducing a second discount calculation.
 */
export async function getActiveSaleProducts(): Promise<SaleProduct[]> {
  const feeds = await Promise.all(
    audiences.map((audience) =>
      getShopTheLookProducts({
        data: { audience, aesthetic: "all", resultLimit: 60 },
      }),
    ),
  );

  const unique = new Map<string, SaleProduct>();
  for (const product of feeds.flat()) {
    if (product.salePrice != null && product.salePrice > 0 && product.salePrice < product.price) {
      unique.set(product.id, product);
    }
  }

  return [...unique.values()].sort((a, b) => {
    const discountA = (a.price - (a.salePrice ?? a.price)) / a.price;
    const discountB = (b.price - (b.salePrice ?? b.price)) / b.price;
    return discountB - discountA || b.createdAt.localeCompare(a.createdAt);
  });
}

export function getSaleDiscountPercent(product: SaleProduct): number {
  if (product.salePrice == null || product.price <= 0) return 0;
  return Math.round(((product.price - product.salePrice) / product.price) * 100);
}
