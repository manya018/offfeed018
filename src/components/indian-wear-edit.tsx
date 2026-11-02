import { ArrowDown, ArrowUpRight } from "lucide-react";
import gulaboBanner from "@/assets/indian-wear/Gulabo_ An Indian Heritage Journal.png";
import gGreenDupatta from "@/assets/indian-wear/gulabo_green_dupatta.jpg.asset.json";
import gLehenga from "@/assets/indian-wear/gulabo_lehenga.jpg.asset.json";
import gPrintedSuit from "@/assets/indian-wear/gulabo_printed_suit.jpg.asset.json";
import gHawaMahal from "@/assets/indian-wear/gulabo_hawa_mahal.jpg.asset.json";
import gGarland from "@/assets/indian-wear/gulabo_garland_vendor.jpg.asset.json";
import gBlockPrinting from "@/assets/indian-wear/gulabo_block_printing.jpg.asset.json";
import gJuttiStall from "@/assets/indian-wear/gulabo_jutti_stall.jpg.asset.json";
import gBazaar from "@/assets/indian-wear/gulabo_bazaar_night.jpg.asset.json";
import gTextiles from "@/assets/indian-wear/gulabo_jaisalmer_textiles.jpg.asset.json";
import gRoses from "@/assets/indian-wear/gulabo_rose_garden.jpg.asset.json";
import gFabric from "@/assets/indian-wear/gulabo_block_print_fabric.jpg.asset.json";
import gLane from "@/assets/indian-wear/gulabo_old_lane.jpg.asset.json";
import gJuttis from "@/assets/indian-wear/gulabo_embroidered_juttis.jpg.asset.json";
import nArches from "@/assets/indian-wear/nawab_jaipur_arches.jpg.asset.json";
import nNehru from "@/assets/indian-wear/nawab_nehru_jacket.jpg.asset.json";
import nBandhgala from "@/assets/indian-wear/nawab_bandhgala.jpg.asset.json";
import nKurta from "@/assets/indian-wear/nawab_white_kurta.jpg.asset.json";
import nGroom from "@/assets/indian-wear/nawab_groom.jpg.asset.json";
import nElder from "@/assets/indian-wear/nawab_village_elder.jpg.asset.json";
import nArch from "@/assets/indian-wear/nawab_palace_arch.jpg.asset.json";
import nHaveli from "@/assets/indian-wear/nawab_haveli_facade.jpg.asset.json";
import nDoor from "@/assets/indian-wear/nawab_painted_door.jpg.asset.json";
import nCourtyard from "@/assets/indian-wear/nawab_courtyard.jpg.asset.json";
import nRide from "@/assets/indian-wear/nawab_vintage_ride.jpg.asset.json";
import nJharokha from "@/assets/indian-wear/nawab_jharokha.jpg.asset.json";
import nSafa from "@/assets/indian-wear/nawab_safa.jpg.asset.json";

type Shot = { src: string; alt: string; caption: string; pos?: string };
type Tile = Shot & { title: string; note: string; tab: string };

const worlds = {
  her: {
    name: "GULABO",
    eyebrow: "THE INDIAN WEAR EDIT · HER",
    tagline: "A little desi. A lot of drama.",
    intro: "For the love of beautiful Indian silhouettes, delicate details and outfits that deserve a second look.",
    categories: "KURTAS · SUITS · SAREES · LEHENGAS · CO-ORDS",
    signoff: "summer, somewhere in old Jaipur —",
    hero: { src: gGreenDupatta.url, alt: "A young woman in an emerald dupatta draped over her head, photographed in soft daylight inside an old village house", caption: "Emerald dupatta, afternoon light", pos: "50% 30%" },
    side: [
      { src: gGarland.url, alt: "Fresh jasmine and marigold garlands being prepared at an Indian flower market", caption: "jasmine in the morning", pos: "50% 40%" },
      { src: gLane.url, alt: "A lived-in old Jaipur lane with carved balconies and warm afternoon light", caption: "old-city afternoons", pos: "50% 55%" },
    ] as Shot[],
    postcard: { src: gJuttiStall.url, alt: "Gold and red embroidered juttis hanging at a market stall", caption: "juttis, Dilli Haat" },
    note: "wear the jhumkas. always.",
    storyTitle: "Notes from the old city",
    storyIntro: "Block-printed mornings, flower markets and bazaars that never quite sleep — the India that dresses us.",
    story: [
      { src: gBlockPrinting.url, alt: "A woman hand block printing fabric on a long table in Bagru village near Jaipur", caption: "Bagru · hand block printing", pos: "40% 50%" },
      { src: gGarland.url, alt: "A vendor stringing fresh flower garlands at a colourful market stall", caption: "Morning garlands", pos: "30% 50%" },
      { src: gTextiles.url, alt: "Embroidered textiles and quilts hung along a carved sandstone facade in Jaisalmer", caption: "Jaisalmer · textiles in the sun", pos: "50% 50%" },
      { src: gBazaar.url, alt: "Shoppers in a busy, lantern-lit clothing bazaar at night", caption: "Bazaar after dark", pos: "50% 45%" },
    ] as Shot[],
    tiles: [
      { title: "Everyday Desi", note: "Kurtas & suits for chai runs and long lunches", tab: "Kurtas & Suits", src: "https://shopcanvas.in/cdn/shop/files/26_e698aec3-f858-47da-b799-ef81d583c13b.jpg?v=1710216582", alt: "Minimal ivory cotton kurta set styled in soft natural light", caption: "", pos: "50% 25%" },
      { title: "Festive Finds", note: "Shararas, sparkle and a reason to dress up", tab: "Sharara Sets", src: "https://www.elahe.in/cdn/shop/files/IMG_3188_1_2048x.jpg?v=1705409812", alt: "Rich pink and red embroidered sharara set with intricate gold detailing", caption: "", pos: "50% 50%" },
      { title: "Wedding Guest", note: "Lehengas that deserve the dance floor", tab: "Lehengas", src: "https://shopkynah.com/cdn/shop/files/MM260.jpg?v=1748930838&width=2400", alt: "Olive and gold embroidered lehenga styled for a wedding celebration", caption: "", pos: "50% 20%" },
      { title: "The Saree Story", note: "Six yards of handloom, block print and memory", tab: "Sarees", src: "https://imgmedia.lbb.in/media/2019/05/5ce526d67c6b977cc01de7ef_1558521558386.jpg", alt: "Deep green traditional handloom saree with a red and gold border", caption: "", pos: "50% 50%" },
      { title: "Co-ord Club", note: "Matching sets for old-city wandering", tab: "Ethnic Co-ords", src: "https://www.elahe.in/cdn/shop/files/48_feaa3dcf-bd8f-4bdf-bcfa-44fa35d4d264_2048x.jpg?v=1754114075", alt: "Contemporary indigo Indian co-ord set with delicate embroidery", caption: "", pos: "50% 60%" },
    ] as Tile[],
  },
  him: {
    name: "NAWAB",
    eyebrow: "THE INDIAN WEAR EDIT · HIM",
    tagline: "Tradition, with a little attitude.",
    intro: "For timeless Indian dressing, effortless elegance and contemporary royal silhouettes.",
    categories: "KURTAS · SHERWANIS · BANDHGALAS · JACKETS · SETS",
    signoff: "old streets, new stories —",
    hero: { src: nArches.url, alt: "A man in a white kurta and red safa standing beneath carved terracotta arches in Jaipur", caption: "Courtyard whites, City Palace", pos: "50% 60%" },
    side: [
      { src: nNehru.url, alt: "A bearded man in glasses wearing a grey Nehru jacket over a kurta outdoors", caption: "the Nehru, done easy", pos: "50% 30%" },
      { src: nDoor.url, alt: "A painted wooden doorway with floral frescoes in a Shekhawati haveli", caption: "Shekhawati doorways", pos: "50% 50%" },
    ] as Shot[],
    postcard: { src: nRide.url, alt: "A vintage motorcycle displayed in a heritage garage beside an old petrol sign", caption: "vintage rides, Dungarpur" },
    note: "roll the sleeves. keep the attitude.",
    storyTitle: "Of courtyards & craftsmen",
    storyIntro: "Carved sandstone, quiet courtyards and the men who wear tradition like it was never out of style.",
    story: [
      { src: nHaveli.url, alt: "The intricately carved sandstone facade of Patwon ki Haveli in Jaisalmer", caption: "Patwon ki Haveli · Jaisalmer", pos: "50% 40%" },
      { src: nCourtyard.url, alt: "A quiet haveli courtyard with potted plants seen from above", caption: "Samode Haveli courtyard", pos: "50% 50%" },
      { src: nJharokha.url, alt: "Delicately carved stone jharokha windows at Jaisalmer Fort", caption: "Jharokhas, Jaisalmer Fort", pos: "50% 50%" },
      { src: nSafa.url, alt: "A bright tied Jodhpuri safa turban displayed in a white alcove", caption: "The Jodhpuri safa", pos: "50% 50%" },
    ] as Shot[],
    tiles: [
      { title: "Everyday Nawabi", note: "Easy cotton kurtas with a little swagger", tab: "Kurtas", src: "https://www.chilinen.com/cdn/shop/files/DAJ_7412.jpg?v=1755481686&width=800", alt: "Model in a softly tailored ivory linen kurta and pajama set in a sunlit heritage veranda", caption: "", pos: "50% 50%" },
      { title: "Wedding Season", note: "Sherwanis for the baraat and beyond", tab: "Sherwanis", src: "https://kundansbridalcouture.com/cdn/shop/files/RawSilkSherwaniforMen.jpg?v=1776281888&width=1200", alt: "Groom in an ivory embroidered raw silk sherwani beneath ornate palace arches and chandeliers", caption: "", pos: "50% 50%" },
      { title: "The Royal Edit", note: "Bandhgalas cut for quiet power", tab: "Bandhgalas", src: "https://taruntahiliani.com/cdn/shop/files/TTSEPT-684.jpg?v=1757161300&width=1200", alt: "Model in an emerald-green velvet embroidered bandhgala with refined traditional detailing", caption: "", pos: "50% 50%" },
      { title: "Kurtas & Layers", note: "Jackets, waistcoats and easy layering", tab: "Nehru Jackets", src: "https://www.smritiapparels.com/cdn/shop/files/SMW279-a_800x.jpg?v=1739381760", alt: "Model wearing an ivory embroidered Nehru jacket layered over a kurta in a deep teal archway", caption: "", pos: "50% 50%" },
      { title: "Village Classics", note: "Dhoti pants and relaxed heritage sets", tab: "Dhoti Pants", src: "https://i.pinimg.com/originals/ce/f3/54/cef354bb47b4932390ff6b18107e026b.jpg", alt: "Young man in a crisp white kurta and dhoti beside a quiet lake with soft greenery", caption: "", pos: "50% 50%" },
    ] as Tile[],
  },
};

function Photo({ shot, className = "", eager = false, sizes }: { shot: Shot; className?: string; eager?: boolean; sizes?: string }) {
  return <img src={shot.src} alt={shot.alt} loading={eager ? "eager" : "lazy"} decoding="async" sizes={sizes} style={{ objectPosition: shot.pos ?? "50% 50%" }} className={`h-full w-full object-cover ${className}`} />;
}

export function IndianWearEdit({ isHim, onPickCategory }: { isHim: boolean; onPickCategory: (tab: string) => void }) {
  const w = isHim ? worlds.him : worlds.her;
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  return <div className="space-y-10 sm:space-y-14">
    {/* HERO */}
    <section aria-label={isHim ? "Nawab — The Indian Wear Edit for Him" : "Gulabo — The Indian Wear Edit for Her"} className={isHim ? "relative isolate aspect-[2.33/1] w-full min-h-0 overflow-hidden rounded-[1.5rem] border border-[#8f6848]/25 bg-[#4a2b1d] shadow-soft" : "relative isolate w-full min-h-0 overflow-hidden"}>
      <img
        src={isHim ? "https://raw.githubusercontent.com/manya018/offfeed018/main/src/assets/indian-wear/The%20Nawab%20Edit_%20Tradition%20With%20Attitude%20(1).png" : gulaboBanner}
        alt={isHim ? "Nawab — Tradition, with a little attitude, OffFeed's Indian wear edit for him" : "Gulabo — An Indian Heritage Journal, OffFeed's Indian wear edit for her"}
        className={isHim ? "absolute inset-0 h-full w-full object-cover" : "block h-auto w-full rounded-[1.5rem] object-contain"}
        fetchPriority="high"
        decoding="async"
      />
    </section>

    {/* STORY STRIP — retained for NAWAB only */}
    {isHim && (
    <section aria-labelledby="iw-story" className="iw-texture rounded-[1.4rem] border border-iw-line bg-iw-paper px-4 py-7 text-iw-ink sm:px-7 sm:py-8" style={!isHim ? { backgroundImage: "linear-gradient(135deg, #f5ecdc 0%, #eadbc3 100%)" } : undefined}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-[11px] font-semibold tracking-[.22em] text-iw-muted">THE WORLD OF {w.name}</p><h2 id="iw-story" className="mt-2 font-display text-4xl sm:text-5xl">{w.storyTitle}</h2></div>
        <p className="max-w-sm text-sm leading-6 text-iw-muted">{w.storyIntro}</p>
      </div>
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
        {w.story.map((shot, i) => <figure key={shot.src} className="w-[72%] shrink-0 snap-start sm:w-auto">
          <div className={`overflow-hidden rounded-[1rem] ${i % 2 ? "aspect-[4/5] lg:mt-10" : "aspect-[3/4]"}`}><Photo shot={shot} className="transition duration-700 hover:scale-[1.03]" sizes="(min-width: 1024px) 25vw, 70vw" /></div>
          <figcaption className="mt-2 flex items-baseline gap-2 text-sm"><span className="font-display text-lg italic text-iw-accent">No. 0{i + 1}</span><span className="text-iw-muted">{shot.caption}</span></figcaption>
        </figure>)}
      </div>
    </section>
    )}

    {/* COLLECTIONS */}
    <section id="indian-wear-collections" aria-labelledby="iw-collections" className="scroll-mt-24 text-iw-ink">
      <div className="mb-6"><p className="text-[11px] font-semibold tracking-[.22em] text-iw-muted">CURATED COLLECTIONS</p><h2 id="iw-collections" className="mt-2 font-display text-4xl sm:text-5xl">Pick a mood, <em className="text-iw-accent">find the fit.</em></h2></div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {w.tiles.map((tile, i) => <button key={tile.title} type="button" onClick={() => { onPickCategory(tile.tab); scrollTo("indian-wear-shop"); }} className={`group relative overflow-hidden rounded-[1.1rem] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iw-accent ${i === 0 ? "col-span-2 aspect-[4/3] lg:col-span-1 lg:aspect-[3/4]" : "aspect-[3/4]"}`} aria-label={`${tile.title}: shop ${tile.tab}`}>
          <Photo shot={tile} className="transition duration-700 group-hover:scale-[1.04]" sizes="(min-width: 1024px) 20vw, 50vw" />
          <span className="absolute inset-0 bg-gradient-to-t from-iw-ink/85 via-iw-ink/20 to-transparent" />
          <span className="absolute inset-x-0 bottom-0 p-4 text-iw-paper">
            <span className="block font-display text-2xl leading-tight sm:text-[1.7rem]">{tile.title}</span>
            <span className="mt-1 block text-xs leading-5 opacity-90">{tile.note}</span>
            <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold tracking-[.14em]">SHOP {tile.tab.toUpperCase()} <ArrowUpRight className="size-3.5" /></span>
          </span>
        </button>)}
      </div>
    </section>
  </div>;
}
