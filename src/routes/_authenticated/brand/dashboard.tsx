import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownToLine, ArrowLeft, ArrowRight, Check, ExternalLink, ImagePlus, LoaderCircle, PackagePlus, PencilLine, Plus, RefreshCw, Search, Shirt, Trash2, Upload, X } from "lucide-react";
import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { createBrandProduct, getBrandWorkspace, importShopifyCatalog, saveImportedShopifyProducts, updateBrandProductStatus } from "@/lib/brand-products.functions";

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

type DraftProduct = {
  name: string;
  description: string;
  category: string;
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

const blankProduct: DraftProduct = { name: "", description: "", category: "Fashion", price: "", productUrl: "", sizes: "", colors: "", tags: "", audience: ["her"] };
const fieldClass = "mt-2 h-11 rounded-lg border-border/80 bg-card px-3";
const parseList = (value: string) => value.split(",").map((item) => item.trim().replace(/^#/, "")).filter(Boolean);

function BrandDashboard() {
  const queryClient = useQueryClient();
  const workspace = useQuery({ queryKey: ["brand-workspace"], queryFn: () => getBrandWorkspace() });
  const [mode, setMode] = useState<"manual" | "import" | null>(null);
  const [draft, setDraft] = useState<DraftProduct>(blankProduct);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [imported, setImported] = useState<ImportedProduct[]>([]);
  const [selectedImports, setSelectedImports] = useState<string[]>([]);
  const [importAudience, setImportAudience] = useState<Array<"her" | "him">>(["her"]);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const application = workspace.data?.application;
  const supportedAudience = useMemo(() => (application?.audience ?? ["her"]).filter((item): item is "her" | "him" => item === "her" || item === "him"), [application?.audience]);
  const products = workspace.data?.products ?? [];
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
        description: draft.description,
        category: draft.category,
        price,
        productUrl: draft.productUrl.trim() || null,
        imagePath: path,
        sizes: parseList(draft.sizes),
        colors: parseList(draft.colors),
        tags: parseList(draft.tags),
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

      <div className="grid gap-10 py-9 lg:grid-cols-[minmax(0,1fr)_260px]">
        <section className="min-w-0">
          {mode === "manual" && <section className="mb-9 border-b border-border/70 pb-9" aria-labelledby="manual-heading">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">MANUAL LISTING</p><h2 id="manual-heading" className="mt-2 font-display text-3xl">Add a product</h2></div><Button variant="ghost" size="icon" aria-label="Close product form" onClick={() => { setMode(null); setError(""); }}><X/></Button></div>
            <form onSubmit={(event) => void submitManual(event)} className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label htmlFor="product-name">Product name</Label><Input id="product-name" value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} maxLength={160} required className={fieldClass}/></div>
              <div className="sm:col-span-2"><Label htmlFor="product-description">Description</Label><Textarea id="product-description" value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} maxLength={2000} minLength={10} required className="mt-2 min-h-28 rounded-lg border-border/80 bg-card px-3 py-3"/></div>
              <div><Label htmlFor="product-category">Category</Label><Input id="product-category" value={draft.category} onChange={(event) => updateDraft("category", event.target.value)} maxLength={80} required className={fieldClass}/></div>
              <div><Label htmlFor="product-price">Price (₹)</Label><Input id="product-price" type="number" min="1" step="0.01" value={draft.price} onChange={(event) => updateDraft("price", event.target.value)} required className={fieldClass}/><p className="mt-2 text-xs text-muted-foreground">At ₹{Number(draft.price || 0).toLocaleString("en-IN")}, you receive ₹{(Number(draft.price || 0) * (1 - commission)).toLocaleString("en-IN", { maximumFractionDigits: 2 })} after OFFFEED’s 18% fee.</p></div>
              <div><Label htmlFor="product-link">Product link <span className="font-normal text-muted-foreground">(optional)</span></Label><Input id="product-link" type="url" value={draft.productUrl} onChange={(event) => updateDraft("productUrl", event.target.value)} placeholder="https://yourbrand.com/product" className={fieldClass}/></div>
              <div><Label htmlFor="product-sizes">Sizes</Label><Input id="product-sizes" value={draft.sizes} onChange={(event) => updateDraft("sizes", event.target.value)} placeholder="XS, S, M, L" className={fieldClass}/></div>
              <div><Label htmlFor="product-colors">Colors</Label><Input id="product-colors" value={draft.colors} onChange={(event) => updateDraft("colors", event.target.value)} placeholder="Ivory, Rose, Black" className={fieldClass}/></div>
              <div><Label htmlFor="product-tags">Tags</Label><Input id="product-tags" value={draft.tags} onChange={(event) => updateDraft("tags", event.target.value)} placeholder="#collegewear, #minimal, #pink" className={fieldClass}/></div>
              <div className="sm:col-span-2"><p className="text-sm font-medium">Show in</p><div className="mt-2 flex flex-wrap gap-2">{supportedAudience.map((item) => <Button key={item} type="button" size="sm" variant={draft.audience.includes(item) ? "default" : "outline"} aria-pressed={draft.audience.includes(item)} onClick={() => toggleDraftAudience(item)}>{draft.audience.includes(item) && <Check className="size-4"/>}{item === "her" ? "Her space" : "Him space"}</Button>)}</div></div>
              <div className="sm:col-span-2"><p className="text-sm font-medium">Product photo</p><input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleImage}/><Button type="button" variant="outline" className="mt-2 h-12 w-full justify-start" onClick={() => fileInput.current?.click()}>{imagePreview ? <><img src={imagePreview} alt="Product preview" className="size-9 rounded object-cover"/>{image?.name}</> : <><ImagePlus/>Choose a product photo (JPG, PNG or WebP · up to 20 MB)</>}</Button></div>
              {error && <p role="alert" className="sm:col-span-2 text-sm text-destructive">{error}</p>}
              <div className="flex flex-wrap gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={() => setMode(null)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? <LoaderCircle className="animate-spin"/> : <PackagePlus/>}Save as draft</Button></div>
            </form>
          </section>}

          {mode === "import" && <section className="mb-9 border-b border-border/70 pb-9" aria-labelledby="import-heading">
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

        <aside className="border-t border-border/70 pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0"><p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">PAYOUTS</p><h2 className="mt-2 font-display text-2xl">Every sale, clearly.</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">OFFFEED keeps 18% of completed marketplace sales. Your brand receives the remaining 82%.</p><div className="mt-5 border-y border-border/70 py-4"><div className="flex justify-between text-sm"><span className="text-muted-foreground">Customer pays</span><span>₹2,500</span></div><div className="mt-3 flex justify-between text-sm"><span className="text-muted-foreground">OFFFEED · 18%</span><span>− ₹450</span></div><div className="mt-3 flex justify-between text-sm font-medium"><span>Your share · 82%</span><span>₹2,050</span></div></div><p className="mt-4 text-xs leading-5 text-muted-foreground">Orders and payouts will appear here as marketplace checkout becomes available.</p><div className="mt-8 border-t border-border/70 pt-6"><p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">NEED A HAND?</p><p className="mt-2 text-sm leading-6 text-muted-foreground">The store import is currently designed for public Shopify catalogs. Other shops can still be added manually.</p><Button variant="ghost" size="sm" className="mt-3" asChild><Link to="/for-brands/apply"><PencilLine/>Application details<ArrowRight/></Link></Button></div></aside>
      </div>
    </div>
  </main>;
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Shirt }) {
  return <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-secondary text-primary"><Icon className="size-4"/></span><span><span className="block text-xs text-muted-foreground">{label}</span><span className="mt-1 block text-xl font-medium">{value}</span></span></div>;
}