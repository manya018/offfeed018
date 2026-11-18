import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Tag } from "lucide-react";
import { getShopTheLookProducts } from "@/lib/public-brand.functions";

type Audience = "her" | "him" | "home";

export function SaleDiscoveryBanner({ audience }: { audience: Audience }) {
  const [hasActiveSale, setHasActiveSale] = useState(false);

  useEffect(() => {
    let active = true;
    getShopTheLookProducts({ data: { audience, aesthetic: "all", categoryOnly: false, resultLimit: 200 } })
      .then((products) => {
        if (active) setHasActiveSale(products.some((product) => product.salePrice != null && product.salePrice > 0 && product.salePrice < product.price));
      })
      .catch(() => { if (active) setHasActiveSale(false); });
    return () => { active = false; };
  }, [audience]);

  if (!hasActiveSale) return null;

  return (
    <section className="mx-auto max-w-[1440px] px-5 pt-5 lg:px-10" aria-label="Discover active sales">
      <Link to="/sale" className="group flex flex-col gap-4 rounded-2xl border border-border/70 bg-secondary/70 px-6 py-6 shadow-soft transition-colors hover:bg-secondary sm:flex-row sm:items-center sm:justify-between sm:px-9">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-background text-primary"><Tag className="size-5" /></span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">A little something worth finding</p>
            <h2 className="mt-1 font-display text-2xl sm:text-3xl">The brands you love, on sale.</h2>
            <p className="mt-1 text-sm text-muted-foreground">Discover live offers from independent brands across OFFFEED.</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 text-sm font-semibold">Explore SALE <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span>
      </Link>
    </section>
  );
}
