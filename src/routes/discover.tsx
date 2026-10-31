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

const herClothingCategories = ["Tops", "Dresses", "Skirts", "Jeans & Denim", "Trousers & Pants", "Shorts", "Co-ord Sets", "Jumpsuits", "Shirts", "Jackets & Outerwear", "Knitwear", "Activewear", "Lingerie & Loungewear"];
const himClothingCategories = ["T-shirts & Polos", "Shirts", "Jeans & Denim", "Trousers", "Shorts", "Co-ord Sets", "Jackets & Outerwear", "Sweatshirts & Hoodies", "Activewear"];
const accessoryCategories = ["Bags", "Sunglasses", "Watches", "Belts", "Hair Accessories"];

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
  const [clothingMenuOpen, setClothingMenuOpen] = useState(true);
  const [accessoriesMenuOpen, setAccessoriesMenuOpen] = useState(false);
  const [selectedClothingCategory, setSelectedClothingCategory] = useState("");
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
  useEffect(() => { setFilter("All"); setQuery(""); setVisible(6); setSelectedClothingCategory(""); }, [space]);
  useEffect(() => {
    let active = true;
    const isClothingFeed = category !== "jewellery" && category !== "accessories";
    setCategoryLoading(true);
    setCategoryError(false);
    getShopTheLookProducts({ data: { audience: space, aesthetic: isClothingFeed ? "clothing" : category!, categoryOnly: true } })
      .then((products) => { if (active) { const clothingProducts = products.filter((product) => product.category.toLowerCase().includes("clothing") || product.category.toLowerCase().includes("complete look") || product.category.toLowerCase().includes("mixed look")); setCategoryProducts(category === "indian-wear" ? clothingProducts.filter((product) => /indian|ethnic|desi|kurta|saree|lehenga|sherwani|dhoti|salwar|anarkali|nehru|indo.?western/.test((product.category + " " + product.tags.join(" ")).toLowerCase())) : isClothingFeed ? clothingProducts : products); } })
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
    const filteredProducts = categoryProducts.filter((product) => {
      const categoryText = (product.category + " " + product.tags.join(" ")).toLowerCase();
      const selected = selectedClothingCategory.toLowerCase();
      const categoryMatch = !selectedClothingCategory || (selectedClothingCategory === "Indian Wear" ? /indian|ethnic|desi|kurta|saree|lehenga|sherwani|dhoti|salwar|anarkali|nehru|indo.?western/.test(categoryText) : categoryText.includes(selected)) || (selectedClothingCategory === "Sarees" && /saree/.test(categoryText)) || (selectedClothingCategory === "Lehengas" && /lehenga/.test(categoryText)) || (selectedClothingCategory === "Kurtas & Suits" && /kurta|salwar|anarkali|suit/.test(categoryText)) || (selectedClothingCategory === "Indo-Western" && /indo.?western|fusion/.test(categoryText)) || (selectedClothingCategory === "Dupattas" && /dupatta|stole/.test(categoryText)) || (selectedClothingCategory === "Sherwanis" && /sherwani/.test(categoryText)) || (selectedClothingCategory === "Nehru Jackets" && /nehru|bandhgala/.test(categoryText)) || (selectedClothingCategory === "Bottoms" && /dhoti|trouser|pant|salwar/.test(categoryText)) || (selectedClothingCategory === "Tops" && /top|shirt|blouse|tee|polo/.test(categoryText)) || (selectedClothingCategory === "Jeans & Denim" && /jean|denim/.test(categoryText)) || (selectedClothingCategory === "Trousers & Pants" && /trouser|pant/.test(categoryText)) || (selectedClothingCategory === "Co-ord Sets" && /co.?ord|coord/.test(categoryText)) || (selectedClothingCategory === "Jackets & Outerwear" && /jacket|outerwear|coat/.test(categoryText)) || (selectedClothingCategory === "Lingerie & Loungewear" && /lingerie|lounge|sleepwear/.test(categoryText)) || (selectedClothingCategory === "T-shirts & Polos" && /t.?shirt|tee|polo/.test(categoryText)) || (selectedClothingCategory === "Sweatshirts & Hoodies" && /sweatshirt|hoodie/.test(categoryText));
      return categoryMatch &&
      (productBrand === "All brands" || product.brand.name === productBrand) &&
      (productColor === "All colours" || product.colors.some((color) => color.toLowerCase() === productColor.toLowerCase())) &&
      (productSize === "All sizes" || product.sizes.some((size) => size.toLowerCase() === productSize.toLowerCase())) &&
      (productStyle === "All styles" || product.tags.some((tag) => tag.toLowerCase() === productStyle.toLowerCase())) &&
      (!productMinPrice || product.price >= Number(productMinPrice)) &&
      (!productMaxPrice || product.price <= Number(productMaxPrice));
    });
    if (productSort === "newest") filteredProducts.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    else if (productSort === "price-low") filteredProducts.sort((a, b) => a.price - b.price);
    else if (productSort === "price-high") filteredProducts.sort((a, b) => b.price - a.price);
    return filteredProducts;
  }, [categoryProducts, selectedClothingCategory, productBrand, productColor, productSize, productStyle, productMinPrice, productMaxPrice, productSort]);
  const resetProductFilters = () => { setProductBrand("All brands"); setProductColor("All colours"); setProductSize("All sizes"); setProductStyle("All styles"); setProductMinPrice(""); setProductMaxPrice(""); setProductSort("recommended"); };
  const filtered = useMemo(() => collection.filter((look) => {
    const searchMatch = `${look.title} ${look.aesthetic} ${look.occasion} ${look.season}`.toLowerCase().includes(query.toLowerCase());
    if (!searchMatch) return false;
    if (["All", "Trending", "For You", "New", "Color", "Style", "Price"].includes(filter)) return true;
    return `${look.aesthetic} ${look.occasion} ${look.season}`.toLowerCase().includes(filter.toLowerCase());
  }), [collection, filter, query]);

  if (category === "jewellery" || category === "accessories" || category === "indian-wear") {
    const indianWear = category === "indian-wear";
    const jewellery = category === "jewellery";
    const calmHerJewellery = jewellery && !isHim;
    const calmHerAccessories = !jewellery && !isHim;
    const indianTabs = isHim ? ["All", "Kurtas", "Sherwanis", "Indo-Western", "Nehru Jackets", "Bottoms"] : ["All", "Sarees", "Lehengas", "Kurtas & Suits", "Indo-Western", "Dupattas"];
    const indianMoreTabs = isHim ? ["Bandhgalas", "Dhoti Pants", "Waistcoats"] : ["Anarkalis", "Sharara Sets", "Dupattas", "Ethnic Co-ords"];
    const indianScenes = isHim
      ? [
          { src: "https://images.pexels.com/photos/33565901/pexels-photo-33565901.jpeg?auto=compress&cs=tinysrgb&w=1200", alt: "A man in traditional Rajasthani attire beneath a Jaipur palace facade", note: "People & palaces" },
          { src: "https://images.unsplash.com/photo-1758467745965-00ca240b1224?auto=format&fit=crop&w=1200&q=85", alt: "Traditional palace gatekeepers framed by an ornate Indian arch", note: "Old-world details" },
          { src: "https://images.unsplash.com/photo-1777707461579-8fd436630ebb?auto=format&fit=crop&w=1200&q=85", alt: "Carved sandstone courtyard at Mehrangarh Fort in Jodhpur", note: "Stone & stories" },
        ]
      : [
          { src: "https://images.unsplash.com/photo-1763291966927-740c48e6afe5?auto=format&fit=crop&w=1400&q=85", alt: "A lively Jaipur textile market near Hawa Mahal", note: "Bazaar mornings" },
          { src: "https://images.unsplash.com/photo-1568371600021-36b968768c30?auto=format&fit=crop&w=1200&q=85", alt: "Handcrafted textiles displayed along a Jaisalmer street shop", note: "Textiles & craft" },
          { src: "https://www.goldentriangletoursinindia.com/blog_images/indian-markets.webp", alt: "A colourful Indian market filled with fabrics and local shoppers", note: "Everyday India" },
        ];
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
    return <main className={`mx-auto min-h-[70vh] max-w-[1440px] px-5 pb-24 ${indianWear ? "pt-5 lg:pt-7" : "pt-12 lg:pt-16"} lg:px-10`}>
      {indianWear ? <section className={\`relative isolate mx-auto max-w-[1500px] overflow-hidden rounded-[1.4rem] border shadow-[0_22px_60px_-32px_rgba(35,28,20,.48)] \${isHim ? "border-[#506454] bg-[#20372d] text-[#f2e7d1]" : "border-[#d2b99a] bg-[#eee0ca] text-[#57392e]"}\`}>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[.13]" style={{ backgroundImage: isHim ? "repeating-linear-gradient(135deg, transparent 0 18px, #d2b77f 19px, transparent 20px 38px)" : "radial-gradient(circle at 1px 1px, #8c563f 1px, transparent 1.5px)", backgroundSize: isHim ? "42px 42px" : "17px 17px" }} />
        <div className="relative grid lg:min-h-[470px] lg:grid-cols-[.78fr_1.22fr]">
          <div className="relative z-10 flex flex-col justify-center px-6 py-9 sm:px-10 sm:py-12 lg:px-12 lg:py-14">
            <p className={\`mb-5 text-[10px] font-semibold uppercase tracking-[.24em] sm:text-xs \${isHim ? "text-[#c6ad79]" : "text-[#98634c]"}\`}>OFFFEED · AN INDIAN HERITAGE JOURNAL</p>
            <h1 className={\`font-display text-6xl font-medium leading-[.86] tracking-[-.055em] sm:text-7xl lg:text-[6.6rem] \${isHim ? "text-[#f0e4cb]" : "text-[#783c31]"}\`}>{isHim ? "NAWAB" : "GULABO"}</h1>
            <p className={\`mt-5 text-[10px] font-semibold uppercase tracking-[.19em] sm:text-xs \${isHim ? "text-[#d1bd91]" : "text-[#895744]"}\`}>THE INDIAN WEAR EDIT · {isHim ? "HIM" : "HER"}</p>
            <h2 className={\`mt-7 max-w-md font-display text-3xl leading-tight sm:text-4xl \${isHim ? "text-[#f4ead8]" : "text-[#56372d]"}\`}>{isHim ? "Tradition, with a little attitude." : "A little desi. A lot of drama."}</h2>
            <p className={\`mt-4 max-w-md text-sm leading-7 sm:text-base \${isHim ? "text-[#d8d0bd]" : "text-[#725447]"}\`}>{isHim ? "For timeless Indian dressing, effortless elegance and contemporary royal silhouettes." : "For the love of beautiful Indian silhouettes, delicate details and outfits that deserve a second look."}</p>
            <p className={\`mt-6 border-t pt-4 text-[10px] font-medium uppercase tracking-[.13em] sm:text-xs \${isHim ? "border-[#637566] text-[#d9c9a7]" : "border-[#c9ae91] text-[#70483a]"}\`}>{isHim ? "KURTAS · SHERWANIS · BANDHGALAS · JACKETS · SETS" : "KURTAS · SUITS · SAREES · LEHENGAS · CO-ORDS"}</p>
            <p className={\`mt-5 font-display text-xl italic \${isHim ? "text-[#c7ad79]" : "text-[#9c5a45]"}\`}>{isHim ? "Old streets. New stories." : "A summer somewhere in India."}</p>
          </div>
          <div className="relative min-h-[390px] p-3 pt-0 sm:min-h-[500px] sm:p-5 lg:min-h-0 lg:pl-0 lg:py-5 lg:pr-5">
            <div className="grid h-full min-h-[370px] grid-cols-[1.08fr_.92fr] grid-rows-2 gap-2 sm:min-h-[460px] sm:gap-3">
              <figure className="relative row-span-2 overflow-hidden rounded-[1rem]">
                <img src={indianScenes[0].src} alt={indianScenes[0].alt} className="h-full w-full object-cover" />
                <figcaption className="absolute bottom-3 left-3 rounded-full border border-white/60 bg-[#f8f0e4]/90 px-3 py-1.5 text-[10px] font-medium tracking-wide text-[#49372c] shadow-sm backdrop-blur">{indianScenes[0].note}</figcaption>
              </figure>
              {indianScenes.slice(1).map((scene) => <figure key={scene.src} className="relative min-h-0 overflow-hidden rounded-[1rem]">
                <img src={scene.src} alt={scene.alt} loading="lazy" className="h-full w-full object-cover" />
                <figcaption className="absolute bottom-2 left-2 rounded-full border border-white/60 bg-[#f8f0e4]/90 px-2.5 py-1 text-[9px] font-medium tracking-wide text-[#49372c] shadow-sm backdrop-blur sm:bottom-3 sm:left-3 sm:px-3 sm:text-[10px]">{scene.note}</figcaption>
              </figure>)}
            </div>
            <span aria-hidden="true" className={\`absolute right-6 top-6 hidden -rotate-6 font-display text-3xl italic lg:block \${isHim ? "text-[#e0c996]" : "text-[#fff2dc]"}\`}>{isHim ? "The Nawab edit" : "The Gulabo diaries"}</span>
          </div>
        </div>
        <div className={\`relative flex flex-wrap items-center justify-between gap-2 border-t px-6 py-3 text-[9px] font-semibold uppercase tracking-[.16em] sm:px-10 sm:text-[10px] lg:px-12 \${isHim ? "border-[#536858] bg-[#192e25]/70 text-[#c9b88e]" : "border-[#d1b89a] bg-[#e5d3b9]/70 text-[#80533f]"}\`}>
          <span>{isHim ? "Heritage architecture" : "Old-city markets"}</span><span aria-hidden="true">✳</span><span>{isHim ? "Indian craftsmanship" : "Handmade textiles"}</span><span aria-hidden="true">✳</span><span>{isHim ? "The modern gentleman" : "Everyday celebrations"}</span>
        </div>
      </section> : <section className={(calmHerJewellery || calmHerAccessories) ? "mx-auto max-w-3xl pb-2 pt-2 text-center" : "mx-auto max-w-3xl text-center"}>
        {!calmHerJewellery && !calmHerAccessories && <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Independent brands · OFFFEED</p>}
        <h1 className={(calmHerJewellery || calmHerAccessories) ? "mt-2 font-display text-5xl font-medium tracking-[-0.045em] text-stone-800 sm:text-7xl" : "mt-4 font-display text-5xl font-medium sm:text-7xl"}>{calmHerJewellery ? <><em className="font-normal text-[#c58d98]">Her</em> Jewellery</> : calmHerAccessories ? <><em className="font-normal text-[#c58d98]">Her</em> Accessories</> : <>{jewellery ? "Jewellery" : "Accessories"} <em className="font-normal text-primary">edit.</em></>}</h1>
        <p className={(calmHerJewellery || calmHerAccessories) ? "mx-auto mt-4 max-w-lg text-[15px] leading-7 text-stone-500" : "mx-auto mt-5 max-w-xl leading-7 text-muted-foreground"}>{calmHerJewellery ? "Delicate details, everyday pieces and little treasures from independent brands." : calmHerAccessories ? "Bags, sunglasses and watches — little details, softly collected." : jewellery ? "Discover independent jewellery labels, delicate everyday pieces and statement finds." : "Find bags, sunglasses, belts and finishing touches from independent brands."}</p>
      </section>}
      <section className={(calmHerJewellery || calmHerAccessories || indianWear) ? "mt-10 sm:mt-14" : "mt-12"}>
        {!calmHerJewellery && !calmHerAccessories && <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{jewellery ? "A tiny jewellery daydream" : "The accessories edit"} · {isHim ? "Him" : "Her"}</p><h2 className="mt-2 font-display text-3xl sm:text-4xl">{isHim ? "The details make the mood." : jewellery ? <>Little treasures, <em className="font-normal text-primary">softly found.</em></> : <>The finishing touches, <em className="font-normal text-primary">considered.</em></>}</h2></div>
          <p className="max-w-sm text-sm leading-6 text-muted-foreground">{isHim ? "Considered details, collected inspiration." : jewellery ? "Pearls, warm gold, shell dishes and the kind of pieces you save just because they make you feel something." : "Structured bags, timeless sunglasses and gold-tone watches in warm, understated shades."}</p>
        </div>}
        {indianWear ? null : (calmHerJewellery || calmHerAccessories) ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 lg:gap-6">
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
<section className={indianWear ? "mt-8 sm:mt-10" : "mt-16"}>
        {indianWear && <nav aria-label="Indian wear categories" className={`mb-5 flex gap-2 overflow-x-auto rounded-xl border px-3 py-3 shadow-sm sm:px-4 ${isHim ? "border-[#536858] bg-[#263d32]" : "border-[#d1b89a] bg-[#e9dbc6]"}`}>{indianTabs.map((tab) => <button key={tab} type="button" onClick={() => setSelectedClothingCategory(tab === "All" ? "" : tab)} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${(tab === "All" ? !selectedClothingCategory : selectedClothingCategory === tab) ? (isHim ? "border-[#c4a76e] bg-[#c4a76e] text-[#24372d]" : "border-[#98513d] bg-[#98513d] text-white") : (isHim ? "border-[#65796a] bg-[#31493b] text-[#f0e5cf] hover:bg-[#3c5647]" : "border-[#cbb99e] bg-[#f7eddf] text-[#624235] hover:bg-[#fff8ed]")}`}>{tab}</button>)}<details className="relative shrink-0"><summary className="cursor-pointer list-none rounded-full border border-[#e7ddd4] bg-[#fffaf5] px-4 py-2 text-sm font-medium text-[#66564d]">More⌄</summary><div className="absolute right-0 top-full z-30 mt-2 min-w-40 rounded-xl border border-[#e7ddd4] bg-white p-2 shadow-xl">{indianMoreTabs.map((tab) => <button key={tab} type="button" onClick={() => setSelectedClothingCategory(tab)} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-[#66564d] hover:bg-[#f8f0eb]">{tab}</button>)}</div></details></nav>}
        {!indianWear && <div className="mb-6"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Shop independent labels</p><h2 className="mt-2 font-display text-3xl sm:text-4xl">Pieces to make it yours.</h2></div>}
        {categoryError && <p className="mb-4 text-center text-muted-foreground">We couldn’t load this edit right now. Please try again.</p>}{categoryLoading && <p className="mb-4 text-center text-muted-foreground">Finding pieces for your edit…</p>}{!categoryError && <>
          <div className={`mb-6 rounded-2xl border p-4 ${indianWear ? (isHim ? "border-[#536858] bg-[#263d32] text-[#f0e5cf]" : "border-[#d1b89a] bg-[#e9dbc6] text-[#624235]") : "border-border/70 bg-card"}`}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-medium">Refine your results · {filteredCategoryProducts.length} products</p><Button type="button" variant="ghost" size="sm" onClick={resetProductFilters}>Clear filters</Button></div>
            <div className={indianWear ? "flex flex-wrap items-end gap-3" : "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"}>
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

  const score = (value: string) => Number.parseFloat(value) * (value.toLowerCase().includes("k") ? 1000 : 1);
  const trendingLooks = [...filtered].sort((a, b) => score(b.saves) - score(a.saves));
  const hiddenGems = [...filtered].sort((a, b) => score(a.saves) - score(b.saves));
  const featuredBrands = [...new Map(categoryProducts.map((product) => [product.brand.handle, product])).values()].slice(0, 4);
  const newArrivals = [...(selectedClothingCategory ? filteredCategoryProducts : categoryProducts)].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 8);
  const categoryTiles = [
    { title: "Clothing", image: moodArtwork[0], href: "/discover" },
    { title: "Jewellery", image: moodArtwork[1 % moodArtwork.length], href: "/discover?category=jewellery" },
    { title: "Accessories", image: moodArtwork[2 % moodArtwork.length], href: "/discover?category=accessories" },
    { title: "Complete looks", image: moodArtwork[3 % moodArtwork.length], href: "/explore" },
  ];

  const clothingCategories = isHim ? himClothingCategories : herClothingCategories;
  const chooseClothingCategory = (item: string) => {
    setSelectedClothingCategory(item);
    setQuery(item);
    setFilter("All");
    window.setTimeout(() => document.getElementById("new-arrivals")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };
  const clearClothingCategory = () => {
    setSelectedClothingCategory("");
    setQuery("");
    setFilter("All");
  };

  return <main className="bg-[#fcfaf7] pb-24 text-[#493a33]">
    <div className="mx-auto flex max-w-[1680px] flex-col gap-4 px-3 pt-3 sm:px-5 lg:flex-row lg:items-start lg:gap-7 lg:px-6">
      <aside aria-label="Discover categories" className="w-full shrink-0 overflow-hidden rounded-2xl border border-[#eadfd7] bg-[#f7f2ed] lg:sticky lg:top-24 lg:mt-6 lg:max-h-[calc(100vh-7rem)] lg:w-[218px] lg:overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#e8ddd5] px-4 py-3">
          <div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#a17e75]">The style directory</p><p className="mt-0.5 font-display text-lg text-[#493a33]">Browse OFFFEED</p></div>
          <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#a16d73]">{isHim ? "Him" : "Her"}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 p-3 lg:block lg:space-y-1">
          <button type="button" onClick={clearClothingCategory} className="flex w-full items-center justify-between rounded-lg bg-white px-3 py-2.5 text-left text-sm font-medium text-[#76534f] shadow-sm lg:mb-1"><span>All Discoveries</span><span>↗</span></button>
          <div className="rounded-lg bg-white/65 lg:bg-transparent">
            <button type="button" aria-expanded={clothingMenuOpen} onClick={() => setClothingMenuOpen((open) => !open)} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-[#59463e] hover:bg-white"><span>Clothing</span><span className="text-[#b46f78]">{clothingMenuOpen ? "−" : "+"}</span></button>
            {clothingMenuOpen && <div className="max-h-52 space-y-0.5 overflow-y-auto pb-2 pl-2 pr-1 lg:max-h-none">{clothingCategories.map((item) => <button type="button" key={item} onClick={() => chooseClothingCategory(item)} className={`block w-full rounded-md px-3 py-2 text-left text-xs transition ${selectedClothingCategory === item ? "bg-[#b46f78] font-semibold text-white" : "text-[#77645a] hover:bg-[#f1e5e1] hover:text-[#59463e]"}`}>{item}</button>)}</div>}
          </div>
          <button type="button" onClick={() => { window.location.href = "/discover?category=indian-wear"; }} className="flex w-full items-center justify-between rounded-lg border border-[#e7cfc0] bg-[#f4e8dd] px-3 py-2.5 text-left text-sm font-semibold text-[#8c4e3d] transition hover:bg-[#efdfd2]"><span>{isHim ? "NaWaB" : "GuLaBo"}</span><span>✦</span></button>
          <div className="rounded-lg bg-white/65 lg:bg-transparent">
            <button type="button" aria-expanded={accessoriesMenuOpen} onClick={() => setAccessoriesMenuOpen((open) => !open)} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-[#59463e] hover:bg-white"><span>Accessories</span><span className="text-[#71836d]">{accessoriesMenuOpen ? "−" : "+"}</span></button>
            {accessoriesMenuOpen && <div className="space-y-0.5 pb-2 pl-2 pr-1">{accessoryCategories.map((item) => <button type="button" key={item} onClick={() => { window.location.href = "/discover?category=accessories"; }} className="block w-full rounded-md px-3 py-2 text-left text-xs text-[#77645a] hover:bg-[#edf0e8]">{item}</button>)}</div>}
          </div>
          <button type="button" onClick={() => { window.location.href = "/discover?category=jewellery"; }} className="rounded-lg px-3 py-2.5 text-left text-sm text-[#59463e] hover:bg-white">Jewellery <span className="float-right text-[#b46f78]">↗</span></button>
          <button type="button" onClick={() => { window.location.href = "/explore"; }} className="rounded-lg px-3 py-2.5 text-left text-sm text-[#59463e] hover:bg-white">Complete Looks <span className="float-right text-[#b46f78]">↗</span></button>
          <button type="button" onClick={() => { document.getElementById("featured-brands")?.scrollIntoView({ behavior: "smooth" }); }} className="rounded-lg px-3 py-2.5 text-left text-sm text-[#59463e] hover:bg-white">Independent Brands <span className="float-right text-[#b46f78]">↗</span></button>
        </div>
        <div className="hidden border-t border-[#e8ddd5] px-4 py-3 lg:block"><p className="text-[10px] leading-5 text-[#927e74]">Find it before your feed does.</p></div>
      </aside>
      <div className="min-w-0 flex-1">
    <section className="relative mx-auto mt-1 max-w-[1500px] overflow-hidden border-y border-[#eadbd2] bg-[linear-gradient(105deg,#f5e6e3_0%,#fbf7f0_52%,#edf0e8_100%)] px-5 py-10 sm:mt-6 sm:rounded-[1.75rem] sm:border sm:px-10 sm:py-14 lg:px-16 lg:py-16">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-32 size-96 rounded-full border border-white/70"/>
      <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[1.05fr_.95fr] lg:gap-12">
        <div>
          <p className="mb-5 text-[10px] font-semibold uppercase tracking-[.25em] text-[#98776d] sm:text-xs">The independent style index · OFFFEED</p>
          <h1 className="max-w-2xl font-display text-5xl font-medium leading-[.98] tracking-[-.045em] text-[#49382f] sm:text-7xl">{isHim ? <>Find your <em className="font-normal text-[#71836d]">own style.</em></> : <>Find your next <em className="font-normal text-[#bd8790]">obsession.</em></>}</h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-[#78645a] sm:text-base">{isHim ? "Discover independent labels, unexpected combinations and pieces that feel like you." : "A considered edit of independent labels, unexpected looks and little details worth discovering."}</p>
          <div className="relative mt-7 max-w-xl"><Search className="absolute left-5 top-1/2 size-5 -translate-y-1/2 text-[#987e72]"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={isHim ? "Search styles, looks and labels…" : "Search looks, moods, styles and more…"} className="h-14 w-full rounded-full border border-[#e4c9c6] bg-white/90 pl-14 pr-5 text-sm text-[#49382f] shadow-sm outline-none placeholder:text-[#a18c82] focus:border-[#bd8790]"/></div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-full border-[#d8b8b5] bg-[#fffaf7]/80 px-5 text-[#76534f] hover:bg-white" onClick={() => { window.location.href = "/discover?category=jewellery"; }}>Jewellery ↗</Button>
            <Button variant="outline" className="rounded-full border-[#c8d2c2] bg-[#f8fbf5]/90 px-5 text-[#536a56] hover:bg-white" onClick={() => { window.location.href = "/discover?category=accessories"; }}>Accessories ↗</Button>
          </div>
        </div>
        <div className="relative mx-auto grid w-full max-w-[520px] grid-cols-[1.08fr_.92fr] items-center gap-3 lg:gap-4">
          <div className="overflow-hidden rounded-[1.2rem] border-[5px] border-white/90 shadow-[0_18px_45px_-25px_rgba(69,48,39,.4)]"><img src={moodArtwork[0]} alt="OFFFEED curated fashion inspiration" className="aspect-[4/5] w-full object-cover"/></div>
          <div className="mt-12 overflow-hidden rounded-[1.2rem] border-[5px] border-white/90 shadow-[0_18px_45px_-25px_rgba(69,48,39,.4)]"><img src={moodArtwork[1 % moodArtwork.length]} alt="A second curated fashion look" className="aspect-[4/5] w-full object-cover"/></div>
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-[1440px] px-5 pt-12 lg:px-10 lg:pt-16">
      <div className="mb-5"><p className="text-[10px] font-semibold uppercase tracking-[.23em] text-[#a17e75]">What's catching eyes</p><h2 className="mt-2 font-display text-3xl sm:text-4xl">Trending discoveries</h2></div>
      <div className="flex flex-wrap gap-2">{moodList.slice(0, 8).map((mood) => <button type="button" key={mood} onClick={() => { setQuery(mood); setFilter("All"); }} className="rounded-full border border-[#e7d9d0] bg-white px-4 py-2.5 text-sm text-[#725d53] transition hover:border-[#c9979d] hover:bg-[#f8eeeb]">{mood} <span className="ml-1 text-[#b8898c]">↗</span></button>)}</div>
    </section>

    <section className="mx-auto max-w-[1440px] px-5 pt-14 lg:px-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.23em] text-[#a17e75]">Find your next favourite corner</p><h2 className="mt-2 font-display text-3xl sm:text-4xl">Shop by category</h2></div><p className="max-w-sm text-sm leading-6 text-[#87756c]">From everyday essentials to the finishing touches.</p></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5">{categoryTiles.map((item) => <button type="button" key={item.title} onClick={() => { window.location.href = item.href; }} className="group relative overflow-hidden rounded-[1.15rem] bg-[#eee5dc] text-left"><img src={item.image} alt={item.title} loading="lazy" className="aspect-[4/5] w-full object-cover transition duration-700 group-hover:scale-105"/><span className="absolute inset-0 bg-gradient-to-t from-[#211914]/70 via-transparent to-transparent"/><span className="absolute bottom-4 left-4 font-display text-xl text-white sm:bottom-5 sm:left-5 sm:text-2xl">{item.title}</span><span className="absolute right-3 top-3 grid size-8 place-items-center rounded-full border border-white/60 bg-white/20 text-white backdrop-blur">↗</span></button>)}</div>
    </section>

    <section id="featured-brands" className="mx-auto max-w-[1440px] px-5 pt-14 lg:px-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.23em] text-[#a17e75]">The people behind the pieces</p><h2 className="mt-2 font-display text-3xl sm:text-4xl">Featured independent brands</h2></div><p className="max-w-sm text-sm leading-6 text-[#87756c]">Discover the independent labels bringing something different to the feed.</p></div>
      {categoryLoading ? <p className="py-8 text-center text-[#87756c]">Finding independent labels…</p> : featuredBrands.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5">{featuredBrands.map((product) => <button type="button" key={product.brand.handle} onClick={() => { window.location.href = `/brand/${product.brand.handle}`; }} className="group overflow-hidden rounded-[1.2rem] border border-[#eadfd7] bg-white text-left shadow-[0_12px_35px_-28px_rgba(70,48,40,.35)]"><div className="overflow-hidden bg-[#f0e9e2]"><img src={product.imageUrl || moodArtwork[0]} alt={product.brand.name} loading="lazy" className="aspect-[4/3] w-full object-cover transition duration-700 group-hover:scale-105"/></div><div className="px-4 py-4"><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#a17e75]">Independent label</p><h3 className="mt-1 font-display text-xl">{product.brand.name}</h3><p className="mt-1 text-xs text-[#927e74]">{product.brand.category} · Discover brand ↗</p></div></button>)}</div> : <p className="rounded-xl border border-dashed border-[#dfd1c7] bg-white/60 px-5 py-8 text-center text-sm text-[#87756c]">Independent brands will be featured here as their approved products are published on OFFFEED.</p>}
    </section>

    <section className="mx-auto max-w-[1440px] px-5 pt-14 lg:px-10">
      <div className="mb-6"><p className="text-[10px] font-semibold uppercase tracking-[.23em] text-[#a17e75]">Not on every feed. Yet.</p><h2 className="mt-2 font-display text-3xl sm:text-4xl">Hidden gems</h2><p className="mt-2 max-w-sm text-sm leading-6 text-[#87756c]">The less obvious finds that deserve a little more attention.</p></div>
      {hiddenGems.length ? <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">{hiddenGems.slice(0, 4).map((look, index) => <LookCard key={look.id} look={look} tall={index % 2 === 1}/>)}</div> : <p className="py-8 text-center text-sm text-[#87756c]">More hidden gems are on their way.</p>}
    </section>

    <section className="mx-auto max-w-[1440px] px-5 pt-14 lg:px-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.23em] text-[#a17e75]">The looks making waves</p><h2 className="mt-2 font-display text-3xl sm:text-4xl">Trending looks</h2></div><span className="text-xs text-[#927e74]">Her & Him · OFFFEED</span></div>
      <div className="mb-5 flex flex-wrap gap-2">{filters.map((item) => <Button key={item} size="sm" variant={filter === item ? "default" : "outline"} className={filter === item ? "rounded-full bg-[#ad6970] text-white shadow-sm hover:bg-[#985a62]" : "rounded-full border-[#e8ddd5] bg-white/70 text-[#735e54] hover:bg-[#f4ece6]"} onClick={() => setFilter(item)}>{item}</Button>)}</div>
      {trendingLooks.length ? <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">{trendingLooks.slice(0, 4).map((look, index) => <LookCard key={look.id} look={look} tall={index % 2 === 1}/>)}</div> : <p className="rounded-xl border border-dashed border-[#dfd1c7] bg-white/60 py-12 text-center text-sm text-[#87756c]">No looks match your search. Try another mood.</p>}
      {trendingLooks.length > 4 && <div className="mt-6 text-center"><Button variant="outline" className="rounded-full border-[#d8b8b5] bg-white px-7 text-[#76534f]" onClick={() => { window.location.href = "/explore"; }}>Explore all looks ↗</Button></div>}
    </section>

    <section className="mx-auto max-w-[1440px] px-5 pt-14 lg:px-10">
      <div className="mb-6"><p className="text-[10px] font-semibold uppercase tracking-[.23em] text-[#a17e75]">Find the aesthetic that feels like you</p><h2 className="mt-2 font-display text-3xl sm:text-4xl">Shop by aesthetic</h2><p className="mt-2 max-w-sm text-sm leading-6 text-[#87756c]">Choose a mood and let your next discovery find you.</p></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">{moodList.slice(0, 6).map((mood, index) => <button type="button" key={mood} onClick={() => { setQuery(mood); setFilter("All"); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="group relative overflow-hidden rounded-[1rem] text-left"><img src={moodArtwork[index % moodArtwork.length]} alt={mood} loading="lazy" className="aspect-[4/5] w-full object-cover transition duration-700 group-hover:scale-105"/><span className="absolute inset-0 bg-gradient-to-t from-[#211914]/70 to-transparent"/><span className="absolute bottom-3 left-3 right-3 font-display text-lg text-white">{mood}</span></button>)}</div>
    </section>

    <section id="new-arrivals" className="scroll-mt-28 mx-auto max-w-[1440px] px-5 pt-14 lg:px-10">
      <div className="mb-6"><p className="text-[10px] font-semibold uppercase tracking-[.23em] text-[#a17e75]">Just added to OFFFEED</p><h2 className="mt-2 font-display text-3xl sm:text-4xl">New arrivals</h2><p className="mt-2 max-w-sm text-sm leading-6 text-[#87756c]">Fresh finds from independent labels. First come, first discovered.</p></div>
      {categoryLoading ? <p className="py-8 text-center text-[#87756c]">Loading new arrivals…</p> : newArrivals.length ? <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">{newArrivals.map((product) => <PublicProductCard key={product.id} product={product}/>)}</div> : <p className="rounded-xl border border-dashed border-[#dfd1c7] bg-white/60 px-5 py-8 text-center text-sm text-[#87756c]">New arrivals from independent brands will appear here as soon as their collections are published.</p>}
    </section>
      </div>
    </div>
  </main>;
}