import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PublicProductCard } from "@/components/public-product-card";
import { getShopTheLookProducts, type ProductWithBrand } from "@/lib/public-brand.functions";

const audiences = ["her", "him", "home"] as const;
type SaleFilter = "ALL" | "HER" | "HIM" | "LIVING" | "JEWELLERY" | "ACCESSORIES";
const isOnSale = (product: ProductWithBrand) => product.salePrice != null && product.salePrice > 0 && product.salePrice < product.price;

export const Route = createFileRoute("/sale")({
  loader: async () => {
    const results = await Promise.all(audiences.map((audience) =>
      getShopTheLookProducts({ data: { audience, aesthetic: "all", categoryOnly: false, resultLimit: 200 } })
    ));
    const unique = new Map<string, ProductWithBrand>();
    results.flat().filter(isOnSale).forEach((product) => unique.set(product.id, product));
    return [...unique.values()];
  },
  head: () => ({ meta: [
    { title: "SALE — Independent brand offers | OFFFEED" },
    { name: "description", content: "Discover active sales and special offers from independent brands on OFFFEED." },
    { property: "og:title", content: "SALE — OFFFEED" },
    { property: "og:description", content: "The brands you love, at better prices." },
  ] }),
  component: SalePage,
});

function SalePage() {
  const products = Route.useLoaderData();
  const [filter, setFilter] = useState<SaleFilter>("ALL");
  const filters: SaleFilter[] = ["ALL", "HER", "HIM", "LIVING", "JEWELLERY", "ACCESSORIES"];
  const visible = products.filter((product) => {
    if (filter === "HER") return product.audience.includes("her");
    if (filter === "HIM") return product.audience.includes("him");
    if (filter === "LIVING") return product.audience.includes("home");
    const category = (product.category + " " + product.tags.join(" ")).toLowerCase();
    if (filter === "JEWELLERY") return /jewel|earring|necklace|bracelet|ring/.test(category);
    if (filter === "ACCESSORIES") return /accessor|bag|handbag|watch|sunglass|belt|wallet/.test(category);
    return true;
  });

  return (
    <main className="mx-auto min-h-[70vh] max-w-[1440px] px-5 pb-16 pt-10 lg:px-10">
      <Link to="/discover" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Back to discovery</Link>
      <section className="mt-7 border-b border-border/70 pb-8">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary"><Tag className="size-4" />The OFFFEED sale edit</p>
        <h1 className="mt-3 font-display text-5xl font-medium sm:text-6xl">Good finds. <em className="font-normal text-primary">Better prices.</em></h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">Explore live offers from independent brands. Every promotion appears here automatically while it is active.</p>
        <div className="mt-5 flex flex-wrap gap-2" aria-label="Filter sale products">
          {filters.map((item) => <Button key={item} size="sm" variant={filter === item ? "default" : "outline"} onClick={() => setFilter(item)}>{item === "ALL" ? "All sale" : item}</Button>)}
        </div>
      </section>
      <div className="mt-7 flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl">Currently on sale</h2>
        <Badge variant="secondary">{visible.length} {visible.length === 1 ? "piece" : "pieces"}</Badge>
      </div>
      {visible.length ? (
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4">
          {visible.map((product) => <PublicProductCard key={product.id} product={product} />)}
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-border/70 px-6 py-16 text-center">
          <Tag className="mx-auto size-8 text-muted-foreground" />
          <h3 className="mt-4 font-display text-2xl">{products.length ? "No offers in this edit right now." : "No active sales just yet."}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{products.length ? "Try another category to discover current offers." : "Check back soon — new independent brand offers will appear here automatically."}</p>
          <Button className="mt-5" variant="outline" asChild><Link to="/discover">Explore OFFFEED</Link></Button>
        </div>
      )}
    </main>
  );
}
