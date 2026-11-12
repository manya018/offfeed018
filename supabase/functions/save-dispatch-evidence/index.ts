import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Photo = { path: string; kind: string };

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return Response.json({ error: "Method not allowed." }, { status: 405, headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return Response.json({ error: "Dispatch evidence storage is not configured." }, { status: 500, headers: corsHeaders });
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

  let payload: {
    orderId?: string;
    photos?: Photo[];
    videoPath?: string;
    packingNote?: string;
    report?: Record<string, unknown>;
  };
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400, headers: corsHeaders });
  }

  const userId = userData.user.id;
  const orderId = payload.orderId;
  const photos = payload.photos;
  const videoPath = payload.videoPath;
  const packingNote = payload.packingNote;
  const report = payload.report;

  const validPath = (path: unknown, extensions: string[]) => {
    if (typeof path !== "string" || path.length > 600 || path.includes("..") || !path.startsWith(`${userId}/`)) return false;
    const extension = path.split(".").pop()?.toLowerCase() ?? "";
    return extensions.includes(extension);
  };

  if (typeof orderId !== "string" ||
      !Array.isArray(photos) || photos.length < 3 || photos.length > 6 ||
      photos.some((photo) => !photo || !validPath(photo.path, ["jpg", "jpeg", "png", "webp"]) ||
        typeof photo.kind !== "string" || photo.kind.length > 60) ||
      !validPath(videoPath, ["mp4", "webm", "mov"]) ||
      typeof packingNote !== "string" || packingNote.trim().length < 10 || packingNote.length > 1000 ||
      !report || typeof report !== "object" || Array.isArray(report)) {
    return Response.json({ error: "The dispatch evidence details are invalid." }, { status: 400, headers: corsHeaders });
  }

  const score = report.trust_score;
  const verdict = report.verdict;
  if (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 100 ||
      !["clean", "suspicious", "likely_fraud", "unanalyzed"].includes(String(verdict))) {
    return Response.json({ error: "The forensic report is invalid." }, { status: 400, headers: corsHeaders });
  }

  const uniquePaths = [...new Set([...photos.map((photo) => photo.path), videoPath])];
  if (uniquePaths.length !== photos.length + 1) {
    return Response.json({ error: "Evidence files must be unique." }, { status: 400, headers: corsHeaders });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: application, error: applicationError } = await admin
    .from("brand_applications")
    .select("id, status")
    .eq("user_id", userId)
    .maybeSingle();
  if (applicationError || !application || application.status !== "approved") {
    return Response.json({ error: "An approved brand account is required." }, { status: 403, headers: corsHeaders });
  }

  const { data: order, error: orderError } = await admin
    .from("brand_orders")
    .select("id, brand_user_id, brand_application_id")
    .eq("id", orderId)
    .maybeSingle();
  if (orderError || !order || order.brand_user_id !== userId || order.brand_application_id !== application.id) {
    return Response.json({ error: "That order does not belong to your approved brand." }, { status: 403, headers: corsHeaders });
  }

  // Verify that every submitted object exists in the private evidence bucket.
  // The user-folder prefix is checked above; only the service-role client can read these objects here.
  for (const path of uniquePaths) {
    const { error: fileError } = await admin.storage.from("order-evidence").download(path);
    if (fileError) {
      return Response.json({ error: "One or more uploaded evidence files could not be found." }, { status: 400, headers: corsHeaders });
    }
  }

  const status = score >= 75 ? "verified" : score >= 40 ? "submitted" : "flagged";
  const { data: evidence, error: insertError } = await admin
    .from("dispatch_evidence")
    .insert({
      order_id: orderId,
      brand_user_id: userId,
      photos,
      video_path: videoPath,
      packing_note: packingNote.trim(),
      status,
      ai_report: report,
      updated_at: new Date().toISOString(),
    })
    .select("id, status")
    .single();

  if (insertError || !evidence) {
    // A unique order index prevents a second dispatch-proof submission from racing through.
    return Response.json({ error: "The packing proof could not be saved." }, { status: 409, headers: corsHeaders });
  }

  return Response.json({ evidenceId: evidence.id, status: evidence.status }, { headers: corsHeaders });
});
