import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import coquette from "@/assets/offfeed-coquette.jpg";
import minimal from "@/assets/offfeed-minimal.jpg";
import oldMoney from "@/assets/offfeed-oldmoney.jpg";
import himTailoring from "@/assets/offfeed-him-tailoring.jpg";
import himGorpcore from "@/assets/offfeed-him-gorpcore.jpg";
import himStreetwear from "@/assets/offfeed-him-streetwear.jpg";
import { useStyleSpace } from "@/lib/style-space";

// No head() here: the home route inherits title/description/og/twitter from
// __root.tsx, and ships no og:image so serve-time hosting can inject the
// project's social preview (explicit og:image or latest screenshot).
export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "OFFFEED — Fashion beyond the algorithm" },
    { name: "description", content: "Discover unique outfits, aesthetics and fashion inspiration beyond the algorithm." },
    { property: "og:title", content: "OFFFEED — Fashion beyond the algorithm" },
    { property: "og:description", content: "Discover personal fashion inspiration beyond the repetitive feed." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}), component: Index,
});

// IMPORTANT: Replace this placeholder. See ./README.md for routing conventions.
function Index() {
  const { space } = useStyleSpace();
  const isHim = space === "him";
  const collage = isHim ? [himTailoring, himGorpcore, himStreetwear] : [oldMoney, coquette, minimal];
  return (
    <main className="overflow-hidden">
      <section className="mx-auto grid min-h-[calc(100svh-5rem)] max-w-[1440px] items-center gap-12 px-5 py-12 lg:grid-cols-[.9fr_1.1fr] lg:px-10 lg:py-16">
        <div className="relative z-10 max-w-2xl animate-fade-in">
          <p className="mb-6 text-xs font-semibold uppercase tracking-[0.22em] text-primary">{isHim ? "A more personal menswear edit" : "Fashion discovery, reimagined"}</p>
          <h1 className="font-display text-6xl font-medium leading-[0.9] sm:text-7xl lg:text-[5.7rem]">{isHim ? <>Your style, <em className="font-normal text-primary">on your terms.</em></> : <>Your feed is repetitive.<br/><em className="font-normal text-primary">Your style doesn’t have to be.</em></>}</h1>
          <p className="mt-7 max-w-lg text-lg leading-8 text-muted-foreground">{isHim ? "Explore menswear, personal style and considered outfits beyond the algorithm." : "Discover outfits, aesthetics and fashion inspiration beyond the algorithm."}</p>
          <div className="mt-9 flex flex-wrap gap-3"><Button size="lg" asChild><Link to="/discover">Explore OFFFEED <ArrowRight /></Link></Button><Button size="lg" variant="outline" asChild><Link to="/create">Create Your Look</Link></Button></div>
        </div>
        <div className="relative mx-auto h-[570px] w-full max-w-[670px] lg:h-[660px]">
          <div className="absolute left-[3%] top-[13%] w-[43%] rotate-[-4deg] overflow-hidden rounded-[1.5rem] shadow-soft"><img src={collage[0]} alt={isHim ? "Tailored menswear look" : "Old money campus outfit"} width={1024} height={1376} className="aspect-[3/4] object-cover" /></div>
          <div className="absolute right-[3%] top-[2%] w-[46%] rotate-[3deg] overflow-hidden rounded-[1.5rem] shadow-soft"><img src={collage[1]} alt={isHim ? "Technical menswear look" : "Coquette outfit in Paris"} width={1024} height={1376} className="aspect-[3/4] object-cover" /></div>
          <div className="absolute bottom-[1%] left-[30%] w-[39%] rotate-[1deg] overflow-hidden rounded-[1.5rem] border-[6px] border-background shadow-soft"><img src={collage[2]} alt={isHim ? "Modern streetwear outfit" : "Minimal model off duty outfit"} width={1024} height={1376} loading="lazy" className="aspect-[3/4] object-cover" /></div>
          <span className="absolute left-[4%] top-[5%] z-10 rounded-full border border-border bg-card/90 px-3 py-1.5 text-xs shadow-sm backdrop-blur">{isHim ? "ivy league" : "coquette"}</span>
          <span className="absolute left-[5%] top-[72%] z-10 rounded-full border border-border bg-card/90 px-3 py-1.5 text-xs shadow-sm backdrop-blur">{isHim ? "gorpcore" : "old money"}</span>
          <span className="absolute left-[72%] top-[57%] z-10 rounded-full border border-border bg-card/90 px-3 py-1.5 text-xs shadow-sm backdrop-blur">{isHim ? "dark academia" : "café core"}</span>
          <span className="absolute left-[73%] top-[87%] z-10 rounded-full border border-border bg-card/90 px-3 py-1.5 text-xs shadow-sm backdrop-blur">{isHim ? "streetwear" : "minimal"}</span>
        </div>
      </section>
      <section className="bg-secondary px-5 py-20 text-center"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">A softer way to discover</p><h2 className="mx-auto mt-4 max-w-3xl font-display text-4xl sm:text-5xl">Follow your taste, not the crowd.</h2><Button className="mt-8" variant="outline" asChild><Link to="/discover">Find your next look</Link></Button></section>
    </main>
  );
}
