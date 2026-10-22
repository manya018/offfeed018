import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Copy,
  Heart,
  ImagePlus,
  RotateCcw,
  Share2,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicProductCard } from "@/components/public-product-card";
import { getShopTheLookProducts, type ProductWithBrand } from "@/lib/public-brand.functions";
import { useStyleSpace } from "@/lib/style-space";
import { toast } from "sonner";

const vibes = ["Minimal", "Streetwear", "Soft romantic", "Old money", "Indie", "Y2K", "Boho", "Quiet luxury"];
const occasions = ["Everyday", "College", "Date night", "Party", "Festive", "Work", "Vacation"];
const budgets = ["Under ₹1,000", "₹1,000–₹2,500", "₹2,500–₹5,000", "No limit"];
const palettes = ["Neutrals", "Earthy tones", "Black & white", "Pastels", "Bold colours", "Denim blues"];

function CreateLookPage() {
  const [outfitFile, setOutfitFile] = useState<File | null>(null);
  const [outfitPreview, setOutfitPreview] = useState("");
  const [vibe, setVibe] = useState("Indie");
  const [occasion, setOccasion] = useState("Everyday");
  const [budget, setBudget] = useState("₹1,000–₹2,500");
  const [palette, setPalette] = useState("Earthy tones");
  const [details, setDetails] = useState("");
  const [recipe, setRecipe] = useState("");
  const [saved, setSaved] = useState(false);
  const [matching, setMatching] = useState(false);
  const [matchError, setMatchError] = useState("");
  const [matchedProducts, setMatchedProducts] = useState<ProductWithBrand[]>([]);
  const { space } = useStyleSpace();
  const fileInput = useRef<HTMLInputElement>(null);

  const acceptImage = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Choose an image smaller than 10 MB.");
      return;
    }
    if (outfitPreview) URL.revokeObjectURL(outfitPreview);
    setOutfitFile(file);
    setOutfitPreview(URL.createObjectURL(file));
    setRecipe("");
    setSaved(false);
  };

  const buildRecipe = async () => {
    const extra = details.trim() ? `\nSignature details: ${details.trim()}` : "";
    const text = `MY OFFFEED STYLE DNA ✦\nVibe: ${vibe}\nOccasion: ${occasion}\nColour story: ${palette}\nBudget: ${budget}${extra}\n\nFind it before your feed does. #OFFFEED`;
    setRecipe(text);
    setSaved(false);
    setMatchError("");
    setMatchedProducts([]);
    setMatching(true);
    const budgetRange = budget === "Under ₹1,000"
      ? { minPrice: undefined, maxPrice: 999.99 }
      : budget === "₹1,000–₹2,500"
        ? { minPrice: 1000, maxPrice: 2500 }
        : budget === "₹2,500–₹5,000"
          ? { minPrice: 2500, maxPrice: 5000 }
          : {};
    try {
      const products = await getShopTheLookProducts({
        data: {
          audience: space === "him" ? "him" : "her",
          aesthetic: [vibe, occasion, palette, details.trim()].filter(Boolean).join(" ").slice(0, 80),
          ...budgetRange,
          requireMatch: true,
        },
      });
      setMatchedProducts(products.filter((product) =>
        (budgetRange.minPrice === undefined || product.price >= budgetRange.minPrice) &&
        (budgetRange.maxPrice === undefined || product.price <= budgetRange.maxPrice)
      ).slice(0, 8));
    } catch {
      setMatchError("We couldn't load matching products just now. Your Style DNA is ready — try matching again in a moment.");
    } finally {
      setMatching(false);
    }
  };

  const saveRecipe = () => {
    if (!recipe) return;
    try {
      const previous = JSON.parse(localStorage.getItem("offfeed-style-dna") || "[]");
      const entries = Array.isArray(previous) ? previous : [];
      localStorage.setItem("offfeed-style-dna", JSON.stringify([
        { id: `style-${Date.now()}`, recipe, createdAt: new Date().toISOString() },
        ...entries,
      ].slice(0, 20)));
      setSaved(true);
      toast.success("Your Style DNA is saved on this device.");
    } catch {
      toast.error("Could not save on this device. You can still copy your Style DNA.");
    }
  };

  const copyRecipe = async () => {
    if (!recipe) return;
    try {
      await navigator.clipboard.writeText(recipe);
      toast.success("Style DNA copied. Share it anywhere!");
    } catch {
      toast.error("Copy isn't available in this browser. Select the text to copy it.");
    }
  };

  const shareRecipe = async () => {
    if (!recipe) return;
    try {
      if (navigator.share) await navigator.share({ title: "My OFFFEED Style DNA", text: recipe });
      else await copyRecipe();
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      await copyRecipe();
    }
  };

  const reset = () => {
    if (outfitPreview) URL.revokeObjectURL(outfitPreview);
    setOutfitFile(null);
    setOutfitPreview("");
    setVibe("Indie");
    setOccasion("Everyday");
    setBudget("₹1,000–₹2,500");
    setPalette("Earthy tones");
    setDetails("");
    setRecipe("");
    setSaved(false);
    setMatchedProducts([]);
    setMatchError("");
    if (fileInput.current) fileInput.current.value = "";
  };

  return (
    <main className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm text-primary">
          <Sparkles className="size-4" /> YOUR PERSONAL STYLE LAB
        </span>
        <h1 className="mt-6 font-display text-4xl leading-tight sm:text-6xl">
          Create a look that feels like <em className="font-normal text-primary">you.</em>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          Save an outfit that caught your eye, build its Style DNA, and turn your taste into a shareable style recipe. No AI try-on, no credits — just your style, your way.
        </p>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-3xl border bg-card p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary"><ImagePlus className="size-5" /></div>
            <div>
              <h2 className="font-display text-2xl">01. Keep the inspiration</h2>
              <p className="mt-1 text-sm text-muted-foreground">Upload a look you love from anywhere. The image stays in this page and is not sent to an AI service.</p>
            </div>
          </div>
          <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label="Upload outfit inspiration" onChange={(event) => acceptImage(event.target.files?.[0])} />
          <button type="button" onClick={() => fileInput.current?.click()} className="mt-5 flex min-h-72 w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-primary/40 bg-muted/30 transition hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            {outfitPreview ? <img src={outfitPreview} alt="Your outfit inspiration" className="h-96 w-full object-contain" /> : <>
              <Upload className="size-8 text-primary" />
              <span className="mt-3 font-medium">Upload outfit inspiration</span>
              <span className="mt-1 text-xs text-muted-foreground">JPG, PNG or WEBP · up to 10 MB</span>
            </>}
          </button>
          {outfitFile && <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><Check className="size-4 text-primary" />{outfitFile.name}<button type="button" aria-label="Remove inspiration image" onClick={() => { if (outfitPreview) URL.revokeObjectURL(outfitPreview); setOutfitFile(null); setOutfitPreview(""); if (fileInput.current) fileInput.current.value = ""; }} className="ml-auto rounded-full p-1 hover:bg-muted"><X className="size-4" /></button></p>}
          <div className="mt-5 rounded-2xl bg-muted/40 p-4">
            <p className="text-sm font-medium">The OFFFEED twist</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Your choices become a little Style DNA card — a mood, colour story, occasion and budget you can save or share with friends.</p>
          </div>
        </section>

        <section className="rounded-3xl border bg-card p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary"><Heart className="size-5" /></div>
            <div>
              <h2 className="font-display text-2xl">02. Define your Style DNA</h2>
              <p className="mt-1 text-sm text-muted-foreground">Make the inspiration yours with a few quick choices.</p>
            </div>
          </div>
          <div className="mt-6 space-y-6">
            <fieldset>
              <legend className="mb-3 text-sm font-medium">Your vibe</legend>
              <div className="flex flex-wrap gap-2">{vibes.map((item) => <button key={item} type="button" onClick={() => { setVibe(item); setRecipe(""); }} className={`rounded-full border px-3 py-2 text-sm transition ${vibe === item ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50"}`}>{item}</button>)}</div>
            </fieldset>
            <fieldset>
              <legend className="mb-3 text-sm font-medium">Where are you wearing it?</legend>
              <div className="flex flex-wrap gap-2">{occasions.map((item) => <button key={item} type="button" onClick={() => { setOccasion(item); setRecipe(""); }} className={`rounded-full border px-3 py-2 text-sm transition ${occasion === item ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50"}`}>{item}</button>)}</div>
            </fieldset>
            <fieldset>
              <legend className="mb-3 text-sm font-medium">Colour story</legend>
              <div className="flex flex-wrap gap-2">{palettes.map((item) => <button key={item} type="button" onClick={() => { setPalette(item); setRecipe(""); }} className={`rounded-full border px-3 py-2 text-sm transition ${palette === item ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50"}`}>{item}</button>)}</div>
            </fieldset>
            <fieldset>
              <legend className="mb-3 text-sm font-medium">Shopping budget</legend>
              <div className="grid grid-cols-2 gap-2">{budgets.map((item) => <button key={item} type="button" onClick={() => { setBudget(item); setRecipe(""); }} className={`rounded-xl border px-3 py-3 text-sm transition ${budget === item ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50"}`}>{item}</button>)}</div>
            </fieldset>
            <div>
              <label htmlFor="style-details" className="mb-2 block text-sm font-medium">Your signature detail <span className="font-normal text-muted-foreground">(optional)</span></label>
              <input id="style-details" value={details} onChange={(event) => { setDetails(event.target.value); setRecipe(""); }} maxLength={120} placeholder="e.g. silver jewellery, oversized layers, vintage denim" className="w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>
          <Button size="lg" className="mt-7 min-h-12 w-full rounded-full" onClick={buildRecipe}><Sparkles className="mr-2 size-4" /> Build my Style DNA <ArrowRight className="ml-2 size-4" /></Button>
        </section>
      </div>

      {recipe && <section className="mx-auto mt-10 max-w-3xl rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Your style, decoded</span>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl">The Style DNA card</h2>
          <p className="mt-2 text-sm text-muted-foreground">A little style recipe to keep, send to a friend or use as your next shopping brief.</p>
        </div>
        <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-7">
          {outfitPreview && <img src={outfitPreview} alt="Style inspiration for your Style DNA" className="mb-5 max-h-72 w-full rounded-xl object-contain" />}
          <p className="font-display text-2xl">MY OFFFEED STYLE DNA <span className="text-primary">✦</span></p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{[["VIBE", vibe], ["OCCASION", occasion], ["COLOUR STORY", palette], ["BUDGET", budget]].map(([label, value]) => <div key={label} className="rounded-xl bg-background/80 p-3"><p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div>)}</div>
          {details.trim() && <p className="mt-4 text-sm"><span className="font-medium">Signature detail:</span> {details.trim()}</p>}
          <p className="mt-5 text-xs tracking-wide text-muted-foreground">FIND IT BEFORE YOUR FEED DOES. · #OFFFEED</p>
        </div>
        <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={saveRecipe} variant="outline" className="rounded-full">{saved ? <Check className="mr-2 size-4" /> : <Heart className="mr-2 size-4" />}{saved ? "Saved on this device" : "Save Style DNA"}</Button>
          <Button onClick={copyRecipe} variant="outline" className="rounded-full"><Copy className="mr-2 size-4" /> Copy recipe</Button>
          <Button onClick={shareRecipe} className="rounded-full"><Share2 className="mr-2 size-4" /> Share my style</Button>
        </div>
        <div className="mt-6 text-center"><Link to="/discover" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">Explore OFFFEED looks <ArrowRight className="size-4" /></Link></div>
      </section>
      <section className="mt-12">
        <div className="text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Your recipe, your finds</span>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl">Pieces that match your mood.</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">We’ll look through approved, published OFFFEED brand listings for pieces that fit your style choices and budget.</p>
        </div>
        {matching ? <p className="py-12 text-center text-sm text-muted-foreground">Finding your kind of pieces…</p>
          : matchError ? <p role="status" className="mx-auto mt-6 max-w-xl rounded-2xl border p-4 text-center text-sm text-muted-foreground">{matchError}</p>
          : matchedProducts.length > 0 ? <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4">{matchedProducts.map((product) => <PublicProductCard key={product.id} product={product} />)}</div>
          : <div className="mx-auto mt-7 max-w-xl rounded-2xl border border-dashed p-6 text-center"><p className="font-medium">Your Style DNA is ready to explore.</p><p className="mt-2 text-sm leading-6 text-muted-foreground">When approved independent brands list products that match your choices and budget, they’ll show up here. You can also browse all looks in Discover.</p><Link to="/discover" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">Explore Discover <ArrowRight className="size-4" /></Link></div>}
      </section>

      <div className="mt-8 flex justify-center">
        <Button variant="ghost" className="rounded-full" onClick={reset}><RotateCcw className="mr-2 size-4" /> Start a new look</Button>
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">No AI try-on or paid generation API is used. Uploaded inspiration is previewed locally in your browser.</p>
    </main>
  );
}

export const Route = createFileRoute("/create")({
  head: () => ({
    meta: [
      { title: "Create your Style DNA — OFFFEED" },
      { name: "description", content: "Build a personal style recipe from an outfit you love. Choose your vibe, occasion, colour story and budget, then save or share it." },
      { property: "og:title", content: "Create your Style DNA — OFFFEED" },
      { property: "og:description", content: "Turn outfit inspiration into a style recipe with OFFFEED." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CreateLookPage,
});
