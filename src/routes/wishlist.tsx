import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { himLooks, looks, type Look } from "@/lib/offfeed-data";
import { readLikedLookIds, syncWishlistWithAccount, readReferenceInspirations, readSavedReferenceInspirationIds, readLikedProductIds } from "@/lib/look-collections";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/wishlist")({
  head: () => ({ meta: [{ title: "My Wishlist — OFFFEED" }, { name: "description", content: "Your liked OFFFEED looks and fashion inspiration." }] }),
  component: WishlistPage,
});
function WishlistPage() {
  const [liked, setLiked] = useState<Look[]>([]);
  const [loading, setLoading] = useState(true);
  const [referenceItems, setReferenceItems] = useState<ReturnType<typeof readReferenceInspirations>>([]);
  const [savedReferenceIds, setSavedReferenceIds] = useState<string[]>([]);
  const [likedReferenceIds, setLikedReferenceIds] = useState<string[]>([]);
  const refresh = useCallback(async () => {
    try {
      const result = await syncWishlistWithAccount();
      setLiked([...looks, ...himLooks].filter((look) => result.lookIds.includes(look.id)));
      setReferenceItems(readReferenceInspirations());
      setSavedReferenceIds(readSavedReferenceInspirationIds());
      setLikedReferenceIds(readLikedLookIds().filter((id) => id.startsWith("reference-")));
    } catch (error) {
      console.error("Wishlist sync failed:", error);
      const ids = readLikedLookIds();
      setLiked([...looks, ...himLooks].filter((look) => ids.includes(look.id)));
      setReferenceItems(readReferenceInspirations());
      setSavedReferenceIds(readSavedReferenceInspirationIds());
      setLikedReferenceIds(ids.filter((id) => id.startsWith("reference-")));
    } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    void refresh();
    const onUpdate = () => { const ids = readLikedLookIds(); setLiked([...looks, ...himLooks].filter((look) => ids.includes(look.id))); setReferenceItems(readReferenceInspirations()); setSavedReferenceIds(readSavedReferenceInspirationIds()); setLikedReferenceIds(ids.filter((id) => id.startsWith("reference-"))); };
    window.addEventListener("offfeed-wishlist-updated", onUpdate);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { window.setTimeout(() => void refresh(), 0); });
    return () => { window.removeEventListener("offfeed-wishlist-updated", onUpdate); subscription.unsubscribe(); };
  }, [refresh]);
  return <main className="mx-auto max-w-6xl px-5 py-12 lg:px-10">
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Your personal edit</p>
    <h1 className="mt-2 font-display text-5xl">My Wishlist</h1>
    <p className="mt-3 text-muted-foreground">Your liked looks, all in one place.</p>
    <section id="liked-looks" className="mt-12 border-t border-border pt-8">
      <div className="flex items-center gap-2"><Heart className="size-5"/><h2 className="font-display text-3xl">Liked looks</h2><span className="text-sm text-muted-foreground">({liked.length})</span></div>
      {loading ? <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin"/>Loading your wishlist…</div> : liked.length ? <div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">{liked.map((look)=><Link key={look.id} to="/look/$lookId" params={{lookId:look.id}} className="group block"><img src={look.image} alt={look.title} className="aspect-[3/4] w-full rounded-xl object-cover transition group-hover:opacity-90"/><p className="mt-2 text-xs uppercase tracking-wider text-primary">{look.aesthetic}</p><p className="mt-1 font-medium">{look.title}</p></Link>)}</div> : <p className="mt-4 text-sm text-muted-foreground">Looks you like will appear here. Tap the heart on any look to add it.</p>}
    </section>
    {(likedReferenceIds.length > 0 || savedReferenceIds.length > 0) && <section className="mt-12 border-t border-border pt-8">
      <h2 className="font-display text-3xl">Saved jewellery & accessories inspiration</h2>
      <p className="mt-2 text-sm text-muted-foreground">Reference images you’ve liked or saved for later. These are inspiration items, not purchasable products.</p>
      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {referenceItems.filter((item) => likedReferenceIds.includes(item.id) || savedReferenceIds.includes(item.id)).map((item) => <a key={item.id} href={`/discover?category=${item.category}`} className="group block">
          <img src={item.image} alt={item.title} loading="lazy" className="aspect-[4/5] w-full rounded-xl object-cover transition group-hover:opacity-90"/>
          <p className="mt-2 text-sm font-medium">{item.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{likedReferenceIds.includes(item.id) ? "♥ In wishlist" : ""}{likedReferenceIds.includes(item.id) && savedReferenceIds.includes(item.id) ? " · " : ""}{savedReferenceIds.includes(item.id) ? "Saved for later" : ""}</p>
        </a>)}
      </div>
    </section>}
    <Button className="mt-10" asChild><Link to="/discover">Discover more looks</Link></Button>
  </main>;
}
