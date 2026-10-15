import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ImagePlus,
  LoaderCircle,
  RefreshCw,
  ScanSearch,
  Shirt,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Match = {
  id?: string;
  name: string;
  brand?: string;
  price?: string | number;
  imageUrl?: string;
  productUrl?: string;
  matchType?: "exact" | "similar";
};

type TryOnResponse = {
  imageUrl?: string;
  products?: Match[];
  message?: string;
};

function CreateLookPage() {
  const [personFile, setPersonFile] = useState<File | null>(null);
  const [outfitFile, setOutfitFile] = useState<File | null>(null);
  const [personPreview, setPersonPreview] = useState("");
  const [outfitPreview, setOutfitPreview] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const personInput = useRef<HTMLInputElement>(null);
  const outfitInput = useRef<HTMLInputElement>(null);

  const acceptImage = (
    file: File | undefined,
    type: "person" | "outfit",
  ) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (JPG, PNG or WEBP).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Please choose an image smaller than 10 MB.");
      return;
    }
    const preview = URL.createObjectURL(file);
    setError("");
    setResultUrl("");
    setMatches([]);
    if (type === "person") {
      setPersonFile(file);
      setPersonPreview(preview);
    } else {
      setOutfitFile(file);
      setOutfitPreview(preview);
    }
  };

  const generateTryOn = async () => {
    if (!personFile || !outfitFile) {
      setError("Upload both your photo and the outfit photo to continue.");
      return;
    }
    const endpoint = import.meta.env.VITE_VTON_API_URL as string | undefined;
    if (!endpoint) {
      setError(
        "Your uploads are ready. To generate the real AI try-on, connect a virtual try-on API endpoint using VITE_VTON_API_URL. No image has been sent anywhere.",
      );
      return;
    }

    setLoading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("person_image", personFile);
      form.append("outfit_image", outfitFile);
      const response = await fetch(endpoint, { method: "POST", body: form });
      if (!response.ok) {
        throw new Error(
          response.status === 429
            ? "The try-on service is busy. Please try again shortly."
            : "The try-on service could not process these images. Please try again.",
        );
      }
      const data = (await response.json()) as TryOnResponse;
      if (!data.imageUrl) {
        throw new Error("The AI service did not return a try-on image.");
      }
      setResultUrl(data.imageUrl);
      setMatches(Array.isArray(data.products) ? data.products : []);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setPersonFile(null);
    setOutfitFile(null);
    setPersonPreview("");
    setOutfitPreview("");
    setResultUrl("");
    setMatches([]);
    setError("");
    if (personInput.current) personInput.current.value = "";
    if (outfitInput.current) outfitInput.current.value = "";
  };

  return (
    <main className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm text-primary">
          <Sparkles className="size-4" /> OFFFEED AI STUDIO
        </span>
        <h1 className="mt-6 font-display text-4xl leading-tight sm:text-6xl">
          See the fit on you.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Bring an outfit you love. Preview it on yourself, then discover
          independent brands with pieces that match your vibe.
        </p>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <section className="rounded-3xl border bg-card p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <ImagePlus className="size-5" />
            </div>
            <div>
              <h2 className="font-display text-2xl">01. Your photo</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose a clear, well-lit photo where your outfit area is visible.
              </p>
            </div>
          </div>
          <input
            ref={personInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            aria-label="Upload your photo"
            onChange={(event) => acceptImage(event.target.files?.[0], "person")}
          />
          <button
            type="button"
            onClick={() => personInput.current?.click()}
            className="mt-5 flex min-h-64 w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-primary/40 bg-muted/30 transition hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {personPreview ? (
              <img
                src={personPreview}
                alt="Your uploaded photo preview"
                className="h-80 w-full object-contain"
              />
            ) : (
              <>
                <Upload className="size-8 text-primary" />
                <span className="mt-3 font-medium">Upload your photo</span>
                <span className="mt-1 text-xs text-muted-foreground">
                  JPG, PNG or WEBP · up to 10 MB
                </span>
              </>
            )}
          </button>
          {personFile && (
            <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="size-4 text-primary" />
              {personFile.name}
              <button
                type="button"
                aria-label="Remove your photo"
                onClick={() => {
                  setPersonFile(null);
                  setPersonPreview("");
                  if (personInput.current) personInput.current.value = "";
                  setResultUrl("");
                }}
                className="ml-auto rounded-full p-1 hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </p>
          )}
        </section>

        <section className="rounded-3xl border bg-card p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <Shirt className="size-5" />
            </div>
            <div>
              <h2 className="font-display text-2xl">02. Your inspiration</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Upload the outfit you found on Instagram, Pinterest or anywhere else.
              </p>
            </div>
          </div>
          <input
            ref={outfitInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            aria-label="Upload an outfit photo"
            onChange={(event) => acceptImage(event.target.files?.[0], "outfit")}
          />
          <button
            type="button"
            onClick={() => outfitInput.current?.click()}
            className="mt-5 flex min-h-64 w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-primary/40 bg-muted/30 transition hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {outfitPreview ? (
              <img
                src={outfitPreview}
                alt="Outfit inspiration preview"
                className="h-80 w-full object-contain"
              />
            ) : (
              <>
                <ImagePlus className="size-8 text-primary" />
                <span className="mt-3 font-medium">Upload outfit image</span>
                <span className="mt-1 text-xs text-muted-foreground">
                  A full look works best
                </span>
              </>
            )}
          </button>
          {outfitFile && (
            <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="size-4 text-primary" />
              {outfitFile.name}
              <button
                type="button"
                aria-label="Remove outfit photo"
                onClick={() => {
                  setOutfitFile(null);
                  setOutfitPreview("");
                  if (outfitInput.current) outfitInput.current.value = "";
                  setResultUrl("");
                }}
                className="ml-auto rounded-full p-1 hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </p>
          )}
        </section>
      </div>

      {error && (
        <div
          role="alert"
          className="mx-auto mt-5 max-w-3xl rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm"
        >
          {error}
        </div>
      )}

      <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
        <Button
          size="lg"
          className="min-h-12 rounded-full px-7"
          onClick={generateTryOn}
          disabled={loading}
        >
          {loading ? (
            <LoaderCircle className="mr-2 size-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 size-4" />
          )}
          {loading ? "Creating your preview…" : "Try this outfit on me"}
          {!loading && <ArrowRight className="ml-2 size-4" />}
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="min-h-12 rounded-full px-7"
          onClick={reset}
          disabled={loading}
        >
          <RefreshCw className="mr-2 size-4" /> Start over
        </Button>
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Your photos stay on this page unless you choose to generate a preview.
        AI results are visual estimates, not a guarantee of fit.
      </p>

      {resultUrl && (
        <section className="mt-14">
          <div className="text-center">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">
              Your OFFFEED preview
            </p>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl">
              A little outfit magic.
            </h2>
          </div>
          <div className="mx-auto mt-6 max-w-md overflow-hidden rounded-3xl border bg-card p-3 shadow-sm">
            <img
              src={resultUrl}
              alt="AI virtual try-on result"
              className="max-h-[680px] w-full rounded-2xl object-contain"
            />
          </div>
          {matches.length > 0 && (
            <div className="mt-12">
              <div className="text-center">
                <ScanSearch className="mx-auto size-6 text-primary" />
                <h3 className="mt-3 font-display text-3xl">Find your fit</h3>
                <p className="mt-2 text-muted-foreground">
                  Pieces from independent brands that match your inspiration.
                </p>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                {matches.map((match, index) => (
                  <article
                    key={match.id ?? `${match.name}-${index}`}
                    className="overflow-hidden rounded-2xl border bg-card"
                  >
                    {match.imageUrl ? (
                      <img
                        src={match.imageUrl}
                        alt={match.name}
                        className="aspect-[3/4] w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-[3/4] items-center justify-center bg-muted">
                        <Shirt className="size-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="p-3">
                      <p className="font-medium">{match.name}</p>
                      {match.brand && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {match.brand}
                        </p>
                      )}
                      {match.price !== undefined && (
                        <p className="mt-1 text-sm">
                          {typeof match.price === "number"
                            ? `₹${match.price.toLocaleString("en-IN")}`
                            : match.price}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {match.matchType === "exact"
                          ? "Exact match"
                          : "Similar style"}
                      </p>
                      {match.productUrl && (
                        <a
                          href={match.productUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex items-center text-sm font-medium text-primary hover:underline"
                        >
                          View product <ArrowRight className="ml-1 size-3" />
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

export const Route = createFileRoute("/create")({
  head: () => ({
    meta: [
      { title: "AI Virtual Try-On — OFFFEED" },
      {
        name: "description",
        content:
          "Upload your photo and an outfit you love to preview the look and discover independent fashion brands.",
      },
      { property: "og:title", content: "AI Virtual Try-On — OFFFEED" },
      {
        property: "og:description",
        content: "See the fit on you. Discover it on OFFFEED.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CreateLookPage,
});
