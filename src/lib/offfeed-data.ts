import coquette from "@/assets/offfeed-coquette.jpg";
import minimal from "@/assets/offfeed-minimal.jpg";
import oldMoney from "@/assets/offfeed-oldmoney.jpg";
import y2k from "@/assets/offfeed-y2k.jpg";
import himTailoring from "@/assets/offfeed-him-tailoring.jpg";
import himGorpcore from "@/assets/offfeed-him-gorpcore.jpg";
import himVintage from "@/assets/offfeed-him-vintage.jpg";
import himStreetwear from "@/assets/offfeed-him-streetwear.jpg";

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
  { id: "model-off-duty", title: "Model Off Duty", aesthetic: "Minimal", occasion: "Everyday", season: "Winter", image: minimal, saves: "4.2k", description: "The no-effort uniform: monochrome separates and grounded proportions." },
  { id: "parisian-summer", title: "Parisian Summer", aesthetic: "Coquette", occasion: "City break", season: "Summer", image: coquette, saves: "1.6k", description: "Feminine dressing with a downtown edge and delicate accessories." },
  { id: "library-hours", title: "Library Hours", aesthetic: "Old Money", occasion: "College", season: "Spring", image: oldMoney, saves: "2.2k", description: "A scholarly mix of plaid, crisp shirting and polished leather." },
  { id: "downtown-rose", title: "Downtown Rose", aesthetic: "Y2K", occasion: "Night out", season: "Spring", image: y2k, saves: "3.8k", description: "A playful throwback balanced by oversized leather and soft florals." },
];

export const himLooks: Look[] = [
  { id: "forest-and-form", title: "Forest & Form", aesthetic: "Minimalist tailoring", occasion: "City day", season: "Autumn", image: himTailoring, saves: "1.9k", description: "A deep green knit, considered tailoring and an overcoat made for slower city days." },
  { id: "outside-the-lines", title: "Outside the Lines", aesthetic: "Gorpcore", occasion: "Weekend", season: "Autumn", image: himGorpcore, saves: "1.6k", description: "Technical layers and grounded neutrals, ready for a long way home." },
  { id: "coffee-in-leather", title: "Coffee in Leather", aesthetic: "Vintage workwear", occasion: "Coffee run", season: "Spring", image: himVintage, saves: "2.2k", description: "A worn-in leather jacket and relaxed denim, with nowhere urgent to be." },
  { id: "quiet-tokyo", title: "Quiet Tokyo", aesthetic: "Japanese streetwear", occasion: "Everyday", season: "Winter", image: himStreetwear, saves: "2.8k", description: "Strong proportions, soft layers and a clean monochrome point of view." },
  { id: "the-long-weekend", title: "The Long Weekend", aesthetic: "Gorpcore", occasion: "Travel", season: "Spring", image: himGorpcore, saves: "1.3k", description: "Utility-minded outerwear meets an easy, everyday silhouette." },
  { id: "after-hours-academia", title: "After Hours Academia", aesthetic: "Ivy League", occasion: "Dinner", season: "Autumn", image: himTailoring, saves: "2.1k", description: "A modern take on campus classics: dark layers, soft structure and polish." },
  { id: "soft-focus-vintage", title: "Soft Focus Vintage", aesthetic: "Vintage workwear", occasion: "Everyday", season: "Spring", image: himVintage, saves: "1.4k", description: "Timeless denim and a leather layer with the feel of a favorite record." },
  { id: "city-uniform", title: "City Uniform", aesthetic: "Japanese streetwear", occasion: "City day", season: "Winter", image: himStreetwear, saves: "3.0k", description: "Relaxed black layers, precise proportions and a little room to move." },
];

export const moods = ["Clean Girl", "Coquette", "Old Money", "Streetwear", "Y2K", "Soft Girl", "Dark Feminine", "Minimal", "Café Core", "Model Off Duty", "Indie", "Vintage"];

export const moodImages = [minimal, coquette, oldMoney, y2k];

export const himMoods = ["Dark Academia", "Ivy League", "Japanese Streetwear", "Gorpcore", "Minimalist Tailoring", "Café Core", "Vintage Workwear"];

export const himMoodImages = [himTailoring, himTailoring, himStreetwear, himGorpcore, himTailoring, himVintage, himVintage];