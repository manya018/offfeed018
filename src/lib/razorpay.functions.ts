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
type PaymentSessionRow = { session_id: string; amount_paise: number };
type FinalizedOrderRow = OfffeedCheckoutResult & { newly_created: boolean };

function getRazorpayConfig() {
  const keyId = process.env["RAZORPAY_KEY_ID"];
  const keySecret = process.env["RAZORPAY_KEY_SECRET"];
  const mode = process.env["RAZORPAY_MODE"];
  if (mode !== "test" || !keyId?.startsWith("rzp_test_") || !keySecret) {
    throw new Error("Razorpay test payments are not configured. Set test-mode credentials in the server environment.");
  }
  return { keyId, keySecret };
}

async function callAdminRpc<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) throw new Error("Checkout is temporarily unavailable. Please try again later.");
  const headers = new Headers({ apikey: key, "Content-Type": "application/json" });
  // New Supabase secret keys are opaque and must not be sent as bearer JWTs.
  if (!key.startsWith("sb_")) headers.set("Authorization", `Bearer ${key}`);
  const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => null) as unknown;
  if (!response.ok) {
    const message = typeof result === "object" && result !== null && "message" in result && typeof result.message === "string"
      ? result.message
      : "Checkout could not be prepared. Please try again.";
    throw new Error(message);
  }
  return result as T;
}

async function razorpayRequest<T>(path: string, method: "GET" | "POST", payload?: Record<string, unknown>): Promise<T> {
  const { keyId, keySecret } = getRazorpayConfig();
  const authorization = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const response = await fetch(`https://api.razorpay.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Basic ${authorization}`,
      "Content-Type": "application/json",
    },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
  });
  const result = await response.json().catch(() => null) as unknown;
  if (!response.ok) {
    const description = typeof result === "object" && result !== null && "error" in result &&
      typeof result.error === "object" && result.error !== null && "description" in result.error &&
      typeof result.error.description === "string" ? result.error.description : "Payment provider request failed.";
    throw new Error(description);
  }
  return result as T;
}

export const createOfffeedRazorpayOrder = createServerFn({ method: "POST" })
  .inputValidator((input) => checkoutSchema.parse(input))
  .handler(async ({ data }) => {
    const { keyId } = getRazorpayConfig();
    const prepared = await callAdminRpc<PaymentSessionRow[]>("prepare_offfeed_razorpay_session", {
      p_customer_name: data.customerName,
      p_customer_email: data.customerEmail,
      p_customer_phone: data.customerPhone,
      p_delivery_address: data.address,
      p_destination_pin_code: data.pinCode,
      p_items: data.items,
    });
    const session = Array.isArray(prepared) ? prepared[0] : undefined;
    if (!session?.session_id || !Number.isInteger(Number(session.amount_paise)) || Number(session.amount_paise) <= 0) {
      throw new Error("The checkout amount could not be confirmed. Please refresh your bag and try again.");
    }

    const razorpayOrder = await razorpayRequest<{ id: string; amount: number; currency: string }>("orders", "POST", {
      amount: Number(session.amount_paise),
      currency: "INR",
      receipt: session.session_id,
      notes: { offfeed_payment_session: session.session_id },
    });
    if (razorpayOrder.amount !== Number(session.amount_paise) || razorpayOrder.currency !== "INR") {
      throw new Error("Razorpay returned an unexpected checkout amount. Please contact OFFFEED support.");
    }

    await callAdminRpc<null>("attach_offfeed_razorpay_order", {
      p_session_id: session.session_id,
      p_razorpay_order_id: razorpayOrder.id,
    });
    return {
      sessionId: session.session_id,
      keyId,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
    };
  });

const verifySchema = z.object({
  sessionId: z.string().uuid(),
  orderId: z.string().min(1).max(80),
  paymentId: z.string().min(1).max(80),
  signature: z.string().min(1).max(256),
});

export const verifyOfffeedRazorpayPayment = createServerFn({ method: "POST" })
  .inputValidator((input) => verifySchema.parse(input))
  .handler(async ({ data }) => {
    const { keySecret } = getRazorpayConfig();
    const { createHmac, timingSafeEqual } = await import("node:crypto");
    const expected = createHmac("sha256", keySecret).update(`${data.orderId}|${data.paymentId}`).digest();
    let received: Buffer;
    try {
      received = Buffer.from(data.signature, "hex");
    } catch {
      throw new Error("Payment verification failed. Please contact OFFFEED support before retrying.");
    }
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
      throw new Error("Razorpay could not verify this payment. Please contact OFFFEED support before retrying.");
    }

    let payment = await razorpayRequest<{
      id: string; order_id: string; amount: number; currency: string; status: string;
    }>(`payments/${encodeURIComponent(data.paymentId)}`, "GET");
    if (payment.order_id !== data.orderId || payment.currency !== "INR") {
      throw new Error("Payment details do not match this checkout.");
    }
    if (payment.status === "authorized") {
      payment = await razorpayRequest(`payments/${encodeURIComponent(data.paymentId)}/capture`, "POST", { amount: payment.amount });
    }
    if (payment.status !== "captured") {
      throw new Error("Payment has not been captured yet. Please wait a moment and retry verification.");
    }

    // The database session is the source of truth for the amount; the server verifies the provider's
    // captured payment amount against it before creating any brand-visible orders.
    const sessionUrl = process.env["SUPABASE_URL"];
    const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
    if (!sessionUrl || !serviceKey) throw new Error("Checkout is temporarily unavailable. Please try again later.");
    const sessionHeaders = new Headers({ apikey: serviceKey });
    if (!serviceKey.startsWith("sb_")) sessionHeaders.set("Authorization", `Bearer ${serviceKey}`);
    const sessionResponse = await fetch(
      `${sessionUrl.replace(/\/$/, "")}/rest/v1/offfeed_payment_sessions?id=eq.${encodeURIComponent(data.sessionId)}&select=amount_paise,razorpay_order_id,status`,
      { headers: sessionHeaders },
    );
    const sessionRows = await sessionResponse.json().catch(() => null) as Array<{ amount_paise: number; razorpay_order_id: string; status: string }> | null;
    const session = sessionRows?.[0];
    if (!sessionResponse.ok || !session || session.razorpay_order_id !== data.orderId || Number(session.amount_paise) !== payment.amount) {
      throw new Error("The captured amount does not match OFFFEED’s checkout. Please contact OFFFEED support.");
    }

    const finalized = await callAdminRpc<FinalizedOrderRow[]>("complete_offfeed_razorpay_session", {
      p_session_id: data.sessionId,
      p_razorpay_order_id: data.orderId,
      p_razorpay_payment_id: data.paymentId,
    });
    if (!Array.isArray(finalized) || finalized.length === 0) {
      throw new Error("Payment was received but the order could not be finalized. Please contact OFFFEED support with your payment ID.");
    }
    await notifyBrands(finalized.filter((order) => order.newly_created).map((order) => order.order_id));
    return finalized.map(({ newly_created: _newlyCreated, ...order }) => order);
  });

async function notifyBrands(orderIds: string[]) {
  if (!orderIds.length) return;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: orders, error: orderError } = await supabaseAdmin
      .from("brand_orders")
      .select("id, brand_application_id, order_number, customer_name, customer_email, product_name, quantity, unit_price, selected_size, selected_color")
      .in("id", orderIds);
    if (orderError) throw orderError;
    const applicationIds = [...new Set((orders ?? []).map((order) => order.brand_application_id))];
    const { data: applications, error: applicationsError } = await supabaseAdmin
      .from("brand_applications")
      .select("id, brand_name, email")
      .in("id", applicationIds);
    if (applicationsError) throw applicationsError;
    const applicationById = new Map((applications ?? []).map((application) => [application.id, application]));
    const { sendOrderNotificationEmails } = await import("./brand-notification.server");
    for (const order of orders ?? []) {
      const application = applicationById.get(order.brand_application_id);
      if (!application) continue;
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
      } catch (error) {
        console.error("[razorpay] Paid order was saved, but its notification email failed", order.order_number, error);
      }
    }
  } catch (error) {
    // Payment and order are already confirmed; email failure must not undo them.
    console.error("[razorpay] Paid order was saved, but brand notifications could not be loaded", error);
  }
}
