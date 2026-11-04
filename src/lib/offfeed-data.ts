import coquette from "@/assets/offfeed-coquette.jpg";
import minimal from "@/assets/offfeed-minimal.jpg";
import oldMoney from "@/assets/offfeed-oldmoney.jpg";
import y2k from "@/assets/offfeed-y2k.jpg";
import himTailoring from "@/assets/offfeed-him-tailoring.jpg";
import himGorpcore from "@/assets/offfeed-him-gorpcore.jpg";
import himVintage from "@/assets/offfeed-him-vintage.jpg";
import himStreetwear from "@/assets/offfeed-him-streetwear.jpg";
import minimal2 from "@/assets/offfeed-minimal-2.jpg";
import coquette2 from "@/assets/offfeed-coquette-2.jpg";
import oldMoney2 from "@/assets/offfeed-oldmoney-2.jpg";
import y2k2 from "@/assets/offfeed-y2k-2.jpg";
import himTailoring2 from "@/assets/offfeed-him-tailoring-2.jpg";
import himGorpcore2 from "@/assets/offfeed-him-gorpcore-2.jpg";
import himVintage2 from "@/assets/offfeed-him-vintage-2.jpg";
import himStreetwear2 from "@/assets/offfeed-him-streetwear-2.jpg";

export type Look = {
  id: string;
  title: string;
  aesthetic: string;
  occasion: string;
  season: string;
  image: string;
  saves: string;
  description: string;
};

export const looks: Look[] = [
  { id: "soft-pink-energy", title: "Soft Pink Energy", aesthetic: "Coquette", occasion: "Coffee date", season: "Spring", image: coquette, saves: "2.4k", description: "Romantic layers, soft texture and a little Parisian nostalgia." },
  { id: "sunday-coffee-run", title: "Sunday Coffee Run", aesthetic: "Minimal", occasion: "Casual", season: "Autumn", image: minimal, saves: "1.8k", description: "Quiet luxury with wide-leg tailoring and an easy knit." },
  { id: "campus-after-dark", title: "Campus After Dark", aesthetic: "Old Money", occasion: "College", season: "Autumn", image: oldMoney, saves: "3.1k", description: "Classic campus codes made sharper with rich chocolate tailoring." },
  { id: "pink-in-the-city", title: "Pink in the City", aesthetic: "Y2K", occasion: "Night out", season: "Summer", image: y2k, saves: "2.7k", description: "Low-rise denim, vintage leather and blush details for after dark." },
  { id: "model-off-duty", title: "Model Off Duty", aesthetic: "Minimal", occasion: "Everyday", season: "Winter", image: minimal2, saves: "4.2k", description: "The no-effort uniform: monochrome separates and grounded proportions." },
  { id: "parisian-summer", title: "Parisian Summer", aesthetic: "Coquette", occasion: "City break", season: "Summer", image: coquette2, saves: "1.6k", description: "Feminine dressing with a downtown edge and delicate accessories." },
  { id: "library-hours", title: "Library Hours", aesthetic: "Old Money", occasion: "College", season: "Spring", image: oldMoney2, saves: "2.2k", description: "A scholarly mix of plaid, crisp shirting and polished leather." },
  { id: "downtown-rose", title: "Downtown Rose", aesthetic: "Y2K", occasion: "Night out", season: "Spring", image: y2k2, saves: "3.8k", description: "A playful throwback balanced by oversized leather and soft florals." },
];

export const himLooks: Look[] = [
  { id: "forest-and-form", title: "Forest & Form", aesthetic: "Minimalist tailoring", occasion: "City day", season: "Autumn", image: himTailoring, saves: "1.9k", description: "A deep green knit, considered tailoring and an overcoat made for slower city days." },
  { id: "outside-the-lines", title: "Outside the Lines", aesthetic: "Gorpcore", occasion: "Weekend", season: "Autumn", image: himGorpcore, saves: "1.6k", description: "Technical layers and grounded neutrals, ready for a long way home." },
  { id: "coffee-in-leather", title: "Coffee in Leather", aesthetic: "Vintage workwear", occasion: "Coffee run", season: "Spring", image: himVintage, saves: "2.2k", description: "A worn-in leather jacket and relaxed denim, with nowhere urgent to be." },
  { id: "quiet-tokyo", title: "Quiet Tokyo", aesthetic: "Japanese streetwear", occasion: "Everyday", season: "Winter", image: himStreetwear, saves: "2.8k", description: "Strong proportions, soft layers and a clean monochrome point of view." },
  { id: "the-long-weekend", title: "The Long Weekend", aesthetic: "Gorpcore", occasion: "Travel", season: "Spring", image: himGorpcore2, saves: "1.3k", description: "Utility-minded outerwear meets an easy, everyday silhouette." },
  { id: "after-hours-academia", title: "After Hours Academia", aesthetic: "Ivy League", occasion: "Dinner", season: "Autumn", image: himTailoring2, saves: "2.1k", description: "A modern take on campus classics: dark layers, soft structure and polish." },
  { id: "soft-focus-vintage", title: "Soft Focus Vintage", aesthetic: "Vintage workwear", occasion: "Everyday", season: "Spring", image: himVintage2, saves: "1.4k", description: "Timeless denim and a leather layer with the feel of a favorite record." },
  { id: "city-uniform", title: "City Uniform", aesthetic: "Japanese streetwear", occasion: "City day", season: "Winter", image: himStreetwear2, saves: "3.0k", description: "Relaxed black layers, precise proportions and a little room to move." },
];


export type JewelleryReference = { id: string; title: string; note: string; image: string };

export const himJewelleryReferences: JewelleryReference[] = [
  { id: "him-starburst-pendant", title: "Starburst pendant", note: "A sculptural silver pendant on a fine chain", image: "/images/jewellery/ChatGPT%20Image%20Oct%2014%2C%202026%2C%2010_02_37%20PM.jpg" },
  { id: "him-black-dogtag", title: "Black dog-tag pendant", note: "Clean, dark-toned metal with a minimal edge", image: "/images/jewellery/ChatGPT%20Image%20Oct%2014%2C%202026%2C%2010_02_45%20PM.jpg" },
  { id: "him-double-silver-bracelet", title: "Double silver chain bracelet", note: "Layered links with a polished finish", image: "/images/jewellery/ChatGPT%20Image%20Oct%2014%2C%202026%2C%2010_02_53%20PM.jpg" },
  { id: "him-initial-bar-bracelet", title: "Initial bar bracelet", note: "A personal detail in a clean silver silhouette", image: "/images/jewellery/ChatGPT%20Image%20Oct%2014%2C%202026%2C%2010_03_00%20PM.jpg" },
  { id: "him-black-geometric-pendant", title: "Black geometric pendant", note: "A bold black-and-silver everyday chain", image: "/images/jewellery/ChatGPT%20Image%20Oct%2014%2C%202026%2C%2010_03_06%20PM.jpg" },
  { id: "him-slim-gold-bracelet", title: "Slim gold bracelet", note: "A subtle gold accent for everyday styling", image: "/images/jewellery/ChatGPT%20Image%20Oct%2014%2C%202026%2C%2010_03_12%20PM.jpg" },
  { id: "him-silver-snake-chain", title: "Silver snake chain", note: "A smooth, understated silver essential", image: "/images/jewellery/ChatGPT%20Image%20Oct%2014%2C%202026%2C%2010_03_19%20PM.jpg" },
  { id: "him-gold-snake-chain", title: "Gold snake chain", note: "Warm gold with a clean, classic profile", image: "/images/jewellery/ChatGPT%20Image%20Oct%2014%2C%202026%2C%2010_03_26%20PM.jpg" },
  { id: "him-geometric-gold-hoop", title: "Geometric gold hoop", note: "A sharp, modern finishing detail", image: "/images/jewellery/ChatGPT%20Image%20Oct%2014%2C%202026%2C%2010_03_33%20PM.jpg" },
];

export const moods = ["Clean Girl", "Coquette", "Old Money", "Streetwear", "Y2K", "Soft Girl", "Dark Feminine", "Minimal", "Café Core", "Model Off Duty", "Indie", "Vintage"];

export const moodImages = [minimal, coquette, oldMoney, y2k, minimal2, coquette2, oldMoney2, y2k2];

export const himMoods = ["Dark Academia", "Ivy League", "Japanese Streetwear", "Gorpcore", "Minimalist Tailoring", "Café Core", "Vintage Workwear"];

export const himMoodImages = [himTailoring, himTailoring2, himStreetwear, himGorpcore, himStreetwear2, himVintage, himGorpcore2, himVintage2];