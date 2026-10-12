import { createFileRoute } from "@tanstack/react-router";
import { Search, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PublicProductCard } from "@/components/public-product-card";
import { getShopTheLookProducts, type ProductWithBrand } from "@/lib/public-brand.functions";
import { Button } from "@/components/ui/button";
import { LookCard } from "@/components/look-card";
import { himLooks, himMoodImages, himMoods, looks, moodImages, moods } from "@/lib/offfeed-data";
import { useStyleSpace } from "@/lib/style-space";

export const Route = createFileRoute("/discover")({
  validateSearch: (search: Record<string, unknown>) => ({ category: typeof search.category === "string" ? search.category : undefined }),
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
  const { category } = Route.useSearch();
  const { space } = useStyleSpace();
  const isHim = space === "him";
  const collection = isHim ? himLooks : looks;
  const moodList = isHim ? himMoods : moods;
  const moodArtwork = isHim ? himMoodImages : moodImages;
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(6);
  const [categoryProducts, setCategoryProducts] = useState<ProductWithBrand[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryError, setCategoryError] = useState(false);
  useEffect(() => { setFilter("All"); setQuery(""); setVisible(6); }, [space]);
  useEffect(() => {
    if (category !== "jewellery" && category !== "accessories") return;
    let active = true;
    setCategoryLoading(true);
    setCategoryError(false);
    getShopTheLookProducts({ data: { audience: space, aesthetic: category, categoryOnly: true } })
      .then((products) => { if (active) setCategoryProducts(products); })
      .catch(() => { if (active) { setCategoryProducts([]); setCategoryError(true); } })
      .finally(() => { if (active) setCategoryLoading(false); });
    return () => { active = false; };
  }, [category, space]);
  const filtered = useMemo(() => collection.filter((look) => {
    const searchMatch = `${look.title} ${look.aesthetic} ${look.occasion} ${look.season}`.toLowerCase().includes(query.toLowerCase());
    if (!searchMatch) return false;
    if (["All", "Trending", "For You", "New", "Color", "Style", "Price"].includes(filter)) return true;
    return `${look.aesthetic} ${look.occasion} ${look.season}`.toLowerCase().includes(filter.toLowerCase());
  }), [collection, filter, query]);

  if (category === "jewellery" || category === "accessories") {
    const jewellery = category === "jewellery";
    const calmHerJewellery = jewellery && !isHim;
    const referenceImages = jewellery
      ? isHim
        ? [
            { src: "https://najo.com.au/cdn/shop/files/Pearl-Blog-17.png?v=1695853341&width=1080", title: "Sculptural silver", note: "Cool-toned metal, clean lines, no excess" },
            { src: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=85", title: "The daily watch", note: "Understated hardware against warm neutrals" },
            { src: "https://www.poshtottydesigns.com/cdn/shop/files/9ctLargePearlHoops.jpg?v=1723033585", title: "Quiet statement", note: "A few considered details, styled with restraint" },
          ]
        : [
            { src: "https://www.linjer.co/cdn/shop/files/keira-43-maeve-pearl-hoop-earrings-gv-lookbook-94copy-min_4480x.jpg?v=1747718107", title: "A little treasure from the sea", note: "Golden hoops tucked into a pearly shell" },
            { src: "https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=1000&q=85", title: "Pearls, please", note: "Soft, luminous details for a daydream" },
            { src: "https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=1000&q=85", title: "Found at the vanity", note: "An heirloom mood with a little mirror magic" },
            { src: "https://images.pexels.com/photos/12585697/pexels-photo-12585697.jpeg?auto=compress&cs=tinysrgb&w=1000", title: "Golden hour, always", note: "Sculptural gold catching the light" },
            { src: "https://gemfemme.shop/cdn/shop/files/CallaEarrings_1_4362f635-e62f-468e-8d55-79f8feb21c2e.jpg?v=1772123694&width=1946", title: "Golden details", note: "Sweet pearls with a playful, dressed-up feel" },
            { src: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=1000&q=85", title: "Collected on the coast", note: "Natural shells, tiny treasures, slow summer days" },
            { src: "https://images.pexels.com/photos/29371789/pexels-photo-29371789.jpeg?auto=compress&cs=tinysrgb&w=1000", title: "A bow in the story", note: "Delicate gold and pearl charms on silky fabric" },
            { src: "https://images.pexels.com/photos/36229139/pexels-photo-36229139.jpeg?auto=compress&cs=tinysrgb&w=1000", title: "Little things to keep", note: "Romantic vintage details, like a jewellery box" },
            { src: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1000&q=85", title: "Golden keepsakes", note: "Sculptural gold against soft neutral textures" },
            { src: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1000&q=85", title: "Everyday gold", note: "Fine jewellery, quietly collected" },
            { src: "https://images.pexels.com/photos/6624862/pexels-photo-6624862.jpeg?auto=compress&cs=tinysrgb&w=1000", title: "Notes from a soft morning", note: "Fine chains, flowers and sunlit linen" },
            { src: "https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=1000&q=85", title: "A bloom and a pearl", note: "Dreamy floral details with a vintage heart" },
          ]
      : isHim
        ? [
            { src: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1000&q=85", title: "After-hours shades", note: "Sharp frames, muted tones, effortless edge" },
            { src: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1000&q=85", title: "Everyday utility", note: "Functional shapes with a considered silhouette" },
            { src: "https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=1000&q=85", title: "Off-duty uniform", note: "Minimal essentials in black, stone and espresso" },
          ]
        : [
            { src: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1000&q=85", title: "The statement bag", note: "Sculptural shapes in soft, wearable colour" },
            { src: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1000&q=85", title: "Blush-hour details", note: "Pretty textures, subtle colour and clean styling" },
            { src: "https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?auto=format&fit=crop&w=1000&q=85", title: "A little sun", note: "Sleek sunglasses and an easy, polished finish" },
          ]
    return <main className="mx-auto min-h-[70vh] max-w-[1440px] px-5 pb-24 pt-12 lg:px-10 lg:pt-16">
      <section className={calmHerJewellery ? "mx-auto max-w-3xl pb-2 pt-2 text-center" : "mx-auto max-w-3xl text-center"}>
        {!calmHerJewellery && <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Independent brands · OFFFEED</p>}
        <h1 className={calmHerJewellery ? "mt-2 font-display text-5xl font-medium tracking-[-0.045em] text-stone-800 sm:text-7xl" : "mt-4 font-display text-5xl font-medium sm:text-7xl"}>{calmHerJewellery ? <><em className="font-normal text-[#c58d98]">Her</em> Jewellery</> : <>{jewellery ? "Jewellery" : "Accessories"} <em className="font-normal text-primary">edit.</em></>}</h1>
        <p className={calmHerJewellery ? "mx-auto mt-4 max-w-lg text-[15px] leading-7 text-stone-500" : "mx-auto mt-5 max-w-xl leading-7 text-muted-foreground"}>{calmHerJewellery ? "Delicate details, everyday pieces and little treasures from independent brands." : jewellery ? "Discover independent jewellery labels, delicate everyday pieces and statement finds." : "Find bags, sunglasses, belts and finishing touches from independent brands."}</p>
      </section>
      <section className={calmHerJewellery ? "mt-10 sm:mt-14" : "mt-12"}>
        {!calmHerJewellery && <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">A tiny jewellery daydream · {isHim ? "Him" : "Her"}</p><h2 className="mt-2 font-display text-3xl sm:text-4xl">{isHim ? "The details make the mood." : <>Little treasures, <em className="font-normal text-primary">softly found.</em></>}</h2></div>
          <p className="max-w-sm text-sm leading-6 text-muted-foreground">{isHim ? "Considered details, collected inspiration." : "Pearls, warm gold, shell dishes and the kind of pieces you save just because they make you feel something."}</p>
        </div>}
        {calmHerJewellery ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 lg:gap-6">
          {referenceImages.map((item, index) => <figure key={item.title} className="overflow-hidden rounded-[1rem] bg-[#f5f0eb]">
            <img src={item.src} alt={item.title} loading="lazy" className={`block w-full object-cover ${index % 5 === 1 ? "aspect-[4/5]" : index % 5 === 3 ? "aspect-[3/4]" : "aspect-[4/5]"}`} />
          </figure>)}
        </div> : <div className="columns-1 gap-5 sm:columns-2 lg:columns-3">
          {referenceImages.map((item, index) => <article key={item.title} className="group mb-5 break-inside-avoid overflow-hidden rounded-[1.35rem] border border-border/50 bg-card/80 shadow-soft">
            <div className="relative overflow-hidden bg-secondary/30"><img src={item.src} alt={item.title} loading="lazy" className={`w-full object-cover transition-transform duration-700 group-hover:scale-[1.035] ${index % 4 === 1 ? "aspect-[4/5]" : index % 4 === 2 ? "aspect-[3/4]" : index % 4 === 3 ? "aspect-[5/6]" : "aspect-[4/5]"}`} /><span className="absolute bottom-3 left-3 rounded-full border border-white/40 bg-white/80 px-3 py-1.5 text-[10px] font-medium tracking-[0.08em] text-stone-700 shadow-sm backdrop-blur-md">♡ saved for the mood</span></div>
            <div className="px-4 pb-4 pt-3"><h3 className="font-display text-xl">{item.title}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{item.note}</p></div>
          </article>)}
        </div>}
      </section>
      <section className="mt-16">
        <div className="mb-6"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Shop independent labels</p><h2 className="mt-2 font-display text-3xl sm:text-4xl">Pieces to make it yours.</h2></div>
        {categoryLoading ? <p className="py-20 text-center text-muted-foreground">Finding pieces for your edit…</p> : categoryError ? <p className="py-20 text-center text-muted-foreground">We couldn’t load this edit right now. Please try again.</p> : categoryProducts.length ? <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4">{categoryProducts.map((product) => <PublicProductCard key={product.id} product={product} />)}</div> : <div className="mx-auto max-w-2xl border-y border-dashed border-border/70 py-12 text-center"><h2 className="font-display text-3xl">Good things are on their way.</h2><p className="mt-3 leading-7 text-muted-foreground">There aren’t any approved, published {jewellery ? "jewellery" : "accessory"} products in this edit yet. As brands publish matching products, they’ll appear here.</p></div>}
      </section>
    </main>;
  }

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