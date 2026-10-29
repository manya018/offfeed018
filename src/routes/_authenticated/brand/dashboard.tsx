import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownToLine, ArrowLeft, ArrowRight, Check, ExternalLink, ImagePlus, LoaderCircle, PackagePlus, PencilLine, Plus, RefreshCw, Search, Shirt, Trash2, Truck, Upload, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { createBrandProduct, getBrandWorkspace, importShopifyCatalog, saveBrandShippingProfile, saveImportedShopifyProducts, updateBrandOrderTracking, updateBrandProductStatus } from "@/lib/brand-products.functions";

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

type ProductDepartment = "Clothing" | "Jewellery" | "Accessories" | "Mixed look";
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
  audience: Array<"her" | "him">;
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
const blankProduct: DraftProduct = { listingType: "product", bundleItems: "", department: "Clothing", name: "", description: "", category: "Shirts & Tops", aesthetic: "Romantic & Dreamy", price: "", productUrl: "", sizes: "XS, S, M, L, XL", colors: "", tags: "", audience: ["her"] };
const categoryOptions: Record<ProductDepartment, string[]> = {
  Clothing: ["Shirts & Tops", "Trousers", "Dresses", "Ethnic Wear", "Outerwear", "Footwear", "Other Clothing"],
  Jewellery: ["Earrings", "Necklaces", "Rings", "Bracelets", "Anklets", "Jewellery Sets", "Brooches", "Other Jewellery"],
  Accessories: ["Bags", "Belts", "Sunglasses", "Watches", "Hats & Caps", "Scarves", "Wallets", "Other Accessories"],
  "Mixed look": ["Complete Look"],
};
const fieldClass = "mt-2 h-11 rounded-lg border-border/80 bg-card px-3";
const parseList = (value: string) => value.split(",").map((item) => item.trim().replace(/^#/, "")).filter(Boolean);

type BrandOrder = {
  id: string; order_number: string; customer_name: string; customer_email: string; customer_phone: string;
  delivery_address: import("@/integrations/supabase/types").Json; destination_pin_code: string; product_name: string; selected_size: string; selected_color: string; quantity: number; unit_price: number; currency: string;
  status: string; tracking_provider: string; tracking_number: string; tracking_url: string;
  estimated_delivery_start: string | null; estimated_delivery_end: string | null; created_at: string;
};

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
  return <form onSubmit={(event) => void save(event)} className="rounded-xl border border-border/80 p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{order.order_number}</p><h3 className="mt-1 font-medium">{order.product_name} <span className="text-muted-foreground">× {order.quantity}</span></h3><p className="mt-1 text-sm text-muted-foreground">{order.customer_name} · {order.customer_email}</p>{order.customer_phone && <p className="mt-1 text-sm text-muted-foreground">Phone: {order.customer_phone}</p>}<p className="mt-1 text-xs text-muted-foreground">Product subtotal ₹{(order.unit_price * order.quantity).toLocaleString("en-IN")}</p>{(order.selected_size || order.selected_color) && <p className="mt-1 text-xs text-muted-foreground">Variant: {[order.selected_size, order.selected_color].filter(Boolean).join(" · ")}</p>}<p className="mt-2 text-sm">{[deliveryAddress.line1, deliveryAddress.line2, deliveryAddress.landmark, deliveryAddress.city, deliveryAddress.state, order.destination_pin_code].filter(Boolean).join(", ")}</p></div><Badge variant="secondary">{order.status.replaceAll("_", " ")}</Badge></div>
    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div><Label htmlFor={`status-${order.id}`}>Order status</Label><select id={`status-${order.id}`} value={status} onChange={(event) => setStatus(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-border/80 bg-card px-3 text-sm">{["pending", "confirmed", "processing", "shipped", "out_for_delivery", "delivered", "cancelled"].map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></div>
      <div><Label htmlFor={`provider-${order.id}`}>Courier partner</Label><Input id={`provider-${order.id}`} value={provider} onChange={(event) => setProvider(event.target.value)} maxLength={100} placeholder="e.g. Shiprocket / Delhivery" className={fieldClass}/></div>
      <div><Label htmlFor={`tracking-number-${order.id}`}>Tracking / AWB number</Label><Input id={`tracking-number-${order.id}`} value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} maxLength={160} placeholder="Enter tracking number" className={fieldClass}/></div>
      <div className="sm:col-span-2"><Label htmlFor={`tracking-url-${order.id}`}>Tracking link</Label><Input id={`tracking-url-${order.id}`} type="url" value={trackingUrl} onChange={(event) => setTrackingUrl(event.target.value)} placeholder="https://…" className={fieldClass}/></div>
      <div className="grid grid-cols-2 gap-3"><div><Label htmlFor={`eta-start-${order.id}`}>ETA from</Label><Input id={`eta-start-${order.id}`} type="date" value={deliveryStart} onChange={(event) => setDeliveryStart(event.target.value)} className={fieldClass}/></div><div><Label htmlFor={`eta-end-${order.id}`}>ETA until</Label><Input id={`eta-end-${order.id}`} type="date" value={deliveryEnd} onChange={(event) => setDeliveryEnd(event.target.value)} min={deliveryStart || undefined} className={fieldClass}/></div></div>
    </div>
    <div className="mt-4 flex justify-end"><Button type="submit" disabled={saving}>{saving ? <LoaderCircle className="animate-spin"/> : <Truck/>}{saving ? "Saving…" : "Save tracking update"}</Button></div>
  </form>;
}

function BrandDashboard() {
  const queryClient = useQueryClient();
  const workspace = useQuery({ queryKey: ["brand-workspace"], queryFn: () => getBrandWorkspace() });
  const [mode, setMode] = useState<"manual" | "import" | null>(null);
  const importSectionRef = useRef<HTMLElement | null>(null);
  const [draft, setDraft] = useState<DraftProduct>(blankProduct);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [imported, setImported] = useState<ImportedProduct[]>([]);
  const [selectedImports, setSelectedImports] = useState<string[]>([]);
  const [importAudience, setImportAudience] = useState<Array<"her" | "him">>(["her"]);
  const [error, setError] = useState("");
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
    if (mode !== "import") return;
    const frame = window.requestAnimationFrame(() => {
      importSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
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
  const supportedAudience = useMemo(() => (application?.audience ?? ["her"]).filter((item): item is "her" | "him" => item === "her" || item === "him"), [application?.audience]);
  const products = workspace.data?.products ?? [];
  const orders = workspace.data?.orders ?? [];
  const publishedCount = products.filter((product) => product.status === "published").length;
  const commission = Number(application?.commission_rate ?? 0.18);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["brand-workspace"] });
    setMode(null);
    setDraft({ ...blankProduct, audience: supportedAudience.length ? supportedAudience : ["her"] });
    setImage(null);
    setImagePreview("");
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
  const toggleDraftAudience = (value: "her" | "him") => setDraft((current) => ({ ...current, audience: current.audience.includes(value) ? current.audience.filter((item) => item !== value) : [...current.audience, value] }));

  const handleImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!(["image/jpeg", "image/png", "image/webp"].includes(file.type)) || file.size > 20 * 1024 * 1024) {
      setError("Choose a JPG, PNG or WebP image up to 20 MB.");
      event.target.value = "";
      return;
    }
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
    setError("");
  };

  const submitManual = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!image || !application) { setError("Add a product photo before saving."); return; }
    if (draft.listingType === "bundle" && !draft.bundleItems.trim()) { setError("List the pieces included in this complete look."); return; }
    if (!draft.audience.length || draft.audience.some((value) => !supportedAudience.includes(value))) { setError("Choose an audience available to your brand."); return; }
    const price = Number(draft.price);
    if (!Number.isFinite(price) || price <= 0) { setError("Enter a price greater than ₹0."); return; }
    setSaving(true); setError("");
    const { data: userResult } = await supabase.auth.getUser();
    if (!userResult.user) { setError("Your sign-in has expired. Sign in again to continue."); setSaving(false); return; }
    const extension = image.type === "image/png" ? "png" : image.type === "image/webp" ? "webp" : "jpg";
    const path = `${userResult.user.id}/${crypto.randomUUID()}-product.${extension}`;
    const { error: uploadError } = await supabase.storage.from("brand-product-images").upload(path, image, { contentType: image.type, cacheControl: "3600", upsert: false });
    if (uploadError) { setError("The product photo couldn't be uploaded. Please try again."); setSaving(false); return; }
    try {
      await createBrandProduct({ data: {
        name: draft.name,
        description: draft.listingType === "bundle" ? `${draft.description.trim()}\n\nIncluded in this look:\n${draft.bundleItems.split(",").map((item) => item.trim()).filter(Boolean).join("\n")}` : draft.description,
        category: draft.listingType === "bundle" ? `Complete Look / ${draft.department}` : `${draft.department} / ${draft.category}`,
        price,
        productUrl: draft.productUrl.trim() || null,
        imagePath: path,
        sizes: parseList(draft.sizes),
        colors: parseList(draft.colors),
        tags: [...new Set([...parseList(draft.tags), draft.aesthetic].filter(Boolean))],
        audience: draft.audience,
      } });
      toast.success("Product saved as a draft.");
      await refresh();
    } catch (saveError) {
      await supabase.storage.from("brand-product-images").remove([path]);
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
        <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">OFFFEED · BRAND STUDIO</p><h1 className="mt-3 font-display text-5xl">{application.brand_name}</h1><p className="mt-2 text-sm text-muted-foreground">A considered space for your products to find their people.</p><div className="mt-4 flex flex-wrap gap-2">{supportedAudience.map((item) => <Badge key={item} variant="secondary">{item === "her" ? "Her space" : "Him space"}</Badge>)}</div></div>
        <div className="flex flex-wrap gap-2">{application.public_handle && <Button variant="ghost" asChild><Link to="/brand/$brandHandle" params={{ brandHandle: application.public_handle }}><ExternalLink/>Preview storefront</Link></Button>}<Button variant="outline" onClick={() => { setDraft({ ...blankProduct, audience: supportedAudience.length ? supportedAudience : ["her"] }); setMode("manual"); }}><Plus/>Add product</Button><Button onClick={() => { setMode("import"); setImported([]); setError(""); }}><ArrowDownToLine/>Import from Shopify</Button></div>
      </div>

      <div className="grid gap-5 border-b border-border/70 py-6 sm:grid-cols-3">
        <Stat label="Products" value={String(products.length)} icon={Shirt}/>
        <Stat label="Published" value={String(publishedCount)} icon={Check}/>
        <Stat label="Your share" value={`${Math.round((1 - commission) * 100)}%`} icon={PackagePlus}/>
      </div>

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
          {mode === "manual" && <section className="mb-9 border-b border-border/70 pb-9" aria-labelledby="manual-heading">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">MANUAL LISTING</p><h2 id="manual-heading" className="mt-2 font-display text-3xl">{draft.listingType === "bundle" ? "Add a complete look" : "Add a product"}</h2></div><Button variant="ghost" size="icon" aria-label="Close product form" onClick={() => { setMode(null); setError(""); }}><X/></Button></div>
            <form onSubmit={(event) => void submitManual(event)} className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2"><p className="text-sm font-medium">What are you listing?</p><div className="mt-2 flex flex-wrap gap-2"><Button type="button" variant={draft.listingType === "product" ? "default" : "outline"} onClick={() => { setDraft((current) => ({ ...current, listingType: "product" })); setError(""); }}>Individual product</Button><Button type="button" variant={draft.listingType === "bundle" ? "default" : "outline"} onClick={() => { setDraft((current) => ({ ...current, listingType: "bundle" })); setError(""); }}>Complete look / outfit bundle</Button></div><p className="mt-2 text-xs text-muted-foreground">Both listing types are saved as drafts first and require approval before appearing in your storefront.</p></div>
              <div className="sm:col-span-2"><Label htmlFor="product-name">Product name</Label><Input id="product-name" value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} maxLength={160} required className={fieldClass}/></div>
              <div className="sm:col-span-2"><Label htmlFor="product-description">Description</Label><Textarea id="product-description" value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} maxLength={2000} minLength={10} required className="mt-2 min-h-28 rounded-lg border-border/80 bg-card px-3 py-3"/></div>
              {draft.listingType === "bundle" && <div className="sm:col-span-2"><Label htmlFor="bundle-items">Pieces included in this look</Label><Textarea id="bundle-items" value={draft.bundleItems} onChange={(event) => setDraft((current) => ({ ...current, bundleItems: event.target.value }))} placeholder="Blazer, trousers, shirt, belt — list included pieces separated by commas" required minLength={2} className="mt-2 min-h-24 rounded-lg border-border/80 bg-card px-3 py-3"/><p className="mt-2 text-xs text-muted-foreground">Be clear about exactly what the bundle price includes.</p></div>}
              <div><Label htmlFor="product-department">Product department</Label><select id="product-department" value={draft.department} onChange={(event) => { const department = event.target.value as ProductDepartment; setDraft((current) => ({ ...current, department, category: categoryOptions[department][0], sizes: department === "Clothing" ? "XS, S, M, L, XL" : "" })); }} className={fieldClass}><option value="Clothing">Clothing</option><option value="Jewellery">Jewellery</option><option value="Accessories">Accessories</option><option value="Mixed look">Mixed look / outfit bundle</option></select><p className="mt-2 text-xs text-muted-foreground">Choose the department for this listing. You can create other listings in other departments too.</p></div>
              <div><Label htmlFor="product-category">Specific category</Label><select id="product-category" value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value, sizes: current.department === "Jewellery" && event.target.value === "Rings" ? current.sizes : current.department === "Clothing" ? current.sizes : "" }))} className={fieldClass} required>{categoryOptions[draft.department].map((category) => <option key={category} value={category}>{category}</option>)}</select></div>
              <div><Label htmlFor="product-aesthetic">Style / aesthetic</Label><select id="product-aesthetic" value={draft.aesthetic} onChange={(event) => updateDraft("aesthetic", event.target.value)} className={fieldClass}>{aestheticOptions.map((aesthetic) => <option key={aesthetic} value={aesthetic}>{aesthetic}</option>)}</select><p className="mt-2 text-xs text-muted-foreground">Choose the vibe shoppers should associate with this listing. It will be saved as a product tag.</p></div>
              <div><Label htmlFor="product-price">Price (₹)</Label><Input id="product-price" type="number" min="1" step="0.01" value={draft.price} onChange={(event) => updateDraft("price", event.target.value)} required className={fieldClass}/><p className="mt-2 text-xs text-muted-foreground">At ₹{Number(draft.price || 0).toLocaleString("en-IN")}, you receive ₹{(Number(draft.price || 0) * (1 - commission)).toLocaleString("en-IN", { maximumFractionDigits: 2 })} after OFFFEED’s 18% fee.</p></div>
              <div><Label htmlFor="product-link">Product link <span className="font-normal text-muted-foreground">(optional)</span></Label><Input id="product-link" type="url" value={draft.productUrl} onChange={(event) => updateDraft("productUrl", event.target.value)} placeholder="https://yourbrand.com/product" className={fieldClass}/></div>
              {(draft.listingType === "product" && draft.department === "Clothing" || draft.listingType === "product" && draft.department === "Jewellery" && draft.category === "Rings") && <div><Label htmlFor="product-sizes">{draft.department === "Jewellery" ? "Ring sizes (optional)" : "Available sizes (optional)"}</Label><Input id="product-sizes" value={draft.sizes} onChange={(event) => updateDraft("sizes", event.target.value)} placeholder={draft.department === "Jewellery" ? "6, 7, 8 or 16, 17, 18" : "XS, S, M, L, XL or 28, 30, 32"} className={fieldClass}/></div>}
              <div><Label htmlFor="product-colors">{draft.department === "Jewellery" ? "Metal / colour" : "Colours"}</Label><Input id="product-colors" value={draft.colors} onChange={(event) => updateDraft("colors", event.target.value)} placeholder={draft.department === "Jewellery" ? "Gold, silver, rose gold" : "Ivory, Rose, Black"} className={fieldClass}/></div>
              <div><Label htmlFor="product-tags">Tags</Label><Input id="product-tags" value={draft.tags} onChange={(event) => updateDraft("tags", event.target.value)} placeholder="#collegewear, #minimal, #pink" className={fieldClass}/></div>
              <div className="sm:col-span-2"><p className="text-sm font-medium">Show in</p><div className="mt-2 flex flex-wrap gap-2">{supportedAudience.map((item) => <Button key={item} type="button" size="sm" variant={draft.audience.includes(item) ? "default" : "outline"} aria-pressed={draft.audience.includes(item)} onClick={() => toggleDraftAudience(item)}>{draft.audience.includes(item) && <Check className="size-4"/>}{item === "her" ? "Her space" : "Him space"}</Button>)}</div></div>
              <div className="sm:col-span-2"><p className="text-sm font-medium">Product photo</p><input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleImage}/><Button type="button" variant="outline" className="mt-2 h-12 w-full justify-start" onClick={() => fileInput.current?.click()}>{imagePreview ? <><img src={imagePreview} alt="Product preview" className="size-9 rounded object-cover"/>{image?.name}</> : <><ImagePlus/>Choose a product photo (JPG, PNG or WebP · up to 20 MB)</>}</Button></div>
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
              <div className="mb-4 flex flex-wrap gap-2">{supportedAudience.map((item) => <Button key={item} size="sm" type="button" variant={importAudience.includes(item) ? "default" : "outline"} aria-pressed={importAudience.includes(item)} onClick={() => setImportAudience((current) => current.includes(item) ? current.filter((entry) => entry !== item) : [...current, item])}>{importAudience.includes(item) && <Check className="size-4"/>}{item === "her" ? "Her space" : "Him space"}</Button>)}</div>
              <div className="grid gap-3 sm:grid-cols-2">{imported.map((product) => <label key={product.externalId} className="flex cursor-pointer gap-3 border border-border/70 p-3"><input type="checkbox" checked={selectedImports.includes(product.externalId)} onChange={() => setSelectedImports((current) => current.includes(product.externalId) ? current.filter((id) => id !== product.externalId) : [...current, product.externalId])} className="mt-1 size-4 accent-primary"/><img src={product.imagePath ?? ""} alt="" className="size-16 shrink-0 object-cover"/><span className="min-w-0"><span className="block truncate text-sm font-medium">{product.name}</span><span className="mt-1 block text-xs text-muted-foreground">₹{product.price.toLocaleString("en-IN")} · {product.sizes.length ? product.sizes.join(", ") : "Sizes not listed"}</span></span></label>)}</div>
              <Button className="mt-5" onClick={() => void saveImports()} disabled={saving || !selectedImports.length}>{saving ? <LoaderCircle className="animate-spin"/> : <ArrowDownToLine/>}Import {selectedImports.length} selected</Button>
            </div>}
          </section>}

          <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">PRODUCTS</p><h2 className="mt-2 font-display text-3xl">Your collection</h2></div><Button variant="ghost" size="sm" onClick={() => void workspace.refetch()}><RefreshCw/>Refresh</Button></div>
          {products.length ? <div className="mt-5 divide-y divide-border/70 border-y border-border/70">{products.map((product) => <article key={product.id} className="grid grid-cols-[76px_minmax(0,1fr)] gap-4 py-4 sm:grid-cols-[88px_minmax(0,1fr)_auto] sm:items-center"><div className="size-[76px] overflow-hidden bg-secondary sm:size-[88px]">{product.imageUrl ? <img src={product.imageUrl} alt={product.product_name} className="size-full object-cover"/> : <div className="grid size-full place-items-center"><ImagePlus className="size-5 text-muted-foreground"/></div>}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-medium">{product.product_name}</h3><Badge variant={product.status === "published" ? "default" : "secondary"}>{product.status}</Badge>{product.source === "shopify" && <Badge variant="outline">Shopify</Badge>}</div><p className="mt-1 text-sm">₹{Number(product.price).toLocaleString("en-IN")}</p><p className="mt-1 truncate text-xs text-muted-foreground">{product.audience.map((item) => item === "her" ? "Her" : "Him").join(" · ")} · {product.sizes.join(", ") || "No sizes"}{product.colors.length ? ` · ${product.colors.join(", ")}` : ""}</p></div><div className="col-span-2 flex flex-wrap gap-2 sm:col-span-1 sm:justify-end"><Button variant="outline" size="sm" onClick={() => void toggleStatus(product.id, product.status === "published" ? "published" : "draft")}>{product.status === "published" ? "Move to draft" : "Publish"}</Button>{product.product_url && <Button variant="ghost" size="icon" aria-label={`Open ${product.product_name} on store`} asChild><a href={product.product_url} target="_blank" rel="noreferrer"><ExternalLink/></a></Button>}</div></article>)}</div> : <div className="mt-6 border-y border-dashed border-border/70 py-12 text-center"><div className="mx-auto grid size-12 place-items-center rounded-full bg-secondary"><Search className="size-5 text-primary"/></div><h3 className="mt-4 font-display text-2xl">Your first product starts here.</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Add products one at a time or import your Shopify catalog, then choose when each listing is ready to publish.</p><div className="mt-5 flex flex-wrap justify-center gap-2"><Button variant="outline" onClick={() => { setDraft({ ...blankProduct, audience: supportedAudience.length ? supportedAudience : ["her"] }); setMode("manual"); }}><Plus/>Add manually</Button><Button onClick={() => { setMode("import"); setError(""); }}><ArrowDownToLine/>Import catalog</Button></div></div>}
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
        {item.brand_response && <p className="mt-3 text-sm text-muted-foreground">Your response: {item.brand_response}</p>}
        {item.status === "requested" && <div className="mt-4 space-y-3"><label className="block text-sm font-medium" htmlFor={`return-response-${item.id}`}>Response to customer (optional)</label><Textarea id={`return-response-${item.id}`} value={responses[item.id] ?? ""} onChange={(event) => setResponses((old) => ({ ...old, [item.id]: event.target.value }))} maxLength={2000} placeholder="Add a short explanation…" /><div className="flex flex-wrap gap-2"><Button disabled={busyId === item.id} onClick={() => void review(item, "approved")}>{busyId === item.id ? <LoaderCircle className="animate-spin"/> : <Check/>}Approve return</Button><Button variant="outline" disabled={busyId === item.id} onClick={() => void review(item, "rejected")}>Reject request</Button></div></div>}
      </article>)}
    </div>}
  </section>;
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Shirt }) {
  return <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-secondary text-primary"><Icon className="size-4"/></span><span><span className="block text-xs text-muted-foreground">{label}</span><span className="mt-1 block text-xl font-medium">{value}</span></span></div>;
}