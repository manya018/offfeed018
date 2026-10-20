import { ImageOff, ShoppingBag, Check, Heart, Share2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ProductWithBrand } from "@/lib/public-brand.functions";
import { addToOfffeedCart } from "@/lib/cart";

const PRODUCT_WISHLIST_KEY = "offfeed-liked-products-v1";

export function PublicProductCard({ product }: { product: ProductWithBrand }) {
  const [added, setAdded] = useState(false);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    try {
      const ids = JSON.parse(localStorage.getItem(PRODUCT_WISHLIST_KEY) ?? "[]") as string[];
      setLiked(ids.includes(product.id));
    } catch { setLiked(false); }
  }, [product.id]);

  function toggleWishlist() {
    try {
      const ids = JSON.parse(localStorage.getItem(PRODUCT_WISHLIST_KEY) ?? "[]") as string[];
      const next = ids.includes(product.id) ? ids.filter((id) => id !== product.id) : [...ids, product.id];
      localStorage.setItem(PRODUCT_WISHLIST_KEY, JSON.stringify(next));
      setLiked(next.includes(product.id));
      toast.success(next.includes(product.id) ? "Added to wishlist" : "Removed from wishlist");
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
      <Link to="/brand/$brandHandle" params={{ brandHandle: product.brand.handle }} className="group block">
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
        <div className="mt-3 flex items-center gap-1">
          <Button variant="outline" size="sm" className="min-w-0 flex-1" onClick={() => { addToOfffeedCart(product); setAdded(true); }}>
            {added ? <Check /> : <ShoppingBag />}{added ? "Saved" : "Save"}
          </Button>
          <Button variant="ghost" size="icon" aria-label={liked ? "Remove product from wishlist" : "Like product"} onClick={toggleWishlist}>
            <Heart className={liked ? "fill-current text-primary" : ""} />
          </Button>
          <Button variant="ghost" size="icon" aria-label={`Share ${product.productName}`} onClick={shareProduct}><Share2 /></Button>
        </div>
      </div>
    </article>
  );
}