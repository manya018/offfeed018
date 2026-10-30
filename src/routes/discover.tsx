import { createFileRoute } from "@tanstack/react-router";
import { Search, Sparkles, Heart, Share2, ShoppingBag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PublicProductCard } from "@/components/public-product-card";
import { getShopTheLookProducts, type ProductWithBrand } from "@/lib/public-brand.functions";
import { Button } from "@/components/ui/button";
import { LookCard } from "@/components/look-card";
import { himLooks, himMoodImages, himMoods, looks, moodImages, moods } from "@/lib/offfeed-data";
import { useStyleSpace } from "@/lib/style-space";
import { readLikedLookIds, setWishlistItem, rememberReferenceInspiration, toggleSavedReferenceInspiration, readSavedReferenceInspirationIds } from "@/lib/look-collections";
import { toast } from "sonner";

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
  const [productBrand, setProductBrand] = useState("All brands");
  const [productColor, setProductColor] = useState("All colours");
  const [productSize, setProductSize] = useState("All sizes");
  const [productStyle, setProductStyle] = useState("All styles");
  const [productSort, setProductSort] = useState("recommended");
  const [productMinPrice, setProductMinPrice] = useState("");
  const [productMaxPrice, setProductMaxPrice] = useState("");
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryError, setCategoryError] = useState(false);
  const [likedReferenceItems, setLikedReferenceItems] = useState<string[]>([]);
  const [savedReferenceItems, setSavedReferenceItems] = useState<string[]>(() => readSavedReferenceInspirationIds());
  useEffect(() => { setLikedReferenceItems(readLikedLookIds()); }, []);
  const toggleReferenceLike = (id: string) => { const next = !likedReferenceItems.includes(id); setLikedReferenceItems((current) => next ? [...current, id] : current.filter((value) => value !== id)); void setWishlistItem("look", id, next); toast.success(next ? "Added to wishlist" : "Removed from wishlist"); };
  const shareReference = async (item: { title: string; src: string }) => { const url = new URL(`/discover?category=${category ?? "jewellery"}`, window.location.origin).toString(); try { if (navigator.share) await navigator.share({ title: `${item.title} — OFFFEED`, text: `Found this style on OFFFEED`, url }); else { await navigator.clipboard.writeText(url); toast.success("Link copied to share"); } } catch (error) { if (error instanceof Error && error.name === "AbortError") return; try { await navigator.clipboard.writeText(url); toast.success("Link copied to share"); } catch { toast.error("Could not share this item."); } } };
  useEffect(() => { setFilter("All"); setQuery(""); setVisible(6); }, [space]);
  useEffect(() => {
    let active = true;
    const isClothingFeed = category !== "jewellery" && category !== "accessories";
    setCategoryLoading(true);
    setCategoryError(false);
    getShopTheLookProducts({ data: { audience: space, aesthetic: isClothingFeed ? "clothing" : category!, categoryOnly: true } })
      .then((products) => { if (active) setCategoryProducts(isClothingFeed ? products.filter((product) => product.category.toLowerCase().includes("clothing") || product.category.toLowerCase().includes("complete look") || product.category.toLowerCase().includes("mixed look")) : products); })
      .catch(() => { if (active) { setCategoryProducts([]); setCategoryError(true); } })
      .finally(() => { if (active) setCategoryLoading(false); });
    return () => { active = false; };
  }, [category, space]);
  const productFilterOptions = useMemo(() => ({
    brands: [...new Set(categoryProducts.map((product) => product.brand.name))].sort(),
    colors: [...new Set(categoryProducts.flatMap((product) => product.colors))].sort(),
    sizes: [...new Set(categoryProducts.flatMap((product) => product.sizes))].sort(),
    styles: [...new Set(categoryProducts.flatMap((product) => product.tags))].sort(),
  }), [categoryProducts]);
  const filteredCategoryProducts = useMemo(() => {
    const filteredProducts = categoryProducts.filter((product) =>
      (productBrand === "All brands" || product.brand.name === productBrand) &&
      (productColor === "All colours" || product.colors.some((color) => color.toLowerCase() === productColor.toLowerCase())) &&
      (productSize === "All sizes" || product.sizes.some((size) => size.toLowerCase() === productSize.toLowerCase())) &&
      (productStyle === "All styles" || product.tags.some((tag) => tag.toLowerCase() === productStyle.toLowerCase())) &&
      (!productMinPrice || product.price >= Number(productMinPrice)) &&
      (!productMaxPrice || product.price <= Number(productMaxPrice))
    );
    if (productSort === "newest") filteredProducts.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    else if (productSort === "price-low") filteredProducts.sort((a, b) => a.price - b.price);
    else if (productSort === "price-high") filteredProducts.sort((a, b) => b.price - a.price);
    return filteredProducts;
  }, [categoryProducts, productBrand, productColor, productSize, productStyle, productMinPrice, productMaxPrice, productSort]);
  const resetProductFilters = () => { setProductBrand("All brands"); setProductColor("All colours"); setProductSize("All sizes"); setProductStyle("All styles"); setProductMinPrice(""); setProductMaxPrice(""); setProductSort("recommended"); };
  const filtered = useMemo(() => collection.filter((look) => {
    const searchMatch = `${look.title} ${look.aesthetic} ${look.occasion} ${look.season}`.toLowerCase().includes(query.toLowerCase());
    if (!searchMatch) return false;
    if (["All", "Trending", "For You", "New", "Color", "Style", "Price"].includes(filter)) return true;
    return `${look.aesthetic} ${look.occasion} ${look.season}`.toLowerCase().includes(filter.toLowerCase());
  }), [collection, filter, query]);

  if (category === "jewellery" || category === "accessories") {
    const jewellery = category === "jewellery";
    const calmHerJewellery = jewellery && !isHim;
    const calmHerAccessories = !jewellery && !isHim;
    const referenceImages = jewellery
      ? isHim
        ? [
            { src: "/images/jewellery/ChatGPT%20Image%20Oct%2014%2C%202026%2C%2010_02_37%20PM.jpg", title: "Starburst pendant", note: "A sculptural silver pendant on a fine chain" },
            { src: "/images/jewellery/ChatGPT%20Image%20Oct%2014%2C%202026%2C%2010_02_45%20PM.jpg", title: "Black dog-tag pendant", note: "Clean, dark-toned metal with a minimal edge" },
            { src: "/images/jewellery/ChatGPT%20Image%20Oct%2014%2C%202026%2C%2010_02_53%20PM.jpg", title: "Double silver chain bracelet", note: "Layered links with a polished finish" },
            { src: "/images/jewellery/ChatGPT%20Image%20Oct%2014%2C%202026%2C%2010_03_00%20PM.jpg", title: "Initial bar bracelet", note: "A personal detail in a clean silver silhouette" },
            { src: "/images/jewellery/ChatGPT%20Image%20Oct%2014%2C%202026%2C%2010_03_06%20PM.jpg", title: "Black geometric pendant", note: "A bold black-and-silver everyday chain" },
            { src: "/images/jewellery/ChatGPT%20Image%20Oct%2014%2C%202026%2C%2010_03_12%20PM.jpg", title: "Slim gold bracelet", note: "A subtle gold accent for everyday styling" },
            { src: "/images/jewellery/ChatGPT%20Image%20Oct%2014%2C%202026%2C%2010_03_19%20PM.jpg", title: "Silver snake chain", note: "A smooth, understated silver essential" },
            { src: "/images/jewellery/ChatGPT%20Image%20Oct%2014%2C%202026%2C%2010_03_26%20PM.jpg", title: "Gold snake chain", note: "Warm gold with a clean, classic profile" },
            { src: "/images/jewellery/ChatGPT%20Image%20Oct%2014%2C%202026%2C%2010_03_33%20PM.jpg", title: "Geometric gold hoop", note: "A sharp, modern finishing detail" }
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
            { src: "https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=1000&q=85&sat=-8", title: "Softly treasured", note: "Delicate jewellery arranged in a calm, feminine flat lay" },
            { src: "https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=1000&q=85&sat=-8", title: "Everyday heirloom", note: "Understated gold with a vintage feel" },
            { src: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=1000&q=85&sat=-8", title: "Quiet gold", note: "A single sculptural detail in soft light" },
            { src: "https://images.pexels.com/photos/6624862/pexels-photo-6624862.jpeg?auto=compress&cs=tinysrgb&w=1000", title: "Notes from a soft morning", note: "Fine chains, flowers and sunlit linen" },
            { src: "https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=1000&q=85", title: "A bloom and a pearl", note: "Dreamy floral details with a vintage heart" },
          ]
      : isHim
        ? [
            { src: "/images/accessories/ChatGPT%20Image%20Oct%2014%2C%202026%2C%2010_21_51%20PM.jpg", title: "Espresso statement belt", note: "A rich brown belt with a polished silver buckle" },
            { src: "/images/accessories/ChatGPT%20Image%20Oct%2014%2C%202026%2C%2010_22_00%20PM.jpg", title: "After-hours black shades", note: "Sculptural black frames with a clean, confident edge" },
            { src: "/images/accessories/ChatGPT%20Image%20Oct%2014%2C%202026%2C%2010_22_06%20PM.jpg", title: "Minimal black leather belt", note: "A timeless everyday essential with silver hardware" },
            { src: "/images/accessories/ChatGPT%20Image%20Oct%2014%2C%202026%2C%2010_22_12%20PM.jpg", title: "Off-duty square sunglasses", note: "Bold frames styled for an effortless street look" },
            { src: "/images/accessories/ChatGPT%20Image%20Oct%2014%2C%202026%2C%2010_22_18%20PM.jpg", title: "Vintage-inspired sunglasses", note: "A relaxed denim look finished with slim dark lenses" },
            { src: "/images/accessories/ChatGPT%20Image%20Oct%2014%2C%202026%2C%2010_22_23%20PM.jpg", title: "Everyday black frames", note: "A sharp, understated accessory for daily outfits" },
            { src: "/images/accessories/ChatGPT%20Image%20Oct%2014%2C%202026%2C%2010_22_29%20PM.jpg", title: "Classic bold sunglasses", note: "Dark rectangular frames with a strong silhouette" },
            { src: "/images/accessories/ChatGPT%20Image%20Oct%2014%2C%202026%2C%2010_22_36%20PM.jpg", title: "Black crossbody bag", note: "Compact and practical with a minimal city-ready shape" },
            { src: "/images/accessories/ChatGPT%20Image%20Oct%2014%2C%202026%2C%2010_22_42%20PM.jpg", title: "Utility sling bag", note: "A hands-free essential with understated streetwear appeal" },
            { src: "/images/accessories/ChatGPT%20Image%20Oct%2014%2C%202026%2C%2010_22_47%20PM.jpg", title: "Monochrome backpack", note: "A clean black-and-white backpack for everyday carry" },
          ]
        : [
            { src: "https://i.etsystatic.com/63821927/r/il/b5ae44/7610152187/il_1588xN.7610152187_ilps.jpg", title: "Cherry, softly", note: "A deep burgundy handbag against champagne satin" },
            { src: "https://cdn.shopify.com/s/files/1/0264/0793/files/Pandora-Bag-B1_1280x.progressive.jpg?v=1519732356", title: "The little burgundy bag", note: "A sculptural top handle against a soft blush backdrop" },
            { src: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1000&q=85", title: "A timeless favourite", note: "A polished handbag in warm, understated tones" },
            { src: "https://lenskandy.com/cdn/shop/files/Bold_Brown_Designer_Square_Sunglasses_For_Women_LKS9131-BRN-4.webp?v=1776932368&width=1200", title: "Tortoiseshell mornings", note: "Warm brown frames styled with soft pink and tiny florals" },
            { src: "https://ellosunglasses.com/cdn/shop/articles/editorial-flatlay-sunglasses-thin-face-female-fashion_c1f2e297-eeb9-405e-926d-c733d3b5e685.jpg?v=1760982934", title: "The golden-hour edit", note: "Brown sunglasses, delicate gold jewellery and a little lipstick" },
            { src: "https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=1000&q=85", title: "Off-duty elegance", note: "Classic frames in a muted, editorial palette" },
            { src: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1000&q=85", title: "Softly structured", note: "A timeless handbag in a warm, understated palette" },
            { src: "https://caitlynminimalist.com/cdn/shop/files/ANTIQUELOW-5316.jpg?v=1778434769&width=1024", title: "Collected treasures", note: "A vintage-inspired gold timepiece beside an iridescent shell" },
            { src: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=1000&q=85", title: "Soft gold details", note: "A delicate gold-tone women’s watch with a refined, everyday silhouette" },
          ]
    return <main className="mx-auto min-h-[70vh] max-w-[1440px] px-5 pb-24 pt-12 lg:px-10 lg:pt-16">
      <section className={(calmHerJewellery || calmHerAccessories) ? "mx-auto max-w-3xl pb-2 pt-2 text-center" : "mx-auto max-w-3xl text-center"}>
        {!calmHerJewellery && !calmHerAccessories && <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Independent brands · OFFFEED</p>}
        <h1 className={(calmHerJewellery || calmHerAccessories) ? "mt-2 font-display text-5xl font-medium tracking-[-0.045em] text-stone-800 sm:text-7xl" : "mt-4 font-display text-5xl font-medium sm:text-7xl"}>{calmHerJewellery ? <><em className="font-normal text-[#c58d98]">Her</em> Jewellery</> : calmHerAccessories ? <><em className="font-normal text-[#c58d98]">Her</em> Accessories</> : <>{jewellery ? "Jewellery" : "Accessories"} <em className="font-normal text-primary">edit.</em></>}</h1>
        <p className={(calmHerJewellery || calmHerAccessories) ? "mx-auto mt-4 max-w-lg text-[15px] leading-7 text-stone-500" : "mx-auto mt-5 max-w-xl leading-7 text-muted-foreground"}>{calmHerJewellery ? "Delicate details, everyday pieces and little treasures from independent brands." : calmHerAccessories ? "Bags, sunglasses and watches — little details, softly collected." : jewellery ? "Discover independent jewellery labels, delicate everyday pieces and statement finds." : "Find bags, sunglasses, belts and finishing touches from independent brands."}</p>
      </section>
      <section className={(calmHerJewellery || calmHerAccessories) ? "mt-10 sm:mt-14" : "mt-12"}>
        {!calmHerJewellery && !calmHerAccessories && <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{jewellery ? "A tiny jewellery daydream" : "The accessories edit"} · {isHim ? "Him" : "Her"}</p><h2 className="mt-2 font-display text-3xl sm:text-4xl">{isHim ? "The details make the mood." : jewellery ? <>Little treasures, <em className="font-normal text-primary">softly found.</em></> : <>The finishing touches, <em className="font-normal text-primary">considered.</em></>}</h2></div>
          <p className="max-w-sm text-sm leading-6 text-muted-foreground">{isHim ? "Considered details, collected inspiration." : jewellery ? "Pearls, warm gold, shell dishes and the kind of pieces you save just because they make you feel something." : "Structured bags, timeless sunglasses and gold-tone watches in warm, understated shades."}</p>
        </div>}
        {(calmHerJewellery || calmHerAccessories) ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 lg:gap-6">
          {referenceImages.map((item, index) => {
            const referenceId = `reference-${category}-${item.title}`;
            const inspiration = { id: referenceId, title: item.title, note: item.note, image: item.src, category: category ?? "accessories" };
            const isLiked = likedReferenceItems.includes(referenceId);
            const isSaved = savedReferenceItems.includes(referenceId);
            return <article key={item.title} className="group relative overflow-hidden rounded-[1rem] bg-[#f5f0eb]">
              <button type="button" className="block w-full cursor-zoom-in text-left" aria-label={`View ${item.title}`} onClick={() => { rememberReferenceInspiration(inspiration); window.open(item.src, "_blank", "noopener,noreferrer"); }}>
                <img src={item.src} alt={item.title} loading="lazy" className={`block w-full object-cover transition-transform duration-500 group-hover:scale-[1.025] ${index % 5 === 1 ? "aspect-[4/5]" : index % 5 === 3 ? "aspect-[3/4]" : "aspect-[4/5]"}`} />
              </button>
              <div className="absolute right-2 top-2 flex gap-1 rounded-full border border-white/40 bg-white/90 p-1 shadow-sm backdrop-blur-md">
                <Button type="button" variant="ghost" size="icon" aria-label={isLiked ? "Remove from wishlist" : "Add to wishlist"} onClick={() => { rememberReferenceInspiration(inspiration); toggleReferenceLike(referenceId); }}><Heart className={`size-4 ${isLiked ? "fill-current text-primary" : ""}`} /></Button>
                <Button type="button" variant="ghost" size="icon" aria-label={isSaved ? "Remove saved inspiration" : "Save inspiration"} onClick={() => { const saved = toggleSavedReferenceInspiration(inspiration); setSavedReferenceItems((current) => saved ? [...current.filter((id) => id !== referenceId), referenceId] : current.filter((id) => id !== referenceId)); toast.success(saved ? "Saved for later" : "Removed from saved items"); }}><ShoppingBag className={`size-4 ${isSaved ? "text-primary" : ""}`} /></Button>
                <Button type="button" variant="ghost" size="icon" aria-label={`Share ${item.title}`} onClick={() => { rememberReferenceInspiration(inspiration); void shareReference(item); }}><Share2 className="size-4" /></Button>
              </div>
              <div className="px-3 pb-3 pt-2"><h3 className="text-sm font-medium">{item.title}</h3><p className="mt-1 text-xs text-stone-500">{item.note}</p></div>
            </article>;
          })}
        </div> : <div className="columns-1 gap-5 sm:columns-2 lg:columns-3">
          {referenceImages.map((item, index) => <article key={item.title} className="group mb-5 break-inside-avoid overflow-hidden rounded-[1.35rem] border border-border/50 bg-card/80 shadow-soft">
            <div className="relative overflow-hidden bg-secondary/30"><img src={item.src} alt={item.title} loading="lazy" className={`w-full object-cover transition-transform duration-700 group-hover:scale-[1.035] ${index % 4 === 1 ? "aspect-[4/5]" : index % 4 === 2 ? "aspect-[3/4]" : index % 4 === 3 ? "aspect-[5/6]" : "aspect-[4/5]"}`} /><div className="absolute right-3 top-3 flex gap-1 rounded-full border border-white/40 bg-white/85 p-1 shadow-sm backdrop-blur-md"><Button variant="ghost" size="icon" aria-label="Like this look" onClick={(event) => { event.preventDefault(); rememberReferenceInspiration({ id: `reference-${category}-${item.title}`, title: item.title, note: item.note, image: item.src, category: category ?? "accessories" }); toggleReferenceLike(`reference-${category}-${item.title}`); }}><Heart className={`size-4 ${likedReferenceItems.includes(`reference-${category}-${item.title}`) ? "fill-current text-primary" : ""}`} /></Button><Button variant="ghost" size="icon" aria-label="Save inspiration" onClick={(event) => { event.preventDefault(); const id = `reference-${category}-${item.title}`; const saved = toggleSavedReferenceInspiration({ id, title: item.title, note: item.note, image: item.src, category: category ?? "accessories" }); setSavedReferenceItems((current) => saved ? [...current.filter((value) => value !== id), id] : current.filter((value) => value !== id)); toast.success(saved ? "Saved for later" : "Removed from saved items"); }}><ShoppingBag className={`size-4 ${savedReferenceItems.includes(`reference-${category}-${item.title}`) ? "text-primary" : ""}`} /></Button><Button variant="ghost" size="icon" aria-label="Share this look" onClick={(event) => { event.preventDefault(); rememberReferenceInspiration({ id: `reference-${category}-${item.title}`, title: item.title, note: item.note, image: item.src, category: category ?? "accessories" }); void shareReference(item); }}><Share2 className="size-4" /></Button></div></div>
            <div className="px-4 pb-4 pt-3"><h3 className="font-display text-xl">{item.title}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{item.note}</p></div>
          </article>)}
        </div>}
      </section>
<section className="mt-16">
        <div className="mb-6"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Shop independent labels</p><h2 className="mt-2 font-display text-3xl sm:text-4xl">Pieces to make it yours.</h2></div>
        {categoryError && <p className="mb-4 text-center text-muted-foreground">We couldn’t load this edit right now. Please try again.</p>}{categoryLoading && <p className="mb-4 text-center text-muted-foreground">Finding pieces for your edit…</p>}{!categoryError && <>
          <div className="mb-6 rounded-2xl border border-border/70 bg-card p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-medium">Refine your results · {filteredCategoryProducts.length} products</p><Button type="button" variant="ghost" size="sm" onClick={resetProductFilters}>Clear filters</Button></div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <div><label htmlFor="shop-brand" className="text-xs text-muted-foreground">Brand</label><select id="shop-brand" value={productBrand} onChange={(e) => setProductBrand(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-2 text-sm"><option>All brands</option>{productFilterOptions.brands.map((item) => <option key={item}>{item}</option>)}</select></div>
              <div><label htmlFor="shop-color" className="text-xs text-muted-foreground">Colour</label><select id="shop-color" value={productColor} onChange={(e) => setProductColor(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-2 text-sm"><option>All colours</option>{productFilterOptions.colors.map((item) => <option key={item}>{item}</option>)}</select></div>
              <div><label htmlFor="shop-size" className="text-xs text-muted-foreground">Size</label><select id="shop-size" value={productSize} onChange={(e) => setProductSize(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-2 text-sm"><option>All sizes</option>{productFilterOptions.sizes.map((item) => <option key={item}>{item}</option>)}</select></div>
              <div><label htmlFor="shop-style" className="text-xs text-muted-foreground">Style / aesthetic</label><select id="shop-style" value={productStyle} onChange={(e) => setProductStyle(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-2 text-sm"><option>All styles</option>{productFilterOptions.styles.map((item) => <option key={item}>{item}</option>)}</select></div>
              <div><label htmlFor="shop-min-price" className="text-xs text-muted-foreground">Minimum price (₹)</label><input id="shop-min-price" type="number" min="0" value={productMinPrice} onChange={(e) => setProductMinPrice(e.target.value)} placeholder="₹0" className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"/></div>
              <div><label htmlFor="shop-max-price" className="text-xs text-muted-foreground">Maximum price (₹)</label><input id="shop-max-price" type="number" min="0" value={productMaxPrice} onChange={(e) => setProductMaxPrice(e.target.value)} placeholder="No limit" className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"/></div>
              <div className="col-span-2 sm:col-span-1"><label htmlFor="shop-sort" className="text-xs text-muted-foreground">Sort by</label><select id="shop-sort" value={productSort} onChange={(e) => setProductSort(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-2 text-sm"><option value="recommended">Recommended</option><option value="newest">New arrivals</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></div>
            </div>
          </div>
          {categoryLoading ? null : filteredCategoryProducts.length ? <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4">{filteredCategoryProducts.map((product) => <PublicProductCard key={product.id} product={product} />)}</div> : <div className="mx-auto max-w-2xl border-y border-dashed border-border/70 py-12 text-center"><h2 className="font-display text-3xl">Good things are on their way.</h2><p className="mt-3 leading-7 text-muted-foreground">{categoryProducts.length ? "No products match these filters. Try changing or clearing them." : "There are no approved, published products in this edit yet. As brands publish matching products, they will appear here."}</p></div>}
        </>}
      </section>
    </main>;
  }

  return <main className="overflow-hidden bg-[#fcfaf7] pb-24 text-[#493a33]">
    <section className="relative mx-auto mt-4 grid max-w-[1500px] overflow-hidden border-y border-[#eee3dc] bg-[linear-gradient(115deg,#f6e9e5_0%,#fbf8f1_52%,#edf0e8_100%)] px-5 py-12 sm:mt-6 sm:rounded-[2rem] sm:border sm:px-9 sm:py-14 lg:grid-cols-[1.02fr_.98fr] lg:gap-8 lg:px-16 lg:py-16">
      <div aria-hidden="true" className="pointer-events-none absolute -right-28 -top-36 size-[28rem] rounded-full border border-white/70"/>
      <div className="relative z-10 flex flex-col justify-center">
        <p className="mb-5 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#94766c] sm:text-xs"><span className="h-px w-8 bg-[#bd8990]"/> The independent style index · OFFFEED</p>
        <h1 className="max-w-3xl font-display text-[3.35rem] font-medium leading-[.96] tracking-[-.055em] text-[#48372f] sm:text-7xl lg:text-[5.4rem]">{isHim ? <>Dress like <em className="font-normal text-[#71836d]">yourself.</em></> : <>Your style, <em className="font-normal text-[#bd8790]">found.</em></>}</h1>
        <p className="mt-6 max-w-lg text-sm leading-7 text-[#78645a] sm:text-base">{isHim ? "A better place to find the labels, looks and details that feel like you — beyond the algorithm." : "Less scrolling past the same things. More discovering the independent labels, unexpected looks and little details that feel like you."}</p>
        <div className="relative mt-8 max-w-xl">
          <Search className="absolute left-5 top-1/2 size-5 -translate-y-1/2 text-[#987e72]"/>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={isHim ? "Search outfits, aesthetics, details…" : "What are you in the mood for?"} className="h-14 w-full rounded-full border border-white/90 bg-white/85 pl-14 pr-5 text-sm text-[#49382f] shadow-[0_14px_40px_-24px_rgba(82,54,45,.38)] outline-none backdrop-blur placeholder:text-[#a18c82] focus:border-[#c9979d]"/>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-full border-[#d8b8b5] bg-[#fffaf7]/80 px-5 text-[#76534f] hover:bg-white" onClick={() => { window.location.href = "/discover?category=jewellery"; }}>Jewellery edit ↗</Button>
          <Button variant="outline" className="rounded-full border-[#c8d2c2] bg-[#f8fbf5]/90 px-5 text-[#536a56] hover:bg-white" onClick={() => { window.location.href = "/discover?category=accessories"; }}>Accessories edit ↗</Button>
        </div>
        <p className="mt-7 text-[10px] font-semibold uppercase tracking-[.22em] text-[#a18479]">Find it before your feed does.</p>
      </div>
      <div className="relative mx-auto mt-10 h-[390px] w-full max-w-[560px] lg:mt-0 lg:h-[510px]">
        <div className="absolute left-[3%] top-[7%] w-[43%] rotate-[-5deg] overflow-hidden rounded-[1.4rem] border-[5px] border-white/80 shadow-[0_24px_55px_-28px_rgba(69,48,39,.45)]"><img src={moodArtwork[0 % moodArtwork.length]} alt={isHim ? "Menswear inspiration" : "Fashion mood inspiration"} className="aspect-[3/4] w-full object-cover"/></div>
        <div className="absolute right-[4%] top-[1%] w-[47%] rotate-[4deg] overflow-hidden rounded-[1.4rem] border-[5px] border-white/80 shadow-[0_24px_55px_-28px_rgba(69,48,39,.4)]"><img src={moodArtwork[1 % moodArtwork.length]} alt={isHim ? "A second menswear mood" : "A second fashion mood"} className="aspect-[3/4] w-full object-cover"/></div>
        <div className="absolute bottom-[0%] left-[31%] z-10 w-[38%] rotate-[1deg] overflow-hidden rounded-[1.3rem] border-[5px] border-white shadow-xl"><img src={moodArtwork[2 % moodArtwork.length]} alt={isHim ? "Everyday style inspiration" : "Everyday outfit inspiration"} className="aspect-[3/4] w-full object-cover"/></div>
        <span className="absolute bottom-[13%] left-[1%] z-20 rounded-full border border-white/80 bg-[#fffaf4]/95 px-4 py-2 text-[11px] font-medium text-[#71594f] shadow-md">{isHim ? "A point of view" : "A little more you"}</span>
        <span className="absolute right-[0%] top-[58%] z-20 rounded-full border border-white/80 bg-[#f3f5ed]/95 px-4 py-2 text-[11px] font-medium text-[#65735e] shadow-md">Independent finds</span>
      </div>
    </section>

    <section className="mx-auto max-w-[1440px] px-5 pt-16 lg:px-10 lg:pt-20">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.24em] text-[#a17e75]">Start somewhere unexpected</p><h2 className="mt-2 font-display text-4xl tracking-tight text-[#493a33] sm:text-5xl">Browse by feeling.</h2></div><p className="max-w-sm text-sm leading-6 text-[#87756c]">A mood, a moment, a new direction. Follow whatever catches your eye.</p></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5">
        {moodList.slice(0, 4).map((mood, index) => <button type="button" key={mood} onClick={() => { setQuery(mood); setFilter("All"); }} className="group relative overflow-hidden rounded-[1.25rem] bg-[#eee5dc] text-left shadow-[0_12px_30px_-22px_rgba(70,48,40,.35)]">
          <img src={moodArtwork[index % moodArtwork.length]} alt={mood} loading="lazy" className="aspect-[4/5] w-full object-cover transition duration-700 group-hover:scale-105"/>
          <span className="absolute inset-0 bg-gradient-to-t from-[#211914]/65 via-transparent to-transparent"/>
          <span className="absolute bottom-4 left-4 right-3 font-display text-xl text-white sm:bottom-5 sm:left-5 sm:text-2xl">{mood}</span>
          <span className="absolute right-3 top-3 grid size-8 place-items-center rounded-full border border-white/60 bg-white/20 text-white backdrop-blur">↗</span>
        </button>)}
      </div>
    </section>

    <section className="mx-auto max-w-[1440px] px-5 pt-16 lg:px-10 lg:pt-20">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.24em] text-[#a17e75]">The discovery shelf</p><h2 className="mt-2 font-display text-4xl tracking-tight text-[#493a33] sm:text-5xl">Pieces worth finding.</h2></div><p className="max-w-sm text-sm leading-6 text-[#87756c]">Explore real listings from independent labels and emerging brands.</p></div>
      <div className="mb-6 flex flex-wrap gap-2 border-b border-[#e9dfd7] pb-5">{filters.map((item) => <Button key={item} size="sm" variant={filter === item ? "default" : "outline"} className={filter === item ? "rounded-full bg-[#ad6970] text-white shadow-sm hover:bg-[#985a62]" : "rounded-full border-[#e8ddd5] bg-white/70 text-[#735e54] hover:bg-[#f4ece6]"} onClick={() => setFilter(item)}>{item}</Button>)}</div>
      {categoryLoading ? <p className="py-12 text-center text-[#8a776e]">Finding pieces for your edit…</p> : categoryError ? <p className="py-12 text-center text-[#8a776e]">We couldn’t load products right now. Please try again.</p> : categoryProducts.length ? <>
        <div className="mb-6 rounded-[1.4rem] border border-[#e9dfd7] bg-white/80 p-4 shadow-[0_12px_35px_-28px_rgba(70,48,40,.35)] sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-medium text-[#5d493f]">Refine your results · {filteredCategoryProducts.length} products</p><Button type="button" variant="ghost" size="sm" onClick={resetProductFilters}>Clear filters</Button></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <div><label htmlFor="clothes-brand" className="text-xs text-[#8a776e]">Brand</label><select id="clothes-brand" value={productBrand} onChange={(e) => setProductBrand(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-[#e8ddd5] bg-[#fffdfa] px-2 text-sm"><option>All brands</option>{productFilterOptions.brands.map((item) => <option key={item}>{item}</option>)}</select></div>
            <div><label htmlFor="clothes-color" className="text-xs text-[#8a776e]">Colour</label><select id="clothes-color" value={productColor} onChange={(e) => setProductColor(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-[#e8ddd5] bg-[#fffdfa] px-2 text-sm"><option>All colours</option>{productFilterOptions.colors.map((item) => <option key={item}>{item}</option>)}</select></div>
            <div><label htmlFor="clothes-size" className="text-xs text-[#8a776e]">Size</label><select id="clothes-size" value={productSize} onChange={(e) => setProductSize(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-[#e8ddd5] bg-[#fffdfa] px-2 text-sm"><option>All sizes</option>{productFilterOptions.sizes.map((item) => <option key={item}>{item}</option>)}</select></div>
            <div><label htmlFor="clothes-style" className="text-xs text-[#8a776e]">Style / aesthetic</label><select id="clothes-style" value={productStyle} onChange={(e) => setProductStyle(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-[#e8ddd5] bg-[#fffdfa] px-2 text-sm"><option>All styles</option>{productFilterOptions.styles.map((item) => <option key={item}>{item}</option>)}</select></div>
            <div><label htmlFor="clothes-min-price" className="text-xs text-[#8a776e]">Minimum price (₹)</label><input id="clothes-min-price" type="number" min="0" value={productMinPrice} onChange={(e) => setProductMinPrice(e.target.value)} placeholder="₹0" className="mt-1 h-10 w-full rounded-lg border border-[#e8ddd5] bg-[#fffdfa] px-3 text-sm"/></div>
            <div><label htmlFor="clothes-max-price" className="text-xs text-[#8a776e]">Maximum price (₹)</label><input id="clothes-max-price" type="number" min="0" value={productMaxPrice} onChange={(e) => setProductMaxPrice(e.target.value)} placeholder="No limit" className="mt-1 h-10 w-full rounded-lg border border-[#e8ddd5] bg-[#fffdfa] px-3 text-sm"/></div>
            <div className="col-span-2 sm:col-span-1"><label htmlFor="clothes-sort" className="text-xs text-[#8a776e]">Sort by</label><select id="clothes-sort" value={productSort} onChange={(e) => setProductSort(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-[#e8ddd5] bg-[#fffdfa] px-2 text-sm"><option value="recommended">Recommended</option><option value="newest">New arrivals</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4">{filteredCategoryProducts.map((product) => <PublicProductCard key={product.id} product={product} />)}</div>
      </> : <div className="rounded-[1.4rem] border border-dashed border-[#dfd1c7] bg-white/60 px-6 py-10 text-center"><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#a17e75]">A space for independent labels</p><h3 className="mt-2 font-display text-3xl text-[#493a33]">Good things are on their way.</h3><p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#87756c]">As independent brands publish their collections, their pieces will appear here. In the meantime, explore the looks and moods below.</p></div>}
    </section>

    <section className="mx-auto mt-20 max-w-[1440px] px-5 lg:px-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.24em] text-[#a17e75]">{isHim ? "The menswear index" : "Saved-worthy inspiration"}</p><h2 className="mt-2 font-display text-4xl text-[#493a33] sm:text-5xl">{isHim ? "A wardrobe with a point of view." : "The fashion feed, reimagined."}</h2></div><span className="text-xs text-[#927e74]">Curated looks · Updated as you explore</span></div>
      {filtered.length ? <div className="columns-1 gap-6 sm:columns-2 lg:columns-3 xl:columns-4">{filtered.slice(0, visible).map((look, index) => <LookCard key={`${look.id}-${index}`} look={look} tall={index % 3 === 1}/>)}</div> : <p className="rounded-2xl border border-dashed border-[#dfd1c7] bg-white/60 py-16 text-center text-[#87756c]">No looks found. Try a different mood.</p>}
      {visible < filtered.length && <div className="mt-9 text-center"><Button variant="outline" size="lg" className="rounded-full border-[#d8b8b5] bg-white px-7 text-[#76534f]" onClick={() => setVisible((count) => count + 4)}>Discover more looks ↓</Button></div>}
    </section>

    <section className="mx-auto mt-20 max-w-[1440px] px-5 lg:px-10">
      <div className="overflow-hidden rounded-[1.7rem] bg-[#eee9df] px-6 py-10 sm:px-10 sm:py-12">
        <p className="text-[10px] font-semibold uppercase tracking-[.24em] text-[#94766c]">{isHim ? "The details that make it yours" : "A little inspiration for later"}</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-5"><h2 className="max-w-xl font-display text-4xl leading-tight text-[#493a33] sm:text-5xl">{isHim ? "Make everyday dressing feel intentional." : "Save the feeling. Find the look."}</h2><p className="max-w-sm text-sm leading-6 text-[#78685e]">A few directions to explore next — choose one and let your feed follow your taste.</p></div>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5">{(isHim ? ["Ivy League layers","A slower coffee run","Quiet streetwear","Modern utility"] : ["Neutral college outfits","Coffee date outfits","Minimal streetwear","Soft feminine looks"]).map((title, i) => <button type="button" onClick={() => { setQuery(title); setFilter("All"); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="group relative overflow-hidden rounded-[1rem] text-left" key={title}><img src={moodArtwork[i % moodArtwork.length]} alt={title} loading="lazy" className="aspect-[4/5] w-full object-cover transition duration-700 group-hover:scale-105"/><span className="absolute inset-0 bg-gradient-to-t from-[#211914]/70 to-transparent"/><span className="absolute bottom-3 left-3 right-3 font-display text-lg text-white sm:bottom-4 sm:left-4 sm:text-xl">{title}</span></button>)}</div>
      </div>
    </section>
  </main>;
}