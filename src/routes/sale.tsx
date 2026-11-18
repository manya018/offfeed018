import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Search, Tag } from "lucide-react";
import { PublicProductCard } from "@/components/public-product-card";
import { Button } from "@/components/ui/button";
import { getAllActiveSaleProducts, getSaleDiscountPercent } from "@/lib/sale-discovery";
import type { ProductWithBrand } from "@/lib/public-brand.functions";

export const Route = createFileRoute("/sale")({
  head: () => ({ meta: [
    { title: "The Sale Edit — OFFFEED" },
    { name: "description", content: "Discover live offers from independent brands across OFFFEED." },
    { property: "og:title", content: "The Sale Edit — OFFFEED" },
    { property: "og:description", content: "Independent brands, considered pieces, special prices." },
  ] }),
  component: SalePage,
});

type SaleCategory = "all" | "her" | "him" | "home" | "jewellery" | "accessories";
const categories: Array<{ value: SaleCategory; label: string }> = [
  { value: "all", label: "All sale" }, { value: "her", label: "HER" },
  { value: "him", label: "HIM" }, { value: "home", label: "LIVING" },
  { value: "jewellery", label: "Jewellery" }, { value: "accessories", label: "Accessories" },
];

function matchesCategory(product: ProductWithBrand, category: SaleCategory) {
  if (category === "all") return true;
  const text = (product.category + " " + product.tags.join(" ")).toLowerCase();
  if (category === "her" || category === "him" || category === "home") return product.audience.includes(category);
  if (category === "jewellery") return /jewel|earring|necklace|bracelet|ring|pendant|chain|anklet/.test(text);
  return /accessor|bag|handbag|wallet|belt|watch|sunglass|scarf|hair clip/.test(text);
}

function SalePage() {
  const [products, setProducts] = useState<ProductWithBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [category, setCategory] = useState<SaleCategory>("all");
  const [minimumDiscount, setMinimumDiscount] = useState("0");
  const [sort, setSort] = useState("discount");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    getAllActiveSaleProducts()
      .then((items) => { if (active) setProducts(items); })
      .catch(() => { if (active) setFailed(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const visibleProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    const result = products.filter((product) =>
      matchesCategory(product, category) &&
      getSaleDiscountPercent(product) >= Number(minimumDiscount) &&
      (!term || [product.productName, product.brand.name, product.category, ...product.tags].join(" ").toLowerCase().includes(term)),
    );
    if (sort === "price-low") result.sort((a, b) => (a.salePrice ?? a.price) - (b.salePrice ?? b.price));
    else if (sort === "price-high") result.sort((a, b) => (b.salePrice ?? b.price) - (a.salePrice ?? a.price));
    else if (sort === "newest") result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    else result.sort((a, b) => getSaleDiscountPercent(b) - getSaleDiscountPercent(a));
    return result;
  }, [products, category, minimumDiscount, sort, query]);

  const brandCount = new Set(visibleProducts.map((product) => product.brand.handle)).size;
  const highestDiscount = products.reduce((highest, product) => Math.max(highest, getSaleDiscountPercent(product)), 0);

  return (
    <main className="mx-auto min-h-[60vh] max-w-[1440px] px-5 pb-20 pt-8 lg:px-10">
      <section className="relative overflow-hidden rounded-[1.75rem] bg-[#49382f] px-6 py-12 text-[#fffaf5] sm:px-12 sm:py-16">
        <div className="pointer-events-none absolute -right-12 -top-20 size-72 rounded-full border border-white/15"/>
        <div className="pointer-events-none absolute -right-2 -top-10 size-52 rounded-full border border-white/15"/>
        <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#e5c6b2]">OFFFEED · The sale edit</p>
        <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[.98] sm:text-7xl">Good finds.<br/><em className="font-normal text-[#e8c6b7]">Better prices.</em></h1>
        <p className="mt-5 max-w-xl text-sm leading-7 text-white/75">A considered edit of live offers from independent brands. Discover something unexpected, for a little less.</p>
        {!loading && products.length > 0 && <p className="mt-5 text-xs font-medium uppercase tracking-[.16em] text-[#e8c6b7]">{products.length} pieces · {new Set(products.map((product) => product.brand.handle)).size} brands{highestDiscount > 0 ? ` · Up to ${highestDiscount}% off` : ""}</p>}
      </section>

      <section className="mt-9" aria-label="Filter sale products">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">Find your offer</p><h2 className="mt-1 font-display text-3xl">The live sale edit</h2></div>
          <p className="text-sm text-muted-foreground">{loading ? "Finding active offers…" : `${visibleProducts.length} pieces · ${brandCount} brands`}</p>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {categories.map((item) => <Button key={item.value} type="button" size="sm" variant={category === item.value ? "default" : "outline"} onClick={() => setCategory(item.value)}>{item.label}</Button>)}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_190px_190px]">
          <label className="relative block"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products or brands" className="h-11 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"/></label>
          <select aria-label="Minimum discount" value={minimumDiscount} onChange={(event) => setMinimumDiscount(event.target.value)} className="h-11 rounded-lg border border-input bg-background px-3 text-sm"><option value="0">Any discount</option><option value="10">10% off or more</option><option value="20">20% off or more</option><option value="30">30% off or more</option><option value="50">50% off or more</option></select>
          <select aria-label="Sort sale products" value={sort} onChange={(event) => setSort(event.target.value)} className="h-11 rounded-lg border border-input bg-background px-3 text-sm"><option value="discount">Highest discount</option><option value="newest">Newest</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select>
        </div>
      </section>

      {loading ? <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div key={index} className="aspect-[4/5] animate-pulse rounded-xl bg-secondary"/>)}</div>
        : failed ? <div role="alert" className="mt-10 border-y border-dashed py-14 text-center"><p className="font-display text-2xl">The sale edit couldn't load.</p><p className="mt-2 text-sm text-muted-foreground">Please refresh and try again.</p></div>
        : visibleProducts.length ? <div className="mt-9 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4">{visibleProducts.map((product) => <PublicProductCard key={product.id} product={product}/>)}</div>
        : <div className="mt-10 border-y border-dashed border-border/70 py-16 text-center"><Tag className="mx-auto size-8 text-primary"/><h2 className="mt-4 font-display text-3xl">No offers in this edit right now.</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{products.length ? "Try another category, discount or search." : "When OFFFEED brands start a sale, their discounted pieces will appear here automatically."}</p><Button className="mt-5" variant="outline" asChild><Link to="/discover">Explore all brands <ArrowRight className="ml-2 size-4"/></Link></Button></div>}
    </main>
  );
}
