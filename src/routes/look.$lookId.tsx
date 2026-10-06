import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Heart, Share2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PublicProductCard } from "@/components/public-product-card";
import { LookCard } from "@/components/look-card";
import { himLooks, looks } from "@/lib/offfeed-data";
import { getShopTheLookProducts } from "@/lib/public-brand.functions";
import { useStyleSpace } from "@/lib/style-space";

export const Route = createFileRoute("/look/$lookId")({
  loader: ({ params }) => { const look = [...looks, ...himLooks].find((item) => item.id === params.lookId); if (!look) throw notFound(); return look; },
  head: ({ loaderData }) => ({ meta: [
    { title: loaderData ? `${loaderData.title} — OFFFEED` : "Look unavailable — OFFFEED" },
    { name: "description", content: loaderData?.description ?? "Explore curated fashion on OFFFEED." },
    { property: "og:title", content: loaderData ? `${loaderData.title} — OFFFEED` : "Look unavailable — OFFFEED" },
    { property: "og:description", content: loaderData?.description ?? "Explore curated fashion on OFFFEED." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ]}), component: LookDetail,
});

function LookDetail() {
  const look = Route.useLoaderData();
  const { space } = useStyleSpace();
  const otherLooks = (space === "him" ? himLooks : looks).filter((item) => item.id !== look.id);
  const [saved, setSaved] = useState(false);
  const shopProducts = useQuery({
    queryKey: ["shop-the-look", look.id, space],
    queryFn: () => getShopTheLookProducts({ data: { audience: space, aesthetic: look.aesthetic } }),
  });

  return <main className="mx-auto max-w-[1280px] px-5 py-10 lg:px-10 lg:py-16">
    <Button variant="ghost" asChild><Link to="/discover"><ArrowLeft/> Back to discovery</Link></Button>
    <div className="mt-8 grid gap-10 lg:grid-cols-[1.08fr_.92fr] lg:gap-16">
      <div className="overflow-hidden rounded-[1.5rem] shadow-soft"><img src={look.image} alt={look.title} width={1024} height={1376} className="h-full max-h-[780px] w-full object-cover"/></div>
      <div className="flex flex-col justify-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{look.aesthetic}</p>
        <h1 className="mt-4 font-display text-6xl font-medium leading-none">{look.title}</h1>
        <p className="mt-6 max-w-md text-lg leading-8 text-muted-foreground">{look.description}</p>
        <dl className="mt-10 grid grid-cols-3 border-y border-border py-6 text-sm"><div><dt className="text-muted-foreground">Aesthetic</dt><dd className="mt-1 font-medium">{look.aesthetic}</dd></div><div><dt className="text-muted-foreground">Occasion</dt><dd className="mt-1 font-medium">{look.occasion}</dd></div><div><dt className="text-muted-foreground">Season</dt><dd className="mt-1 font-medium">{look.season}</dd></div></dl>
        <div className="mt-8 flex flex-wrap gap-3"><Button size="lg" onClick={() => setSaved((value) => !value)}><Heart className={saved ? "fill-current" : ""}/> {saved ? "Saved" : "Save"}</Button><Button size="lg" variant="outline"><Heart/> Like</Button><Button size="lg" variant="outline"><Share2/> Share</Button></div>
        <div className="mt-12"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Style notes</p><p className="mt-3 leading-7 text-muted-foreground">{space === "him" ? "Keep the palette grounded, build with texture, and let one strong layer set the tone." : "Balance the silhouette with understated accessories. Keep the palette tonal and let one tactile detail do the talking."}</p></div>
      </div>
    </div>

    <section className="mt-16 border-t border-border pt-10" aria-labelledby="shop-the-look-heading">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Selected for the {space === "him" ? "Him" : "Her"} edit</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3"><h2 id="shop-the-look-heading" className="font-display text-4xl">Shop the Look</h2><p className="text-sm text-muted-foreground">Pieces from approved OFFFEED brands</p></div>
      {shopProducts.isPending ? <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="aspect-[4/5] animate-pulse bg-secondary" />)}</div> : shopProducts.isError ? <p role="alert" className="mt-6 text-sm text-muted-foreground">The brand collection is unavailable right now.</p> : shopProducts.data.length ? <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4">{shopProducts.data.map((product) => <PublicProductCard key={product.id} product={product}/>)}</div> : <div className="mt-6 border-y border-dashed border-border/70 py-10 text-center"><p className="font-display text-2xl">Independent labels, coming into view.</p><p className="mt-2 text-sm text-muted-foreground">There are no published brand pieces in this edit yet.</p></div>}
    </section>

    <section className="mt-20 border-t border-border pt-10"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{space === "him" ? "More from the Him edit" : "Keep exploring"}</p><div className="mt-7 columns-1 gap-6 sm:columns-2 lg:columns-4">{otherLooks.slice(0,4).map((item,index)=><LookCard key={item.id} look={item} tall={index%2===0}/>)}</div></section>
  </main>;
}