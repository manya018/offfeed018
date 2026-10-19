import type { ProductWithBrand } from "@/lib/public-brand.functions";

export type OfffeedCartItem = {
  productId: string;
  productName: string;
  brandName: string;
  brandHandle: string;
  price: number;
  imageUrl: string | null;
  sizes: string[];
  colors: string[];
  quantity: number;
  size: string;
  color: string;
};

const CART_KEY = "offfeed-cart-v1";
const CART_EVENT = "offfeed-cart-updated";

export function readOfffeedCart(): OfffeedCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(CART_KEY) ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((item) => item && typeof item.productId === "string" && typeof item.price === "number");
  } catch {
    return [];
  }
}

export function writeOfffeedCart(items: OfffeedCartItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(CART_EVENT));
}

export function addToOfffeedCart(product: ProductWithBrand) {
  const items = readOfffeedCart();
  const existing = items.find((item) => item.productId === product.id);
  if (existing) {
    existing.quantity = Math.min(10, existing.quantity + 1);
  } else {
    items.push({
      productId: product.id,
      productName: product.productName,
      brandName: product.brand.name,
      brandHandle: product.brand.handle,
      price: product.price,
      imageUrl: product.imageUrl,
      sizes: product.sizes,
      colors: product.colors,
      quantity: 1,
      size: "",
      color: "",
    });
  }
  writeOfffeedCart(items);
}

export function clearOfffeedCart() {
  writeOfffeedCart([]);
}

export function offfeedCartEventName() {
  return CART_EVENT;
}
