import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const reviewInput = z.object({ token: z.string().min(1).max(1200) });
const decisionInput = reviewInput.extend({ action: z.enum(["approve", "decline"]), reason: z.string().trim().max(500).optional() });

const getApplication = async (token: string) => {
  const { verifyBrandApprovalToken } = await import("./brand-approval.server");
  const payload = await verifyBrandApprovalToken(token);
  if (!payload) throw new Error("This review link is invalid or has expired.");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: application, error } = await supabaseAdmin
    .from("brand_applications")
    .select("id, brand_name, contact_name, email, category, brand_description, website_url, social_handle, logo_path, cover_path, proof_path, status, commission_rate, commission_agreed_at, created_at")
    .eq("id", payload.applicationId)
    .single();
  if (error || !application) throw new Error("This application could not be found.");

  const paths = [application.logo_path, application.cover_path, application.proof_path].filter((path): path is string => Boolean(path));
  const { data: signedFiles, error: signedUrlError } = await supabaseAdmin.storage.from("brand-applications").createSignedUrls(paths, 600);
  if (signedUrlError) throw new Error("The application files could not be loaded.");
  const fileUrls = new Map((signedFiles ?? []).map((file) => [file.path, file.signedUrl]));
  return {
    id: application.id,
    brandName: application.brand_name,
    contactName: application.contact_name,
    email: application.email,
    category: application.category,
    description: application.brand_description,
    website: application.website_url,
    socialHandle: application.social_handle,
    status: application.status,
    commissionRate: application.commission_rate,
    commissionAgreedAt: application.commission_agreed_at,
    createdAt: application.created_at,
    logoUrl: fileUrls.get(application.logo_path) ?? null,
    coverUrl: fileUrls.get(application.cover_path) ?? null,
    proofUrl: application.proof_path ? fileUrls.get(application.proof_path) ?? null : null,
  };
};

export const getBrandReview = createServerFn({ method: "POST" })
  .inputValidator((input) => reviewInput.parse(input))
  .handler(async ({ data }) => getApplication(data.token));

export const decideBrandApplication = createServerFn({ method: "POST" })
  .inputValidator((input) => decisionInput.parse(input))
  .handler(async ({ data }) => {
    const { verifyBrandApprovalToken } = await import("./brand-approval.server");
    const payload = await verifyBrandApprovalToken(data.token);
    if (!payload) throw new Error("This review link is invalid or has expired.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: current, error: readError } = await supabaseAdmin.from("brand_applications").select("id, brand_name, email, status, commission_rate").eq("id", payload.applicationId).single();
    if (readError || !current) throw new Error("This application could not be found.");
    if (current.status !== "under_review") return { status: current.status, brandName: current.brand_name };

    const nextStatus = data.action === "approve" ? "approved" : "declined";
    const { error } = await supabaseAdmin.from("brand_applications").update({ status: nextStatus }).eq("id", payload.applicationId).eq("status", "under_review");
    if (error) throw new Error("The application status could not be updated.");

    try {
      const { sendBrandDecisionEmail } = await import("./brand-notification.server");
      await sendBrandDecisionEmail({ brandName: current.brand_name, email: current.email, approved: data.action === "approve", reason: data.reason, commissionRate: current.commission_rate });
    } catch (notifyError) {
      console.error("[brand-review] Decision email failed", notifyError);
    }
    return { status: nextStatus, brandName: current.brand_name };
  });