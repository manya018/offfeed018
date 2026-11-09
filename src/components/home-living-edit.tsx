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
  const filtered = products.filter((product) => !activeCollection || (product.brand.homeCategories?.includes(activeCollection.title) === true && activeCollection.match.test([product.category, product.productName, product.description, ...product.tags].join(" "))));

  return <main className="home-world min-h-screen pb-24">
    <section className="mx-3 mt-3 overflow-hidden rounded-[1.25rem] border border-[#e6d7c5] bg-[#f7efe3] shadow-sm sm:mx-5 lg:mx-7">
      <a href="#home-collections" aria-label="Explore the HOME collection" className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9b6b48] focus-visible:ring-offset-2">
        <img
          src="/images/Come%20on%20in_%20A%20Cozy%20Home%20Nook.png"
          alt="OFFFEED LIVING — Come on in. Make yourself at home. A warm, sunlit cosy nook with floral tableware, flowers, candles and home comforts."
          fetchPriority="high"
          decoding="async"
          className="block h-auto w-full"
        />
      </a>
    </section>

    <section className="mx-auto max-w-[1500px] px-5 pt-12 lg:px-10">
      <div className="mb-6 text-center">
        <p className="font-display text-2xl italic text-[#9b765b]">It’s the little things, isn’t it?</p>
        <p className="mt-2 text-sm text-[#806b59]">The moments that make an ordinary day feel a little more special.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <article className="relative overflow-hidden rounded-[1.25rem]">
          <img src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=85" alt="A slow morning with a warm cup of coffee" loading="lazy" className="h-56 w-full object-cover sm:h-64"/>
          <div className="absolute inset-0 bg-gradient-to-t from-[#34251d]/65 via-transparent to-transparent"/>
          <p className="absolute bottom-4 left-5 font-display text-2xl italic text-[#fff8ed]">Slow mornings</p>
        </article>
        <article className="relative overflow-hidden rounded-[1.25rem]">
          <img src="https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85" alt="A lovingly prepared meal ready to be shared" loading="lazy" className="h-56 w-full object-cover sm:h-64"/>
          <div className="absolute inset-0 bg-gradient-to-t from-[#34251d]/65 via-transparent to-transparent"/>
          <p className="absolute bottom-4 left-5 font-display text-2xl italic text-[#fff8ed]">One more at the table</p>
        </article>
        <article className="relative overflow-hidden rounded-[1.25rem]">
          <img src="https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=900&q=85" alt="Fresh flowers brought home just because" loading="lazy" className="h-56 w-full object-cover sm:h-64"/>
          <div className="absolute inset-0 bg-gradient-to-t from-[#34251d]/65 via-transparent to-transparent"/>
          <p className="absolute bottom-4 left-5 font-display text-2xl italic text-[#fff8ed]">Flowers, just because</p>
        </article>
      </div>
    </section>

    <section id="home-collections" className="mx-auto max-w-[1500px] px-5 pt-14 lg:px-10">
      <div className="mx-auto mb-9 max-w-2xl text-center"><p className="text-[10px] font-semibold uppercase tracking-[.25em] text-[#9a7658]">A home is made of moments</p><h2 className="mt-3 font-display text-4xl leading-tight text-[#4c392b] sm:text-5xl">For all the moments that feel like home.</h2><p className="mt-4 text-sm leading-7 text-[#806b59]">The favourite mug everyone reaches for. Fresh flowers on the table. A candle lit before guests arrive. Find thoughtful little things for the moments you want to keep.</p></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 lg:gap-5">{collections.map((item) => <button key={item.title} type="button" onClick={() => { setSelected((current) => current === item.title ? "" : item.title); document.getElementById("home-products")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} aria-pressed={selected === item.title} className={`group relative overflow-hidden rounded-[1.2rem] text-left ring-offset-2 transition ${selected === item.title ? "ring-2 ring-[#9b6b48]" : ""}`}><img src={item.image} alt={item.title} loading="lazy" className="aspect-[5/4] w-full object-cover transition duration-700 group-hover:scale-105"/><span className="absolute inset-0 bg-gradient-to-t from-[#302319]/80 via-[#302319]/5 to-transparent"/><span className="absolute inset-x-0 bottom-0 p-4 sm:p-5"><span className="block font-display text-xl text-[#fff8ed] sm:text-2xl">{item.title}</span><span className="mt-1 block text-[11px] leading-5 text-[#fff3e4]/85 sm:text-xs">{item.detail}</span></span></button>)}</div>
      <div id="home-products" className="mt-8 scroll-mt-28 flex flex-wrap items-center justify-between gap-3 border-y border-[#d9c5aa] py-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#9a7658]">The LIVING edit</p><h2 className="mt-1 font-display text-3xl text-[#4c392b]">{selected || "Little things, lovely memories"}</h2></div><Button variant="outline" className="rounded-full border-[#b99a78] bg-[#fffaf1] text-[#71543b]" onClick={() => setSelected("")}>View everything</Button></div>
      {loading ? <p className="py-14 text-center text-sm text-[#806b59]">Finding lovely things for your home…</p> : filtered.length ? <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">{filtered.map((product) => <PublicProductCard key={product.id} product={product}/>)}</div> : <div className="mt-7 border-y border-dashed border-[#d9c5aa] py-14 text-center"><h3 className="font-display text-3xl text-[#4c392b]">Your LIVING story starts here.</h3><p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#806b59]">{products.length ? `No published products found in ${selected}. Products appear here when an approved LIVING brand has selected this collection and publishes products in a matching category.` : "We’re making room for the little things that make a home feel loved. Homegrown brands and thoughtful finds are on their way."}</p></div>}
    </section>
    <section className="mx-3 mt-16 overflow-hidden rounded-[1.5rem] bg-[#e9deca] px-6 py-12 text-center sm:mx-5 sm:px-12"><p className="font-display text-3xl italic text-[#72543c] sm:text-4xl">“The best moments happen when we’re all together.”</p><p className="mt-4 text-[10px] font-semibold uppercase tracking-[.24em] text-[#92765a]">For the people, rituals and little joys you call home</p></section>
  </main>;
}
