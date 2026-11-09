import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowUpRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicProductCard } from "@/components/public-product-card";
import { LookCard } from "@/components/look-card";
import { getShopTheLookProducts, type ProductWithBrand } from "@/lib/public-brand.functions";
import { himLooks, looks, moodImages, himMoodImages } from "@/lib/offfeed-data";
import { useStyleSpace } from "@/lib/style-space";

const herEdits = [
  { id: "soft-romance", title: "Soft Romance", label: "THE FEELING", description: "Airy textures, delicate details and pieces that make an ordinary day feel a little softer.", keywords: "coquette romantic soft pink pastel floral feminine lace", image: moodImages[0], story: "A softer point of view." },
  { id: "off-duty", title: "Off-Duty Uniform", label: "THE EVERYDAY", description: "The pieces you reach for without thinking: relaxed denim, easy layers and quietly considered basics.", keywords: "minimal everyday casual denim neutral basics", image: moodImages[1], story: "Easy does it." },
  { id: "quiet-luxury", title: "Quiet Luxury", label: "THE AESTHETIC", description: "Clean silhouettes, rich neutrals and thoughtful details. Understated, never ordinary.", keywords: "old money quiet luxury minimal tailored neutral elegant", image: moodImages[2], story: "Less, but better." },
  { id: "after-hours", title: "After Hours", label: "THE OCCASION", description: "A little drama for evenings out: statement shapes, going-out tops and pieces with presence.", keywords: "party night out evening statement bold y2k", image: moodImages[3], story: "Made for the last plan." },
  { id: "earth-toned", title: "Earth Toned", label: "THE COLOUR STORY", description: "Olive, cocoa, sand and sun-warmed shades that belong together.", keywords: "earthy brown olive beige tan natural boho", image: moodImages[4 % moodImages.length], story: "Grounded in good taste." },
  { id: "new-classics", title: "New Classics", label: "THE NEW TAKE", description: "Wardrobe signatures with a fresh perspective, sourced from independent labels.", keywords: "classic timeless modern preppy smart casual", image: moodImages[5 % moodImages.length], story: "Familiar, never predictable." },
];
const himEdits = [
  { id: "modern-uniform", title: "The Modern Uniform", label: "THE EVERYDAY", description: "Relaxed fits, clean layers and everyday pieces with a sharper point of view.", keywords: "minimalist tailoring everyday neutral clean", image: himMoodImages[0], story: "A uniform, your way." },
  { id: "street-notes", title: "Street Notes", label: "THE AESTHETIC", description: "Strong proportions, graphic layers and independent streetwear worth finding.", keywords: "streetwear japanese streetwear urban graphic", image: himMoodImages[1], story: "Outside the algorithm." },
  { id: "weekend-mode", title: "Weekend Mode", label: "THE OCCASION", description: "Utility layers, comfortable silhouettes and pieces made for taking the long way.", keywords: "gorpcore travel weekend utility outdoor", image: himMoodImages[2], story: "No plans. Good pieces." },
  { id: "after-dark-him", title: "After Dark", label: "THE OCCASION", description: "Dark tones, considered tailoring and details that do the talking.", keywords: "party evening night tailoring black", image: himMoodImages[3], story: "The night has a dress code." },
  { id: "vintage-state", title: "Vintage State", label: "THE MOOD", description: "Worn-in textures, timeless denim and the pieces that get better with time.", keywords: "vintage workwear denim retro classic", image: himMoodImages[4 % himMoodImages.length], story: "Already feels like yours." },
  { id: "quiet-form", title: "Quiet Form", label: "THE AESTHETIC", description: "Thoughtful proportions, muted colour and modern pieces with staying power.", keywords: "quiet luxury minimalist tailoring neutral", image: himMoodImages[5 % himMoodImages.length], story: "A little restraint goes far." },
];

const homeEdits = [
  { id: "slow-sunday", title: "Slow Sunday Mornings", label: "THE RITUAL", description: "Chai in your favourite cup, sunlight on the table and nowhere you need to be just yet.", keywords: "home chai cups crockery tableware breakfast warm slow morning", image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=85", story: "Take the morning slowly." },
  { id: "gather-around", title: "Gather Around", label: "THE TOGETHERNESS", description: "The dinner table that always has room for one more, with pieces made for sharing.", keywords: "home dining table crockery dinner set plates bowls serving family", image: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=85", story: "There is always room for one more." },
  { id: "little-comforts", title: "Little Comforts", label: "THE EVERYDAY", description: "Soft bedsheets, favourite cushions and the familiar things that make you exhale.", keywords: "home bedding bedsheets cushions throws quilt linen comfort", image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=85", story: "Come home to comfort." },
  { id: "candlelight", title: "A Little Candlelight", label: "THE MOOD", description: "A warm glow, a familiar fragrance and an evening that feels like yours.", keywords: "home candles fragrance diffuser room scent warm ambience", image: "https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=1200&q=85", story: "Make the everyday feel special." },
  { id: "flowers-at-home", title: "Flowers, Just Because", label: "THE LITTLE JOYS", description: "Fresh blooms, favourite vases and small gestures that brighten the whole room.", keywords: "home decor flowers vase planters plants ceramic", image: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1200&q=85", story: "A little joy for your corner." },
  { id: "festive-together", title: "Made for Together", label: "THE CELEBRATION", description: "Thoughtful table details and warm finishing touches for the days everyone comes together.", keywords: "home festive dining kitchen decor table linen serving cookware", image: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=85", story: "For the moments we keep." },
];

export const Route = createFileRoute("/edit")({
  validateSearch: (search: Record<string, unknown>) => typeof search.collection === "string" ? { collection: search.collection } : {},
  head: () => ({ meta: [{ title: "The OFFFEED EDIT — Weekly fashion stories" }, { name: "description", content: "A weekly editorial edit of aesthetics, occasions, trends and independent fashion labels." }] }),
  component: OfffeedEditPage,
});
function OfffeedEditPage() {
  const { collection: collectionId } = Route.useSearch();
  const { space } = useStyleSpace();
  const isHim = space === "him";
  const isHome = collectionId === "home" || space === "home";
  const edits = isHome ? homeEdits : isHim ? himEdits : herEdits;
  const looksForSpace = isHim ? himLooks : looks;
  const active = edits.find((item) => item.id === collectionId);
  const [products, setProducts] = useState<ProductWithBrand[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!active) { setProducts([]); return; }
    let alive = true;
    setLoading(true);
    setError(false);
    getShopTheLookProducts({ data: { audience: isHome ? "home" : isHim ? "him" : "her", aesthetic: active.keywords, resultLimit: 60, requireMatch: true } })
      .then((items) => { if (alive) setProducts(items); })
      .catch(() => { if (alive) { setProducts([]); setError(true); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [active?.id, active?.keywords, isHim, isHome]);
  const relatedLooks = useMemo(() => {
    if (!active || isHome) return [];
    const terms = active.keywords.toLowerCase().split(/\s+/).filter((term) => term.length > 3);
    return looksForSpace.filter((look) => terms.some((term) => `${look.title} ${look.aesthetic} ${look.occasion} ${look.description}`.toLowerCase().includes(term))).slice(0, 4);
  }, [active, looksForSpace, isHome]);
  return <main className="min-h-[70vh] bg-[#fbf8f4] pb-24 text-[#493a33]">
    <div className="mx-auto max-w-[1440px] px-5 py-10 lg:px-10 lg:py-14">
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-[10px] font-semibold uppercase tracking-[.25em] text-[#a17e75]">{isHome ? "OFFFEED · A little more like home" : "OFFFEED · A weekly fashion journal"}</p><span className="rounded-full border border-[#e8d8ce] bg-white/70 px-3 py-1.5 text-[10px] uppercase tracking-[.18em] text-[#8d7166]">{isHome ? "THE LIVING EDIT" : "Issue 01 · The first edit"}</span></div>
      {active ? <>
        <Button variant="ghost" className="mt-7 -ml-3 text-[#876e63]" onClick={() => { window.location.href = "/edit"; }}><ArrowLeft className="mr-2 size-4"/>All edits</Button>
        <section className="mt-5 grid overflow-hidden rounded-[1.6rem] border border-[#eadfd7] bg-[#f2e8df] lg:grid-cols-[.95fr_1.05fr]">
          <div className="flex flex-col justify-center p-7 sm:p-12 lg:p-16"><p className="text-[10px] font-semibold uppercase tracking-[.24em] text-[#a17e75]">{active.label} · {isHome ? "LIVING" : isHim ? "HIM" : "HER"}</p><h1 className="mt-4 font-display text-5xl leading-[1.02] tracking-[-.04em] sm:text-7xl">{active.title}<span className="text-[#b77e83]">.</span></h1><p className="mt-5 max-w-lg text-base leading-8 text-[#78645a]">{active.description}</p><p className="mt-8 font-display text-xl italic text-[#a17e75]">{active.story}</p></div>
          <div className="min-h-[320px] overflow-hidden"><img src={active.image} alt={active.title} className="h-full min-h-[320px] w-full object-cover"/></div>
        </section>
        <section className="mt-14"><div className="mb-6"><p className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#a17e75]">{isHome ? "Thoughtful finds for this story" : "Picked for this story"}</p><h2 className="mt-2 font-display text-3xl sm:text-4xl">{isHome ? "Bring the feeling home" : "Shop the edit"}</h2><p className="mt-2 text-sm text-[#87756c]">{isHome ? "Independent home labels, selected for the moments that make a house feel like yours." : "Independent labels, selected to match this week’s mood."}</p></div>
          {loading ? <p className="py-12 text-center text-sm text-[#87756c]">Curating pieces for this edit…</p> : error ? <p className="rounded-xl border border-dashed border-[#dfd1c7] bg-white/60 px-5 py-10 text-center text-sm text-[#87756c]">This edit couldn't load right now. Please try again.</p> : products.length ? <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">{products.slice(0, 12).map((product) => <PublicProductCard key={product.id} product={product}/>)}</div> : <p className="rounded-xl border border-dashed border-[#dfd1c7] bg-white/60 px-5 py-10 text-center text-sm text-[#87756c]">New independent-brand pieces will appear here as matching products are published.</p>}
        </section>
        {relatedLooks.length > 0 && <section className="mt-16"><div className="mb-6"><p className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#a17e75]">{isHome ? "A little inspiration for your space" : "The inspiration board"}</p><h2 className="mt-2 font-display text-3xl sm:text-4xl">{isHome ? "More little things to love" : "Looks in this mood"}</h2></div><div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{relatedLooks.map((look,index)=><LookCard key={look.id} look={look} tall={index%2===1}/>)}</div></section>}
      </> : <>
        <section className="relative mt-8 overflow-hidden rounded-[1.6rem] border border-[#eadbd2] bg-[linear-gradient(110deg,#f2e3df_0%,#fbf6ef_54%,#e9eee5_100%)] px-6 py-12 sm:px-12 sm:py-16">
          <div className="relative z-10 max-w-2xl"><div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/55 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.2em] text-[#9a7770]"><Sparkles className="size-3.5"/> Curated, not calculated</div><h1 className="mt-6 font-display text-5xl leading-[.98] tracking-[-.045em] sm:text-7xl">{isHome ? <>The OFFFEED <em className="font-normal text-[#b17c5d]">LIVING EDIT.</em></> : <>The OFFFEED <em className="font-normal text-[#b77e83]">EDIT.</em></>}</h1><p className="mt-5 max-w-xl text-sm leading-7 text-[#78645a] sm:text-base">{isHome ? "Little rituals, thoughtful finds and warm corners. A home edit filled with independent labels and everyday comforts." : "A little less scrolling. A lot more discovering. Weekly stories, fresh aesthetics and independent labels worth knowing."}</p><p className="mt-7 text-xs uppercase tracking-[.2em] text-[#9a7770]">{isHome ? "The home issue" : isHim ? "The him issue" : "The her issue"} · Issue 01</p></div>
        </section>
        <section className="mt-14"><div className="mb-7 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.23em] text-[#a17e75]">The latest issue</p><h2 className="mt-2 font-display text-3xl sm:text-4xl">{isHome ? "Little stories, lovely homes" : "Stories worth stepping into"}</h2></div><p className="max-w-sm text-sm leading-6 text-[#87756c]">{isHome ? "A rotating point of view on how we live, gather, rest and make a space our own." : "A rotating point of view on what to wear, where to wear it and who is making it."}</p></div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{edits.map((item,index)=><button key={item.id} type="button" onClick={() => { window.location.href = `/edit?collection=${item.id}`; }} className="group overflow-hidden rounded-[1.25rem] border border-[#eadfd7] bg-white text-left shadow-[0_14px_38px_-30px_rgba(70,48,40,.4)] transition hover:-translate-y-1 hover:shadow-lg"><div className="relative overflow-hidden"><img src={item.image} alt={item.title} loading="lazy" className="aspect-[4/5] w-full object-cover transition duration-700 group-hover:scale-[1.04]"/><span className="absolute left-4 top-4 rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[.18em] text-[#765b52] backdrop-blur">{item.label}</span><span className="absolute bottom-4 right-4 grid size-10 place-items-center rounded-full bg-white/90 text-[#765b52] shadow-sm transition group-hover:rotate-45"><ArrowUpRight className="size-5"/></span></div><div className="p-5"><p className="text-[10px] uppercase tracking-[.18em] text-[#a17e75]">The OFFFEED EDIT · 0{index+1}</p><h3 className="mt-2 font-display text-2xl">{item.title}</h3><p className="mt-2 text-sm leading-6 text-[#87756c]">{item.description}</p><p className="mt-4 text-xs font-semibold uppercase tracking-[.15em] text-[#a16f76]">Explore the story ↗</p></div></button>)}</div>
        </section>
        <section className="mt-16 rounded-[1.4rem] border border-[#e8ddd5] bg-white/70 px-6 py-8 text-center sm:px-10"><p className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#a17e75]">{isHome ? "Find the little things that make it home" : "Find it before your feed does"}</p><h2 className="mt-3 font-display text-3xl">{isHome ? "Your next favourite homegrown label is in here somewhere." : "Your next favourite label is in here somewhere."}</h2><p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#87756c]">{isHome ? "Every story is a way into independent home labels. Save what feels like you, then make your space your own." : "Every story is a way into independent fashion. Save what inspires you, then make it your own."}</p><Button className="mt-6 rounded-full bg-[#ad6970] px-7 text-white hover:bg-[#985a62]" onClick={() => { window.location.href = isHome ? "/discover?category=home&view=discover" : "/discover"; }}>{isHome ? "Explore HOME" : "Explore all of OFFFEED"}</Button></section>
      </>}
    </div>
  </main>;
}
