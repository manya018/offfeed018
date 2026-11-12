import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return Response.json({ error: "Trust analysis storage is not configured." }, { status: 500, headers: corsHeaders });
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return Response.json({ error: "Authentication required." }, { status: 401, headers: corsHeaders });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return Response.json({ error: "Invalid session." }, { status: 401, headers: corsHeaders });
  }

  let payload: { returnId?: string; report?: Record<string, unknown> };
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400, headers: corsHeaders });
  }

  const returnId = payload.returnId;
  const report = payload.report;
  if (!returnId || !report || typeof report !== "object" || Array.isArray(report)) {
    return Response.json({ error: "Return ID and forensic report are required." }, { status: 400, headers: corsHeaders });
  }
  const score = report.trust_score;
  const verdict = report.verdict;
  if (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 100 ||
      !["clean", "suspicious", "likely_fraud", "unanalyzed"].includes(String(verdict))) {
    return Response.json({ error: "The forensic report is invalid." }, { status: 400, headers: corsHeaders });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: returnRow, error: returnError } = await admin
    .from("order_returns")
    .select("id, brand_user_id")
    .eq("id", returnId)
    .maybeSingle();
  if (returnError || !returnRow) {
    return Response.json({ error: "Return request not found." }, { status: 404, headers: corsHeaders });
  }
  if (returnRow.brand_user_id !== userData.user.id) {
    return Response.json({ error: "Only the responsible brand can save this analysis." }, { status: 403, headers: corsHeaders });
  }

  const status = score >= 75 ? "verified" : score >= 40 ? "submitted" : "flagged";
  const { error: updateError } = await admin
    .from("return_evidence")
    .update({
      trust_score: Math.round(score),
      status,
      ai_report: report,
      updated_at: new Date().toISOString(),
    })
    .eq("return_id", returnId);
  if (updateError) {
    return Response.json({ error: "The forensic report could not be saved." }, { status: 500, headers: corsHeaders });
  }

  return Response.json({ success: true, status }, { headers: corsHeaders });
});
