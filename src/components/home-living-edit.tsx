import { useState } from "react";
import { PublicProductCard } from "@/components/public-product-card";
import type { ProductWithBrand } from "@/lib/public-brand.functions";
import { Button } from "@/components/ui/button";

const collections = [
  { title: "Crockery & Tableware", detail: "Mugs, cups, dinner sets, plates, bowls and serving pieces.", image: "https://images.unsplash.com/photo-1490312278390-ab64016e0aa9?auto=format&fit=crop&w=900&q=85", match: /crockery|tableware|mug|cup|dinner|plate|bowl|cutlery|serve|tray|ceramic|glassware/i },
  { title: "Bedding & Furnishings", detail: "Bedsheets, quilts, cushions, throws and soft little comforts.", image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=900&q=85", match: /bedding|bedsheet|linen|quilt|blanket|cushion|pillow|throw|furnishing/i },
  { title: "Candles & Fragrance", detail: "Scented candles, diffusers, room sprays and incense.", image: "https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=900&q=85", match: /candle|fragrance|diffuser|room spray|incense|scent/i },
  { title: "Home Decor", detail: "Vases, wall art, mirrors, frames and objects with a story.", image: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=900&q=85", match: /decor|vase|wall art|mirror|frame|sculpture|ornament|object/i },
  { title: "Kitchen & Dining", detail: "Cookware, kitchen tools, jars, table linen and more.", image: "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=85", match: /kitchen|cookware|utensil|jar|storage|table linen|apron/i },
  { title: "Storage & Organisation", detail: "Baskets, organisers and thoughtful everyday storage.", image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=900&q=85", match: /storage|organis|basket|box|organizer/i },
  { title: "Bath & Wellness", detail: "Bath linens, self-care accessories and quiet rituals.", image: "https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=900&q=85", match: /bath|wellness|towel|soap|self.?care|bathroom/i },
  { title: "Lighting", detail: "Table lamps, ambient lights and warm little glows.", image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=85", match: /light|lamp|lighting|lantern/i },
  { title: "Plants & Planters", detail: "Greens, planters and small reminders to slow down.", image: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=900&q=85", match: /plant|planter|pot|garden/i },
];

export function HomeLivingEdit({ products, loading }: { products: ProductWithBrand[]; loading: boolean }) {
  const [selected, setSelected] = useState("");
  const activeCollection = collections.find((item) => item.title === selected);
  const filtered = products.filter((product) => !activeCollection || activeCollection.match.test(product.category + " " + product.productName + " " + product.tags.join(" ")));

  return <main className="home-world min-h-screen pb-24">
    <section className="relative isolate mx-3 mt-3 overflow-hidden rounded-[1.6rem] sm:mx-5 lg:mx-7">
      <img src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=2200&q=90" alt="A welcoming sunlit home with warm, natural textures" className="absolute inset-0 -z-20 size-full object-cover"/>
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#2e2119]/85 via-[#493528]/55 to-[#493528]/10"/>
      <div className="max-w-3xl px-7 py-20 text-[#fff8ed] sm:px-12 sm:py-28 lg:px-20 lg:py-36">
        <p className="text-[10px] font-semibold uppercase tracking-[.3em] text-[#f1d6b4] sm:text-xs">OFFFEED · THE LIVING EDIT</p>
        <h1 className="mt-5 font-display text-6xl font-medium leading-[.9] sm:text-7xl lg:text-8xl">A little more<br/><em className="font-normal text-[#e9c89d]">like home.</em></h1>
        <p className="mt-6 max-w-xl text-sm leading-7 text-[#fff5e8]/90 sm:text-base">For the cups that hold your morning chai, the table everyone gathers around, and the little things that make a space feel like yours.</p>
        <p className="mt-8 font-display text-2xl italic text-[#f0d5b5]">Made for living. Chosen with love.</p>
      </div>
      <span className="absolute bottom-5 right-6 hidden font-display text-sm italic tracking-wide text-[#fff4e5]/80 sm:block">A place for your kind of together.</span>
    </section>

    <section className="mx-auto max-w-[1500px] px-5 pt-14 lg:px-10">
      <div className="mx-auto mb-9 max-w-2xl text-center"><p className="text-[10px] font-semibold uppercase tracking-[.25em] text-[#9a7658]">The things that make a house yours</p><h2 className="mt-3 font-display text-4xl leading-tight text-[#4c392b] sm:text-5xl">Little comforts. Big feelings.</h2><p className="mt-4 text-sm leading-7 text-[#806b59]">Discover independent homegrown labels for slow mornings, shared meals and the everyday rituals you hold close.</p></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 lg:gap-5">{collections.map((item) => <button key={item.title} type="button" onClick={() => setSelected((current) => current === item.title ? "" : item.title)} aria-pressed={selected === item.title} className={`group relative overflow-hidden rounded-[1.2rem] text-left ring-offset-2 transition ${selected === item.title ? "ring-2 ring-[#9b6b48]" : ""}`}><img src={item.image} alt={item.title} loading="lazy" className="aspect-[5/4] w-full object-cover transition duration-700 group-hover:scale-105"/><span className="absolute inset-0 bg-gradient-to-t from-[#302319]/80 via-[#302319]/5 to-transparent"/><span className="absolute inset-x-0 bottom-0 p-4 sm:p-5"><span className="block font-display text-xl text-[#fff8ed] sm:text-2xl">{item.title}</span><span className="mt-1 block text-[11px] leading-5 text-[#fff3e4]/85 sm:text-xs">{item.detail}</span></span></button>)}</div>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-y border-[#d9c5aa] py-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#9a7658]">The HOME edit</p><h2 className="mt-1 font-display text-3xl text-[#4c392b]">{selected || "Things made to be lived with"}</h2></div><Button variant="outline" className="rounded-full border-[#b99a78] bg-[#fffaf1] text-[#71543b]" onClick={() => setSelected("")}>View everything</Button></div>
      {loading ? <p className="py-14 text-center text-sm text-[#806b59]">Finding lovely things for your home…</p> : filtered.length ? <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">{filtered.map((product) => <PublicProductCard key={product.id} product={product}/>)}</div> : <div className="mt-7 border-y border-dashed border-[#d9c5aa] py-14 text-center"><h3 className="font-display text-3xl text-[#4c392b]">A little space is waiting to be filled.</h3><p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#806b59]">{products.length ? "No products in this collection just yet. Choose another category or view everything." : "Our HOME shelves are being lovingly put together. Approved brands can list their home and living products, and they’ll appear here as soon as they’re published."}</p></div>}
    </section>
    <section className="mx-3 mt-16 overflow-hidden rounded-[1.5rem] bg-[#e9deca] px-6 py-12 text-center sm:mx-5 sm:px-12"><p className="font-display text-3xl italic text-[#72543c] sm:text-4xl">“Home is not a place. It’s a feeling.”</p><p className="mt-4 text-[10px] font-semibold uppercase tracking-[.24em] text-[#92765a]">Find the pieces that feel like you</p></section>
  </main>;
}
