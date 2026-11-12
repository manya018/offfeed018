import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateChatCompletion } from "@lovable.dev/ai-gateway";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const EVIDENCE_BUCKET = "order-evidence";
const FORENSIC_MODEL = "openai/gpt-6-astra";
const PHOTO_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];
const MAX_PHOTO_BYTES = 12 * 1024 * 1024;

export type EvidencePhoto = { path: string; kind: string };
export type ForensicReport = {
  trust_score: number;
  verdict: "clean" | "suspicious" | "likely_fraud" | "unanalyzed";
  flags: string[];
  manipulation_signals: string[];
  ai_generation_signals: string[];
  mismatch_notes: string[];
  summary: string;
  analyzed_at?: string;
  error?: string;
};

export type DisputeViewerData = {
  role: "brand" | "customer";
  order: {
    id: string; order_number: string; product_name: string; selected_size: string; selected_color: string;
    quantity: number; unit_price: number; currency: string; status: string; customer_name: string;
    customer_email: string; destination_pin_code: string; created_at: string;
  };
  dispatch: {
    id: string;
    photos: Array<EvidencePhoto & { url: string }>;
    videoUrl: string;
    packingNote: string;
    status: string;
    aiReport: ForensicReport | null;
    createdAt: string;
  } | null;
  returns: Array<{
    id: string; reason: string; customer_details: string; evidence_url: string; status: string;
    brand_response: string; refund_status: string; created_at: string; updated_at: string;
    evidence: {
      id: string;
      photos: Array<EvidencePhoto & { url: string }>;
      notes: string;
      status: string;
      trustScore: number;
      aiReport: ForensicReport | null;
      createdAt: string;
    } | null;
  }>;
};


function cleanMediaPath(path: string) {
  const trimmed = path.trim().replace(/^\/+/, "");
  if (!trimmed || trimmed.includes("..") || trimmed.length > 600) throw new Error("That file path isn't valid.");
  return trimmed;
}

function assertOwnedPath(path: string, userId: string, extensions: string[]) {
  if (!path.startsWith(`${userId}/`)) throw new Error("Evidence files must be uploaded to your own secure folder first.");
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  if (!extensions.includes(extension)) throw new Error("That file type isn't accepted as evidence.");
}

function detectMime(path: string) {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  return "image/jpeg";
}

async function toDataUrl(blob: Blob, mime: string) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

async function loadImages(supabase: SupabaseClient<Database>, paths: string[], limit: number) {
  const selected = [...new Set(paths)].slice(0, limit);
  const images: string[] = [];
  for (const path of selected) {
    const { data, error } = await supabase.storage.from(EVIDENCE_BUCKET).download(path);
    if (error || !data) continue;
    if (data.size > MAX_PHOTO_BYTES) continue;
    images.push(await toDataUrl(data, detectMime(path)));
  }
  return images;
}

function scoreToStatus(score: number): "verified" | "submitted" | "flagged" {
  if (score >= 75) return "verified";
  if (score >= 40) return "submitted";
  return "flagged";
}

function unanalyzedReport(message: string): ForensicReport {
  return { trust_score: 50, verdict: "unanalyzed", flags: ["analysis_unavailable"], manipulation_signals: [], ai_generation_signals: [], mismatch_notes: [], summary: message };
}

function parseReport(raw: string): Omit<ForensicReport, "analyzed_at"> {
  const cleaned = raw.replace(/^```(?:json)?/m, "").replace(/```\s*$/m, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const parsed = JSON.parse(start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned) as Record<string, unknown>;
  const clamp = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : 50);
  const list = (value: unknown) => (Array.isArray(value) ? value.map((item) => String(item).slice(0, 200)) : []);
  const verdict = typeof parsed.verdict === "string" && ["clean", "suspicious", "likely_fraud"].includes(parsed.verdict)
    ? (parsed.verdict as ForensicReport["verdict"])
    : clamp(parsed.trust_score) >= 75 ? "clean" : clamp(parsed.trust_score) >= 40 ? "suspicious" : "likely_fraud";
  return {
    trust_score: clamp(parsed.trust_score),
    verdict,
    flags: list(parsed.flags),
    manipulation_signals: list(parsed.manipulation_signals),
    ai_generation_signals: list(parsed.ai_generation_signals),
    mismatch_notes: list(parsed.mismatch_notes),
    summary: typeof parsed.summary === "string" ? parsed.summary.slice(0, 800) : "No summary returned.",
  };
}

async function analyzeImages(supabase: SupabaseClient<Database>, photoPaths: string[], referencePaths: string[], scenario: string): Promise<ForensicReport> {
  const [photos, references] = await Promise.all([
    loadImages(supabase, photoPaths, 6),
    referencePaths.length ? loadImages(supabase, referencePaths, 2) : Promise.resolve([]),
  ]);
  if (!photos.length) return unanalyzedReport("The evidence images could not be read for analysis.");
  const content: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> = [
    { type: "text", text: scenario },
  ];
  if (references.length) {
    content.push({ type: "text", text: "First, the brand's original packing/dispatch photos for reference:" });
    for (const image of references) content.push({ type: "image_url", image_url: { url: image } });
    content.push({ type: "text", text: "Now the submitted evidence photos under review:" });
  }
  for (const image of photos) content.push({ type: "image_url", image_url: { url: image } });
  try {
    const completion = await generateChatCompletion({
      model: FORENSIC_MODEL,
      messages: [
        {
          role: "system",
          content: "You are OFFFEED's forensic media reviewer for a fashion marketplace. You compare submitted proof photos against original dispatch photos and flag fraud. Look for: signs of digital editing or photo manipulation (spliced regions, cloned patches, inconsistent lighting, warped edges, mismatched shadows), signs the image was generated by AI (over-smooth textures, impossible details, wrong reflections), reuse of unrelated or old photos (different product, missing tags, visibly worn items, different background from the dispatch photos), and whether the claimed condition matches what is visible. Judge cautiously: soft-mobile photos have noise and compression; only report signals you can actually justify. Respond with STRICT JSON only, no markdown: {\"trust_score\": 0-100 confidence the evidence is authentic and matches the order, \"verdict\": \"clean\"|\"suspicious\"|\"likely_fraud\", \"flags\": [short strings], \"manipulation_signals\": [strings], \"ai_generation_signals\": [strings], \"mismatch_notes\": [strings], \"summary\": \"2-3 sentence explanation\"}.",
        },
        { role: "user", content },
      ],
      temperature: 0,
      response_format: { type: "json_object" },
    });
    const text = completion.choices?.[0]?.message?.content ?? "";
    if (!text) return unanalyzedReport("The AI reviewer returned no analysis.");
    return { ...parseReport(text), analyzed_at: new Date().toISOString() };
  } catch (error) {
    console.error("Evidence analysis failed:", error);
    return unanalyzedReport("The AI reviewer is unavailable right now. The evidence was still saved for manual review.");
  }
}

const photoEntrySchema = z.object({
  path: z.string().min(1).max(600),
  kind: z.string().trim().max(60).default("product"),
});

export const submitDispatchEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    orderId: z.string().uuid(),
    photos: z.array(photoEntrySchema).min(3, "Add at least 3 packing photos.").max(6),
    videoPath: z.string().min(1, "A packing video is required.").max(600),
    packingNote: z.string().trim().min(10).max(1000),
  }).parse(input))
  .handler(async ({ context, data }) => {
    const application = await getApprovedApplication(context);
    for (const photo of data.photos) {
      const path = cleanMediaPath(photo.path);
      assertOwnedPath(path, context.userId, PHOTO_EXTENSIONS);
      photo.path = path;
    }
    const videoPath = cleanMediaPath(data.videoPath);
    assertOwnedPath(videoPath, context.userId, ["mp4", "webm", "mov"]);

    const { data: order, error: orderError } = await context.supabase
      .from("brand_orders")
      .select("id, order_number, product_name, selected_size, selected_color, quantity, destination_pin_code")
      .eq("id", data.orderId)
      .eq("brand_application_id", application.id)
      .maybeSingle();
    if (orderError || !order) throw new Error("That order doesn't belong to your brand.");

    const { data: existing, error: existingError } = await context.supabase
      .from("dispatch_evidence")
      .select("id")
      .eq("order_id", data.orderId)
      .maybeSingle();
    if (existingError) throw new Error("We couldn't check the existing dispatch proof.");
    if (existing?.id) throw new Error("Dispatch evidence has already been submitted for this order. Contact OFFFEED support if it needs correction.");

    const row = {
      order_id: data.orderId,
      brand_user_id: context.userId,
      photos: data.photos,
      video_path: videoPath,
      packing_note: data.packingNote,
      updated_at: new Date().toISOString(),
    };
    const report = await analyzeImages(
      context.supabase,
      data.photos.map((photo) => photo.path),
      [],
      `Brand packing verification for OFFFEED order ${order.order_number}: product "${order.product_name}"${order.selected_size ? ` size ${order.selected_size}` : ""}${order.selected_color ? ` colour ${order.selected_color}` : ""}, quantity ${order.quantity}, shipping to PIN ${order.destination_pin_code}. The brand states: "${data.packingNote}". Judge whether these photos genuinely show this product being packed with the order details visible.`,
    );
    // Persist the server-generated report with the server-only service-role client.
    // Authenticated users do not receive permission to set their own AI score or status.
    const { data: videoFile, error: videoError } = await context.supabase.storage
      .from(EVIDENCE_BUCKET)
      .download(videoPath);
    if (videoError || !videoFile) throw new Error("The packing video could not be found in your secure uploads.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: evidence, error } = await supabaseAdmin
      .from("dispatch_evidence")
      .insert({
        ...row,
        status: scoreToStatus(report.trust_score),
        ai_report: report,
      })
      .select("id, status")
      .single();
    if (error || !evidence) {
      console.error("Dispatch evidence save failed:", error);
      throw new Error("The packing proof couldn't be saved. Please try again.");
    }
    return { evidenceId: evidence.id, status: evidence.status, report };
  });

export const submitReturnEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    orderId: z.string().uuid(),
    reason: z.enum(["defective_damaged", "wrong_item_colour", "not_as_described", "size_fit", "other"]),
    details: z.string().trim().max(2000),
    photos: z.array(z.string().min(1).max(600)).min(2, "Add at least 2 photos of the item you received.").max(6),
    evidenceUrl: z.union([z.literal(""), z.string().url().max(2048)]),
  }).parse(input))
  .handler(async ({ context, data }) => {
    const photos = data.photos.map((path) => {
      const cleaned = cleanMediaPath(path);
      assertOwnedPath(cleaned, context.userId, PHOTO_EXTENSIONS);
      return cleaned;
    });
    const { data: order, error: orderError } = await context.supabase
      .from("brand_orders")
      .select("id, customer_user_id, status, order_number, product_name")
      .eq("id", data.orderId)
      .maybeSingle();
    if (orderError || !order) throw new Error("We couldn't find that order.");
    if (order.customer_user_id !== context.userId) throw new Error("That order isn't on your account.");
    if (order.status !== "delivered") throw new Error("Returns open once the order is delivered.");

    const { data: returnId, error: returnError } = await context.supabase
      .rpc("request_offfeed_return_with_evidence", {
        p_order_id: data.orderId,
        p_reason: data.reason,
        p_details: data.details,
        p_evidence_url: data.evidenceUrl,
        p_photo_paths: photos,
      });
    if (returnError || !returnId) throw new Error(returnError?.message ?? "The return request couldn't be submitted.");

    // The brand's packing photos are the authenticity reference for this return.
    const { data: dispatch } = await context.supabase
      .from("dispatch_evidence")
      .select("photos")
      .eq("order_id", data.orderId)
      .maybeSingle();
    const referencePaths = ((dispatch?.photos as EvidencePhoto[] | null) ?? []).map((photo) => photo.path);

    const report = await analyzeImages(
      context.supabase,
      photos,
      referencePaths,
      `Customer return proof for OFFFEED order ${order.order_number}, product "${order.product_name}". Claimed reason: ${data.reason.replaceAll("_", " ")}. Customer says: "${data.details || "no details given"}". Compare the submitted photos with the brand's packing photos where provided and judge whether this looks like the genuine delivered item.`,
    );
    // Persist the initial report through the authenticated Edge Function.
    // The function verifies that this caller is either the customer or responsible brand.
    const { error: analysisSaveError } = await context.supabase.functions.invoke("save-return-analysis", {
      body: { returnId, report },
    });
    if (analysisSaveError) {
      console.error("Initial return analysis could not be persisted:", analysisSaveError);
    }

    // The secure RPC creates the evidence row atomically with the return request.
    const { data: evidence } = await context.supabase
      .from("return_evidence")
      .select("id, status, trust_score")
      .eq("return_id", returnId)
      .maybeSingle();
    return { returnId, evidenceId: evidence?.id ?? null, status: evidence?.status ?? "submitted", trustScore: report.trust_score, report };
  });

export const rerunReturnAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ returnId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { data: returnRow, error } = await context.supabase
      .from("order_returns")
      .select("id, reason, customer_details, brand_user_id")
      .eq("id", data.returnId)
      .maybeSingle();
    if (error || !returnRow) throw new Error("Return request not found.");
    if (returnRow.brand_user_id !== context.userId) throw new Error("Only the brand responsible for this order can rerun its forensic analysis.");
    const { data: evidence } = await context.supabase
      .from("return_evidence")
      .select("id, order_id, photos, notes")
      .eq("return_id", data.returnId)
      .maybeSingle();
    if (!evidence) throw new Error("No photo proof is attached to this return yet.");
    const photoPaths = ((evidence.photos as EvidencePhoto[] | null) ?? []).map((photo) => photo.path);
    const { data: dispatch } = await context.supabase
      .from("dispatch_evidence")
      .select("photos")
      .eq("order_id", evidence.order_id)
      .maybeSingle();
    const referencePaths = ((dispatch?.photos as EvidencePhoto[] | null) ?? []).map((photo) => photo.path);
    const report = await analyzeImages(
      context.supabase,
      photoPaths,
      referencePaths,
      `Customer return proof re-check for OFFFEED. Claimed reason: ${returnRow.reason.replaceAll("_", " ")}. Customer says: "${returnRow.customer_details || evidence.notes || "no details given"}". Judge whether this looks like the genuine delivered item.`,
    );
    const { error: updateError } = await context.supabase.functions.invoke("save-return-analysis", {
      body: { returnId: data.returnId, report },
    });
    if (updateError) throw new Error("The analysis result couldn't be saved.");
    return { report };
  });

export const getDisputeViewerData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ orderId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { data: order, error } = await context.supabase
      .from("brand_orders")
      .select("id, order_number, product_name, selected_size, selected_color, quantity, unit_price, currency, status, customer_name, customer_email, destination_pin_code, created_at")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error || !order) throw new Error("Order not found.");
    // Resolve the viewer's role directly from the two ownership columns.

    const { data: roleRow } = await context.supabase
      .from("brand_orders")
      .select("brand_user_id, customer_user_id")
      .eq("id", data.orderId)
      .maybeSingle();
    const role: "brand" | "customer" = roleRow?.brand_user_id === context.userId ? "brand" : roleRow?.customer_user_id === context.userId ? "customer" : "customer";
    if (roleRow?.brand_user_id !== context.userId && roleRow?.customer_user_id !== context.userId) throw new Error("You don't have access to this order.");

    const [dispatchResult, returnsResult] = await Promise.all([
      context.supabase.from("dispatch_evidence").select("id, photos, video_path, packing_note, status, ai_report, created_at").eq("order_id", data.orderId).maybeSingle(),
      context.supabase.from("order_returns").select("id, reason, customer_details, evidence_url, status, brand_response, refund_status, created_at, updated_at").eq("order_id", data.orderId).order("created_at", { ascending: false }),
    ]);
    const returns = returnsResult.data ?? [];
    const { data: returnEvidenceRows } = await Promise.all(
      returns.map((item) => context.supabase.from("return_evidence").select("id, return_id, photos, notes, status, trust_score, ai_report, created_at").eq("return_id", item.id).maybeSingle()),
    );
    const evidenceByReturn = new Map(returnEvidenceRows.map((result) => [result.data?.return_id, result.data]).filter((entry): entry is [string, NonNullable<(typeof entry)[1]>] => Boolean(entry[1])));

    const paths: string[] = [];
    const collect = (path: string | null | undefined) => { if (path) paths.push(path); };
    collect(dispatchResult.data?.video_path ?? null);
    for (const photo of ((dispatchResult.data?.photos as EvidencePhoto[] | null) ?? [])) collect(photo.path);
    for (const item of returns) for (const photo of ((evidenceByReturn.get(item.id)?.photos as EvidencePhoto[] | null) ?? [])) collect(photo.path);
    const { data: signedFiles } = paths.length
      ? await context.supabase.storage.from(EVIDENCE_BUCKET).createSignedUrls([...new Set(paths)], 3600)
      : { data: [] as Array<{ path: string; signedUrl: string | null }> | null };
    const urlFor = new Map((signedFiles ?? []).map((file) => [file.path, file.signedUrl ?? ""]));

    const mapPhotos = (photos: unknown) => ((photos as EvidencePhoto[] | null) ?? []).map((photo) => ({ ...photo, url: urlFor.get(photo.path) ?? "" }));
    return {
      role,
      order,
      dispatch: dispatchResult.data
        ? {
            id: dispatchResult.data.id,
            photos: mapPhotos(dispatchResult.data.photos),
            videoUrl: urlFor.get(dispatchResult.data.video_path) ?? "",
            packingNote: dispatchResult.data.packing_note,
            status: dispatchResult.data.status,
            aiReport: dispatchResult.data.ai_report as ForensicReport | null,
            createdAt: dispatchResult.data.created_at,
          }
        : null,
      returns: returns.map((item) => {
        const evidence = evidenceByReturn.get(item.id);
        return {
          ...item,
          evidence: evidence
            ? {
                id: evidence.id,
                photos: mapPhotos(evidence.photos),
                notes: evidence.notes,
                status: evidence.status,
                trustScore: evidence.trust_score,
                aiReport: evidence.ai_report as ForensicReport | null,
                createdAt: evidence.created_at,
              }
            : null,
        };
      }),
    };
  });

async function getApprovedApplication(context: { supabase: SupabaseClient<Database>; userId: string }) {
  const { data, error } = await context.supabase
    .from("brand_applications")
    .select("id, brand_name, status")
    .eq("user_id", context.userId)
    .maybeSingle();
  if (error || !data) throw new Error("We couldn't find your brand application.");
  if (data.status !== "approved") throw new Error("Dispatch verification opens after your brand is approved.");
  return data;
}
