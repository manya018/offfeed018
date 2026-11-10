import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownToLine, ArrowLeft, ArrowRight, Check, ExternalLink, ImagePlus, LoaderCircle, PackagePlus, PencilLine, Plus, RefreshCw, Search, Sparkles, ShieldAlert, ShieldCheck, Shirt, Trash2, Truck, Upload, Video, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { createBrandProduct, getBrandWorkspace, importShopifyCatalog, saveBrandShippingProfile, saveBrandSizeGuide, saveImportedShopifyProducts, updateBrandOrderTracking, updateBrandProductSizeChart, updateBrandProductStatus } from "@/lib/brand-products.functions";
import { submitDispatchEvidence, getDisputeViewerData, rerunReturnAnalysis, type DisputeViewerData, type ForensicReport } from "@/lib/dispute-evidence.functions";
import { submitSpotlightCampaign, getMySpotlightCampaigns, getMySpotlightPerformance } from "@/lib/spotlight.functions";


export const Route = createFileRoute("/_authenticated/brand/dashboard")({
  head: () => ({ meta: [
    { title: "Brand Workspace — OFFFEED" },
    { name: "description", content: "Manage your OFFFEED brand products and catalog." },
    { property: "og:title", content: "Brand Workspace — OFFFEED" },
    { property: "og:description", content: "Manage your OFFFEED brand products and catalog." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: BrandDashboard,
});

type ProductDepartment = "Clothing" | "Jewellery" | "Accessories" | "Footwear" | "Home & Living" | "Mixed look";
type DraftProduct = {
  listingType: "product" | "bundle";
  bundleItems: string;
  department: ProductDepartment;
  name: string;
  description: string;
  category: string;
  aesthetic: string;
  price: string;
  productUrl: string;
  sizes: string;
  colors: string;
  tags: string;
  audience: Array<"her" | "him" | "home">;
};

type ImportedProduct = {
  externalId: string;
  name: string;
  description: string;
  price: number;
  productUrl: string;
  imagePath: string | null;
  sizes: string[];
  colors: string[];
  category: string;
};

const aestheticOptions = ["Romantic & Dreamy", "Minimalist", "Old Money", "Streetwear", "Coquette", "Y2K", "Boho", "Elegant & Classic", "Edgy", "Cottagecore", "Vintage / Retro", "Dark Academia", "Sporty", "Casual Everyday", "Party / Glam", "Ethnic / Traditional", "Gothic", "Quiet Luxury", "Experimental / Avant-Garde", "Other"];
const blankProduct: DraftProduct = { listingType: "product", bundleItems: "", department: "Clothing", name: "", description: "", category: "Tops", aesthetic: "Romantic & Dreamy", price: "", productUrl: "", sizes: "XS, S, M, L, XL", colors: "", tags: "", audience: ["her"] };
const herOnlyCategories = new Set(["Dresses", "Skirts", "Blouses", "Sarees", "Lehengas", "Anarkalis", "Sharara Sets", "Dupattas", "Lingerie & Loungewear", "Heels", "Flats", "Clutches", "Tote Bags", "Hair Accessories", "Bangles", "Maang Tikkas", "Nose Pins"]);
const himOnlyCategories = new Set(["T-shirts & Polos", "Sherwanis", "Nehru Jackets", "Bandhgalas", "Dhoti Pants", "Waistcoats", "Loafers", "Formal Shoes", "Backpacks", "Wallets"]);
const categoryOptions: Record<ProductDepartment, string[]> = {
  "Home & Living": ["Crockery & Tableware", "Mugs & Cups", "Dinner Sets", "Plates & Bowls", "Cutlery & Serving", "Bedding & Furnishings", "Bedsheets & Pillow Covers", "Blankets & Quilts", "Cushions & Throws", "Candles & Fragrance", "Home Decor", "Vases & Planters", "Wall Art & Mirrors", "Kitchen & Dining", "Cookware & Utensils", "Storage & Organisation", "Bath & Wellness", "Lighting", "Plants & Planters", "Other Home & Living"],
  Clothing: ["Tops", "T-shirts & Polos", "Shirts", "Blouses", "Dresses", "Skirts", "Jeans & Denim", "Trousers & Pants", "Shorts", "Co-ord Sets", "Jumpsuits", "Jackets & Outerwear", "Knitwear", "Sweatshirts & Hoodies", "Activewear", "Lingerie & Loungewear", "Sarees", "Lehengas", "Kurtas & Suits", "Anarkalis", "Sharara Sets", "Dupattas", "Indo-Western", "Ethnic Co-ords", "Sherwanis", "Nehru Jackets", "Bandhgalas", "Dhoti Pants", "Waistcoats", "Other Clothing"],
  Jewellery: ["Earrings", "Necklaces", "Rings", "Bracelets", "Anklets", "Jewellery Sets", "Bangles", "Maang Tikkas", "Nose Pins", "Brooches", "Other Jewellery"],
  Accessories: ["Bags", "Clutches", "Tote Bags", "Backpacks", "Belts", "Sunglasses", "Watches", "Hats & Caps", "Hair Accessories", "Scarves", "Wallets", "Other Accessories"],
  Footwear: ["Sneakers", "Heels", "Flats", "Sandals", "Boots", "Loafers", "Formal Shoes", "Ethnic Footwear", "Other Footwear"],
  "Mixed look": ["Complete Look"],
};
const homeProductCategoryGroups: Record<string, string[]> = {
  "Crockery & Tableware": ["Crockery & Tableware", "Mugs & Cups", "Dinner Sets", "Plates & Bowls", "Cutlery & Serving"],
  "Bedding & Furnishings": ["Bedding & Furnishings", "Bedsheets & Pillow Covers", "Blankets & Quilts", "Cushions & Throws"],
  "Candles & Fragrance": ["Candles & Fragrance"],
  "Home Decor": ["Home Decor", "Vases & Planters", "Wall Art & Mirrors"],
  "Kitchen & Dining": ["Kitchen & Dining", "Cookware & Utensils"],
  "Storage & Organisation": ["Storage & Organisation"],
  "Bath & Wellness": ["Bath & Wellness"],
  "Lighting": ["Lighting"],
  "Plants & Planters": ["Plants & Planters"],
};
const fieldClass = "mt-2 h-11 rounded-lg border-border/80 bg-card px-3";
const parseList = (value: string) => value.split(",").map((item) => item.trim().replace(/^#/, "")).filter(Boolean);
const formatSizeChart = (chart: { columns: string[]; rows: Array<{ label: string; values: string[] }>; unit?: string } | null) => chart ? ["Measurement | " + chart.columns.join(" | "), ...chart.rows.map((row) => row.label + " | " + row.values.join(" | "))].join("\n") : "";
const parseSizeChart = (value: string, unit: string) => {
  const lines = value.split("\n").map((line) => line.split("|").map((cell) => cell.trim())).filter((cells) => cells.some(Boolean));
  if (lines.length < 2 || lines[0].length < 2 || lines[0][0].toLowerCase() !== "measurement") return null;
  const columns = lines[0].slice(1);
  if (columns.some((column) => !column)) return null;
  const rows = lines.slice(1).map((cells) => ({ label: cells[0] ?? "", values: cells.slice(1) }));
  if (rows.some((row) => !row.label || row.values.length !== columns.length || row.values.some((value) => !value))) return null;
  return { columns, rows, ...(unit.trim() ? { unit: unit.trim() } : {}) };
};

const parseEditableSizeChart = (value: string) => {
  // Keep rows whose cells are intentionally empty (for example, a newly added row).
  const lines = value.split("\n").filter((line) => line.trim().length > 0).map((line) => line.split("|").map((cell) => cell.trim()));
  const hasHeader = lines[0]?.[0]?.toLowerCase() === "measurement";
  const columns = (hasHeader ? lines[0].slice(1) : ["XS", "S", "M", "L"]).map((cell) => cell || "");
  const rows = (hasHeader ? lines.slice(1) : [["Bust (cm)", "81", "86", "91", "96"]]).map((cells) => ({
    label: cells[0] ?? "",
    values: Array.from({ length: columns.length }, (_, index) => cells[index + 1] ?? ""),
  }));
  return { columns: columns.length ? columns : ["XS", "S", "M", "L"], rows: rows.length ? rows : [{ label: "", values: (columns.length ? columns : ["XS", "S", "M", "L"]).map(() => "") }] };
};
const serializeEditableSizeChart = (columns: string[], rows: Array<{ label: string; values: string[] }>) =>
  ["Measurement | " + columns.join(" | "), ...rows.map((row) => row.label + " | " + columns.map((_, index) => row.values[index] ?? "").join(" | "))].join("\n");

type BrandOrder = {
  id: string; order_number: string; customer_name: string; customer_email: string; customer_phone: string;
  delivery_address: import("@/integrations/supabase/types").Json; destination_pin_code: string; product_name: string; selected_size: string; selected_color: string; quantity: number; unit_price: number; currency: string;
  status: string; tracking_provider: string; tracking_number: string; tracking_url: string;
  estimated_delivery_start: string | null; estimated_delivery_end: string | null; created_at: string;
};

const PACKING_SLOTS = [
  { key: "product", label: "1. Product being packed" },
  { key: "details", label: "2. Parcel with the order slip visible" },
  { key: "sealed", label: "3. Parcel sealed / handover" },
] as const;

function ForensicReportCard({ report, title }: { report: ForensicReport | null; title: string }) {
  if (!report) return null;
  const signals = [...report.manipulation_signals, ...report.ai_generation_signals];
  return <div className="mt-3 rounded-lg border border-border/80 bg-muted/20 p-3">
    <div className="flex flex-wrap items-center gap-2">
      {report.verdict === "clean" ? <ShieldCheck className="size-4 text-primary"/> : <ShieldAlert className="size-4 text-destructive"/>}
      <p className="text-sm font-medium">{title}</p>
      <Badge variant={report.verdict === "clean" ? "default" : report.verdict === "likely_fraud" ? "destructive" : "secondary"}>{report.verdict.replaceAll("_", " ")} · trust {report.trust_score}/100</Badge>
    </div>
    {report.summary && <p className="mt-2 text-sm text-muted-foreground">{report.summary}</p>}
    {report.flags.length > 0 && <p className="mt-2 text-xs text-muted-foreground">Flags: {report.flags.join(" · ")}</p>}
    {signals.length > 0 && <p className="mt-1 text-xs text-destructive">Signals: {signals.join(" · ")}</p>}
  </div>;
}

function DispatchProofPanel({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DisputeViewerData | null>(null);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [video, setVideo] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [replacing, setReplacing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const result = await getDisputeViewerData({ data: { orderId } });
      setData(result);
      setNote(result.dispatch?.packingNote ?? "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "The packing proof couldn't be loaded.");
    } finally { setLoading(false); }
  };

  const pickFile = (slot: string, file: File | null) => {
    if (file && !(["image/jpeg", "image/png", "image/webp"].includes(file.type))) { setError("Packing photos must be JPG, PNG or WebP."); return; }
    if (file && file.size > 12 * 1024 * 1024) { setError("Each packing photo must be 12 MB or smaller."); return; }
    setError("");
    setFiles((current) => ({ ...current, [slot]: file }));
  };
  const pickVideo = (file: File | null) => {
    if (file && !(["video/mp4", "video/webm", "video/quicktime"].includes(file.type))) { setError("The packing video must be MP4, WebM or MOV."); return; }
    if (file && file.size > 50 * 1024 * 1024) { setError("The packing video must be 50 MB or smaller."); return; }
    setError("");
    setVideo(file);
  };

  const submit = async () => {
    setError("");
    const chosen = PACKING_SLOTS.filter((slot) => files[slot.key]);
    if (chosen.length < 3) { setError("All three packing photos are required."); return; }
    if (!video) { setError("A short packing video is required."); return; }
    if (note.trim().length < 10) { setError("Describe what you packed in at least 10 characters."); return; }
    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Your sign-in has expired. Sign in again to continue.");
      const userId = userData.user.id;
      const upload = async (file: File, folder: string) => {
        const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `${userId}/${crypto.randomUUID()}-${folder}.${extension}`;
        const { error: uploadError } = await supabase.storage.from("order-evidence").upload(path, file, { contentType: file.type, upsert: false });
        if (uploadError) throw new Error("An evidence file couldn't be uploaded. Please try again.");
        return path;
      };
      const photos = [];
      for (const slot of PACKING_SLOTS) {
        const file = files[slot.key];
        if (file) photos.push({ path: await upload(file, slot.key), kind: slot.key });
      }
      const videoPath = await upload(video, "packing-video");
      const result = await submitDispatchEvidence({ data: { orderId, photos, videoPath, packingNote: note.trim() } });
      toast.success(`Packing proof saved — AI verification: ${result.report.verdict.replaceAll("_", " ")} (trust ${result.report.trust_score}/100).`);
      setFiles({}); setVideo(null); setReplacing(false);
      await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "The packing proof couldn't be saved.");
    } finally { setBusy(false); }
  };

  const dispatch = data?.dispatch ?? null;
  return <div className="mt-4 border-t border-border/70 pt-4">
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={() => { const next = !open; setOpen(next); if (next && !data) void load(); }}>
        <Video/> {loading ? "Loading proof…" : dispatch ? "Packing proof & AI check" : "Add packing proof"}
      </Button>
      {dispatch && <Badge variant={dispatch.status === "verified" ? "default" : dispatch.status === "flagged" ? "destructive" : "secondary"}>{dispatch.status === "verified" ? <ShieldCheck className="mr-1 size-3"/> : dispatch.status === "flagged" ? <ShieldAlert className="mr-1 size-3"/> : null}{dispatch.status}</Badge>}
      {!dispatch && <span className="text-xs text-muted-foreground">Required before dispatch — customers and OFFFEED rely on this in any dispute.</span>}
    </div>
    {open && loading && <p className="mt-3 text-sm text-muted-foreground"><LoaderCircle className="mr-1 inline size-3.5 animate-spin"/>Loading the evidence vault…</p>}
    {open && !loading && <>
      {dispatch && !replacing && <div className="mt-3">
        <div className="grid grid-cols-3 gap-2 sm:max-w-md">{dispatch.photos.map((photo) => <img key={photo.path} src={photo.url} alt={`Packing proof: ${photo.kind}`} className="aspect-square w-full rounded object-cover"/>)}</div>
        {dispatch.videoUrl && <a className="mt-2 inline-block text-sm underline underline-offset-4" href={dispatch.videoUrl} target="_blank" rel="noreferrer">Watch the packing video</a>}
        <p className="mt-2 text-sm text-muted-foreground">{dispatch.packingNote}</p>
        <ForensicReportCard report={dispatch.aiReport} title="AI verification of your packing proof"/>
        <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => setReplacing(true)}><Upload/>Replace proof</Button>
      </div>}
      {(replacing || !dispatch) && <div className="mt-3 max-w-xl">
        <p className="text-sm font-medium">Record your packing proof</p>
        <p className="mt-1 text-xs text-muted-foreground">This vault is compared against customer return photos to protect you from false claims. OFFFEED's AI checks the photos automatically.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {PACKING_SLOTS.map((slot) => <label key={slot.key} className="block cursor-pointer rounded-lg border border-dashed border-border/80 p-3 text-xs hover:border-primary/50">
            <span className="block font-medium">{slot.label}</span>
            <span className="mt-1 block text-muted-foreground">{files[slot.key] ? files[slot.key]?.name : "Choose photo"}</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => pickFile(slot.key, event.target.files?.[0] ?? null)}/>
          </label>)}
        </div>
        <label className="mt-3 block cursor-pointer rounded-lg border border-dashed border-border/80 p-3 text-xs hover:border-primary/50 sm:max-w-xs">
          <span className="block font-medium">4. Packing video (MP4/WebM/MOV, up to 50 MB)</span>
          <span className="mt-1 block text-muted-foreground">{video ? video.name : "Show yourself packing, with the order details visible"}</span>
          <input type="file" accept="video/mp4,video/webm,video/quicktime" className="sr-only" onChange={(event) => pickVideo(event.target.files?.[0] ?? null)}/>
        </label>
        <Label htmlFor={`packing-note-${orderId}`}>What did you pack?</Label>
        <Textarea id={`packing-note-${orderId}`} value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} placeholder="e.g. Rose midi dress in size M, tags attached, wrapped in tissue with the OFFFEED order slip inside." className="mt-2 min-h-20 rounded-lg border-border/80 bg-card"/>
        {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" disabled={busy} onClick={() => void submit()}>{busy ? <LoaderCircle className="animate-spin"/> : <ShieldCheck/>}{busy ? "Verifying with AI…" : "Save & verify with AI"}</Button>
          {replacing && <Button type="button" variant="outline" onClick={() => setReplacing(false)}>Cancel</Button>}
        </div>
      </div>}
    </>}
  </div>;
}

function BrandOrderCard({ order, onSaved }: { order: BrandOrder; onSaved: () => void }) {

  const deliveryAddress = order.delivery_address as unknown as { line1?: string; line2?: string; city?: string; state?: string; landmark?: string };
  const [status, setStatus] = useState(order.status);
  const [provider, setProvider] = useState(order.tracking_provider);
  const [trackingNumber, setTrackingNumber] = useState(order.tracking_number);
  const [trackingUrl, setTrackingUrl] = useState(order.tracking_url);
  const [deliveryStart, setDeliveryStart] = useState(order.estimated_delivery_start ?? "");
  const [deliveryEnd, setDeliveryEnd] = useState(order.estimated_delivery_end ?? "");
  const [saving, setSaving] = useState(false);
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true);
    try {
      await updateBrandOrderTracking({ data: {
        orderId: order.id,
        status: status as "pending" | "confirmed" | "processing" | "shipped" | "out_for_delivery" | "delivered" | "cancelled",
        trackingProvider: provider, trackingNumber, trackingUrl,
        estimatedDeliveryStart: deliveryStart, estimatedDeliveryEnd: deliveryEnd,
      }});
      toast.success(`Tracking updated for ${order.order_number}.`); onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Order tracking couldn't be updated.");
    } finally { setSaving(false); }
  };
  return <section className="rounded-xl border border-border/80 p-4 sm:p-5">
    <form onSubmit={(event) => void save(event)}>

    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{order.order_number}</p><h3 className="mt-1 font-medium">{order.product_name} <span className="text-muted-foreground">× {order.quantity}</span></h3><p className="mt-1 text-sm text-muted-foreground">{order.customer_name} · {order.customer_email}</p>{order.customer_phone && <p className="mt-1 text-sm text-muted-foreground">Phone: {order.customer_phone}</p>}<p className="mt-1 text-xs text-muted-foreground">Product subtotal ₹{(order.unit_price * order.quantity).toLocaleString("en-IN")}</p>{(order.selected_size || order.selected_color) && <p className="mt-1 text-xs text-muted-foreground">Variant: {[order.selected_size, order.selected_color].filter(Boolean).join(" · ")}</p>}<p className="mt-2 text-sm">{[deliveryAddress.line1, deliveryAddress.line2, deliveryAddress.landmark, deliveryAddress.city, deliveryAddress.state, order.destination_pin_code].filter(Boolean).join(", ")}</p></div><Badge variant="secondary">{order.status.replaceAll("_", " ")}</Badge></div>
    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div><Label htmlFor={`status-${order.id}`}>Order status</Label><select id={`status-${order.id}`} value={status} onChange={(event) => setStatus(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-border/80 bg-card px-3 text-sm">{["pending", "confirmed", "processing", "shipped", "out_for_delivery", "delivered", "cancelled"].map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></div>
      <div><Label htmlFor={`provider-${order.id}`}>Courier partner</Label><Input id={`provider-${order.id}`} value={provider} onChange={(event) => setProvider(event.target.value)} maxLength={100} placeholder="e.g. Shiprocket / Delhivery" className={fieldClass}/></div>
      <div><Label htmlFor={`tracking-number-${order.id}`}>Tracking / AWB number</Label><Input id={`tracking-number-${order.id}`} value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} maxLength={160} placeholder="Enter tracking number" className={fieldClass}/></div>
      <div className="sm:col-span-2"><Label htmlFor={`tracking-url-${order.id}`}>Tracking link</Label><Input id={`tracking-url-${order.id}`} type="url" value={trackingUrl} onChange={(event) => setTrackingUrl(event.target.value)} placeholder="https://…" className={fieldClass}/></div>
      <div className="grid grid-cols-2 gap-3"><div><Label htmlFor={`eta-start-${order.id}`}>ETA from</Label><Input id={`eta-start-${order.id}`} type="date" value={deliveryStart} onChange={(event) => setDeliveryStart(event.target.value)} className={fieldClass}/></div><div><Label htmlFor={`eta-end-${order.id}`}>ETA until</Label><Input id={`eta-end-${order.id}`} type="date" value={deliveryEnd} onChange={(event) => setDeliveryEnd(event.target.value)} min={deliveryStart || undefined} className={fieldClass}/></div></div>
    </div>
    <div className="mt-4 flex justify-end"><Button type="submit" disabled={saving}>{saving ? <LoaderCircle className="animate-spin"/> : <Truck/>}{saving ? "Saving…" : "Save tracking update"}</Button></div>
    </form>
    <DispatchProofPanel orderId={order.id} />
  </section>;
}


function ProductSizeGuideEditor({ productId, override, inherited }: {
  productId: string;
  override: { columns: string[]; rows: Array<{ label: string; values: string[] }>; unit?: string } | null;
  inherited: { columns: string[]; rows: Array<{ label: string; values: string[] }>; unit?: string } | null;
}) {
  const queryClient = useQueryClient();
  const [chartText, setChartText] = useState(formatSizeChart(override ?? inherited));
  const [unit, setUnit] = useState((override ?? inherited)?.unit ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { setChartText(formatSizeChart(override ?? inherited)); setUnit((override ?? inherited)?.unit ?? ""); }, [override, inherited]);
  const save = async (useDefault: boolean) => {
    const chart = useDefault ? null : parseSizeChart(chartText, unit);
    if (!useDefault && !chart) { setError("Check the table format and make sure each row has a value for every size."); return; }
    setSaving(true); setError("");
    try {
      await updateBrandProductSizeChart({ data: { productId, sizeChart: chart } });
      await queryClient.invalidateQueries({ queryKey: ["brand-workspace"] });
      toast.success(useDefault ? "Brand default restored for this product." : "Product-specific size guide saved.");
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "The size guide could not be saved."); }
    finally { setSaving(false); }
  };
  return <details className="mt-3 rounded-lg border border-border/70 p-3">
    <summary className="cursor-pointer text-xs font-medium">{override ? "Edit product-specific size guide" : "Customize size guide for this product"}</summary>
    <p className="mt-2 text-xs text-muted-foreground">{override ? "This chart belongs only to this product. Other products are unchanged." : inherited ? "Currently using the shared category guide. Customize here to override it only for this product." : "No category guide is saved yet. You can create a custom chart here."}</p>
    <Textarea value={chartText} onChange={(event) => setChartText(event.target.value)} className="mt-3 min-h-28 font-mono text-xs" placeholder="Measurement | XS | S | M&#10;Bust (cm) | 81 | 86 | 91"/>
    <div className="mt-2 max-w-xs"><Label>Measurement unit</Label><Input value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="cm, in, mm or custom" className={fieldClass}/></div>
    {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
    <div className="mt-3 flex flex-wrap gap-2"><Button type="button" size="sm" disabled={saving} onClick={() => void save(false)}>{saving ? <LoaderCircle className="animate-spin"/> : <Check/>}Save for this product</Button>{override && <Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => void save(true)}>Use brand default</Button>}</div>
  </details>;
}
function BrandDashboard() {
  const queryClient = useQueryClient();
  const workspace = useQuery({ queryKey: ["brand-workspace"], queryFn: () => getBrandWorkspace() });
  const [mode, setMode] = useState<"manual" | "import" | null>(null);
  const manualSectionRef = useRef<HTMLElement | null>(null);
  const importSectionRef = useRef<HTMLElement | null>(null);
  const [draft, setDraft] = useState<DraftProduct>(blankProduct);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [imported, setImported] = useState<ImportedProduct[]>([]);
  const [selectedImports, setSelectedImports] = useState<string[]>([]);
  const [importAudience, setImportAudience] = useState<Array<"her" | "him" | "home">>(["her"]);
  const [error, setError] = useState("");
  const [guideCategory, setGuideCategory] = useState("Clothing / Tops");
  const [guideText, setGuideText] = useState("Measurement | XS | S | M | L\nBust (cm) | 81 | 86 | 91 | 96");
  const [guideUnit, setGuideUnit] = useState("cm");
  const [guideSaving, setGuideSaving] = useState(false);
  const [originPinCode, setOriginPinCode] = useState("");
  const [processingDaysMin, setProcessingDaysMin] = useState("1");
  const [processingDaysMax, setProcessingDaysMax] = useState("2");
  const [shippingNote, setShippingNote] = useState("");
  const [pickupContactName, setPickupContactName] = useState("");
  const [pickupPhone, setPickupPhone] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [returnAddress, setReturnAddress] = useState("");
  const [gstin, setGstin] = useState("");
  const [parcelWeightGrams, setParcelWeightGrams] = useState("500");
  const [parcelLengthCm, setParcelLengthCm] = useState("25");
  const [parcelWidthCm, setParcelWidthCm] = useState("20");
  const [parcelHeightCm, setParcelHeightCm] = useState("5");
  const [shippingSaving, setShippingSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const application = workspace.data?.application;
  const shippingProfile = workspace.data?.shippingProfile;
  useEffect(() => {
    if (mode !== "manual" && mode !== "import") return;
    let secondFrame = 0;
    const frame = window.requestAnimationFrame(() => {
      // Wait one more paint so the conditional listing section is mounted and measured.
      secondFrame = window.requestAnimationFrame(() => {
        const target = mode === "manual" ? manualSectionRef.current : importSectionRef.current;
        if (!target) return;
        const top = target.getBoundingClientRect().top + window.scrollY - 24;
        window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      });
    });
    return () => {
      window.cancelAnimationFrame(frame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, [mode]);

  useEffect(() => {
    setOriginPinCode(shippingProfile?.origin_pin_code ?? "");
    setProcessingDaysMin(String(shippingProfile?.processing_days_min ?? 1));
    setProcessingDaysMax(String(shippingProfile?.processing_days_max ?? 2));
    setShippingNote(shippingProfile?.shipping_note ?? "");
    setPickupContactName(shippingProfile?.pickup_contact_name ?? "");
    setPickupPhone(shippingProfile?.pickup_phone ?? "");
    setPickupAddress(shippingProfile?.pickup_address ?? "");
    setReturnAddress(shippingProfile?.return_address ?? "");
    setGstin(shippingProfile?.gstin ?? "");
    setParcelWeightGrams(String(shippingProfile?.parcel_weight_grams ?? 500));
    setParcelLengthCm(String(shippingProfile?.parcel_length_cm ?? 25));
    setParcelWidthCm(String(shippingProfile?.parcel_width_cm ?? 20));
    setParcelHeightCm(String(shippingProfile?.parcel_height_cm ?? 5));
  }, [shippingProfile]);
  const supportedAudience = useMemo(() => (application?.audience ?? ["her"]).filter((item): item is "her" | "him" | "home" => item === "her" || item === "him" || item === "home"), [application?.audience]);
  const homeProductCategories = useMemo(() => {
    const saved = (application?.audience_categories as { home?: unknown } | null)?.home;
    const registered = Array.isArray(saved) ? saved.filter((item): item is string => typeof item === "string") : [];
    if (!registered.length) return categoryOptions["Home & Living"];
    const allowed = new Set(registered.flatMap((item) => homeProductCategoryGroups[item] ?? []));
    return categoryOptions["Home & Living"].filter((item) => allowed.has(item));
  }, [application?.audience_categories]);
  const products = workspace.data?.products ?? [];
  const sizeGuides = workspace.data?.sizeGuides ?? [];
  const guideDraft = parseEditableSizeChart(guideText);
  const sortedProducts = useMemo(() => [...products].sort((a, b) => a.category.localeCompare(b.category) || a.product_name.localeCompare(b.product_name)), [products]);
  const orders = workspace.data?.orders ?? [];
  const publishedCount = products.filter((product) => product.status === "published").length;
  const commission = Number(application?.commission_rate ?? 0.18);

  const saveCategoryGuide = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const chart = parseSizeChart(guideText, guideUnit);
    if (!chart) { toast.error("Check the chart format and make sure every row has a value for each size."); return; }
    setGuideSaving(true);
    try {
      await saveBrandSizeGuide({ data: { category: guideCategory, sizeChart: chart } });
      await queryClient.invalidateQueries({ queryKey: ["brand-workspace"] });
      toast.success("Reusable category size guide saved.");
    } catch (saveError) { toast.error(saveError instanceof Error ? saveError.message : "The size guide could not be saved."); }
    finally { setGuideSaving(false); }
  };

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["brand-workspace"] });
    setMode(null);
    setDraft({ ...blankProduct, department: supportedAudience.length === 1 && supportedAudience[0] === "home" ? "Home & Living" : "Clothing", category: supportedAudience.length === 1 && supportedAudience[0] === "home" ? categoryOptions["Home & Living"][0] : "Tops", audience: supportedAudience.length ? [supportedAudience[0]] : ["her"] });
    imagePreviews.forEach((preview) => URL.revokeObjectURL(preview));
    setImages([]);
    setImagePreviews([]);
    setImported([]);
    setSelectedImports([]);
    setError("");
  };

  const saveShippingSettings = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const minDays = Number(processingDaysMin);
    const maxDays = Number(processingDaysMax);
    if (!/^[1-9][0-9]{5}$/.test(originPinCode)) { toast.error("Enter a valid 6-digit Indian dispatch PIN code."); return; }
    if (!Number.isInteger(minDays) || !Number.isInteger(maxDays) || minDays < 0 || maxDays < minDays || maxDays > 45) {
      toast.error("Check the processing-time range. Maximum days must be at least minimum days."); return;
    }
    setShippingSaving(true);
    try {
      const weight = Number(parcelWeightGrams);
      const length = Number(parcelLengthCm);
      const width = Number(parcelWidthCm);
      const height = Number(parcelHeightCm);
      if (!pickupContactName.trim() || !pickupPhone.trim() || !pickupAddress.trim()) {
        toast.error("Add a pickup contact name, phone number, and full pickup address."); return;
      }
      if (![weight, length, width, height].every(Number.isFinite) || weight <= 0 || length <= 0 || width <= 0 || height <= 0) {
        toast.error("Parcel weight and dimensions must all be greater than zero."); return;
      }
      if (gstin.trim() && !/^[0-9A-Z]{15}$/.test(gstin.trim().toUpperCase())) {
        toast.error("GSTIN should contain 15 letters/numbers."); return;
      }
      await saveBrandShippingProfile({ data: {
        originPinCode, processingDaysMin: minDays, processingDaysMax: maxDays, shippingNote,
        pickupContactName, pickupPhone, pickupAddress, returnAddress, gstin: gstin.toUpperCase(),
        parcelWeightGrams: weight, parcelLengthCm: length, parcelWidthCm: width, parcelHeightCm: height,
      } });
      await queryClient.invalidateQueries({ queryKey: ["brand-workspace"] });
      toast.success("Shipping profile saved.");
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Shipping settings couldn't be saved.");
    } finally { setShippingSaving(false); }
  };

  const updateDraft = (key: keyof DraftProduct, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  const toggleDraftAudience = (value: "her" | "him" | "home") => setDraft((current) => {
    const audience = current.audience.includes(value) ? current.audience.filter((item) => item !== value) : [...current.audience, value];
    const allowedCategories = categoryOptions[current.department].filter((category) => current.department === "Home & Living" || audience.includes("home") || audience.includes("her") && audience.includes("him") || (audience[0] === "her" ? !himOnlyCategories.has(category) : !herOnlyCategories.has(category)));
    return { ...current, audience, category: allowedCategories.includes(current.category) ? current.category : allowedCategories[0] ?? current.category };
  });

  const handleImage = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    if (!selected.length) return;
    if (selected.some((file) => !(["image/jpeg", "image/png", "image/webp"].includes(file.type)) || file.size > 20 * 1024 * 1024)) {
      setError("Choose JPG, PNG or WebP images up to 20 MB each.");
      event.target.value = "";
      return;
    }
    if (images.length + selected.length > 6) {
      setError("You can upload up to 6 photos for each product.");
      event.target.value = "";
      return;
    }
    setImages((current) => [...current, ...selected]);
    setImagePreviews((current) => [...current, ...selected.map((file) => URL.createObjectURL(file))]);
    setError("");
    event.target.value = "";
  };
  const removeProductImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setImages((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setImagePreviews((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const submitManual = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!images.length || !application) { setError("Add at least one product photo before saving."); return; }
    if (draft.listingType === "bundle" && !draft.bundleItems.trim()) { setError("List the pieces included in this complete look."); return; }
    if (!draft.audience.length || draft.audience.some((value) => !supportedAudience.includes(value))) { setError("Choose an audience available to your brand."); return; }
    const price = Number(draft.price);
    if (!Number.isFinite(price) || price <= 0) { setError("Enter a price greater than ₹0."); return; }
    const availableSizes = parseList(draft.sizes);
    setSaving(true); setError("");
    const { data: userResult } = await supabase.auth.getUser();
    if (!userResult.user) { setError("Your sign-in has expired. Sign in again to continue."); setSaving(false); return; }
    const uploadedPaths: string[] = [];
    try {
      for (const file of images) {
        const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
        const path = `${userResult.user.id}/${crypto.randomUUID()}-product.${extension}`;
        const { error: uploadError } = await supabase.storage.from("brand-product-images").upload(path, file, { contentType: file.type, cacheControl: "3600", upsert: false });
        if (uploadError) throw new Error("A product photo couldn't be uploaded. Please try again.");
        uploadedPaths.push(path);
      }
      const path = uploadedPaths[0];
      await createBrandProduct({ data: {
        name: draft.name,
        description: draft.listingType === "bundle" ? `${draft.description.trim()}\n\nIncluded in this look:\n${draft.bundleItems.split(",").map((item) => item.trim()).filter(Boolean).join("\n")}` : draft.description,
        category: draft.listingType === "bundle" ? `Complete Look / ${draft.department}` : `${draft.department} / ${draft.category}`,
        price,
        productUrl: draft.productUrl.trim() || null,
        imagePath: path,
        imagePaths: uploadedPaths,
        sizes: availableSizes,
        sizeChart: null,
        colors: parseList(draft.colors),
        tags: [...new Set([...parseList(draft.tags), draft.aesthetic].filter(Boolean))],
        audience: draft.audience,
      } });
      toast.success("Product saved as a draft.");
      await refresh();
    } catch (saveError) {
      if (uploadedPaths.length) await supabase.storage.from("brand-product-images").remove(uploadedPaths);
      setError(saveError instanceof Error ? saveError.message : "This product couldn't be saved.");
    } finally { setSaving(false); }
  };

  const startImport = async () => {
    if (!application?.website_url) { setError("Add a website to your brand application before importing."); return; }
    setImportBusy(true); setError(""); setImported([]); setSelectedImports([]);
    try {
      const result = await importShopifyCatalog({ data: { website: application.website_url } });
      const productsWithImages = result.products.filter((product) => product.imagePath);
      setImported(productsWithImages as ImportedProduct[]);
      setSelectedImports(productsWithImages.map((product) => product.externalId));
      setImportAudience(supportedAudience.length ? supportedAudience : ["her"]);
      if (!productsWithImages.length) setError("No products with photos were found in that store's Shopify catalog.");
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "The catalog couldn't be imported. Try manual listing instead.");
    } finally { setImportBusy(false); }
  };

  const saveImports = async () => {
    const selected = imported.filter((product) => selectedImports.includes(product.externalId));
    if (!selected.length) { setError("Select at least one product to import."); return; }
    setSaving(true); setError("");
    try {
      const result = await saveImportedShopifyProducts({ data: {
        audience: importAudience,
        products: selected.map((product) => ({ name: product.name, description: product.description.length < 10 ? `${product.description} Product from ${application?.brand_name ?? "this brand"}.` : product.description, category: product.category, price: product.price, productUrl: product.productUrl, imageUrl: product.imagePath ?? "", sizes: product.sizes, colors: product.colors })),
      } });
      toast.success(`${result.imported} product${result.imported === 1 ? "" : "s"} imported as drafts.`);
      await refresh();
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Selected products couldn't be imported.");
    } finally { setSaving(false); }
  };

  const toggleStatus = async (id: string, status: "draft" | "published") => {
    try {
      await updateBrandProductStatus({ data: { id, status: status === "published" ? "draft" : "published" } });
      await queryClient.invalidateQueries({ queryKey: ["brand-workspace"] });
      toast.success(status === "published" ? "Product moved to drafts." : "Product published.");
    } catch (statusError) { toast.error(statusError instanceof Error ? statusError.message : "The product couldn't be updated."); }
  };

  if (workspace.isPending) return <main className="grid min-h-[70vh] place-items-center"><LoaderCircle className="size-6 animate-spin text-primary" aria-label="Loading workspace" /></main>;
  if (workspace.isError) return <main className="mx-auto max-w-3xl px-5 py-16"><h1 className="font-display text-4xl">Your brand workspace</h1><p role="alert" className="mt-4 text-sm text-destructive">{workspace.error.message}</p><Button className="mt-5" onClick={() => void workspace.refetch()}>Try again</Button></main>;
  if (!application) return null;

  if (application.status !== "approved") return <main className="mx-auto max-w-3xl px-5 py-16">
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">OFFFEED · FOR BRANDS</p>
    <h1 className="mt-4 font-display text-5xl">{application.status === "under_review" ? "We’re getting to know you." : "Your next chapter starts here."}</h1>
    <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">{application.status === "under_review" ? "Your application is still under review. Product listings open as soon as your brand is approved." : "Your application wasn’t approved. Please contact the OFFFEED team if you’d like to discuss next steps."}</p>
    <Badge variant="secondary" className="mt-6">{application.status === "under_review" ? "Application under review" : "Application declined"}</Badge>
    <Button variant="outline" className="mt-8" asChild><Link to="/for-brands/apply"><ArrowLeft/>Back to your application</Link></Button>
  </main>;

  return <main className="min-h-[calc(100svh-5rem)] px-5 py-8 sm:px-8 sm:py-12">
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-5 border-b border-border/70 pb-7">
        <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">OFFFEED · BRAND STUDIO</p><h1 className="mt-3 font-display text-5xl">{application.brand_name}</h1><p className="mt-2 text-sm text-muted-foreground">A considered space for your products to find their people.</p><div className="mt-4 flex flex-wrap gap-2">{supportedAudience.map((item) => <Badge key={item} variant="secondary">{item === "her" ? "Her space" : item === "him" ? "Him space" : "LIVING"}</Badge>)}</div></div>
        <div className="flex flex-wrap gap-2">{application.public_handle && <Button variant="ghost" asChild><a href={`/brand/${encodeURIComponent(application.public_handle)}`} target="_blank" rel="noreferrer"><ExternalLink/>Preview storefront</a></Button>}<Button variant="outline" onClick={() => { setDraft({ ...blankProduct, department: supportedAudience.length === 1 && supportedAudience[0] === "home" ? "Home & Living" : "Clothing", category: supportedAudience.length === 1 && supportedAudience[0] === "home" ? categoryOptions["Home & Living"][0] : "Tops", audience: supportedAudience.length ? supportedAudience : ["her"] }); setMode("manual"); }}><Plus/>Add product</Button><Button onClick={() => { setMode("import"); setImported([]); setError(""); }}><ArrowDownToLine/>Import from Shopify</Button></div>
      </div>

      <div className="grid gap-5 border-b border-border/70 py-6 sm:grid-cols-3">
        <Stat label="Products" value={String(products.length)} icon={Shirt}/>
        <Stat label="Published" value={String(publishedCount)} icon={Check}/>
        <Stat label="Your share" value={`${Math.round((1 - commission) * 100)}%`} icon={PackagePlus}/>
      </div>

      <SpotlightPricingSection />
      <SpotlightPerformanceSection />
      <BrandSpotlightSection products={products} audiences={supportedAudience} />

      <section className="border-b border-border/70 py-7" aria-labelledby="brand-size-guides-heading">
        <div className="max-w-3xl"><p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">REUSABLE SIZE GUIDES</p><h2 id="brand-size-guides-heading" className="mt-2 font-display text-3xl">Set it once. Use it across products.</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Create one default chart for each category. New products and existing products without a custom chart will use it automatically. Product-specific overrides stay separate.</p></div>
        <form onSubmit={(event) => void saveCategoryGuide(event)} className="mt-5 max-w-3xl rounded-xl border border-border/80 p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="brand-guide-category">Category</Label><select id="brand-guide-category" value={guideCategory} onChange={(event) => { const next = event.target.value; setGuideCategory(next); const existing = sizeGuides.find((guide: any) => guide.category === next); setGuideText(existing ? formatSizeChart(existing.size_chart) : "Measurement | XS | S | M | L\nBust (cm) | 81 | 86 | 91 | 96"); setGuideUnit(existing?.size_chart?.unit ?? "cm"); }} className={fieldClass}>{Object.entries(categoryOptions).flatMap(([department, categories]) => categories.map((category) => <option key={category} value={department + " / " + category}>{department} · {category}</option>))}</select></div><div><Label htmlFor="brand-guide-unit">Measurement unit</Label><Input id="brand-guide-unit" value={guideUnit} onChange={(event) => setGuideUnit(event.target.value)} placeholder="cm, in, mm, UK/EU" className={fieldClass}/></div></div>
          <div className="mt-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <Label>Size guide table</Label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => setGuideText(serializeEditableSizeChart(guideDraft.columns, [...guideDraft.rows, { label: "", values: guideDraft.columns.map(() => "") }]))}><Plus className="size-3.5"/>Add measurement</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setGuideText(serializeEditableSizeChart([...guideDraft.columns, ""], guideDraft.rows.map((row) => ({ ...row, values: [...row.values, ""] }))))}><Plus className="size-3.5"/>Add size</Button>
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border/80">
              <table className="w-full min-w-[560px] border-collapse text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th scope="col" className="min-w-40 border-b border-r border-border/70 p-2 text-left font-medium">Measurement</th>
                    {guideDraft.columns.map((column, columnIndex) => <th scope="col" key={columnIndex} className="min-w-24 border-b border-r border-border/70 p-2">
                      <div className="flex items-center gap-1">
                        <Input aria-label={`Size column ${columnIndex + 1}`} value={column} onChange={(event) => setGuideText(serializeEditableSizeChart(guideDraft.columns.map((item, index) => index === columnIndex ? event.target.value : item), guideDraft.rows))} placeholder="Size" className="h-9 min-w-0 bg-background text-center"/>
                        <Button type="button" size="icon" variant="ghost" aria-label={`Remove size ${column || columnIndex + 1}`} disabled={guideDraft.columns.length <= 1} onClick={() => setGuideText(serializeEditableSizeChart(guideDraft.columns.filter((_, index) => index !== columnIndex), guideDraft.rows.map((row) => ({ ...row, values: row.values.filter((_, index) => index !== columnIndex) }))))}><Trash2 className="size-3.5"/></Button>
                      </div>
                    </th>)}
                  </tr>
                </thead>
                <tbody>
                  {guideDraft.rows.map((row, rowIndex) => <tr key={rowIndex} className="border-b border-border/60 last:border-0">
                    <th scope="row" className="border-r border-border/70 p-2">
                      <Input aria-label={`Measurement name ${rowIndex + 1}`} value={row.label} onChange={(event) => setGuideText(serializeEditableSizeChart(guideDraft.columns, guideDraft.rows.map((item, index) => index === rowIndex ? { ...item, label: event.target.value } : item)))} placeholder="e.g. Bust (cm)" className="h-9 bg-background"/>
                    </th>
                    {guideDraft.columns.map((_, columnIndex) => <td key={columnIndex} className="border-r border-border/70 p-2">
                      <Input aria-label={`${row.label || `Measurement ${rowIndex + 1}`} for ${guideDraft.columns[columnIndex] || `size ${columnIndex + 1}`}`} value={row.values[columnIndex] ?? ""} onChange={(event) => setGuideText(serializeEditableSizeChart(guideDraft.columns, guideDraft.rows.map((item, index) => index === rowIndex ? { ...item, values: item.values.map((value, cellIndex) => cellIndex === columnIndex ? event.target.value : value) } : item)))} placeholder="Value" className="h-9 bg-background text-center"/>
                    </td>)}
                    <td className="w-10 p-1"><Button type="button" size="icon" variant="ghost" aria-label={`Remove measurement ${row.label || rowIndex + 1}`} disabled={guideDraft.rows.length <= 1} onClick={() => setGuideText(serializeEditableSizeChart(guideDraft.columns, guideDraft.rows.filter((_, index) => index !== rowIndex)))}><Trash2 className="size-3.5"/></Button></td>
                  </tr>)}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">Edit each size and measurement directly. Add or remove rows and columns as needed. The saved guide is reused by products in this category unless a product has its own override.</p>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">Use | to separate table cells. First row: size or variant names. Following rows: measurements. Supports clothing, footwear, jewellery, bags, watches and custom options.</p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{sizeGuides.length} reusable guides saved</p><Button type="submit" disabled={guideSaving}>{guideSaving ? <LoaderCircle className="animate-spin"/> : <Check/>}Save category guide</Button></div>
        </form>
      </section>
      <section className="border-b border-border/70 py-7" aria-labelledby="shipping-settings-heading">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">DIRECT-TO-CUSTOMER SHIPPING</p>
          <h2 id="shipping-settings-heading" className="mt-2 font-display text-3xl">Your dispatch details</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Keep products at your own studio or shop. When an order is placed, you prepare it and a courier collects it from this PIN code. OFFFEED will use these details as the foundation for delivery estimates; courier-powered ETAs will be added when shipping integration is connected.</p>
        </div>
        <form onSubmit={(event) => void saveShippingSettings(event)} className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="shipping-origin-pin">Dispatch PIN code</Label>
            <Input id="shipping-origin-pin" inputMode="numeric" maxLength={6} pattern="[1-9][0-9]{5}" required value={originPinCode} onChange={(event) => setOriginPinCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="e.g. 302001" className={fieldClass}/>
            <p className="mt-1 text-xs text-muted-foreground">PIN code where your parcel will be picked up.</p>
          </div>
          <div>
            <Label htmlFor="pickup-contact-name">Pickup contact person</Label>
            <Input id="pickup-contact-name" required maxLength={120} value={pickupContactName} onChange={(event) => setPickupContactName(event.target.value)} placeholder="Name of person handing over parcels" className={fieldClass}/>
          </div>
          <div>
            <Label htmlFor="pickup-phone">Pickup phone number</Label>
            <Input id="pickup-phone" required type="tel" maxLength={20} value={pickupPhone} onChange={(event) => setPickupPhone(event.target.value)} placeholder="Courier pickup contact" className={fieldClass}/>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="pickup-address">Full pickup address</Label>
            <Textarea id="pickup-address" required maxLength={1000} value={pickupAddress} onChange={(event) => setPickupAddress(event.target.value)} placeholder="House/shop, street, area, city, state" className="mt-2 min-h-20 rounded-lg border-border/80 bg-card"/>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="return-address">Return address (optional)</Label>
            <Textarea id="return-address" maxLength={1000} value={returnAddress} onChange={(event) => setReturnAddress(event.target.value)} placeholder="Address where returned parcels should go, if different" className="mt-2 min-h-20 rounded-lg border-border/80 bg-card"/>
          </div>
          <div>
            <Label htmlFor="brand-gstin">GSTIN (optional, if applicable)</Label>
            <Input id="brand-gstin" maxLength={15} value={gstin} onChange={(event) => setGstin(event.target.value.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 15))} placeholder="15-character GSTIN" className={fieldClass}/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="processing-min">Min. prep days</Label><Input id="processing-min" type="number" min={0} max={30} required value={processingDaysMin} onChange={(event) => setProcessingDaysMin(event.target.value)} className={fieldClass}/></div>
            <div><Label htmlFor="processing-max">Max. prep days</Label><Input id="processing-max" type="number" min={0} max={45} required value={processingDaysMax} onChange={(event) => setProcessingDaysMax(event.target.value)} className={fieldClass}/></div>
          </div>
          <div className="sm:col-span-2">
            <p className="text-sm font-medium">Default parcel measurements</p>
            <p className="mt-1 text-xs text-muted-foreground">Used as a starting point for courier quotes. Enter actual packed parcel measurements for each product/order when they differ.</p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div><Label htmlFor="parcel-weight">Weight (grams)</Label><Input id="parcel-weight" type="number" min={1} max={50000} required value={parcelWeightGrams} onChange={(event) => setParcelWeightGrams(event.target.value)} className={fieldClass}/></div>
              <div><Label htmlFor="parcel-length">Length (cm)</Label><Input id="parcel-length" type="number" min={1} max={200} required value={parcelLengthCm} onChange={(event) => setParcelLengthCm(event.target.value)} className={fieldClass}/></div>
              <div><Label htmlFor="parcel-width">Width (cm)</Label><Input id="parcel-width" type="number" min={1} max={200} required value={parcelWidthCm} onChange={(event) => setParcelWidthCm(event.target.value)} className={fieldClass}/></div>
              <div><Label htmlFor="parcel-height">Height (cm)</Label><Input id="parcel-height" type="number" min={1} max={200} required value={parcelHeightCm} onChange={(event) => setParcelHeightCm(event.target.value)} className={fieldClass}/></div>
            </div>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="shipping-note">Dispatch note (optional)</Label>
            <Textarea id="shipping-note" maxLength={500} value={shippingNote} onChange={(event) => setShippingNote(event.target.value)} placeholder="e.g. Made-to-order items need 3 extra days. Orders ship Monday–Saturday." className="mt-2 min-h-24 rounded-lg border-border/80 bg-card"/>
          </div>
          <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-xl text-xs leading-5 text-muted-foreground"><Truck className="mr-1 inline size-3.5"/> These are brand-provided preparation details, not a live courier ETA. No warehouse is required.</p>
            <Button type="submit" disabled={shippingSaving}>{shippingSaving ? <LoaderCircle className="animate-spin"/> : <Truck/>}{shippingSaving ? "Saving…" : "Save shipping details"}</Button>
          </div>
        </form>
        <div className="mt-6 rounded-xl border border-border/80 bg-muted/20 p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">PAYOUT ACCOUNT</p>
          <h3 className="mt-2 font-display text-2xl">Bank & settlement details</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">OFFFEED will need a verified beneficiary account to transfer your earnings after commission and any applicable shipping deductions. Secure bank onboarding is not connected yet, so we are deliberately not collecting account numbers, IFSC details, OTPs, or banking passwords in this form. This section will be enabled through a verified payout provider before payouts go live.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2"><Badge variant="secondary">Setup pending</Badge><span className="text-xs text-muted-foreground">No bank details stored</span></div>
        </div>
      </section>

      <section className="border-b border-border/70 py-7" aria-labelledby="brand-orders-heading">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">FULFILMENT</p><h2 id="brand-orders-heading" className="mt-2 font-display text-3xl">Orders & tracking</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Orders placed through OFFFEED appear here. Add courier details and update the customer-facing status as you fulfil each order.</p></div><Badge variant="secondary">{orders.length} {orders.length === 1 ? "order" : "orders"}</Badge></div>
        {orders.length ? <div className="mt-5 grid gap-4">{orders.map((order) => <BrandOrderCard key={order.id} order={order} onSaved={() => void queryClient.invalidateQueries({ queryKey: ["brand-workspace"] })} />)}</div> : <div className="mt-5 rounded-lg border border-dashed border-border/80 px-5 py-8"><PackagePlus className="size-5 text-muted-foreground"/><h3 className="mt-3 font-medium">No OFFFEED orders yet</h3><p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Your brand ships directly from its own location; no warehouse is needed. Orders placed by customers on OFFFEED will appear here. Orders from your own website won't automatically show up here.</p></div>}
      </section>

      <BrandReturnsSection />

      <div className="grid gap-10 py-9 lg:grid-cols-[minmax(0,1fr)_260px]">
        <section className="min-w-0">
          {mode === "manual" && <section ref={manualSectionRef} className="mb-9 scroll-mt-24 border-b border-border/70 pb-9" aria-labelledby="manual-heading">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">MANUAL LISTING</p><h2 id="manual-heading" className="mt-2 font-display text-3xl">{draft.listingType === "bundle" ? "Add a complete look" : "Add a product"}</h2></div><Button variant="ghost" size="icon" aria-label="Close product form" onClick={() => { setMode(null); setError(""); }}><X/></Button></div>
            <form onSubmit={(event) => void submitManual(event)} className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2"><p className="text-sm font-medium">What are you listing?</p><div className="mt-2 flex flex-wrap gap-2"><Button type="button" variant={draft.listingType === "product" ? "default" : "outline"} onClick={() => { setDraft((current) => ({ ...current, listingType: "product" })); setError(""); }}>Individual product</Button><Button type="button" variant={draft.listingType === "bundle" ? "default" : "outline"} onClick={() => { setDraft((current) => ({ ...current, listingType: "bundle" })); setError(""); }}>Complete look / outfit bundle</Button></div><p className="mt-2 text-xs text-muted-foreground">Both listing types are saved as drafts first and require approval before appearing in your storefront.</p></div>
              <div className="sm:col-span-2"><Label htmlFor="product-name">Product name</Label><Input id="product-name" value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} maxLength={160} required className={fieldClass}/></div>
              <div className="sm:col-span-2"><Label htmlFor="product-description">Description</Label><Textarea id="product-description" value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} maxLength={2000} minLength={10} required className="mt-2 min-h-28 rounded-lg border-border/80 bg-card px-3 py-3"/></div>
              {draft.listingType === "bundle" && <div className="sm:col-span-2"><Label htmlFor="bundle-items">Pieces included in this look</Label><Textarea id="bundle-items" value={draft.bundleItems} onChange={(event) => setDraft((current) => ({ ...current, bundleItems: event.target.value }))} placeholder="Blazer, trousers, shirt, belt — list included pieces separated by commas" required minLength={2} className="mt-2 min-h-24 rounded-lg border-border/80 bg-card px-3 py-3"/><p className="mt-2 text-xs text-muted-foreground">Be clear about exactly what the bundle price includes.</p></div>}
              <div><Label htmlFor="product-department">Product department</Label><select id="product-department" value={draft.department} onChange={(event) => { const department = event.target.value as ProductDepartment; setDraft((current) => ({ ...current, department, category: department === "Home & Living" ? (homeProductCategories[0] ?? "Other Home & Living") : categoryOptions[department][0], audience: department === "Home & Living" ? ["home"] : current.audience.includes("home") ? [supportedAudience.find((item) => item !== "home") ?? "her"] : current.audience, sizes: department === "Clothing" ? "XS, S, M, L, XL" : "" })); }} className={fieldClass}><option value="Clothing">Clothing</option><option value="Jewellery">Jewellery</option><option value="Accessories">Accessories & Bags</option><option value="Footwear">Footwear</option>{supportedAudience.includes("home") && <option value="Home & Living">Home & Living</option>}<option value="Mixed look">Mixed look / outfit bundle</option></select><p className="mt-2 text-xs text-muted-foreground">Choose the department for this listing. You can create other listings in other departments too.</p></div>
              <div><Label htmlFor="product-category">Specific category</Label><select id="product-category" value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value, sizes: current.department === "Jewellery" && event.target.value === "Rings" ? current.sizes : current.department === "Clothing" ? current.sizes : "" }))} className={fieldClass} required>{(draft.department === "Home & Living" ? homeProductCategories : categoryOptions[draft.department].filter((category) => draft.audience.includes("her") && draft.audience.includes("him") || (draft.audience[0] === "her" ? !himOnlyCategories.has(category) : !herOnlyCategories.has(category)))).map((category) => <option key={category} value={category}>{category}</option>)}</select></div>
              <div><Label htmlFor="product-aesthetic">Style / aesthetic</Label><select id="product-aesthetic" value={draft.aesthetic} onChange={(event) => updateDraft("aesthetic", event.target.value)} className={fieldClass}>{aestheticOptions.map((aesthetic) => <option key={aesthetic} value={aesthetic}>{aesthetic}</option>)}</select><p className="mt-2 text-xs text-muted-foreground">Choose the vibe shoppers should associate with this listing. It will be saved as a product tag.</p></div>
              <div><Label htmlFor="product-price">Price (₹)</Label><Input id="product-price" type="number" min="1" step="0.01" value={draft.price} onChange={(event) => updateDraft("price", event.target.value)} required className={fieldClass}/><p className="mt-2 text-xs text-muted-foreground">At ₹{Number(draft.price || 0).toLocaleString("en-IN")}, you receive ₹{(Number(draft.price || 0) * (1 - commission)).toLocaleString("en-IN", { maximumFractionDigits: 2 })} after OFFFEED’s 18% fee.</p></div>
              <div><Label htmlFor="product-link">Product link <span className="font-normal text-muted-foreground">(optional)</span></Label><Input id="product-link" type="url" value={draft.productUrl} onChange={(event) => updateDraft("productUrl", event.target.value)} placeholder="https://yourbrand.com/product" className={fieldClass}/></div>
              {draft.listingType === "product" && <div className="sm:col-span-2"><Label htmlFor="product-sizes">Available sizes / variants (optional)</Label><Input id="product-sizes" value={draft.sizes} onChange={(event) => updateDraft("sizes", event.target.value)} placeholder={draft.department === "Clothing" ? "XXS, XS, S, M, L, XL, 2XL … 10XL" : draft.department === "Footwear" ? "UK 5, UK 6, UK 7, EU 40, EU 41" : draft.department === "Jewellery" ? "Ring 6, 7, 8 or 16, 17, 18" : "Small, Medium, Large or custom options"} className={fieldClass}/><p className="mt-2 text-xs text-muted-foreground">{draft.department === "Clothing" ? "Inclusive sizing supported up to 10XL. Enter only sizes stocked for this product." : "Enter the exact options customers can select for this product."}</p></div>}
               {draft.listingType === "product" && <div className="sm:col-span-2 rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-sm font-medium">Size guide</p><p className="mt-1 text-xs leading-5 text-muted-foreground">This product will automatically use your saved size guide for {draft.department} → {draft.category}. You don’t need to add measurements again. To change measurements for only this product, edit its size guide from Your Collection.</p></div>}
              <div><Label htmlFor="product-colors">{draft.department === "Jewellery" ? "Metal / colour" : "Colours"}</Label><Input id="product-colors" value={draft.colors} onChange={(event) => updateDraft("colors", event.target.value)} placeholder={draft.department === "Jewellery" ? "Gold, silver, rose gold" : "Ivory, Rose, Black"} className={fieldClass}/></div>
              <div><Label htmlFor="product-tags">Tags</Label><Input id="product-tags" value={draft.tags} onChange={(event) => updateDraft("tags", event.target.value)} placeholder="#collegewear, #minimal, #pink" className={fieldClass}/></div>
              <div className="sm:col-span-2"><p className="text-sm font-medium">Show in</p><div className="mt-2 flex flex-wrap gap-2">{(draft.department === "Home & Living" ? supportedAudience.filter((item) => item === "home") : supportedAudience.filter((item) => item !== "home")).map((item) => <Button key={item} type="button" size="sm" disabled={draft.department === "Home & Living"} variant={draft.audience.includes(item) ? "default" : "outline"} aria-pressed={draft.audience.includes(item)} onClick={() => toggleDraftAudience(item)}>{draft.audience.includes(item) && <Check className="size-4"/>}{item === "her" ? "Her space" : item === "him" ? "Him space" : "LIVING"}</Button>)}</div></div>
              <div className="sm:col-span-2"><p className="text-sm font-medium">Product photos <span className="text-muted-foreground">({images.length}/6)</span></p><input ref={fileInput} type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleImage}/><Button type="button" variant="outline" className="mt-2 h-12 w-full justify-start" disabled={images.length >= 6} onClick={() => fileInput.current?.click()}><ImagePlus/>{images.length ? "Add more photos" : "Choose product photos"} (JPG, PNG or WebP · up to 20 MB each)</Button>{imagePreviews.length > 0 && <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">{imagePreviews.map((preview, index) => <div key={preview} className="relative"><img src={preview} alt={`Product preview ${index + 1}`} className="aspect-square w-full rounded object-cover"/><button type="button" aria-label={`Remove photo ${index + 1}`} onClick={() => removeProductImage(index)} className="absolute right-1 top-1 rounded-full bg-background/90 p-1"><X className="size-3"/></button>{index === 0 && <span className="mt-1 block text-[10px] text-muted-foreground">Cover photo</span>}</div>)}</div>}</div>
              {error && <p role="alert" className="sm:col-span-2 text-sm text-destructive">{error}</p>}
              <div className="flex flex-wrap gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={() => setMode(null)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? <LoaderCircle className="animate-spin"/> : <PackagePlus/>}Save as draft</Button></div>
            </form>
          </section>}

          {mode === "import" && <section ref={importSectionRef} className="mb-9 scroll-mt-24 border-b border-border/70 pb-9" aria-labelledby="import-heading">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">SHOPIFY CATALOG</p><h2 id="import-heading" className="mt-2 font-display text-3xl">Bring in your catalog</h2><p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">We’ll find product photos, prices, sizes and colors from the Shopify store on your application. Review the products before importing.</p></div><Button variant="ghost" size="icon" aria-label="Close catalog import" onClick={() => { setMode(null); setError(""); }}><X/></Button></div>
            <div className="mt-5 flex flex-wrap items-end gap-3"><div className="min-w-60 flex-1"><Label htmlFor="store-url">Registered store</Label><Input id="store-url" value={application.website_url} readOnly className={fieldClass}/></div><Button onClick={() => void startImport()} disabled={importBusy}>{importBusy ? <LoaderCircle className="animate-spin"/> : <RefreshCw/>}{importBusy ? "Reading catalog" : imported.length ? "Refresh catalog" : "Find products"}</Button></div>
            {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
            {imported.length > 0 && <div className="mt-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm">{imported.length} products found · imported as drafts for your review</p><Button type="button" variant="outline" size="sm" onClick={() => setSelectedImports(selectedImports.length === imported.length ? [] : imported.map((item) => item.externalId))}>{selectedImports.length === imported.length ? "Clear selection" : "Select all"}</Button></div>
              <div className="mb-4 flex flex-wrap gap-2">{supportedAudience.map((item) => <Button key={item} size="sm" type="button" variant={importAudience.includes(item) ? "default" : "outline"} aria-pressed={importAudience.includes(item)} onClick={() => setImportAudience((current) => item === "home" ? current.includes("home") ? [] : ["home"] : current.includes(item) ? current.filter((entry) => entry !== item) : [...current.filter((entry) => entry !== "home"), item])}>{importAudience.includes(item) && <Check className="size-4"/>}{item === "her" ? "Her space" : item === "him" ? "Him space" : "LIVING"}</Button>)}</div>
              <div className="grid gap-3 sm:grid-cols-2">{imported.map((product) => <label key={product.externalId} className="flex cursor-pointer gap-3 border border-border/70 p-3"><input type="checkbox" checked={selectedImports.includes(product.externalId)} onChange={() => setSelectedImports((current) => current.includes(product.externalId) ? current.filter((id) => id !== product.externalId) : [...current, product.externalId])} className="mt-1 size-4 accent-primary"/><img src={product.imagePath ?? ""} alt="" className="size-16 shrink-0 object-cover"/><span className="min-w-0"><span className="block truncate text-sm font-medium">{product.name}</span><span className="mt-1 block text-xs text-muted-foreground">₹{product.price.toLocaleString("en-IN")} · {product.sizes.length ? product.sizes.join(", ") : "Sizes not listed"}</span></span></label>)}</div>
              <Button className="mt-5" onClick={() => void saveImports()} disabled={saving || !selectedImports.length}>{saving ? <LoaderCircle className="animate-spin"/> : <ArrowDownToLine/>}Import {selectedImports.length} selected</Button>
            </div>}
          </section>}

          <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">PRODUCTS</p><h2 className="mt-2 font-display text-3xl">Your collection</h2></div><Button variant="ghost" size="sm" onClick={() => void workspace.refetch()}><RefreshCw/>Refresh</Button></div>
          {products.length ? <div className="mt-5 divide-y divide-border/70 border-y border-border/70">{sortedProducts.map((product) => <article key={product.id} className="grid grid-cols-[76px_minmax(0,1fr)] gap-4 py-4 sm:grid-cols-[88px_minmax(0,1fr)_auto] sm:items-center"><div className="size-[76px] overflow-hidden bg-secondary sm:size-[88px]">{product.imageUrl ? <img src={product.imageUrl} alt={product.product_name} className="size-full object-cover"/> : <div className="grid size-full place-items-center"><ImagePlus className="size-5 text-muted-foreground"/></div>}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-medium">{product.product_name}</h3><Badge variant={product.status === "published" ? "default" : "secondary"}>{product.status}</Badge>{product.source === "shopify" && <Badge variant="outline">Shopify</Badge>}</div><p className="mt-1 text-sm">₹{Number(product.price).toLocaleString("en-IN")}</p><p className="mt-1 truncate text-xs text-muted-foreground">{product.audience.map((item) => item === "her" ? "HER" : "HIM").join(" + ")} · {product.category} · {product.sizes.join(", ") || "No sizes"}{product.colors.length ? ` · ${product.colors.join(", ")}` : ""}</p><ProductSizeGuideEditor productId={product.id} override={product.size_chart_override as any} inherited={product.size_chart as any}/></div><div className="col-span-2 flex flex-wrap gap-2 sm:col-span-1 sm:justify-end"><Button variant="outline" size="sm" onClick={() => void toggleStatus(product.id, product.status === "published" ? "published" : "draft")}>{product.status === "published" ? "Move to draft" : "Publish"}</Button>{product.product_url && <Button variant="ghost" size="icon" aria-label={`Open ${product.product_name} on store`} asChild><a href={product.product_url} target="_blank" rel="noreferrer"><ExternalLink/></a></Button>}</div></article>)}</div> : <div className="mt-6 border-y border-dashed border-border/70 py-12 text-center"><div className="mx-auto grid size-12 place-items-center rounded-full bg-secondary"><Search className="size-5 text-primary"/></div><h3 className="mt-4 font-display text-2xl">Your first product starts here.</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Add products one at a time or import your Shopify catalog, then choose when each listing is ready to publish.</p><div className="mt-5 flex flex-wrap justify-center gap-2"><Button variant="outline" onClick={() => { setDraft({ ...blankProduct, audience: supportedAudience.length ? supportedAudience : ["her"] }); setError(""); setMode("manual"); }}><Plus/>Add manually</Button><Button onClick={() => { setMode("import"); setError(""); }}><ArrowDownToLine/>Import catalog</Button></div></div>}
        </section>

        <aside className="border-t border-border/70 pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0"><p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">PAYOUTS</p><h2 className="mt-2 font-display text-2xl">Every sale, clearly.</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">OFFFEED keeps 18% of completed marketplace sales. Your brand receives the remaining 82%.</p><div className="mt-5 border-y border-border/70 py-4"><div className="flex justify-between text-sm"><span className="text-muted-foreground">Customer pays</span><span>₹2,500</span></div><div className="mt-3 flex justify-between text-sm"><span className="text-muted-foreground">OFFFEED · 18%</span><span>− ₹450</span></div><div className="mt-3 flex justify-between text-sm font-medium"><span>Your share · 82%</span><span>₹2,050</span></div></div><p className="mt-4 text-xs leading-5 text-muted-foreground">OFFFEED orders now appear in fulfilment above. Automated payment collection and brand payouts still need to be connected before online payments can launch.</p><div className="mt-8 border-t border-border/70 pt-6"><p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">NEED A HAND?</p><p className="mt-2 text-sm leading-6 text-muted-foreground">The store import is currently designed for public Shopify catalogs. Other shops can still be added manually.</p><Button variant="ghost" size="sm" className="mt-3" asChild><Link to="/for-brands/apply"><PencilLine/>Application details<ArrowRight/></Link></Button></div></aside>
      </div>
    </div>
  </main>;
}

function BrandReturnsSection() {
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [viewerOrderId, setViewerOrderId] = useState("");

  const loadReturns = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).from("order_returns").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setReturns(data ?? []);
    } catch (error) {
      console.error("Could not load return requests:", error);
      setReturns([]);
    } finally { setLoading(false); }
  };
  useEffect(() => { void loadReturns(); }, []);
  const review = async (item: any, decision: "approved" | "rejected") => {
    setBusyId(item.id);
    try {
      const { error } = await (supabase as any).rpc("review_offfeed_return", {
        p_return_id: item.id,
        p_decision: decision,
        p_response: (responses[item.id] ?? "").trim(),
      });
      if (error) throw error;
      toast.success(decision === "approved" ? "Return request approved." : "Return request rejected.");
      await loadReturns();
    } catch (error) {
      console.error("Return review failed:", error);
      toast.error(error instanceof Error ? error.message : "Could not update this return request.");
    } finally { setBusyId(""); }
  };
  const reasonLabels: Record<string, string> = {
    defective_damaged: "Defective or damaged", wrong_item_colour: "Wrong item or colour",
    not_as_described: "Not as described", size_fit: "Size or fit", other: "Other",
  };
  return <section className="border-b border-border/70 py-8" aria-labelledby="brand-returns-heading">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">AFTER-SALES</p><h2 id="brand-returns-heading" className="mt-2 font-display text-3xl">Returns & requests</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Review customer return requests for your orders. Refunds are not issued automatically from this screen.</p></div>
      <Button variant="outline" size="sm" onClick={() => void loadReturns()} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""}/>Refresh</Button>
    </div>
    {loading ? <p className="mt-5 text-sm text-muted-foreground">Loading return requests…</p> : returns.length === 0 ? <p className="mt-5 rounded-lg border border-dashed border-border/80 px-5 py-7 text-sm text-muted-foreground">No return requests found. If a customer has submitted one, confirm the returns migration is applied to the live database.</p> : <div className="mt-5 grid gap-4">
      {returns.map((item) => <article key={item.id} className="rounded-xl border border-border/80 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-muted-foreground">Order ID: {item.order_id}</p><h3 className="mt-1 font-medium">{reasonLabels[item.reason] ?? item.reason.replaceAll("_", " ")}</h3><p className="mt-1 text-sm text-muted-foreground">Requested {new Date(item.created_at).toLocaleDateString("en-IN")} · {item.status.replaceAll("_", " ")}</p></div><Badge variant={item.status === "requested" ? "secondary" : "outline"}>{item.status.replaceAll("_", " ")}</Badge></div>
        {item.customer_details && <p className="mt-3 whitespace-pre-wrap text-sm">{item.customer_details}</p>}
        {item.evidence_url && <a className="mt-2 inline-block text-sm underline underline-offset-4" href={item.evidence_url} target="_blank" rel="noreferrer">View evidence link</a>}
        <ReturnDisputeViewer orderId={item.order_id} open={viewerOrderId === item.order_id} onToggle={() => setViewerOrderId((current) => (current === item.order_id ? "" : item.order_id))} />

        {item.brand_response && <p className="mt-3 text-sm text-muted-foreground">Your response: {item.brand_response}</p>}
        {item.status === "requested" && <div className="mt-4 space-y-3"><label className="block text-sm font-medium" htmlFor={`return-response-${item.id}`}>Response to customer (optional)</label><Textarea id={`return-response-${item.id}`} value={responses[item.id] ?? ""} onChange={(event) => setResponses((old) => ({ ...old, [item.id]: event.target.value }))} maxLength={2000} placeholder="Add a short explanation…" /><div className="flex flex-wrap gap-2"><Button disabled={busyId === item.id} onClick={() => void review(item, "approved")}>{busyId === item.id ? <LoaderCircle className="animate-spin"/> : <Check/>}Approve return</Button><Button variant="outline" disabled={busyId === item.id} onClick={() => void review(item, "rejected")}>Reject request</Button></div></div>}
      </article>)}
    </div>}
  </section>;
}

function ReturnDisputeViewer({ orderId, open, onToggle }: { orderId: string; open: boolean; onToggle: () => void }) {
  const [data, setData] = useState<DisputeViewerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyReturnId, setBusyReturnId] = useState("");
  const load = async () => {
    setLoading(true);
    try { setData(await getDisputeViewerData({ data: { orderId } })); }
    catch (error) { toast.error(error instanceof Error ? error.message : "The dispute viewer couldn't be loaded."); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (open && !data) void load(); }, [open]);
  const rerun = async (returnId: string) => {
    setBusyReturnId(returnId);
    try {
      const { report } = await rerunReturnAnalysis({ data: { returnId } });
      toast.success(`AI re-check complete: ${report.verdict.replaceAll("_", " ")} · trust ${report.trust_score}/100.`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The AI re-check failed.");
    } finally { setBusyReturnId(""); }
  };
  if (!open) return <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onToggle}>Open dispute viewer</Button>;
  const dispatch = data?.dispatch ?? null;
  return <div className="mt-3 rounded-lg border border-border/80 p-3 sm:p-4">
    {loading && !data ? <p className="text-sm text-muted-foreground"><LoaderCircle className="mr-1 inline size-3.5 animate-spin"/>Loading both sides of the evidence…</p> : data && <>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Dispute viewer · {data.order.order_number} · {data.order.product_name}</p>
      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border/70 p-3">
          <p className="text-sm font-medium">Brand packing proof</p>
          {dispatch ? <>
            <div className="mt-2 grid grid-cols-3 gap-2">{dispatch.photos.map((photo) => <img key={photo.path} src={photo.url} alt="Brand packing proof" className="aspect-square w-full rounded object-cover"/>)}</div>
            {dispatch.videoUrl && <a className="mt-2 inline-block text-sm underline underline-offset-4" href={dispatch.videoUrl} target="_blank" rel="noreferrer">Watch packing video</a>}
            <p className="mt-2 text-xs text-muted-foreground">{dispatch.packingNote}</p>
            <ForensicReportCard report={dispatch.aiReport} title="AI check of the packing proof"/>
          </> : <p className="mt-2 text-sm text-muted-foreground">No packing proof was recorded for this order.</p>}
        </div>
        <div className="rounded-lg border border-border/70 p-3">
          <p className="text-sm font-medium">Customer return proof</p>
          {data.returns.length === 0 && <p className="mt-2 text-sm text-muted-foreground">No return requests on this order.</p>}
          {data.returns.map((item) => <div key={item.id} className="mt-2 border-t border-border/60 pt-2 first:border-0 first:pt-0">
            <p className="text-xs text-muted-foreground">{item.reason.replaceAll("_", " ")} · {item.status.replaceAll("_", " ")}</p>
            {item.evidence ? <>
              <div className="mt-2 grid grid-cols-3 gap-2">{item.evidence.photos.map((photo) => <img key={photo.path} src={photo.url} alt="Customer return proof" className="aspect-square w-full rounded object-cover"/>)}</div>
              {item.evidence.notes && <p className="mt-2 text-xs">{item.evidence.notes}</p>}
              <ForensicReportCard report={item.evidence.aiReport} title="AI fraud check of the return proof"/>
              <Button type="button" variant="ghost" size="sm" className="mt-1" disabled={busyReturnId === item.id} onClick={() => void rerun(item.id)}><RefreshCw className={busyReturnId === item.id ? "animate-spin" : ""}/>Re-run AI check</Button>
            </> : <p className="mt-2 text-sm text-muted-foreground">No photo proof attached to this request.</p>}
          </div>)}
        </div>
      </div>
    </>}
    <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={onToggle}>Close viewer</Button>
  </div>;
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Shirt }) {

  return <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-secondary text-primary"><Icon className="size-4"/></span><span><span className="block text-xs text-muted-foreground">{label}</span><span className="mt-1 block text-xl font-medium">{value}</span></span></div>;
}

function BrandSpotlightSection({ products, audiences }: {
  products: Array<{ id: string; product_name: string; price: number; status: string; audience: string[] }>;
  audiences: Array<"her" | "him" | "home">;
}) {
  const [selectedAudience, setSelectedAudience] = useState<"her" | "him" | "home">(audiences[0] ?? "her");
  const [durationDays, setDurationDays] = useState<7 | 14 | 28>(28);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const available = products.filter((product) => product.status === "published" && product.audience.includes(selectedAudience));
  const refresh = async () => {
    setLoading(true);
    try { setCampaigns(await getMySpotlightCampaigns()); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Spotlight applications couldn't be loaded."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, []);
  useEffect(() => { setSelectedIds([]); }, [selectedAudience]);
  const submit = async () => {
    if (selectedIds.length < 2) { toast.error("Choose at least two different published products."); return; }
    setSaving(true);
    try {
      await submitSpotlightCampaign({ data: { audience: selectedAudience, durationDays, productIds: selectedIds } });
      toast.success("Your Spotlight application has been submitted for review.");
      setSelectedIds([]);
      await refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Spotlight application couldn't be submitted."); }
    finally { setSaving(false); }
  };
  return <section className="border-b border-border/70 py-7" aria-labelledby="brand-spotlight-heading">
    <div className="max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">BRAND VISIBILITY</p>
      <h2 id="brand-spotlight-heading" className="mt-2 font-display text-3xl">Apply for The Spotlight Edit</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">Feature multiple products from your collection in HER, HIM or LIVING. Choose a campaign duration and submit your products for OFFFEED review. Your feature goes live only after approval and payment confirmation.</p>
    </div>
    <div className="mt-5 grid max-w-3xl gap-4 rounded-xl border border-border/80 p-4 sm:grid-cols-2 sm:p-5">
      <div><Label htmlFor="spotlight-audience">Audience</Label><select id="spotlight-audience" value={selectedAudience} onChange={(event) => setSelectedAudience(event.target.value as "her" | "him" | "home")} className={fieldClass}>{audiences.map((item) => <option key={item} value={item}>{item === "her" ? "HER" : item === "him" ? "HIM" : "LIVING"}</option>)}</select></div>
      <div><Label htmlFor="spotlight-duration">Campaign duration</Label><select id="spotlight-duration" value={durationDays} onChange={(event) => setDurationDays(Number(event.target.value) as 7 | 14 | 28)} className={fieldClass}><option value={7}>1 week</option><option value={14}>2 weeks</option><option value={28}>4 weeks</option></select></div>
      <div className="sm:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-2"><Label>Select products (minimum 2)</Label><span className="text-xs text-muted-foreground">{selectedIds.length} selected</span></div>
        {available.length ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{available.map((product) => <label key={product.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/70 p-3 text-sm"><input type="checkbox" checked={selectedIds.includes(product.id)} onChange={() => setSelectedIds((current) => current.includes(product.id) ? current.filter((id) => id !== product.id) : [...current, product.id])} className="size-4 accent-primary"/><span className="min-w-0 flex-1"><span className="block truncate font-medium">{product.product_name}</span><span className="text-xs text-muted-foreground">₹{Number(product.price).toLocaleString("en-IN")}</span></span></label>)}</div> : <p className="mt-3 rounded-lg border border-dashed border-border/70 p-4 text-sm text-muted-foreground">No published products are available in this audience yet. Publish and receive approval for at least two products first.</p>}
      </div>
      <div className="sm:col-span-2"><Button type="button" disabled={saving || selectedIds.length < 2} onClick={() => void submit()}>{saving ? <LoaderCircle className="animate-spin"/> : <Sparkles/>}Submit Spotlight application</Button><p className="mt-2 text-xs leading-5 text-muted-foreground">OFFFEED will review your selection and confirm the campaign price and payment instructions. No charge is taken by this application form.</p></div>
    </div>
    <div className="mt-6 max-w-3xl">
      <h3 className="font-display text-xl">Your Spotlight applications</h3>
      {loading ? <p className="mt-3 text-sm text-muted-foreground">Loading applications…</p> : campaigns.length ? <div className="mt-3 divide-y divide-border/70 border-y border-border/70">{campaigns.map((campaign) => <div key={campaign.id} className="py-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium">{campaign.audience.toUpperCase()} · {campaign.duration_days} days</p><Badge variant="secondary">{campaign.status.replaceAll("_", " ")}</Badge></div><p className="mt-1 text-xs text-muted-foreground">Payment: {campaign.payment_status} · {Number(campaign.campaign_price) > 0 ? `₹${Number(campaign.campaign_price).toLocaleString("en-IN")}` : "Price to be confirmed by OFFFEED"}</p>{campaign.admin_note && <p className="mt-2 text-xs text-muted-foreground">{campaign.admin_note}</p>}</div>)}</div> : <p className="mt-3 text-sm text-muted-foreground">You haven't submitted a Spotlight application yet.</p>}
    </div>
  </section>;
}


function SpotlightPricingSection() {
  const packages = [{ days: 7, label: "1-week Spotlight", price: 1499 }, { days: 14, label: "2-week Spotlight", price: 2499 }, { days: 28, label: "4-week Spotlight", price: 3999 }];
  return <section className="border-b border-border/70 py-7" aria-labelledby="spotlight-pricing-heading">
    <div className="max-w-3xl"><p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">THE OFFFEED EDIT · SPOTLIGHT</p><h2 id="spotlight-pricing-heading" className="mt-2 font-display text-3xl">How Spotlight works</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Give your brand a dedicated feature with multiple products from your collection. Choose a campaign length, submit your products and OFFFEED will review your application before confirming payment and scheduling.</p></div>
    <div className="mt-5 max-w-3xl overflow-hidden rounded-xl border border-border/80">
      <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-border/70 bg-muted/30 px-4 py-3 text-sm font-semibold"><span>Package</span><span>Price</span></div>
      {packages.map((item) => <div key={item.days} className="grid grid-cols-[1fr_auto] gap-3 border-b border-border/60 px-4 py-4 last:border-0"><span className="text-sm">{item.label}</span><span className="text-sm font-medium">₹{item.price.toLocaleString("en-IN")}</span></div>)}
    </div>
  </section>;
}

function SpotlightPerformanceSection() {
  const performance = useQuery({ queryKey: ["my-spotlight-performance"], queryFn: () => getMySpotlightPerformance(), retry: 1 });
  const [selected, setSelected] = useState("");
  const [week, setWeek] = useState("all");
  const reports = performance.data ?? [];
  const preferredCampaign = reports.find((item: any) => item.status === "active")
    ?? reports.find((item: any) => item.status === "completed")
    ?? reports[0];
  const activeId = reports.some((item: any) => item.id === selected) ? selected : preferredCampaign?.id ?? "";
  const campaign = reports.find((item: any) => item.id === activeId);
  const weekly = campaign?.weeklyReports ?? [];
  const selectedWeek = week === "all" ? null : weekly.find((item: any) => String(item.week) === week);
  const metrics = selectedWeek ?? campaign;
  const dateLabel = (value?: string | null) => value
    ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "Date to be scheduled";
  const campaignLabel = (item: any) => {
    const audience = item.audience === "home" ? "LIVING" : item.audience.toUpperCase();
    const duration = item.durationDays === 7 ? "1 week" : item.durationDays === 14 ? "2 weeks" : "4 weeks";
    return `${audience} · ${duration} · ${dateLabel(item.startsAt)} · ${item.status.replaceAll("_", " ")}`;
  };
  const periodAvailable = Boolean(campaign?.startsAt && ["active", "completed"].includes(campaign.status));
  const numberLabel = (value: unknown) => {
    const number = Number(value);
    return Number.isFinite(number) ? number.toLocaleString("en-IN") : "—";
  };
  return <section className="border-b border-border/70 py-7" aria-labelledby="spotlight-performance-heading">
    <div className="max-w-4xl"><p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">CAMPAIGN INSIGHTS</p><h2 id="spotlight-performance-heading" className="mt-2 font-display text-3xl">Your Spotlight performance</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">See how shoppers discovered and engaged with the products in your Spotlight feature.</p></div>
    {performance.isLoading ? <p className="mt-5 text-sm text-muted-foreground">Loading your campaign report…</p> :
     <div className="mt-5 max-w-4xl rounded-2xl border border-border/80 p-4 sm:p-6">
       <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-display text-xl">EDIT Spotlight — Campaign report</h3><p className="mt-1 text-xs text-muted-foreground">Live OFFFEED analytics · No sample numbers</p></div><Badge variant="secondary">{campaign?.status ?? (performance.isError ? "Data unavailable" : "No campaign yet")}</Badge></div>
       <div className="mt-4 grid gap-3 sm:grid-cols-2">
         <div><Label htmlFor="spotlight-report-campaign">Campaign</Label><select id="spotlight-report-campaign" value={activeId} onChange={(e) => { setSelected(e.target.value); setWeek("all"); }} className={fieldClass} disabled={!reports.length}>
           {!reports.length && <option value="">No campaigns yet</option>}
           {reports.map((item: any) => <option key={item.id} value={item.id}>{campaignLabel(item)}</option>)}
         </select></div>
         <div><Label htmlFor="spotlight-report-week">Reporting period</Label><select id="spotlight-report-week" value={week} onChange={(e) => setWeek(e.target.value)} className={fieldClass} disabled={!periodAvailable}>
           <option value="all">Campaign to date</option>
           {periodAvailable && weekly.map((item: any) => <option key={item.week} value={String(item.week)}>Week {item.week}</option>)}
         </select></div>
       </div>
       <div className="mt-5 overflow-hidden rounded-xl border border-border/80">
         <table className="w-full text-sm">
           <thead className="bg-muted/30"><tr className="border-b border-border/70"><th scope="col" className="px-4 py-3 text-left font-semibold">Performance metric</th><th scope="col" className="px-4 py-3 text-right font-semibold">Number</th></tr></thead>
           <tbody>
             {[{label:"Product views",value:metrics?.views},{label:"Product clicks",value:metrics?.clicks},{label:"Saves",value:metrics?.saves},{label:"Purchases",value:metrics?.purchases}].map((metric) => <tr key={metric.label} className="border-b border-border/60 last:border-0"><th scope="row" className="px-4 py-3 text-left font-normal">{metric.label}</th><td className="px-4 py-3 text-right font-semibold tabular-nums">{campaign ? numberLabel(metric.value ?? 0) : "—"}</td></tr>)}
           </tbody>
         </table>
       </div>
       {performance.isError ? <p className="mt-3 text-xs leading-5 text-muted-foreground">The campaign report could not connect to the Spotlight data tables. Apply the Spotlight database migrations and refresh this page.</p> :
        !campaign ? <p className="mt-3 text-xs leading-5 text-muted-foreground">Your Spotlight campaign reports will appear here after you submit an application.</p> :
        !periodAvailable ? <p className="mt-3 text-xs leading-5 text-muted-foreground">Report available once this campaign starts. You can still view its application status here.</p> :
        campaign.analyticsReady === false ? <p className="mt-3 text-xs leading-5 text-muted-foreground">View, click and save tracking will appear here once the Spotlight analytics database migration has been applied.</p> : null}
       {campaign?.purchaseDataReady === false && <p className="mt-2 text-xs text-muted-foreground">Purchase data is temporarily unavailable.</p>}
       <div className="mt-4"><p className="text-xs font-medium text-muted-foreground">Products included</p><p className="mt-1 text-sm">{campaign?.productNames?.join(" · ") || "No campaign products selected"}</p></div>
       <p className="mt-4 text-xs leading-5 text-muted-foreground">Views, clicks and saves count unique visitor-product interactions per reporting period. Purchases count non-cancelled orders for selected products during the campaign dates.</p>
     </div>}
  </section>;
}
