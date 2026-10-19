import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const checkoutSchema = z.object({
  customerName: z.string().trim().min(2).max(160),
  customerEmail: z.string().trim().email().max(254),
  customerPhone: z.string().trim().min(7).max(30),
  address: z.object({
    line1: z.string().trim().min(4).max(220),
    line2: z.string().trim().max(220).optional().default(""),
    city: z.string().trim().min(2).max(100),
    state: z.string().trim().min(2).max(100),
    landmark: z.string().trim().max(160).optional().default(""),
  }),
  pinCode: z.string().regex(/^[1-9][0-9]{5}$/),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1).max(10),
    size: z.string().max(40).default(""),
    color: z.string().max(60).default(""),
  })).min(1).max(20),
});

export type OfffeedCheckoutResult = {
  order_id: string;
  order_number: string;
  brand_name: string;
  product_name: string;
  quantity: number;
  line_total: number;
};

export const createOfffeedCheckoutOrders = createServerFn({ method: "POST" })
  .inputValidator((input) => checkoutSchema.parse(input))
  .handler(async ({ data }): Promise<OfffeedCheckoutResult[]> => {
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) throw new Error("Checkout is temporarily unavailable. Please try again later.");

    const headers = new Headers({
      apikey: key,
      "Content-Type": "application/json",
    });
    // Legacy anon keys are JWTs; newer sb_publishable keys are opaque and must not be used as bearer tokens.
    if (!key.startsWith("sb_")) headers.set("Authorization", `Bearer ${key}`);

    const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/rpc/create_offfeed_cod_orders`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        p_customer_name: data.customerName,
        p_customer_email: data.customerEmail,
        p_customer_phone: data.customerPhone,
        p_delivery_address: data.address,
        p_destination_pin_code: data.pinCode,
        p_items: data.items,
      }),
    });

    const result = await response.json().catch(() => null) as unknown;
    if (!response.ok) {
      const message = typeof result === "object" && result !== null && "message" in result && typeof result.message === "string"
        ? result.message
        : "We couldn't place your order. Please check your details and try again.";
      throw new Error(message);
    }
    if (!Array.isArray(result) || result.length !== data.items.length) {
      throw new Error("We couldn't confirm every item in your order. Please contact OFFFEED before retrying.");
    }
    return result as OfffeedCheckoutResult[];
  });
