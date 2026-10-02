import { createFileRoute } from "@tanstack/react-router";
import { LookCard } from "@/components/look-card";
import { himLooks, looks } from "@/lib/offfeed-data";
import { useStyleSpace } from "@/lib/style-space";
export const Route = createFileRoute("/explore")({head:()=>({meta:[{title:"Explore looks — OFFFEED"},{name:"description",content:"Explore the OFFFEED editorial lookbook."},{property:"og:title",content:"Explore — OFFFEED"},{property:"og:description",content:"An editorial lookbook for every mood."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary_large_image"}]}),component: ExplorePage});

function ExplorePage() {
  const { space } = useStyleSpace();
  const collection = space === "him" ? himLooks : looks;
  return <main className="mx-auto max-w-[1440px] px-5 py-16 lg:px-10"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{space === "him" ? "The Him edit" : "An OFFFEED original"}</p><h1 className="mt-3 font-display text-6xl">{space === "him" ? "The menswear lookbook" : "The lookbook"}</h1><p className="mt-3 text-muted-foreground">{space === "him" ? "A considered edit of modern menswear." : "An edit of what feels fresh right now."}</p><div className="mt-12 columns-1 gap-6 sm:columns-2 lg:columns-4">{collection.map((look,i)=><LookCard key={look.id} look={look} tall={i%2===0}/>)}</div></main>;
}