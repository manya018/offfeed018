import { ImageOff, ShoppingBag, Check, Heart, Share2, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ProductWithBrand } from "@/lib/public-brand.functions";
import { addToOfffeedCart } from "@/lib/cart";
import { readLikedProductIds, setWishlistItem } from "@/lib/look-collections";
import { MoodboardSaveButton } from "@/components/moodboard-save-button";
import { FindMySize } from "@/components/find-my-size";
import { recordSpotlightEvent } from "@/lib/spotlight.functions";

export function PublicProductCard({ product, spotlightCampaignId }: { product: ProductWithBrand; spotlightCampaignId?: string }) {
  const [added, setAdded] = useState(false);
  const [liked, setLiked] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [showVariantPicker, setShowVariantPicker] = useState(false);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [imageIndex, setImageIndex] = useState(0);
  const [visitorId] = useState(() => { try { const key = "offfeed-analytics-visitor"; let id = localStorage.getItem(key); if (!id) { id = crypto.randomUUID(); localStorage.setItem(key, id); } return id; } catch { return crypto.randomUUID(); } });

  useEffect(() => { if (spotlightCampaignId) void recordSpotlightEvent({ data: { campaignId: spotlightCampaignId, productId: product.id, eventType: "view", visitorId } }); }, [spotlightCampaignId, product.id, visitorId]);

  useEffect(() => {
    try {
      setLiked(readLikedProductIds().includes(product.id));
    } catch { setLiked(false); }
  }, [product.id]);

  function toggleWishlist() {
    try {
      const nextLiked = !readLikedProductIds().includes(product.id);
      setLiked(nextLiked);
      void setWishlistItem("product", product.id, nextLiked);
      if (nextLiked && spotlightCampaignId) void recordSpotlightEvent({ data: { campaignId: spotlightCampaignId, productId: product.id, eventType: "save", visitorId } });
      toast.success(nextLiked ? "Added to wishlist" : "Removed from wishlist");
    } catch { toast.error("Could not update wishlist on this device."); }
  }

  async function shareProduct() {
    const url = new URL(`/brand/${product.brand.handle}`, window.location.origin).toString();
    try {
      if (navigator.share) {
        await navigator.share({ title: `${product.productName} — OFFFEED`, text: `Check out ${product.productName} from ${product.brand.name} on OFFFEED`, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Product link copied — share it anywhere");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      try { await navigator.clipboard.writeText(url); toast.success("Product link copied — share it anywhere"); }
      catch { toast.error("Could not share automatically. Open the brand page to copy its link."); }
    }
  }

  return (
    <article className="min-w-0 border-b border-border/70 pb-4">
      <div className="group relative overflow-hidden bg-secondary/30">
        <Link to="/brand/$brandHandle" params={{ brandHandle: product.brand.handle }} className="block w-full" onClick={() => { if (spotlightCampaignId) void recordSpotlightEvent({ data: { campaignId: spotlightCampaignId, productId: product.id, eventType: "click", visitorId } }); }}>
          {((product.imageUrls?.length ? product.imageUrls : product.imageUrl ? [product.imageUrl] : [])[imageIndex]) ? (
            <img src={(product.imageUrls?.length ? product.imageUrls : [product.imageUrl]).filter(Boolean)[imageIndex] ?? product.imageUrl ?? ""} alt={`${product.productName} photo ${imageIndex + 1}`} loading="lazy" className="block h-auto w-full object-contain transition-opacity duration-300" />
          ) : (
            <div className="grid aspect-[4/5] w-full place-items-center text-muted-foreground"><ImageOff className="size-6" /></div>
          )}
        </Link>
        {product.salePrice != null && product.salePrice > 0 && product.salePrice < product.price && <span className="absolute left-3 top-3 z-10 rounded-full bg-[#49382f] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-white shadow-sm">SALE</span>}
        {product.imageUrls && product.imageUrls.length > 1 && (
          <>
            <button type="button" aria-label="Previous product photo" onClick={() => setImageIndex((index) => (index - 1 + product.imageUrls.length) % product.imageUrls.length)} className="absolute left-2 top-1/2 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-background/90 shadow hover:bg-background"><ChevronLeft className="size-4"/></button>
            <button type="button" aria-label="Next product photo" onClick={() => setImageIndex((index) => (index + 1) % product.imageUrls.length)} className="absolute right-2 top-1/2 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-background/90 shadow hover:bg-background"><ChevronRight className="size-4"/></button>
            <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1.5 rounded-full bg-background/75 px-2 py-1">
              {product.imageUrls.map((_, index) => <button key={index} type="button" aria-label={`Show product photo ${index + 1}`} onClick={() => setImageIndex(index)} className={`size-1.5 rounded-full ${imageIndex === index ? "bg-foreground" : "bg-foreground/35"}`}/>)}
            </div>
          </>
        )}
      </div>
      <div className="pt-3">
        <Link to="/brand/$brandHandle" params={{ brandHandle: product.brand.handle }} className="text-xs text-muted-foreground hover:text-foreground">{product.brand.name}</Link>
        <h3 className="mt-1 line-clamp-2 text-sm font-medium">{product.productName}</h3>
        {product.salePrice != null && product.salePrice > 0 && product.salePrice < product.price ? (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-primary">₹{product.salePrice.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
            <span className="text-xs text-muted-foreground line-through">₹{product.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">{product.saleDiscountLabel ?? "Sale"}</span>
          </div>
        ) : <p className="mt-1 text-sm">₹{product.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</p>}
        {(product.sizes.length > 0 || product.colors.length > 0) && (
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
            {[product.sizes.length ? `Sizes ${product.sizes.join(", ")}` : "", product.colors.join(", ")].filter(Boolean).join(" · ")}
          </p>
        )}
        {product.sizes.length > 0 && (
          <div className="mt-2">
            <button type="button" onClick={() => setShowSizeGuide((value) => !value)} aria-expanded={showSizeGuide} className="text-xs font-medium text-primary underline underline-offset-4">
              {showSizeGuide ? "Hide size chart" : "View size chart"}
            </button>
            {showSizeGuide && (
              <div className="mt-2 max-w-full overflow-x-auto rounded-lg border border-border/70 bg-card p-3">
                {product.sizeChart && product.sizeChart.columns.length > 0 && product.sizeChart.rows.length > 0 ? (
                  <>
                    <p className="mb-2 text-xs font-semibold">Brand measurement chart</p>
                    <table className="w-full min-w-max text-left text-[11px]">
                      <thead><tr><th className="px-2 py-1.5 font-semibold">Measurement</th>{product.sizeChart.columns.map((column) => <th key={column} className="px-2 py-1.5 font-semibold">{column}</th>)}</tr></thead>
                      <tbody>{product.sizeChart.rows.map((row) => <tr key={row.label} className="border-t border-border/60"><th className="px-2 py-1.5 font-medium">{row.label}</th>{row.values.map((value, index) => <td key={`${row.label}-${index}`} className="px-2 py-1.5 text-muted-foreground">{value || "—"}</td>)}</tr>)}</tbody>
                    </table>
                    {product.sizeChart.unit && <p className="mt-2 text-[10px] text-muted-foreground">Measurements in {product.sizeChart.unit}.</p>}
                  </>
                ) : (
                  <>
                    <p className="text-xs font-semibold">Available sizes</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {product.sizes.map((size) => <span key={size} className="rounded-md border border-border px-3 py-1.5 text-xs">{size}</span>)}
                    </div>
                    <p className="mt-3 text-xs leading-5 text-muted-foreground">The brand has not added measurement details for this product yet. These are the available sizes; please check with the brand if you need exact measurements.</p>
                  </>
                )}
              </div>
            )}
          </div>
        )}
        <FindMySize chart={product.sizeChart} productName={product.productName} category={product.category} availableSizes={product.sizes} />
        <div className="mt-3 flex items-center gap-1">
          <Button variant="outline" size="sm" className="min-w-0 flex-1" onClick={() => {
            if (product.sizes.length > 0 || product.colors.length > 0) {
              setSelectedSize(product.sizes.length === 1 ? product.sizes[0] : "");
              setSelectedColor(product.colors.length === 1 ? product.colors[0] : "");
              setShowVariantPicker(true);
              return;
            }
            addToOfffeedCart(product);
            setAdded(true);
            toast.success("Added to your bag");
          }}>
            {added ? <Check /> : <ShoppingBag />}{added ? "Added" : "Save"}
          </Button>
          <MoodboardSaveButton item={{ id: product.id, type: "product", title: product.productName, image: product.imageUrl ?? product.imageUrls[0] ?? "", subtitle: product.brand.name, href: `/brand/${product.brand.handle}`, price: product.price }} />
          <Button variant="ghost" size="icon" aria-label={liked ? "Remove product from wishlist" : "Like product"} onClick={toggleWishlist}>
            <Heart className={liked ? "fill-current text-primary" : ""} />
          </Button>
          <Button variant="ghost" size="icon" aria-label={`Share ${product.productName}`} onClick={shareProduct}><Share2 /></Button>
        </div>
      </div>
      {showVariantPicker && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/45 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowVariantPicker(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby={"variant-title-" + product.id} className="w-full max-w-sm rounded-2xl border border-border bg-background p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id={"variant-title-" + product.id} className="font-display text-xl">Choose your options</h3>
                <p className="mt-1 text-sm text-muted-foreground">{product.productName}</p>
              </div>
              <button type="button" aria-label="Close" className="rounded-md px-2 py-1 text-muted-foreground hover:bg-secondary" onClick={() => setShowVariantPicker(false)}>✕</button>
            </div>
            {product.sizes.length > 0 && (
              <label className="mt-5 block text-sm font-medium">Select size <span className="text-destructive">*</span>
                <select value={selectedSize} onChange={(event) => setSelectedSize(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm">
                  <option value="">Choose a size</option>
                  {product.sizes.map((size) => <option key={size} value={size}>{size}</option>)}
                </select>
              </label>
            )}
            {product.colors.length > 0 && (
              <label className="mt-4 block text-sm font-medium">Select colour {product.colors.length > 1 && <span className="text-destructive">*</span>}
                <select value={selectedColor} onChange={(event) => setSelectedColor(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm">
                  <option value="">Choose a colour</option>
                  {product.colors.map((color) => <option key={color} value={color}>{color}</option>)}
                </select>
              </label>
            )}
            <Button type="button" className="mt-6 w-full" disabled={(product.sizes.length > 0 && !selectedSize) || (product.colors.length > 1 && !selectedColor)} onClick={() => {
              addToOfffeedCart(product, { size: selectedSize, color: selectedColor || product.colors[0] || "" });
              setShowVariantPicker(false);
              setAdded(true);
              toast.success("Added to your bag");
            }}>Add to bag</Button>
          </section>
        </div>
      )}
    </article>
  );
}