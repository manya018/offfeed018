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
    const orders = result as OfffeedCheckoutResult[];
    // Email delivery is best-effort: a mail outage must never undo a successfully placed order.
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: savedOrders, error: orderReadError } = await supabaseAdmin
        .from("brand_orders")
        .select("id, brand_application_id, order_number, customer_name, customer_email, product_name, quantity, unit_price, selected_size, selected_color")
        .in("id", orders.map((order) => order.order_id));
      if (orderReadError) throw orderReadError;
      const applicationIds = [...new Set((savedOrders ?? []).map((order) => order.brand_application_id))];
      const { data: applications, error: applicationReadError } = await supabaseAdmin
        .from("brand_applications")
        .select("id, brand_name, email")
        .in("id", applicationIds);
      if (applicationReadError) throw applicationReadError;
      const applicationById = new Map((applications ?? []).map((application) => [application.id, application]));
      const { sendOrderNotificationEmails } = await import("./brand-notification.server");
      for (const order of savedOrders ?? []) {
        const application = applicationById.get(order.brand_application_id);
        if (!application) {
          console.error("[order-notification] Brand application not found for order", order.order_number);
          continue;
        }
        try {
          await sendOrderNotificationEmails({
            orderNumber: order.order_number,
            customerName: order.customer_name,
            customerEmail: order.customer_email,
            brandName: application.brand_name,
            brandEmail: application.email,
            productName: order.product_name,
            quantity: order.quantity,
            lineTotal: Number(order.unit_price) * order.quantity,
            selectedSize: order.selected_size,
            selectedColor: order.selected_color,
          });
        } catch (notifyError) {
          console.error("[order-notification] Order was saved, but an email could not be sent", order.order_number, notifyError);
        }
      }
    } catch (notifyError) {
      console.error("[order-notification] Order was saved, but notification details could not be loaded", notifyError);
    }
    return orders;
  });
