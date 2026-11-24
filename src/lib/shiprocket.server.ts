type ShiprocketCredentials = { email: string; password: string };
export type ShiprocketRate = {
  courierCompanyId: number;
  courierName: string;
  ratePaise: number;
  estimatedDeliveryDays: number | null;
};

let cachedToken: { value: string; expiresAt: number } | null = null;

function credentials(): ShiprocketCredentials {
  const email = process.env["SHIPROCKET_API_EMAIL"];
  const password = process.env["SHIPROCKET_API_PASSWORD"];
  if (!email || !password) {
    throw new Error("Shiprocket is not connected yet. Add the Shiprocket API user credentials in OFFFEED's private server settings.");
  }
  return { email, password };
}

async function getShiprocketToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;
  const response = await fetch("https://apiv2.shiprocket.in/v1/external/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials()),
  });
  const body = await response.json().catch(() => null) as { token?: string; message?: string } | null;
  if (!response.ok || !body?.token) {
    throw new Error(body?.message || "Shiprocket authentication failed. Check the API user credentials in OFFFEED's private server settings.");
  }
  // Shiprocket tokens last about 10 days; refresh early to avoid expiry during checkout.
  cachedToken = { value: body.token, expiresAt: Date.now() + 9 * 24 * 60 * 60 * 1000 };
  return body.token;
}

export async function getShiprocketRate(input: {
  pickupPinCode: string;
  deliveryPinCode: string;
  weightGrams: number;
  lengthCm: number;
  breadthCm: number;
  heightCm: number;
}): Promise<ShiprocketRate> {
  const token = await getShiprocketToken();
  const query = new URLSearchParams({
    pickup_postcode: input.pickupPinCode,
    delivery_postcode: input.deliveryPinCode,
    cod: "0",
    weight: String(Math.max(0.1, input.weightGrams / 1000)),
    length: String(input.lengthCm),
    breadth: String(input.breadthCm),
    height: String(input.heightCm),
  });
  const response = await fetch(`https://apiv2.shiprocket.in/v1/external/courier/serviceability/?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const body = await response.json().catch(() => null) as {
    message?: string;
    data?: { available_courier_companies?: Array<{
      courier_company_id?: number;
      courier_name?: string;
      rate?: number | string;
      freight_charge?: number | string;
      estimated_delivery_days?: number | string;
    }> };
  } | null;
  if (!response.ok) {
    throw new Error(body?.message || "Shiprocket could not calculate a delivery rate for this address.");
  }
  const rates = (body?.data?.available_courier_companies ?? [])
    .map((courier) => ({
      courierCompanyId: Number(courier.courier_company_id),
      courierName: String(courier.courier_name ?? ""),
      rateRupees: Number(courier.rate ?? courier.freight_charge),
      estimatedDeliveryDays: Number(courier.estimated_delivery_days),
    }))
    .filter((courier) => Number.isInteger(courier.courierCompanyId) && courier.courierCompanyId > 0
      && courier.courierName && Number.isFinite(courier.rateRupees) && courier.rateRupees >= 0)
    .sort((a, b) => a.rateRupees - b.rateRupees);
  const best = rates[0];
  if (!best) {
    throw new Error(`Shiprocket has no courier available from PIN ${input.pickupPinCode} to ${input.deliveryPinCode}. Please contact OFFFEED before placing this order.`);
  }
  return {
    courierCompanyId: best.courierCompanyId,
    courierName: best.courierName,
    ratePaise: Math.round(best.rateRupees * 100),
    estimatedDeliveryDays: Number.isFinite(best.estimatedDeliveryDays) ? best.estimatedDeliveryDays : null,
  };
}
