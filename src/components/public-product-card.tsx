import { ImageOff, ShoppingBag, Check } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ProductWithBrand } from "@/lib/public-brand.functions";
import { addToOfffeedCart } from "@/lib/cart";

export function PublicProductCard({ product }: { product: ProductWithBrand }) {
  const [added, setAdded] = useState(false);
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
        <Link to="/brand/$brandHandle" params={{ brandHandle: product.brand.handle }} className="text-xs text-muted-foreground hover:text-foreground">
          {product.brand.name}
        </Link>
        <h3 className="mt-1 line-clamp-2 text-sm font-medium">{product.productName}</h3>
        <p className="mt-1 text-sm">₹{product.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</p>
        {(product.sizes.length > 0 || product.colors.length > 0) && (
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
            {[product.sizes.length ? `Sizes ${product.sizes.join(", ")}` : "", product.colors.join(", ")].filter(Boolean).join(" · ")}
          </p>
        )}
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full"
          onClick={() => {
            addToOfffeedCart(product);
            setAdded(true);
          }}
        >
          {added ? <Check /> : <ShoppingBag />}
          {added ? "Added to bag" : "Add to bag"}
        </Button>
      </div>
    </article>
  );
}
