import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  imageDataUrl: z.string()
    .min(1)
    .max(3_000_000)
    .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/, "Please upload a supported image."),
});

const analysisSchema = z.object({
  overallStyle: z.string().trim().max(100),
  summary: z.string().trim().max(240),
  items: z.array(z.object({
    category: z.string().trim().max(50),
    color: z.string().trim().max(40),
    pattern: z.string().trim().max(40),
    material: z.string().trim().max(40),
    fit: z.string().trim().max(40),
    searchTerms: z.array(z.string().trim().min(1).max(40)).max(6),
  })).max(6),
  searchTerms: z.array(z.string().trim().min(1).max(40)).max(12),
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
