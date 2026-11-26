import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const SHADOWFAX_BASE_URL = "https://dale.staging.shadowfax.in/api";
const PIN_CODE = /^[1-9][0-9]{5}$/;

type ServiceabilityRow = { code: number; services: string[] };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

async function fetchPincodeServices(token: string, service: "seller_pickup" | "customer_delivery", pincode: string) {
  const url = new URL("/v1/clients/serviceability/", SHADOWFAX_BASE_URL);
  url.searchParams.set("service", service);
  url.searchParams.set("pincodes", pincode);

  const response = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Token ${token}`, Accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
  });
  const payload = await response.json().catch(() => null) as unknown;
  if (!response.ok) {
    // Never return upstream headers or credentials to the caller.
    throw new Error(`Shadowfax serviceability request failed (${response.status}).`);
  }
  if (!Array.isArray(payload)) throw new Error("Shadowfax returned an unexpected serviceability response.");
  return (payload as ServiceabilityRow[]).find((row) => Number(row.code) === Number(pincode))?.services ?? [];
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const shadowfaxToken = Deno.env.get("SHADOWFAX_TEST_TOKEN");
  if (!supabaseUrl || !supabaseAnonKey) return json({ error: "Supabase function authentication is not configured." }, 503);
  if (!shadowfaxToken) return json({ error: "Shadowfax staging token is not configured on the server." }, 503);

  const authHeader = request.headers.get("Authorization") ?? "";
  const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!jwt) return json({ error: "Sign in to check courier serviceability." }, 401);

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await supabase.auth.getUser(jwt);
  if (authError || !authData.user) return json({ error: "Your session is invalid. Please sign in again." }, 401);

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return json({ error: "Send a valid JSON request." }, 400);
  }
  if (!input || typeof input !== "object") return json({ error: "Invalid request." }, 400);

  const body = input as Record<string, unknown>;
  const pickupPinCode = typeof body.pickupPinCode === "string" ? body.pickupPinCode.trim() : "";
  const deliveryPinCode = typeof body.deliveryPinCode === "string" ? body.deliveryPinCode.trim() : "";
  if (!PIN_CODE.test(pickupPinCode) || !PIN_CODE.test(deliveryPinCode)) {
    return json({ error: "Enter valid six-digit pickup and delivery PIN codes." }, 400);
  }

  try {
    const [pickupServices, deliveryServices] = await Promise.all([
      fetchPincodeServices(shadowfaxToken, "seller_pickup", pickupPinCode),
      fetchPincodeServices(shadowfaxToken, "customer_delivery", deliveryPinCode),
    ]);

    // Shadowfax configures Regular vs Surface tiers per client account. Return the
    // exact tiers so the app does not incorrectly treat any listed tier as usable.
    return json({
      provider: "shadowfax",
      environment: "staging",
      pickup: { pinCode: pickupPinCode, service: "seller_pickup", availableTiers: pickupServices },
      delivery: { pinCode: deliveryPinCode, service: "customer_delivery", availableTiers: deliveryServices },
      tierDecisionRequired: true,
      note: "Confirm whether this Shadowfax account is configured for Regular or Surface before treating the route as serviceable.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Shadowfax could not check this route.";
    return json({ error: message }, 502);
  }
});
