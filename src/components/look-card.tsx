import { Link } from "@tanstack/react-router";
import { Heart, Share2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Look } from "@/lib/offfeed-data";

export function LookCard({ look, tall = false }: { look: Look; tall?: boolean }) {
  const [liked, setLiked] = useState(false);
  return (
    <article className="mb-7 break-inside-avoid">
      <div className="group relative overflow-hidden rounded-[1.25rem] bg-card shadow-soft">
        <Link to="/look/$lookId" params={{ lookId: look.id }} aria-label={`View ${look.title}`}>
          <img src={look.image} alt={look.title} width={912} height={1200} loading="lazy" className={`w-full object-cover transition duration-700 group-hover:scale-[1.035] ${tall ? "aspect-[3/5]" : "aspect-[3/4]"}`} />
          <div className="absolute inset-0 flex items-end bg-foreground/0 p-4 transition-colors group-hover:bg-foreground/20">
            <span className="translate-y-2 rounded-full bg-background/90 px-4 py-2 text-xs font-medium opacity-0 backdrop-blur transition group-hover:translate-y-0 group-hover:opacity-100">View Look</span>
          </div>
        </Link>
        <Button variant="soft" size="icon" className="absolute right-3 top-3 opacity-0 shadow-sm transition group-hover:opacity-100" aria-label="Save look" onClick={() => setLiked((value) => !value)}><Heart className={liked ? "fill-current" : ""} /></Button>
      </div>
      <div className="flex items-start justify-between gap-3 px-1 pt-3">
        <div><p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-primary">{look.aesthetic}</p><h3 className="mt-1 font-display text-lg">{look.title}</h3></div>
        <div className="flex items-center gap-1"><Button variant="ghost" size="icon" aria-label="Like" onClick={() => setLiked((value) => !value)}><Heart className={liked ? "fill-current text-primary" : ""} /></Button><Button variant="ghost" size="icon" aria-label="Share"><Share2 /></Button></div>
      </div>
    </article>
  );
}