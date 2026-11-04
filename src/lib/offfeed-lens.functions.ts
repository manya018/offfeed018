import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  imageDataUrl: z.string()
    .min(1)
    .max(3_000_000)
    .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/, "Please upload a supported image."),
});

const analysisSchema = z.object({
  overallStyle: z.string().trim().max(100).default(""),
  summary: z.string().trim().max(240).default(""),
  items: z.array(z.object({
    category: z.string().trim().max(50).default(""),
    color: z.string().trim().max(40).default(""),
    pattern: z.string().trim().max(40).default(""),
    material: z.string().trim().max(40).default(""),
    fit: z.string().trim().max(40).default(""),
    searchTerms: z.array(z.string().trim().min(1).max(40)).max(6).default([]),
  })).max(6).default([]),
  searchTerms: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
});

export type OutfitImageAnalysis = z.infer<typeof analysisSchema>;

export const analyzeOutfitImage = createServerFn({ method: "POST" })
  .inputValidator((input) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) {
      throw new Error("OFFFEED Lens is not configured yet. Add the Lovable AI gateway key to the server environment.");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        temperature: 0.1,
        max_tokens: 900,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: [
              "You are OFFFEED Lens, a fashion catalogue visual-search assistant.",
              "Inspect the outfit image and identify only visible fashion items, not the person's identity, age, body measurements, or sensitive traits.",
              "Return JSON only with keys overallStyle, summary, items, searchTerms.",
              "For each visible item provide category, color, pattern, material, fit, and practical searchTerms.",
              "Use concise catalogue-friendly terms such as oversized shirt, straight jeans, white, denim, floral, cotton.",
              "Do not invent logos, brands, exact materials, or details that cannot be seen. Use an empty string when uncertain.",
              "Prioritize the main clothing pieces and accessories; include up to six items and up to twelve overall search terms.",
            ].join(" "),
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyse this outfit for similar items available in the OFFFEED fashion catalogue." },
              { type: "image_url", image_url: { url: data.imageDataUrl } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) throw new Error("OFFFEED Lens is busy right now. Please try again in a moment.");
      if (response.status === 402) throw new Error("OFFFEED Lens has reached its AI usage limit. Please try again later.");
      throw new Error("We couldn't analyse this image right now. Please try again.");
    }

    const payload = await response.json() as {
      choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }>;
    };
    const message = payload.choices?.[0]?.message?.content;
    const raw = typeof message === "string"
      ? message
      : Array.isArray(message)
        ? message.map((part) => part.text ?? "").join("")
        : "";
    if (!raw) throw new Error("OFFFEED Lens couldn't read the image response. Please try another photo.");

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw.replace(/^\s*\`\`\`(?:json)?\s*/i, "").replace(/\s*\`\`\`\s*$/, ""));
    } catch {
      throw new Error("OFFFEED Lens couldn't understand this image. Please try another photo.");
    }
    return analysisSchema.parse(parsed);
  });


const visualMatchInputSchema = z.object({
  queryImageDataUrl: z.string().min(1).max(3_000_000)
    .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/, "Please upload a supported image."),
  candidates: z.array(z.object({
    id: z.string().trim().min(1).max(100),
    kind: z.enum(["look", "product"]),
    title: z.string().trim().min(1).max(160),
    imageUrl: z.string().min(1).max(3_000_000),
  })).min(1).max(16),
});

const visualMatchResultSchema = z.object({
  matches: z.array(z.object({
    id: z.string().min(1).max(100),
    score: z.number().min(0).max(100),
    reason: z.string().trim().max(180).default(""),
  })).max(16),
});

export type OutfitVisualCandidate = z.infer<typeof visualMatchInputSchema>["candidates"][number];
export type OutfitVisualMatch = z.infer<typeof visualMatchResultSchema>["matches"][number];

function isAllowedCandidateImage(imageUrl: string) {
  if (imageUrl.startsWith("data:image/")) {
    return /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(imageUrl);
  }
  try {
    const parsed = new URL(imageUrl);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    const supabaseHost = process.env["SUPABASE_URL"] ? new URL(process.env["SUPABASE_URL"]).hostname.toLowerCase() : "";
    return host === supabaseHost || host === "cdn.shopify.com" || host.endsWith(".myshopify.com") || host.endsWith(".shopifycdn.net");
  } catch {
    return false;
  }
}

export const rankOutfitImageMatches = createServerFn({ method: "POST" })
  .inputValidator((input) => visualMatchInputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("OFFFEED Lens is not configured yet.");
    if (data.candidates.some((candidate) => !isAllowedCandidateImage(candidate.imageUrl))) {
      throw new Error("One or more catalogue images could not be verified for visual matching.");
    }

    const imageParts = data.candidates.map((candidate) => ({
      type: "image_url",
      image_url: { url: candidate.imageUrl },
    }));
    const candidateList = data.candidates.map((candidate) => ({
      id: candidate.id,
      type: candidate.kind,
      title: candidate.title,
    }));
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        temperature: 0.1,
        max_tokens: 1200,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: [
              "You are OFFFEED Lens visual image-to-image matcher.",
              "The first image is the user's outfit reference. Every following image is a candidate look or product.",
              "Compare the actual pixels and visible appearance, not just titles or text.",
              "Rank candidates by visual similarity: garment type and silhouette, dominant colours, pattern, fabric texture when visible, layering, accessories, and overall styling.",
              "For a product, compare the visible item itself. For a look, compare the complete outfit composition.",
              "Do not infer identity or sensitive traits. Do not reward a candidate merely because its title sounds similar.",
              "Return JSON only as { matches: [{ id, score, reason }] }. Include only genuinely relevant visual matches, highest score first. Score 0-100; omit unrelated candidates.",
            ].join(" "),
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Reference outfit image. Compare it with these candidates in the exact order listed: ${JSON.stringify(candidateList)}` },
              { type: "image_url", image_url: { url: data.queryImageDataUrl } },
              ...imageParts,
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) throw new Error("Visual matching is busy right now. Please try again.");
      if (response.status === 402) throw new Error("OFFFEED Lens has reached its AI usage limit. Please try again later.");
      throw new Error("We couldn't compare catalogue images right now. Please try again.");
    }
    const payload = await response.json() as {
      choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }>;
    };
    const message = payload.choices?.[0]?.message?.content;
    const raw = typeof message === "string" ? message : Array.isArray(message) ? message.map((part) => part.text ?? "").join("") : "";
    if (!raw) throw new Error("OFFFEED Lens couldn't read the visual matching response.");
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, ""));
    } catch {
      throw new Error("OFFFEED Lens couldn't understand the visual matching response.");
    }
    const validated = visualMatchResultSchema.parse(parsed);
    const candidateIds = new Set(data.candidates.map((candidate) => candidate.id));
    return validated.matches.filter((match) => candidateIds.has(match.id) && match.score >= 35).sort((a, b) => b.score - a.score);
  });
