import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { getShopTheLookProducts } from "@/lib/public-brand.functions";

export function SaleDiscoveryBanner() {
  const [saleCount, setSaleCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all((["her", "him", "home"] as const).map((audience) =>
      getShopTheLookProducts({ data: { audience, aesthetic: "all products", resultLimit: 60 } })
    )).then((groups) => {
      if (!active) return;
      const unique = new Map(groups.flat().filter((product) =>
        product.salePrice != null && product.salePrice > 0 && product.salePrice < product.price
      ).map((product) => [product.id, product]));
      setSaleCount(unique.size);
    }).catch((error) => {
      console.error("[OFFFEED sale banner] Active sales could not be loaded:", error);
      if (active) setSaleCount(0);
    }).finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, []);

  if (!loaded || saleCount === 0) return null;

  return (
    <section className="mx-auto max-w-[1440px] px-5 pt-8 lg:px-10" aria-label="Shop active sales">
      <div className="relative overflow-hidden rounded-[1.5rem] bg-[#30231f] px-6 py-8 text-[#fffaf4] sm:px-10 sm:py-10">
        <div className="pointer-events-none absolute -right-12 -top-24 size-72 rounded-full border border-[#e9c9b4]/20" />
        <div className="pointer-events-none absolute -right-2 -top-14 size-52 rounded-full border border-[#e9c9b4]/15" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#e6bda8]">The OFFFEED sale edit</p>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl">A little less. A lot more to love.</h2>
            <p className="mt-2 text-sm text-[#f1dfd5]/80">{saleCount} discounted {saleCount === 1 ? "find" : "finds"} from independent brands, all in one place.</p>
          </div>
          <Link to="/sale" className="inline-flex items-center gap-2 rounded-full bg-[#fffaf4] px-5 py-3 text-sm font-semibold text-[#30231f] transition hover:bg-white">
            Explore the sale <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
