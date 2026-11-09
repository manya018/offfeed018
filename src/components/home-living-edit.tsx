import { useState } from "react";
import { PublicProductCard } from "@/components/public-product-card";
import type { ProductWithBrand } from "@/lib/public-brand.functions";
import { Button } from "@/components/ui/button";

const collections = [
  { title: "Crockery & Tableware", detail: "Mugs, cups, dinner sets, plates, bowls and serving pieces.", image: "/images/living/crockery-tableware.jpeg", match: /crockery|tableware|mug|cup|dinner|plate|bowl|cutlery|serve|tray|ceramic|glassware/i },
  { title: "Bedding & Furnishings", detail: "Bedsheets, quilts, cushions, throws and soft little comforts.", image: "/images/living/bedding-furnishings.jpeg", match: /bedding|bedsheet|linen|quilt|blanket|cushion|pillow|throw|furnishing/i },
  { title: "Candles & Fragrance", detail: "Scented candles, diffusers, room sprays and incense.", image: "/images/living/candles-fragrance.jpeg", match: /candle|fragrance|diffuser|room spray|incense|scent/i },
  { title: "Home Decor", detail: "Vases, wall art, mirrors, frames and objects with a story.", image: "/images/living/home-decor.jpeg", match: /decor|vase|wall art|mirror|frame|sculpture|ornament|object/i },
  { title: "Storage & Organisation", detail: "Baskets, organisers and thoughtful everyday storage.", image: "/images/living/storage-organization.jpeg", match: /storage|organis|basket|box|organizer/i },
  { title: "Bath & Wellness", detail: "Bath linens, self-care accessories and quiet rituals.", image: "/images/living/bath-wellness.jpeg", match: /bath|wellness|towel|soap|self.?care|bathroom/i },
  { title: "Lighting", detail: "Table lamps, ambient lights and warm little glows.", image: "/images/living/lighting.jpeg", match: /light|lamp|lighting|lantern/i },
  { title: "Plants & Planters", detail: "Greens, planters and small reminders to slow down.", image: "/images/living/plants-planters.jpeg", match: /plant|planter|pot|garden/i },
];

export function HomeLivingEdit({ products, loading }: { products: ProductWithBrand[]; loading: boolean }) {
  const [selected, setSelected] = useState("");
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(true);
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

    <section aria-label="Living category directory" className="mx-auto mt-6 max-w-[1500px] px-5 lg:px-10">
      <div className="overflow-hidden rounded-2xl border border-[#e6d7c5] bg-[#f7f2ed] shadow-sm">
        <div className="flex items-center justify-between border-b border-[#e8ddd5] px-4 py-3 sm:px-5">
          <div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#9a7658]">The living directory</p><p className="mt-0.5 font-display text-lg text-[#4c392b]">Browse LIVING categories</p></div>
          <button type="button" onClick={() => { setSelected(""); document.getElementById("home-products")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className="rounded-full bg-white px-3 py-2 text-xs font-medium text-[#76563d] shadow-sm hover:bg-[#fffaf1]">All categories ↗</button>
        </div>
        <div className="p-3 sm:p-4">
          <button type="button" aria-expanded={categoryMenuOpen} onClick={() => setCategoryMenuOpen((open) => !open)} className="flex w-full items-center justify-between rounded-xl bg-white/80 px-4 py-3 text-left text-sm font-semibold text-[#59463e] transition hover:bg-white"><span>Shop by category <span className="ml-1 text-xs font-normal text-[#9a7658]">({collections.length})</span></span><span className="text-[#9a7658]">{categoryMenuOpen ? "−" : "+"}</span></button>
          {categoryMenuOpen && <div className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-4">
            {collections.map((item) => <button key={item.title} type="button" onClick={() => { setSelected(item.title); document.getElementById("home-products")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} aria-pressed={selected === item.title} className={`rounded-lg px-3 py-2.5 text-left text-xs transition ${selected === item.title ? "bg-[#9b6b48] font-semibold text-white" : "text-[#77645a] hover:bg-white hover:text-[#59463e]"}`}>{item.title}</button>)}
          </div>}
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-[1500px] px-5 pt-12 lg:px-10">
      <div className="mb-7">
        <p className="text-[10px] font-semibold uppercase tracking-[.23em] text-[#9a7658]">THE OFFFEED EDIT</p>
        <h2 className="mt-2 font-display text-4xl text-[#4c392b]">Little moments, lovely spaces.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#806b59]">A collection of small rituals, thoughtful details and the things that make a place feel like yours.</p>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { title: "Slow Sunday Mornings", description: "Chai in your favourite cup, sunlight on the table and nowhere you need to be just yet.", image: "/images/living/crockery-tableware.jpeg", alt: "Coffee and tea cups arranged for a slow, sunlit morning", category: "Crockery & Tableware" },
          { title: "Gather Around", description: "The dinner table that always has room for one more, with pieces made for sharing.", image: "/images/living/crockery-tableware.jpeg", alt: "A warmly styled dining table with ceramic tableware and flowers", category: "Crockery & Tableware" },
          { title: "Little Comforts", description: "Soft bedsheets, favourite cushions and the familiar things that make you exhale.", image: "/images/living/bedding-furnishings.jpeg", alt: "A soft, sunlit bedroom with layered bedding and cushions", category: "Bedding & Furnishings" },
          { title: "A Little Candlelight", description: "A gentle glow, a favourite corner and evenings that take their time.", image: "/images/living/candles-fragrance.jpeg", alt: "A glowing candle in a cosy evening corner", category: "Candles & Fragrance" },
          { title: "Flowers, Just Because", description: "Fresh blooms in a favourite vase, simply because they make the day better.", image: "/images/living/plants-planters.jpeg", alt: "Fresh flowers arranged in a ceramic vase in warm daylight", category: "Plants & Planters" },
          { title: "Made for Together", description: "A welcoming space, familiar pieces and room for the people who matter.", image: "/images/living/home-decor.jpeg", alt: "A warm, inviting living room with thoughtfully chosen home decor", category: "Home Decor" },
        ].map((story, index) => (
          <a key={story.title} href="/discover?category=home&view=discover" className="group overflow-hidden rounded-[1.2rem] border border-[#e8d9cc] bg-white shadow-[0_14px_38px_-28px_rgba(63,42,25,.45)] transition duration-500 hover:-translate-y-1 hover:shadow-[0_22px_48px_-28px_rgba(63,42,25,.55)]">
            <div className="relative overflow-hidden">
              <img src={story.image} alt={story.alt} loading="lazy" className="aspect-[1.12/1] w-full object-cover transition duration-700 group-hover:scale-[1.04]"/>
              <span className="absolute bottom-4 right-4 grid size-12 place-items-center rounded-full bg-white/95 text-xl text-[#765b4d] shadow-sm transition group-hover:translate-x-1">↗</span>
            </div>
            <div className="p-5 sm:p-6">
              <p className="text-[10px] font-medium uppercase tracking-[.2em] text-[#a17e70]">THE OFFFEED EDIT · 0{index + 1}</p>
              <h3 className="mt-3 font-display text-[1.75rem] leading-tight text-[#49382f]">{story.title}</h3>
              <p className="mt-3 min-h-[3.5rem] text-sm leading-7 text-[#806b59]">{story.description}</p>
              <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-[#a16f68]">Explore the story <span aria-hidden="true">↗</span></span>
            </div>
          </a>
        ))}
      </div>
    </section>

    <section id="home-collections" className="mx-auto max-w-[1500px] px-5 pt-14 lg:px-10">
      <div className="mx-auto mb-9 max-w-2xl text-center"><p className="text-[10px] font-semibold uppercase tracking-[.25em] text-[#9a7658]">A home is made of moments</p><h2 className="mt-3 font-display text-4xl leading-tight text-[#4c392b] sm:text-5xl">For all the moments that feel like home.</h2><p className="mt-4 text-sm leading-7 text-[#806b59]">The favourite mug everyone reaches for. Fresh flowers on the table. A candle lit before guests arrive. Find thoughtful little things for the moments you want to keep.</p></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-5">{collections.map((item, index) => <button key={item.title} type="button" onClick={() => { setSelected(item.title); document.getElementById("home-products")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} aria-pressed={selected === item.title} className={`group relative isolate overflow-hidden rounded-[1.35rem] border border-[#e7d9c7] bg-[#e9dfd1] text-left shadow-[0_16px_40px_-28px_rgba(63,42,25,.55)] ring-offset-2 transition duration-500 hover:-translate-y-1 hover:shadow-[0_24px_48px_-28px_rgba(63,42,25,.65)] ${index === 0 || index === 4 ? "sm:row-span-2" : ""} ${selected === item.title ? "ring-2 ring-[#9b6b48]" : ""}`}><img src={item.image} alt={`${item.title} — curated LIVING inspiration`} loading="lazy" className={`w-full object-cover transition duration-1000 group-hover:scale-[1.06] ${index === 0 || index === 4 ? "aspect-[4/5] h-full min-h-[290px]" : index === 2 || index === 7 ? "aspect-[4/5]" : "aspect-[5/4]"}`}/><span className="absolute inset-0 bg-gradient-to-t from-[#241a13]/85 via-[#34251d]/15 to-transparent"/><span className="absolute left-4 top-4 rounded-full border border-white/45 bg-[#fffaf1]/15 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[.2em] text-white backdrop-blur-md">THE LIVING EDIT · 0{index + 1}</span><span className="absolute inset-x-0 bottom-0 p-4 sm:p-5"><span className="block max-w-[18rem] font-display text-2xl leading-[1.05] text-[#fff8ed] sm:text-[1.8rem]">{item.title}</span><span className="mt-2 block max-w-[18rem] text-[11px] leading-5 text-[#fff3e4]/90 sm:text-xs">{item.detail}</span><span className="mt-3 inline-flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[.2em] text-[#f3d9b5]">Explore the edit <span aria-hidden="true">↗</span></span></span></button>)}</div>
      <div id="home-products" className="mt-8 scroll-mt-28 flex flex-wrap items-center justify-between gap-3 border-y border-[#d9c5aa] py-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#9a7658]">The LIVING edit</p><h2 className="mt-1 font-display text-3xl text-[#4c392b]">{selected || "Little things, lovely memories"}</h2></div><Button variant="outline" className="rounded-full border-[#b99a78] bg-[#fffaf1] text-[#71543b]" onClick={() => setSelected("")}>View everything</Button></div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {collections.map((item, index) => <button key={item.title} type="button" onClick={() => setSelected(item.title)} aria-pressed={selected === item.title} className={`group relative isolate overflow-hidden rounded-xl border border-[#e7d9c7] text-left transition duration-300 hover:-translate-y-1 ${selected === item.title ? "ring-2 ring-[#9b6b48] ring-offset-2" : ""}`}>
          <img src={item.image} alt={item.title} loading="lazy" className="aspect-[4/5] w-full object-cover transition duration-700 group-hover:scale-105"/>
          <span className="absolute inset-0 bg-gradient-to-t from-[#241a13]/85 via-transparent to-transparent"/>
          <span className="absolute inset-x-0 bottom-0 p-2 text-[10px] font-semibold leading-tight text-[#fff8ed] sm:text-xs">{item.title}</span>
        </button>)}
      </div>
      {loading ? <p className="py-14 text-center text-sm text-[#806b59]">Finding lovely things for your home…</p> : filtered.length ? <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">{filtered.map((product) => <PublicProductCard key={product.id} product={product}/>)}</div> : <div className="mt-7 border-y border-dashed border-[#d9c5aa] py-14 text-center"><h3 className="font-display text-3xl text-[#4c392b]">Your LIVING story starts here.</h3><p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#806b59]">{products.length ? `No published products found in ${selected}. Products appear here when an approved LIVING brand has selected this collection and publishes products in a matching category.` : "We’re making room for the little things that make a home feel loved. Homegrown brands and thoughtful finds are on their way."}</p></div>}
    </section>
    <section className="mx-3 mt-16 overflow-hidden rounded-[1.5rem] bg-[#e9deca] px-6 py-12 text-center sm:mx-5 sm:px-12"><p className="font-display text-3xl italic text-[#72543c] sm:text-4xl">“The best moments happen when we’re all together.”</p><p className="mt-4 text-[10px] font-semibold uppercase tracking-[.24em] text-[#92765a]">For the people, rituals and little joys you call home</p></section>
  </main>;
}


export function HomeLivingDiscover({ products, loading }: { products: ProductWithBrand[]; loading: boolean }) {
  const [selected, setSelected] = useState("");
  const [menuOpen, setMenuOpen] = useState(true);
  const activeCollection = collections.find((item) => item.title === selected);
  const filtered = products.filter((product) => !activeCollection || (product.brand.homeCategories?.includes(activeCollection.title) === true && activeCollection.match.test([product.category, product.productName, product.description, ...product.tags].join(" "))));
  return <main className="min-h-screen bg-[#fbf8f2] px-4 pb-24 pt-8 text-[#4c392b] sm:px-6 lg:px-10">
    <div className="mx-auto max-w-[1440px]">
      <header className="mx-auto mb-9 max-w-3xl text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[.25em] text-[#9a7658]">OFFFEED · The living directory</p>
        <h1 className="mt-3 font-display text-5xl sm:text-6xl">Discover <em className="font-normal text-[#a77955]">LIVING.</em></h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[#806b59]">Thoughtful finds for the spaces, rituals and little moments that make a place feel like home.</p>
      </header>
      <section className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-[#e6d7c5] bg-[#f7f2ed] shadow-sm">
        <div className="flex items-center justify-between border-b border-[#e8ddd5] px-4 py-3 sm:px-5">
          <div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#9a7658]">Shop by category</p><p className="mt-0.5 font-display text-lg text-[#4c392b]">Find your corner of home</p></div>
          <button type="button" onClick={() => setSelected("")} className="rounded-full bg-white px-3 py-2 text-xs font-medium text-[#76563d] shadow-sm hover:bg-[#fffaf1]">View all</button>
        </div>
        <div className="p-3 sm:p-4">
          <button type="button" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)} className="flex w-full items-center justify-between rounded-xl bg-white/80 px-4 py-3 text-left text-sm font-semibold text-[#59463e] transition hover:bg-white"><span>All LIVING categories <span className="ml-1 text-xs font-normal text-[#9a7658]">({collections.length})</span></span><span className="text-[#9a7658]">{menuOpen ? "−" : "+"}</span></button>
          {menuOpen && <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-5">
            {collections.map((item, index) => <button key={item.title} type="button" onClick={() => { setSelected(item.title); document.getElementById("living-products")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} aria-pressed={selected === item.title} className={`group relative isolate overflow-hidden rounded-[1.2rem] border border-[#e7d9c7] bg-[#e9dfd1] text-left shadow-[0_14px_35px_-27px_rgba(63,42,25,.55)] transition duration-500 hover:-translate-y-1 ${selected === item.title ? "ring-2 ring-[#9b6b48]" : ""}`}>
              <img src={item.image} alt={item.title + " — LIVING collection"} loading="lazy" className={`w-full object-cover transition duration-1000 group-hover:scale-105 ${index === 0 || index === 4 || index === 2 || index === 7 ? "aspect-[4/5]" : "aspect-[5/4]"}`}/>
              <span className="absolute inset-0 bg-gradient-to-t from-[#241a13]/85 via-[#34251d]/10 to-transparent"/>
              <span className="absolute left-3 top-3 rounded-full border border-white/45 bg-[#fffaf1]/15 px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[.18em] text-white backdrop-blur-md">LIVING · 0{index + 1}</span>
              <span className="absolute inset-x-0 bottom-0 p-3 sm:p-4"><span className="block font-display text-xl leading-tight text-[#fff8ed] sm:text-2xl">{item.title}</span><span className="mt-2 block text-[9px] font-semibold uppercase tracking-[.18em] text-[#f3d9b5]">Explore collection ↗</span></span>
            </button>)}
          </div>}
        </div>
      </section>
      <section id="living-products" className="mx-auto mt-10 max-w-[1440px] scroll-mt-28">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#d9c5aa] pb-4">
          <div><p className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#9a7658]">The LIVING edit</p><h2 className="mt-1 font-display text-3xl">{selected || "All thoughtful finds"}</h2></div>
          {selected && <button type="button" onClick={() => setSelected("")} className="text-xs font-medium text-[#8a6548] underline underline-offset-4">Clear category</button>}
        </div>
        {loading ? <p className="py-14 text-center text-sm text-[#806b59]">Finding lovely things for your home…</p> : filtered.length ? <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">{filtered.map((product) => <PublicProductCard key={product.id} product={product}/>)}</div> : <div className="mt-7 border-y border-dashed border-[#d9c5aa] py-14 text-center"><h3 className="font-display text-3xl text-[#4c392b]">Lovely things are on their way.</h3><p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#806b59]">{products.length ? `No published products found in ${selected}. Try another category or view all.` : "As approved LIVING brands publish products, they will appear here."}</p></div>}
      </section>
    </div>
  </main>;
}
