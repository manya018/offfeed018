import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Heart, Share2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { himLooks, looks } from "@/lib/offfeed-data";
import { useStyleSpace } from "@/lib/style-space";

export const Route = createFileRoute("/look/$lookId")({
  loader: ({ params }) => { const look = looks.find((item) => item.id === params.lookId); if (!look) throw notFound(); return look; },
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
  return <main className="mx-auto max-w-[1280px] px-5 py-10 lg:px-10 lg:py-16"><Button variant="ghost" asChild><Link to="/discover"><ArrowLeft/> Back to discovery</Link></Button><div className="mt-8 grid gap-10 lg:grid-cols-[1.08fr_.92fr] lg:gap-16"><div className="overflow-hidden rounded-[1.5rem] shadow-soft"><img src={look.image} alt={look.title} width={1024} height={1376} className="h-full max-h-[780px] w-full object-cover"/></div><div className="flex flex-col justify-center"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{look.aesthetic}</p><h1 className="mt-4 font-display text-6xl font-medium leading-none">{look.title}</h1><p className="mt-6 max-w-md text-lg leading-8 text-muted-foreground">{look.description}</p><dl className="mt-10 grid grid-cols-3 border-y border-border py-6 text-sm"><div><dt className="text-muted-foreground">Aesthetic</dt><dd className="mt-1 font-medium">{look.aesthetic}</dd></div><div><dt className="text-muted-foreground">Occasion</dt><dd className="mt-1 font-medium">{look.occasion}</dd></div><div><dt className="text-muted-foreground">Season</dt><dd className="mt-1 font-medium">{look.season}</dd></div></dl><div className="mt-8 flex flex-wrap gap-3"><Button size="lg" onClick={() => setSaved((value) => !value)}><Heart className={saved ? "fill-current" : ""}/> {saved ? "Saved" : "Save"}</Button><Button size="lg" variant="outline"><Heart/> Like</Button><Button size="lg" variant="outline"><Share2/> Share</Button></div><div className="mt-12"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Style notes</p><p className="mt-3 leading-7 text-muted-foreground">{space === "him" ? "Keep the palette grounded, build with texture, and let one strong layer set the tone." : "Balance the silhouette with understated accessories. Keep the palette tonal and let one tactile detail do the talking."}</p></div></div></div><section className="mt-20 border-t border-border pt-10"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{space === "him" ? "More from the Him edit" : "Keep exploring"}</p><div className="mt-7 columns-1 gap-6 sm:columns-2 lg:columns-4">{otherLooks.slice(0,4).map((item,index)=><LookCard key={item.id} look={item} tall={index%2===0}/>)}</div></section></main>;
}