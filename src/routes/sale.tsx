import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Sparkles } from "lucide-react";
import { PublicProductCard } from "@/components/public-product-card";
import { Button } from "@/components/ui/button";
import { getActiveSaleProducts, type ProductWithBrand } from "@/lib/public-brand.functions";
import { useStyleSpace } from "@/lib/style-space";

export const Route = createFileRoute("/sale")({
  head: () => ({ meta: [
    { title: "The Sale Edit — OFFFEED" },
    { name: "description", content: "Discover active offers from independent brands on OFFFEED." },
  ] }),
  component: SalePage,
});

function SalePage() {
  const { space } = useStyleSpace();
  const audience = space === "him" ? "him" : "her";
  const [products, setProducts] = useState<ProductWithBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    getActiveSaleProducts({ data: { audience } })
      .then((items) => { if (active) setProducts(items); })
      .catch(() => { if (active) { setProducts([]); setFailed(true); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [audience]);

  return (
    <main className="mx-auto min-h-[65vh] max-w-[1440px] px-5 pb-16 pt-8 lg:px-10">
      <Button variant="ghost" asChild><Link to="/"><ArrowLeft/>Back home</Link></Button>
      <header className="relative mt-5 overflow-hidden rounded-[1.75rem] bg-[radial-gradient(ellipse_at_15%_20%,rgba(255,202,169,.95),transparent_42%),linear-gradient(115deg,#c85d50,#e88c72_48%,#f2b49a)] px-7 py-10 text-white sm:px-12 sm:py-14">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/85"><Sparkles className="size-4"/> OFFFEED SALE EDIT</p>
        <h1 className="mt-4 font-display text-4xl leading-tight sm:text-6xl">THE BRANDS YOU LOVE.<br/><em className="font-normal">THE PRICES YOU’LL LOVE MORE.</em></h1>
        <p className="mt-4 max-w-xl text-sm leading-6 text-white/90 sm:text-base">Active offers from independent brands, gathered in one place.</p>
      </header>

      <section className="pt-10">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Limited-time finds</p>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl">Shop the sale</h2>
        </div>
        {loading ? <p className="py-12 text-center text-sm text-muted-foreground">Finding active offers…</p>
          : failed ? <p role="alert" className="py-12 text-center text-sm text-muted-foreground">Sale products couldn't load right now. Please try again.</p>
          : products.length ? <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4">{products.map((product) => <PublicProductCard key={product.id} product={product}/>)}</div>
          : <div className="rounded-2xl border border-dashed border-border px-6 py-14 text-center"><h3 className="font-display text-2xl">No active sales just yet.</h3><p className="mt-2 text-sm text-muted-foreground">Check back soon for offers from your favourite independent brands.</p><Button className="mt-5" asChild><Link to="/discover">Explore new brands</Link></Button></div>}
      </section>
    </main>
  );
}
