import { useEffect, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { getActiveSaleProducts, getSaleDiscountPercent } from "@/lib/sale-discovery";

export function SaleHomeBanner() {
  const [saleCount, setSaleCount] = useState<number | null>(null);
  const [topDiscount, setTopDiscount] = useState(0);

  useEffect(() => {
    let active = true;
    getActiveSaleProducts()
      .then((products) => {
        if (!active) return;
        setSaleCount(products.length);
        setTopDiscount(products.reduce((highest, product) => Math.max(highest, getSaleDiscountPercent(product)), 0));
      })
      .catch(() => {
        if (active) setSaleCount(0);
      });
    return () => { active = false; };
  }, []);

  if (saleCount === null || saleCount === 0) return null;

  return (
    <section className="mx-auto max-w-[1440px] px-5 pt-8 lg:px-10" aria-label="Active OFFFEED sales">
      <div className="relative overflow-hidden rounded-[1.5rem] border border-[#e5d3c5] bg-[#f1e5d9] px-6 py-8 text-[#49382f] sm:px-10 sm:py-10">
        <div className="pointer-events-none absolute -right-10 -top-16 size-64 rounded-full border border-[#c9a995]/50" />
        <div className="pointer-events-none absolute -right-2 -top-8 size-44 rounded-full border border-[#c9a995]/50" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8c6256]"><Sparkles className="size-3.5"/> The OFFFEED sale edit</p>
            <h2 className="mt-3 font-display text-4xl leading-[1.02] sm:text-5xl">A little less waiting.<br/><em className="font-normal text-[#986b61]">A lot more discovering.</em></h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#745c50]">{saleCount} discounted {saleCount === 1 ? "piece is" : "pieces are"} live across independent brands{topDiscount > 0 ? ` · Up to ${topDiscount}% off` : ""}.</p>
          </div>
          <Link to="/sale" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#49382f] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#624b40]">Explore the sale <ArrowRight className="size-4"/></Link>
        </div>
      </div>
    </section>
  );
}
