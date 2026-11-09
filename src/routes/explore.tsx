import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { LookCard } from "@/components/look-card";
import { himLooks, looks } from "@/lib/offfeed-data";
import { useStyleSpace } from "@/lib/style-space";
import { OfffeedNote } from "@/components/offfeed-note";

export const Route = createFileRoute("/explore")({
  validateSearch: (search: Record<string, unknown>) => typeof search.space === "string" ? { space: search.space } : {},
  head: () => ({ meta: [
    { title: "Explore inspiration — OFFFEED" },
    { name: "description", content: "Explore visual stories, style moods and curated looks from independent brands." },
    { property: "og:title", content: "Explore — OFFFEED" },
    { property: "og:description", content: "A visual world of moods, stories and complete looks." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: ExplorePage,
});

const livingStories = [
  { title: "Slow mornings", line: "Coffee, soft light and nowhere else to be.", image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=85" },
  { title: "Gather around", line: "A table that always has room for one more.", image: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=85" },
  { title: "Flowers, just because", line: "Small gestures that make a space feel yours.", image: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1200&q=85" },
  { title: "A softer evening", line: "Warm lamps, familiar corners and a little pause.", image: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=85" },
];

const livingCategories = [
  { title: "Crockery & Tableware", image: "/images/living/crockery%20and%20tableware.jpeg" },
  { title: "Bedding & Furnishings", image: "/images/living/bedding%20%26%20furnishing.jpeg" },
  { title: "Candles & Fragrance", image: "/images/living/candles%20%26%20fragrance.jpeg" },
  { title: "Home Decor", image: "/images/living/home%20decor.jpeg" },
  { title: "Storage & Organisation", image: "/images/living/storage%20%26%20organization.jpeg" },
  { title: "Bath & Wellness", image: "/images/living/bath%20%26%20wellness.jpeg" },
  { title: "Lighting", image: "/images/living/lighting.jpeg" },
  { title: "Plants & Planters", image: "/images/living/plants%20%26%20planters.jpeg" },
];

function ExplorePage() {
  const { space: requestedSpace } = Route.useSearch();
  const { space, setSpace } = useStyleSpace();
  const isHome = requestedSpace === "home" || space === "home";
  const isHim = space === "him";
  const collection = isHim ? himLooks : looks;
  useEffect(() => { if (requestedSpace === "home") setSpace("home"); }, [requestedSpace, setSpace]);

  if (isHome) return <main className="min-h-screen bg-[#fbf5eb] pb-24 text-[#4c392b]">
    <section className="mx-auto max-w-[1440px] px-5 pb-10 pt-14 lg:px-10 lg:pt-20">
      <p className="text-[10px] font-semibold uppercase tracking-[.25em] text-[#9a7658]">OFFFEED · LIVING · THE INSPIRATION EDIT</p>
      <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[1.05] sm:text-7xl">A home is made of<br/><em className="font-normal text-[#b17c5d]">little moments.</em></h1>
      <p className="mt-5 max-w-2xl text-base leading-8 text-[#806b59]">Not a shopping list. A feeling. Find inspiration for the slow mornings, shared meals and familiar corners that make a place yours.</p>
      <a href="/discover?category=home&view=discover" className="mt-7 inline-flex rounded-full bg-[#79563d] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#62442f]">Discover LIVING collections <span className="ml-2">↗</span></a>
    </section>
    <section className="mx-auto grid max-w-[1440px] grid-cols-1 gap-4 px-5 sm:grid-cols-2 lg:grid-cols-4 lg:px-10">
      {livingStories.map((story) => <article key={story.title} className="group relative overflow-hidden rounded-[1.3rem]">
        <img src={story.image} alt={story.title} loading="lazy" className="aspect-[4/5] w-full object-cover transition duration-700 group-hover:scale-105"/>
        <div className="absolute inset-0 bg-gradient-to-t from-[#302319]/80 via-[#302319]/5 to-transparent"/>
        <div className="absolute inset-x-0 bottom-0 p-5 text-[#fff8ed]"><h2 className="font-display text-2xl">{story.title}</h2><p className="mt-1 text-xs leading-5 text-[#fff3e4]/90">{story.line}</p></div>
      </article>)}
    </section>
    <section className="mx-auto max-w-[1440px] px-5 pt-16 lg:px-10">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#9a7658]">A little inspiration to bring home</p><h2 className="mt-2 font-display text-4xl">Explore by feeling</h2></div><p className="max-w-sm text-sm leading-6 text-[#806b59]">Browse the collections when you're ready to find the pieces behind the feeling.</p></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {livingCategories.map((item) => <a key={item.title} href="/discover?category=home&view=discover" className="group overflow-hidden rounded-xl bg-white/70"><img src={item.image} alt={item.title} loading="lazy" className="aspect-[4/5] w-full object-cover transition duration-700 group-hover:scale-105"/><p className="px-3 py-3 text-sm font-medium text-[#59463e]">{item.title}</p></a>)}
      </div>
    </section>
    <section className="mx-auto mt-16 max-w-[1440px] px-5 lg:px-10"><div className="rounded-[1.5rem] border border-[#dfcbb4] bg-[#f3e8d8] px-6 py-10 text-center sm:px-12"><p className="font-display text-3xl italic text-[#9b765b]">Make yourself at home.</p><p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#806b59]">When a little inspiration turns into a find, Discover is where you can browse products and independent living brands.</p><a href="/discover?category=home&view=discover" className="mt-6 inline-flex rounded-full border border-[#9b7658] px-6 py-3 text-sm font-medium text-[#76563d] transition hover:bg-white/60">Shop LIVING <span className="ml-2">↗</span></a></div></section>
  </main>;

  return <main className="min-h-screen bg-[#fcfaf7] pb-24 text-[#493a33]">
    <section className="mx-auto max-w-[1440px] px-5 pb-12 pt-14 lg:px-10 lg:pt-20">
      <p className="text-[10px] font-semibold uppercase tracking-[.23em] text-[#a17e75]">{isHim ? "THE HIM EDIT · OFFFEED" : "THE HER EDIT · OFFFEED"}</p>
      <h1 className="mt-4 max-w-4xl font-display text-5xl leading-[1.02] tracking-[-.04em] sm:text-7xl">{isHim ? <>Looks that feel <em className="font-normal text-[#71836d]">like you.</em></> : <>A little inspiration.<br/><em className="font-normal text-[#bd8790]">A lot of you.</em></>}</h1>
      <p className="mt-5 max-w-2xl text-base leading-8 text-[#78645a]">{isHim ? "A visual edit of personal style, considered combinations and the details that bring a look together." : "Save the mood, find your next look and discover the independent labels behind the pieces you love."}</p>
      <a href="/discover" className="mt-7 inline-flex rounded-full border border-[#d8b8b5] bg-white px-6 py-3 text-sm font-medium text-[#76534f] transition hover:bg-[#f8eeeb]">Shop products & independent brands <span className="ml-2">↗</span></a>
    </section>
    <OfffeedNote audience={isHim ? "him" : "her"} placement="lookbook" />
    <section className="mx-auto max-w-[1440px] px-5 pt-5 lg:px-10">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.23em] text-[#a17e75]">The visual diary</p><h2 className="mt-2 font-display text-3xl sm:text-4xl">{isHim ? "The menswear lookbook" : "Looks worth saving"}</h2></div><p className="max-w-sm text-sm leading-6 text-[#87756c]">Explore complete looks and style stories. Head to Discover when you're ready to shop individual pieces.</p></div>
      <div className="columns-1 gap-5 sm:columns-2 lg:columns-4">{collection.map((look, index) => <div key={look.id} className="mb-5 break-inside-avoid"><LookCard look={look} tall={index % 2 === 0}/></div>)}</div>
    </section>
  </main>;
}
