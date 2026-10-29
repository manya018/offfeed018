/**
 * OFFFEED centralized shipping policy.
 *
 * Threshold applies to the combined product subtotal for the entire checkout,
 * not separately to each brand. Actual parcel charges must come from the
 * connected courier provider; do not replace them with a guessed flat fee.
 */
export const OFFFEED_FREE_SHIPPING_THRESHOLD = 999;

export type OfffeedShippingPolicy = {
  productSubtotal: number;
  customerGetsFreeShipping: boolean;
  payer: "brands" | "customer";
  customerMessage: string;
  settlementMessage: string;
};

export function getOfffeedShippingPolicy(productSubtotal: number): OfffeedShippingPolicy {
  const normalizedSubtotal = Math.max(0, Number.isFinite(productSubtotal) ? productSubtotal : 0);
  const customerGetsFreeShipping = normalizedSubtotal >= OFFFEED_FREE_SHIPPING_THRESHOLD;

  return {
    productSubtotal: normalizedSubtotal,
    customerGetsFreeShipping,
    payer: customerGetsFreeShipping ? "brands" : "customer",
    customerMessage: customerGetsFreeShipping
      ? "Free shipping for you. Each brand bears the actual courier cost for its own parcel."
      : "Shipping is charged to you at the actual courier rate for the parcel or parcels in this checkout.",
    settlementMessage: customerGetsFreeShipping
      ? "OffFeed pays the courier through its central shipping account, then allocates each parcel's actual shipping cost to its brand."
      : "OffFeed pays the courier through its central shipping account and collects the actual shipping quote from the customer.",
  };
}
