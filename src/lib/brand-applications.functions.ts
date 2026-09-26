import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const applicationSchema = z.object({
  contactName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  brandName: z.string().trim().min(2).max(120),
  category: z.enum(["Fashion", "Jewelry", "Beauty", "Accessories", "Independent designer", "Other"]),
  description: z.string().trim().min(20).max(1000),
  website: z.string().trim().url().max(2048),
  socialHandle: z.string().trim().max(120).optional().nullable(),
  logoPath: z.string().min(1).max(500),
  coverPath: z.string().min(1).max(500),
  proofPath: z.string().max(500).optional().nullable(),
});

export const getMyBrandApplication = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("brand_applications")
      .select("id, brand_name, status, created_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error("We couldn't check your application. Please try again.");
    return data;
  });

export const submitBrandApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => applicationSchema.parse(input))
  .handler(async ({ context, data }) => {
    const ownedPaths = [data.logoPath, data.coverPath, data.proofPath].filter(Boolean);
    if (ownedPaths.some((path) => !path?.startsWith(`${context.userId}/`))) {
      throw new Error("One or more uploaded files could not be verified. Please upload them again.");
    }
    const { data: application, error } = await context.supabase
      .from("brand_applications")
      .insert({
        user_id: context.userId,
        contact_name: data.contactName,
        email: data.email,
        brand_name: data.brandName,
        category: data.category,
        brand_description: data.description,
        website_url: data.website,
        social_handle: data.socialHandle || null,
        logo_path: data.logoPath,
        cover_path: data.coverPath,
        proof_path: data.proofPath || null,
        status: "under_review",
      })
      .select("id, brand_name, status, created_at")
      .single();
    if (error) {
      if (error.code === "23505") throw new Error("An application has already been submitted for this account.");
      throw new Error("Your application couldn't be submitted. Please try again.");
    }
    return application;
  });