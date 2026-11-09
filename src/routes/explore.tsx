import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { LookCard } from "@/components/look-card";
import { PublicProductCard } from "@/components/public-product-card";
import { getShopTheLookProducts, type ProductWithBrand } from "@/lib/public-brand.functions";
import { himLooks, looks } from "@/lib/offfeed-data";
import { useStyleSpace } from "@/lib/style-space";
import { OfffeedNote } from "@/components/offfeed-note";
export const Route = createFileRoute("/explore")({ validateSearch: (search: Record<string, unknown>) => typeof search.space === "string" ? { space: search.space } : {}, head:()=>({meta:[{title:"Explore looks — OFFFEED"},{name:"description",content:"Explore the OFFFEED editorial lookbook."},{property:"og:title",content:"Explore — OFFFEED"},{property:"og:description",content:"An editorial lookbook for every mood."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary_large_image"}]}),component: ExplorePage});

function ExplorePage() {
  const { space: requestedSpace } = Route.useSearch();
  const { space, setSpace } = useStyleSpace();
  const isHome = requestedSpace === "home" || space === "home";
  const isHim = space === "him";
  const collection = isHim ? himLooks : looks;
  const [products, setProducts] = useState<ProductWithBrand[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState("");
  useEffect(() => { if (requestedSpace === "home") setSpace("home"); }, [requestedSpace, setSpace]);
  useEffect(() => {
    if (!isHome) return;
    let active = true;
    setLoading(true);
    getShopTheLookProducts({ data: { audience: "home", aesthetic: "home", categoryOnly: true, resultLimit: 60 } })
      .then((items) => { if (active) setProducts(items); })
      .catch(() => { if (active) setProducts([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isHome]);
  const homeCategories = [
    { title: "Crockery & Tableware", line: "For chai, conversations and one-more-helpings.", image: "https://images.unsplash.com/photo-1490312278390-ab64016e0aa9?auto=format&fit=crop&w=1000&q=85", match: /crockery|tableware|mug|cup|dinner|plate|bowl|cutlery|serve|tray|ceramic|glassware/i },
    { title: "Bedding & Furnishings", line: "Soft little comforts for the end of a long day.", image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1000&q=85", match: /bedding|bedsheet|linen|quilt|blanket|cushion|pillow|throw|furnishing/i },
    { title: "Candles & Fragrance", line: "A familiar scent and a softer kind of evening.", image: "https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=1000&q=85", match: /candle|fragrance|diffuser|room spray|incense|scent/i },
    { title: "Home Decor", line: "Little details that make a space feel like yours.", image: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1000&q=85", match: /decor|vase|wall art|mirror|frame|sculpture|ornament|object/i },
    { title: "Kitchen & Dining", line: "Made for the meals and memories made together.", image: "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1000&q=85", match: /kitchen|cookware|utensil|jar|storage|table linen|apron/i },
    { title: "Storage & Organisation", line: "A place for everything, with room for living.", image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1000&q=85", match: /storage|organis|basket|box|organizer/i },
    { title: "Bath & Wellness", line: "Little rituals for a slower start and softer finish.", image: "https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=1000&q=85", match: /bath|wellness|towel|soap|self.?care|bathroom/i },
    { title: "Lighting", line: "A warm little glow for every corner.", image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1000&q=85", match: /light|lamp|lighting|lantern/i },
    { title: "Plants & Planters", line: "A little green, a little life, a little joy.", image: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=1000&q=85", match: /plant|planter|pot|garden/i },
  ];
  const activeCategory = homeCategories.find((item) => item.title === selected);
  const homeProducts = useMemo(
    () => products.filter((product) => {
      if (!activeCategory) return true;
      const belongsToBrandCollection = product.brand.homeCategories?.includes(activeCategory.title) === true;
      const productText = [product.category, product.productName, product.description, ...product.tags].join(" ");
      return belongsToBrandCollection && activeCategory.match.test(productText);
    }),
    [products, activeCategory],
  );
  if (isHome) return <main className="min-h-screen bg-[#fbf5eb] pb-24 text-[#4c392b]">
    <section className="mx-auto max-w-[1440px] px-5 py-14 lg:px-10">
      <p className="text-[10px] font-semibold uppercase tracking-[.25em] text-[#9a7658]">OFFFEED · LIVING</p>
      <h1 className="mt-4 max-w-3xl font-display text-5xl leading-tight sm:text-7xl">A home is a feeling.<br/><em className="font-normal text-[#b17c5d]">Find yours here.</em></h1>
      <p className="mt-5 max-w-2xl text-base leading-8 text-[#806b59]">Little corners, familiar rituals and thoughtful things for the people and moments that make a house feel like home.</p>
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{homeCategories.map((item) => <button key={item.title} type="button" onClick={() => setSelected((current) => current === item.title ? "" : item.title)} aria-pressed={selected === item.title} className={`group relative overflow-hidden rounded-[1.3rem] text-left ring-offset-2 ${selected === item.title ? "ring-2 ring-[#9b6b48]" : ""}`}><img src={item.image} alt={item.title} loading="lazy" className="aspect-[5/4] w-full object-cover transition duration-700 group-hover:scale-105"/><span className="absolute inset-0 bg-gradient-to-t from-[#302319]/80 via-transparent to-transparent"/><span className="absolute bottom-0 p-5 text-[#fff8ed]"><span className="block font-display text-2xl">{item.title}</span><span className="mt-1 block text-xs text-[#fff3e4]/90">{item.line}</span></span></button>)}</div>
      <div className="mt-12 flex flex-wrap items-end justify-between gap-3 border-y border-[#d9c5aa] py-5"><div><p className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#9a7658]">The LIVING lookbook</p><h2 className="mt-1 font-display text-3xl">{selected || "Pieces for the moments that matter"}</h2></div><button type="button" onClick={() => setSelected("")} className="text-sm text-[#8b6348] underline underline-offset-4">View all inspiration</button></div>
      {loading ? <p className="py-12 text-center text-[#806b59]">Gathering lovely things for your home…</p> : homeProducts.length ? <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">{homeProducts.map((product) => <PublicProductCard key={product.id} product={product}/>)}</div> : <p className="py-12 text-center text-sm text-[#806b59]">{products.length ? "No products in this edit just yet. Try another home category." : "Thoughtful independent living labels and lovely finds will appear here as they are approved and published."}</p>}
    </section>
  </main>;
  return <main className="mx-auto max-w-[1440px] px-5 py-16 lg:px-10"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{isHim ? "The Him edit" : "An OFFFEED original"}</p><h1 className="mt-3 font-display text-6xl">{isHim ? "The menswear lookbook" : "The lookbook"}</h1><p className="mt-3 text-muted-foreground">{isHim ? "A considered edit of modern menswear." : "An edit of what feels fresh right now."}</p><OfffeedNote audience={isHim ? "him" : "her"} placement="lookbook" /><div className="mt-12 columns-1 gap-6 sm:columns-2 lg:columns-4">{collection.map((look,i)=><LookCard key={look.id} look={look} tall={i%2===0}/>)}</div></main>;
}