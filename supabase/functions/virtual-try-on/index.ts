import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ message: "Use POST to generate a try-on." }, 405);

  const apiKey = Deno.env.get("SEGMIND_API_KEY");
  if (!apiKey) return json({ message: "The try-on service is not configured yet. Please add the SEGMIND_API_KEY secret to the Supabase Edge Function." }, 503);

  try {
    const form = await req.formData();
    const person = form.get("person_image");
    const outfit = form.get("outfit_image");
    const categoryValue = form.get("category");
    const category = categoryValue === "lower_body" || categoryValue === "dresses"
      ? categoryValue
      : "upper_body";

    if (!(person instanceof File) || !(outfit instanceof File)) {
      return json({ message: "Upload both your photo and the clothing photo." }, 400);
    }
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(person.type) || !allowed.includes(outfit.type)) {
      return json({ message: "Use JPG, PNG, or WEBP images." }, 400);
    }
    if (person.size > 10 * 1024 * 1024 || outfit.size > 10 * 1024 * 1024) {
      return json({ message: "Each image must be smaller than 10 MB." }, 413);
    }

    const asDataUrl = async (file: File) =>
      `data:${file.type};base64,${toBase64(new Uint8Array(await file.arrayBuffer()))}`;

    const uploaded = await fetch("https://workflows-api.segmind.com/upload-asset", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "accept": "application/json, text/plain, */*",
        "content-type": "application/json",
      },
      body: JSON.stringify({ data_urls: [await asDataUrl(person), await asDataUrl(outfit)] }),
    });

    if (!uploaded.ok) {
      const detail = await uploaded.text();
      console.error("Segmind asset upload failed:", uploaded.status, detail.slice(0, 500));
      return json({ message: uploaded.status === 401 || uploaded.status === 403
        ? "Segmind rejected the API key. Check the SEGMIND_API_KEY secret."
        : "Could not prepare the images for try-on. Please try again." }, 502);
    }

    const assetData = await uploaded.json();
    const urls = assetData.file_urls;
    if (!Array.isArray(urls) || urls.length < 2) {
      return json({ message: "Segmind did not return image URLs. Please try again." }, 502);
    }

    const generated = await fetch("https://api.segmind.com/v1/idm-vton", {
      method: "POST",
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        human_img: urls[0],
        garm_img: urls[1],
        category,
        crop: false,
        force_dc: false,
        mask_only: false,
        steps: 30,
        seed: 42,
      }),
    });

    if (!generated.ok) {
      const detail = await generated.text();
      console.error("Segmind try-on failed:", generated.status, detail.slice(0, 500));
      if (generated.status === 406) return json({ message: "Your Segmind account needs credits to generate a try-on." }, 402);
      if (generated.status === 401 || generated.status === 403) return json({ message: "Segmind rejected the API key or model access." }, 502);
      if (generated.status === 429) return json({ message: "The try-on service is busy. Please wait and try again." }, 429);
      return json({ message: "Segmind could not generate this try-on. Try clearer photos and try again." }, 502);
    }

    const contentType = generated.headers.get("content-type") || "image/jpeg";
    const bytes = new Uint8Array(await generated.arrayBuffer());
    if (!contentType.startsWith("image/") || bytes.length === 0) {
      return json({ message: "The try-on service returned an unexpected result." }, 502);
    }
    return json({ imageUrl: `data:${contentType};base64,${toBase64(bytes)}`, products: [] });
  } catch (error) {
    console.error("virtual-try-on error:", error);
    return json({ message: "Something went wrong while generating the try-on. Please try again." }, 500);
  }
});
