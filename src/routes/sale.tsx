import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, SlidersHorizontal, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PublicProductCard } from "@/components/public-product-card";
import { getShopTheLookProducts, type ProductWithBrand } from "@/lib/public-brand.functions";

type SaleCategory = "all" | "her" | "him" | "home" | "jewellery" | "accessories";

export const Route = createFileRoute("/sale")({
  loader: async () => {
    const groups = await Promise.all((["her", "him", "home"] as const).map((audience) =>
      getShopTheLookProducts({ data: { audience, aesthetic: "all products", resultLimit: 60 } })
    ));
    const unique = new Map<string, ProductWithBrand>();
    for (const product of groups.flat()) {
      if (product.salePrice != null && product.salePrice > 0 && product.salePrice < product.price) unique.set(product.id, product);
    }
    return [...unique.values()];
  },
  head: () => ({ meta: [
    { title: "The Sale Edit — OFFFEED" },
    { name: "description", content: "Discover current offers from independent brands across HER, HIM and LIVING on OFFFEED." },
  ] }),
  component: SalePage,
});

function SalePage() {
  const products = Route.useLoaderData();
  const [category, setCategory] = useState<SaleCategory>("all");
  const [sort, setSort] = useState<"featured" | "discount">("featured");

  const visibleProducts = useMemo(() => {
    let result = products.filter((product) => {
      if (category === "all") return true;
      if (category === "her" || category === "him" || category === "home") return product.audience.includes(category);
      const searchable = (product.category + " " + product.tags.join(" ")).toLowerCase();
      return category === "jewellery"
        ? /jewel|necklace|earring|bracelet|ring|chain|pendant|anklet|bangle/.test(searchable)
        : /accessor|bag|wallet|belt|watch|sunglass|scarf|hat|cap|hair clip/.test(searchable);
    });
    if (sort === "discount") result = [...result].sort((a, b) => {
      const discountA = a.price > 0 ? (a.price - (a.salePrice ?? a.price)) / a.price : 0;
      const discountB = b.price > 0 ? (b.price - (b.salePrice ?? b.price)) / b.price : 0;
      return discountB - discountA;
    });
    return result;
  }, [products, category, sort]);

  const categories: { value: SaleCategory; label: string }[] = [
    { value: "all", label: "All sale" },
    { value: "her", label: "HER" },
    { value: "him", label: "HIM" },
    { value: "home", label: "LIVING" },
    { value: "jewellery", label: "Jewellery" },
    { value: "accessories", label: "Accessories" },
  ];

  return (
    <main className="min-h-screen bg-background">
      <section className="bg-[#30231f] px-5 py-14 text-[#fffaf4] sm:py-20">
        <div className="mx-auto max-w-[1440px]">
          <Link to="/" className="inline-flex items-center gap-2 text-xs text-[#f1dfd5]/75 hover:text-white"><ArrowLeft className="size-3.5" /> Back to OFFFEED</Link>
          <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#e6bda8]">Independent brands. Better finds.</p>
          <h1 className="mt-3 font-display text-5xl sm:text-7xl">The Sale Edit.</h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-[#f1dfd5]/80">A considered edit of pieces currently on offer across the OFFFEED universe. Discover something new, for a little less.</p>
          <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-[#f1dfd5]/80"><Tag className="size-4" /> {products.length} currently discounted {products.length === 1 ? "piece" : "pieces"}</div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-10 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2" aria-label="Filter sale by category">
            {categories.map((item) => <Button key={item.value} size="sm" variant={category === item.value ? "default" : "outline"} className="rounded-full" onClick={() => setCategory(item.value)}>{item.label}</Button>)}
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground"><SlidersHorizontal className="size-4" /><span>Sort</span><select value={sort} onChange={(event) => setSort(event.target.value as "featured" | "discount")} className="h-9 rounded-full border border-input bg-background px-3 text-xs text-foreground"><option value="featured">Featured</option><option value="discount">Biggest discount</option></select></label>
        </div>

        {visibleProducts.length ? (
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4">
            {visibleProducts.map((product) => <PublicProductCard key={product.id} product={product} />)}
          </div>
        ) : (
          <div className="mt-16 border-y border-dashed border-border/70 py-16 text-center">
            <Tag className="mx-auto size-8 text-muted-foreground" />
            <h2 className="mt-4 font-display text-3xl">No active offers in this edit.</h2>
            <p className="mt-2 text-sm text-muted-foreground">Try another category or come back when new brand sales go live.</p>
            <Button className="mt-6" variant="outline" asChild><Link to="/discover">Explore all brands</Link></Button>
          </div>
        )}
        <p className="mt-12 text-center text-xs text-muted-foreground">Offers are set by participating brands and appear only while their sale is active.</p>
      </section>
    </main>
  );
}
