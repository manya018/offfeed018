import { createFileRoute } from "@tanstack/react-router";
import { Search, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { LookCard } from "@/components/look-card";
import { himLooks, himMoodImages, himMoods, looks, moodImages, moods } from "@/lib/offfeed-data";
import { useStyleSpace } from "@/lib/style-space";

export const Route = createFileRoute("/discover")({
  head: () => ({ meta: [
    { title: "Discover your next obsession — OFFFEED" },
    { name: "description", content: "Search fashion styles, moods, occasions and unique outfits curated beyond the algorithm." },
    { property: "og:title", content: "Discover — OFFFEED" },
    { property: "og:description", content: "Less algorithm. More you. Explore fashion inspiration curated for your mood." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ]}), component: DiscoverPage,
});

const filters = ["All", "Trending", "For You", "New", "Aesthetic", "Occasion", "Season", "Color", "Style", "Price"];

function DiscoverPage() {
  const { space } = useStyleSpace();
  const isHim = space === "him";
  const collection = isHim ? himLooks : looks;
  const moodList = isHim ? himMoods : moods;
  const moodArtwork = isHim ? himMoodImages : moodImages;
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(6);
  useEffect(() => { setFilter("All"); setQuery(""); setVisible(6); }, [space]);
  const filtered = useMemo(() => collection.filter((look) => {
    const searchMatch = `${look.title} ${look.aesthetic} ${look.occasion} ${look.season}`.toLowerCase().includes(query.toLowerCase());
    if (!searchMatch) return false;
    if (["All", "Trending", "For You", "New", "Color", "Style", "Price"].includes(filter)) return true;
    return `${look.aesthetic} ${look.occasion} ${look.season}`.toLowerCase().includes(filter.toLowerCase());
  }), [collection, filter, query]);

  return <main className="pb-24">
    <section className="mx-auto max-w-[1440px] px-5 pb-12 pt-16 text-center lg:px-10 lg:pt-24">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{isHim ? "A considered edit for him" : "Less algorithm. More you."}</p>
      <h1 className="mt-4 font-display text-6xl font-medium sm:text-7xl">{isHim ? <>Find your own <em className="font-normal text-primary">uniform.</em></> : <>Discover your next <em className="font-normal text-primary">obsession.</em></>}</h1>
      <div className="relative mx-auto mt-9 max-w-2xl"><Search className="absolute left-5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={isHim ? "What are you in the mood for?" : "What are you feeling today?"} className="h-14 w-full rounded-full border border-border bg-card px-14 text-sm shadow-soft outline-none transition focus:border-primary"/></div>
      <div className="mx-auto mt-5 flex max-w-5xl flex-wrap justify-center gap-2">{filters.map((item) => <Button key={item} size="sm" variant={filter === item ? "default" : "outline"} className="rounded-full" onClick={() => setFilter(item)}>{item}</Button>)}</div>
    </section>

    <section className="mx-auto max-w-[1440px] px-5 lg:px-10"><div className="mb-6 flex items-end justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{isHim ? "The menswear index" : "Aesthetic index"}</p><h2 className="mt-2 font-display text-4xl">{isHim ? "Find your point of view" : "Pick your mood"}</h2></div><span className="hidden text-sm text-muted-foreground sm:block">Drag to wander →</span></div>
      <div className="flex snap-x gap-4 overflow-x-auto pb-5">{moodList.map((mood, index) => <Button variant="ghost" key={mood} onClick={() => { setQuery(mood); setFilter("All"); }} className="group relative h-64 min-w-44 snap-start overflow-hidden rounded-[1.25rem] p-0 text-left shadow-soft"><img src={moodArtwork[index % moodArtwork.length]} alt={`${mood} aesthetic`} width={1024} height={1376} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105"/><span className="absolute inset-0 bg-gradient-to-t from-foreground/65 via-transparent to-transparent"/><span className="absolute bottom-4 left-4 font-display text-xl text-primary-foreground">{mood}</span></Button>)}</div>
    </section>

    <section className="mx-auto mt-20 max-w-[1440px] px-5 lg:px-10"><div className="mb-8 flex items-center gap-3"><Sparkles className="text-primary"/><h2 className="font-display text-4xl">{isHim ? "The menswear edit" : "The fashion feed"}</h2></div>{filtered.length ? <div className="columns-1 gap-6 sm:columns-2 lg:columns-3 xl:columns-4">{filtered.slice(0, visible).map((look, index) => <LookCard key={`${look.id}-${index}`} look={look} tall={index % 3 === 1}/>)}</div> : <p className="py-20 text-center text-muted-foreground">No looks found. Try a different mood.</p>}
      {visible < filtered.length && <div className="mt-8 text-center"><Button variant="outline" size="lg" onClick={() => setVisible((count) => count + 4)}>Load more looks</Button></div>}
    </section>

    <section className="mx-auto mt-24 max-w-[1440px] border-y border-border bg-secondary px-5 py-16 lg:px-10"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{isHim ? "Trending in menswear" : "Trending on OFFFEED"}</p><div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{collection.slice(0,4).map((look) => <div key={look.id} className="flex items-center gap-4"><img src={look.image} alt="" loading="lazy" width={80} height={96} className="h-24 w-20 rounded-lg object-cover"/><div><p className="font-display text-lg">{look.title}</p><p className="mt-1 text-xs text-muted-foreground">♡ {look.saves} saves</p></div></div>)}</div></section>
    <section className="mx-auto max-w-[1440px] px-5 pt-20 lg:px-10"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{isHim ? "The details that make it yours" : "Because you liked minimal outfits"}</p><h2 className="mt-2 font-display text-4xl">{isHim ? "Made for your everyday" : "Made for your mood"}</h2><div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{(isHim ? ["Ivy League layers","A slower coffee run","Quiet streetwear","Modern utility"] : ["Neutral college outfits","Coffee date outfits","Minimal streetwear","Soft feminine looks"]).map((title, i) => <div className="relative overflow-hidden rounded-[1.25rem]" key={title}><img src={moodArtwork[i % moodArtwork.length]} alt={title} width={1024} height={1376} loading="lazy" className="aspect-[4/3] w-full object-cover"/><div className="absolute inset-0 bg-gradient-to-t from-foreground/70 to-transparent"/><p className="absolute bottom-4 left-4 font-display text-xl text-primary-foreground">{title}</p></div>)}</div></section>
  </main>;
}