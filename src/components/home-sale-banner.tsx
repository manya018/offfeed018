import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import { getActiveSaleProducts } from "@/lib/public-brand.functions";

export function HomeSaleBanner({ audience }: { audience: "her" | "him" }) {
  const [hasSale, setHasSale] = useState(false);
  useEffect(() => {
    let active = true;
    // The shared banner is shown in every style space if any collection has an active offer.
    const audiences = [...new Set([audience, "her", "him", "home"])] as Array<"her" | "him" | "home">;
    Promise.allSettled(audiences.map((saleAudience) => getActiveSaleProducts({ data: { audience: saleAudience } })))
      .then((results) => {
        if (active) setHasSale(results.some((result) => result.status === "fulfilled" && result.value.length > 0));
      });
    return () => { active = false; };
  }, [audience]);

  if (!hasSale) return null;
  return (
    <section className="mx-auto max-w-[1440px] px-5 pb-10 lg:px-10" aria-label="OFFFEED sale">
      <div className="relative overflow-hidden rounded-[1.75rem] bg-[radial-gradient(ellipse_at_15%_20%,rgba(255,202,169,.95),transparent_42%),linear-gradient(115deg,#c85d50,#e88c72_48%,#f2b49a)] px-7 py-10 text-white shadow-soft sm:px-12 sm:py-14">
        <div className="absolute -right-10 -top-20 size-64 rounded-full border border-white/25 sm:size-80" />
        <div className="absolute -bottom-28 right-[18%] size-72 rounded-full border border-white/20" />
        <div className="relative z-10 max-w-3xl">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/85"><Sparkles className="size-4"/> OFFFEED SALE EDIT</p>
          <h2 className="mt-4 font-display text-4xl leading-tight sm:text-6xl">THE BRANDS YOU LOVE.<br/><em className="font-normal">THE PRICES YOU’LL LOVE MORE.</em></h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/90 sm:text-base">Limited-time offers from independent brands, all in one place.</p>
          <Link to="/sale" className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#9d4946] shadow transition-transform hover:-translate-y-0.5">EXPLORE SALE <ArrowRight className="size-4"/></Link>
        </div>
      </div>
    </section>
  );
}
