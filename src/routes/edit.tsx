import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Sparkles } from "lucide-react";
import { PublicProductCard } from "@/components/public-product-card";
import { getShopTheLookProducts, type ProductWithBrand } from "@/lib/public-brand.functions";
import { useStyleSpace } from "@/lib/style-space";

type EditAudience = "her" | "him" | "home";
type EditTab = "curated" | "spotlight";

function getWeekKey(date: Date) {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utc.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${utc.getUTCFullYear()}-${String(week).padStart(2, "0")}`;
}

function getWeeklySelection(products: ProductWithBrand[], weekKey: string) {
  // Keep the strongest-ranked product from each brand, then rotate the brand
  // selection weekly so the edit stays fresh without repeating a brand.
  const byBrand = new Map<string, ProductWithBrand>();
  for (const product of products) {
    if (!byBrand.has(product.brand.handle)) byBrand.set(product.brand.handle, product);
  }
  const candidates = [...byBrand.values()];
  if (!candidates.length) return [];
  const [, weekText] = weekKey.split("-");
  const offset = ((Number(weekText) || 1) - 1) % candidates.length;
  const rotated = [...candidates.slice(offset), ...candidates.slice(0, offset)];
  return rotated.slice(0, 7);
}

export const Route = createFileRoute("/edit")({
  validateSearch: (search: Record<string, unknown>) => typeof search.collection === "string" ? { collection: search.collection } : {},
  head: () => ({ meta: [
    { title: "The OFFFEED EDIT — Seven finds, every week" },
    { name: "description", content: "Seven standout finds from independent brands, refreshed every week across HER, HIM and LIVING." },
  ] }),
  component: OfffeedEditPage,
});

function OfffeedEditPage() {
  const { space } = useStyleSpace();
  const audience: EditAudience = space === "him" ? "him" : space === "home" ? "home" : "her";
  const isHome = audience === "home";
  const isHim = audience === "him";
  const [activeTab, setActiveTab] = useState<EditTab>("curated");
  const [products, setProducts] = useState<ProductWithBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const weekKey = getWeekKey(new Date());

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(false);
    const aesthetic = isHome ? "home living decor tableware bedding candles" : isHim ? "menswear clothing style" : "womenswear clothing style";
    getShopTheLookProducts({ data: { audience, aesthetic, resultLimit: 60 } })
      .then((items) => { if (alive) setProducts(items); })
      .catch(() => { if (alive) { setProducts([]); setError(true); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [audience, isHome, isHim]);

  const weeklyProducts = useMemo(() => getWeeklySelection(products, weekKey), [products, weekKey]);
  const audienceLabel = isHome ? "LIVING" : isHim ? "HIM" : "HER";
  const intro = isHome
    ? "Thoughtful pieces for the spaces, rituals and little moments that make a home yours."
    : isHim
      ? "Independent labels and standout pieces worth knowing, chosen for this week's edit."
      : "Independent labels and standout pieces worth knowing, chosen for this week's edit.";

  return (
    <main className="min-h-[70vh] bg-[#fbf8f4] pb-24 text-[#493a33]">
      <div className="mx-auto max-w-[1440px] px-5 py-10 lg:px-10 lg:py-14">
        <section className="relative overflow-hidden rounded-[1.6rem] border border-[#eadbd2] bg-[linear-gradient(110deg,#f2e3df_0%,#fbf6ef_54%,#e9eee5_100%)] px-6 py-12 sm:px-12 sm:py-16">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/65 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.2em] text-[#9a7770]">
              <Sparkles className="size-3.5" /> The OFFFEED EDIT · {audienceLabel}
            </div>
            <h1 className="mt-6 font-display text-5xl leading-[.98] tracking-[-.045em] sm:text-7xl">
              The OFFFEED <em className="font-normal text-[#b77e83]">{isHome ? "LIVING EDIT." : isHim ? "HIM EDIT." : "HER EDIT."}</em>
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-[#78645a] sm:text-base">{intro}</p>
            <div className="mt-7 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[.18em] text-[#9a7770]">
              <CalendarDays className="size-4" /> Week {weekKey.split("-")[1]}, {weekKey.split("-")[0]} · 7 finds, refreshed weekly
            </div>
          </div>
        </section>

        <div className="mt-8 grid grid-cols-2 gap-2 rounded-2xl border border-[#eadbd2] bg-white/70 p-2 sm:mt-10">
          <button
            type="button"
            onClick={() => setActiveTab("curated")}
            aria-pressed={activeTab === "curated"}
            className={`rounded-xl px-4 py-4 text-left transition-colors sm:px-6 ${activeTab === "curated" ? "bg-[#493a33] text-white shadow-sm" : "text-[#6f5b52] hover:bg-[#f5eee8]"}`}
          >
            <span className="block font-display text-xl sm:text-2xl">The Curated Edit</span>
            <span className={`mt-1 block text-[10px] uppercase tracking-[.14em] ${activeTab === "curated" ? "text-white/75" : "text-[#9a7770]"}`}>Seven finds, refreshed weekly</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("spotlight")}
            aria-pressed={activeTab === "spotlight"}
            className={`rounded-xl px-4 py-4 text-left transition-colors sm:px-6 ${activeTab === "spotlight" ? "bg-[#493a33] text-white shadow-sm" : "text-[#6f5b52] hover:bg-[#f5eee8]"}`}
          >
            <span className="block font-display text-xl sm:text-2xl">The Spotlight Edit</span>
            <span className={`mt-1 block text-[10px] uppercase tracking-[.14em] ${activeTab === "spotlight" ? "text-white/75" : "text-[#9a7770]"}`}>Discover brands in focus</span>
          </button>
        </div>

        {activeTab === "spotlight" ? (
          <section className="mt-8 overflow-hidden rounded-[1.6rem] border border-[#eadbd2] bg-[linear-gradient(115deg,#eee4dc_0%,#f8f2eb_52%,#e7e9df_100%)] px-6 py-12 text-center sm:mt-10 sm:px-12 sm:py-16">
            <p className="text-[10px] font-semibold uppercase tracking-[.23em] text-[#9a7770]">A closer look</p>
            <h2 className="mx-auto mt-3 max-w-2xl font-display text-3xl leading-tight sm:text-5xl">Meet the brands making their mark.</h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[#78645a] sm:text-base">
              Explore a brand through a considered selection of different pieces from its collection, brought together in one feature.
            </p>
            <div className="mx-auto mt-8 max-w-xl rounded-xl border border-white/80 bg-white/55 px-5 py-5">
              <p className="font-display text-xl text-[#493a33]">New brand features are on the way.</p>
              <p className="mt-2 text-xs leading-6 text-[#87756c]">We're preparing the first Spotlight features for {audienceLabel}. Check back soon to discover the collections we bring into focus.</p>
            </div>
          </section>
        ) : (
        <section className="mt-12 sm:mt-16">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[.23em] text-[#a17e75]">The weekly selection</p>
              <h2 className="mt-2 font-display text-3xl sm:text-4xl">{activeTab === "curated" ? "Seven finds. Seven independent brands." : "Discover the brands in focus."}</h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-[#87756c]">{activeTab === "curated" ? "A fresh shortlist of standout products from across OFFFEED." : "Explore collections and standout pieces from brands featured by OFFFEED."}</p>
          </div>

          {loading ? (
            <p className="py-16 text-center text-sm text-[#87756c]">Finding this week's seven…</p>
          ) : error ? (
            <p className="rounded-xl border border-dashed border-[#dfd1c7] bg-white/60 px-5 py-12 text-center text-sm text-[#87756c]">This week's edit couldn't load right now. Please try again.</p>
          ) : weeklyProducts.length ? (
            <>
              <div className="grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 lg:grid-cols-4">
                {weeklyProducts.map((product, index) => (
                  <div key={product.id} className="relative">
                    <span className="absolute left-2 top-2 z-10 rounded-full border border-white/80 bg-white/90 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[.16em] text-[#765b52] shadow-sm">0{index + 1} · This week's find</span>
                    <PublicProductCard product={product} />
                  </div>
                ))}
              </div>
              {weeklyProducts.length < 7 && (
                <p className="mt-6 text-center text-xs text-[#87756c]">We're featuring {weeklyProducts.length} brands this week. More independent brands will appear here as their approved products go live.</p>
              )}
            </>
          ) : (
            <p className="rounded-xl border border-dashed border-[#dfd1c7] bg-white/60 px-5 py-12 text-center text-sm text-[#87756c]">The weekly edit is being curated. Standout products from approved independent brands will appear here as they are published.</p>
          )}
        </section>
        )}
      </div>
    </main>
  );
}
