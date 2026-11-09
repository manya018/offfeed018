import { ImageOff, ShoppingBag, Check, Heart, Share2 } from "lucide-react";
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
      <Link to="/brand/$brandHandle" params={{ brandHandle: product.brand.handle }} className="group block" onClick={() => { if (spotlightCampaignId) void recordSpotlightEvent({ data: { campaignId: spotlightCampaignId, productId: product.id, eventType: "click", visitorId } }); }}>
        <div className="relative aspect-[4/5] overflow-hidden bg-secondary">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.productName} loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
          ) : (
            <div className="grid size-full place-items-center text-muted-foreground"><ImageOff className="size-6" /></div>
          )}
        </div>
      </Link>
      <div className="pt-3">
        <Link to="/brand/$brandHandle" params={{ brandHandle: product.brand.handle }} className="text-xs text-muted-foreground hover:text-foreground">{product.brand.name}</Link>
        <h3 className="mt-1 line-clamp-2 text-sm font-medium">{product.productName}</h3>
        <p className="mt-1 text-sm">₹{product.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</p>
        {(product.sizes.length > 0 || product.colors.length > 0) && (
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
            {[product.sizes.length ? `Sizes ${product.sizes.join(", ")}` : "", product.colors.join(", ")].filter(Boolean).join(" · ")}
          </p>
        )}
        {product.sizeChart && product.sizeChart.columns.length > 0 && product.sizeChart.rows.length > 0 && (
          <div className="mt-2">
            <button type="button" onClick={() => setShowSizeGuide((value) => !value)} aria-expanded={showSizeGuide} className="text-xs font-medium text-primary underline underline-offset-4">
              {showSizeGuide ? "Hide size guide" : "View brand size guide"}
            </button>
            {showSizeGuide && (
              <div className="mt-2 max-w-full overflow-x-auto rounded-lg border border-border/70 p-2">
                <table className="w-full min-w-max text-left text-[11px]">
                  <thead><tr><th className="px-2 py-1.5 font-semibold">Measurement</th>{product.sizeChart.columns.map((column) => <th key={column} className="px-2 py-1.5 font-semibold">{column}</th>)}</tr></thead>
                  <tbody>{product.sizeChart.rows.map((row) => <tr key={row.label} className="border-t border-border/60"><th className="px-2 py-1.5 font-medium">{row.label}</th>{row.values.map((value, index) => <td key={`${row.label}-${index}`} className="px-2 py-1.5 text-muted-foreground">{value}</td>)}</tr>)}</tbody>
                </table>
                {product.sizeChart.unit && <p className="mt-2 text-[10px] text-muted-foreground">Unit: {product.sizeChart.unit}</p>}
              </div>
            )}
          </div>
        )}
        <FindMySize chart={product.sizeChart} productName={product.productName} category={product.category} availableSizes={product.sizes} />
        <div className="mt-3 flex items-center gap-1">
          <Button variant="outline" size="sm" className="min-w-0 flex-1" onClick={() => { addToOfffeedCart(product); setAdded(true); }}>
            {added ? <Check /> : <ShoppingBag />}{added ? "Saved" : "Save"}
          </Button>
          <MoodboardSaveButton item={{ id: product.id, type: "product", title: product.productName, image: product.imageUrl ?? product.imageUrls[0] ?? "", subtitle: product.brand.name, href: `/brand/${product.brand.handle}`, price: product.price }} />
          <Button variant="ghost" size="icon" aria-label={liked ? "Remove product from wishlist" : "Like product"} onClick={toggleWishlist}>
            <Heart className={liked ? "fill-current text-primary" : ""} />
          </Button>
          <Button variant="ghost" size="icon" aria-label={`Share ${product.productName}`} onClick={shareProduct}><Share2 /></Button>
        </div>
      </div>
    </article>
  );
}