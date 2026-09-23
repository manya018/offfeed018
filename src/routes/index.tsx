import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import coquette from "@/assets/offfeed-coquette.jpg";
import minimal from "@/assets/offfeed-minimal.jpg";
import oldMoney from "@/assets/offfeed-oldmoney.jpg";

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
  return (
    <main className="overflow-hidden">
      <section className="mx-auto grid min-h-[calc(100svh-5rem)] max-w-[1440px] items-center gap-12 px-5 py-12 lg:grid-cols-[.9fr_1.1fr] lg:px-10 lg:py-16">
        <div className="relative z-10 max-w-2xl animate-fade-in">
          <p className="mb-6 text-xs font-semibold uppercase tracking-[0.22em] text-primary">Fashion discovery, reimagined</p>
          <h1 className="font-display text-6xl font-medium leading-[0.9] sm:text-7xl lg:text-[5.7rem]">Your feed is repetitive.<br/><em className="font-normal text-primary">Your style doesn’t have to be.</em></h1>
          <p className="mt-7 max-w-lg text-lg leading-8 text-muted-foreground">Discover outfits, aesthetics and fashion inspiration beyond the algorithm.</p>
          <div className="mt-9 flex flex-wrap gap-3"><Button size="lg" asChild><Link to="/discover">Explore OFFFEED <ArrowRight /></Link></Button><Button size="lg" variant="outline" asChild><Link to="/create">Create Your Look</Link></Button></div>
        </div>
        <div className="relative mx-auto h-[570px] w-full max-w-[670px] lg:h-[660px]">
          <div className="absolute left-[3%] top-[13%] w-[43%] rotate-[-4deg] overflow-hidden rounded-[1.5rem] shadow-soft"><img src={oldMoney} alt="Old money campus outfit" width={912} height={1200} className="aspect-[3/4] object-cover" /></div>
          <div className="absolute right-[3%] top-[2%] w-[46%] rotate-[3deg] overflow-hidden rounded-[1.5rem] shadow-soft"><img src={coquette} alt="Coquette outfit in Paris" width={912} height={1200} className="aspect-[3/4] object-cover" /></div>
          <div className="absolute bottom-[1%] left-[30%] w-[39%] rotate-[1deg] overflow-hidden rounded-[1.5rem] border-[6px] border-background shadow-soft"><img src={minimal} alt="Minimal model off duty outfit" width={912} height={1200} loading="lazy" className="aspect-[3/4] object-cover" /></div>
          {[["coquette","4%","5%"],["old money","5%","72%"],["café core","72%","57%"],["minimal","73%","87%"]].map(([label,left,top]) => <span key={label} className="absolute z-10 rounded-full border border-border bg-card/90 px-3 py-1.5 text-xs shadow-sm backdrop-blur" style={{left,top}}>{label}</span>)}
        </div>
      </section>
      <section className="bg-secondary px-5 py-20 text-center"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">A softer way to discover</p><h2 className="mx-auto mt-4 max-w-3xl font-display text-4xl sm:text-5xl">Follow your taste, not the crowd.</h2><Button className="mt-8" variant="outline" asChild><Link to="/discover">Find your next look</Link></Button></section>
    </main>
  );
}
