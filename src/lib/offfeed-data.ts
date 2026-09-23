import coquette from "@/assets/offfeed-coquette.jpg";
import minimal from "@/assets/offfeed-minimal.jpg";
import oldMoney from "@/assets/offfeed-oldmoney.jpg";
import y2k from "@/assets/offfeed-y2k.jpg";

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

export const moods = ["Clean Girl", "Coquette", "Old Money", "Streetwear", "Y2K", "Soft Girl", "Dark Feminine", "Minimal", "Café Core", "Model Off Duty", "Indie", "Vintage"];

export const moodImages = [minimal, coquette, oldMoney, y2k];