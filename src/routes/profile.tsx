import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { himLooks, looks, type Look } from "@/lib/offfeed-data";
import { readLikedLookIds } from "@/lib/look-collections";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Your edits — OFFFEED" }, { name: "description", content: "Your liked OFFFEED fashion inspiration." }] }),
  component: ProfilePage,
});
function ProfilePage() {
  const [liked, setLiked] = useState<Look[]>([]);
  useEffect(() => {
    const allLooks = [...looks, ...himLooks];
    const likedIds = readLikedLookIds();
    setLiked(allLooks.filter((look) => likedIds.includes(look.id)));
  }, []);
  return <main className="mx-auto max-w-6xl px-5 py-12 lg:px-10">
    <h1 className="font-display text-5xl">Your liked looks</h1>
    <p className="mt-3 text-muted-foreground">Saved looks and liked inspiration stay here on this device.</p>
    <section id="liked-looks" className="mt-12 border-t border-border pt-8">
      <div className="flex items-center gap-2"><Heart className="size-5"/><h2 className="font-display text-3xl">Liked looks</h2></div>
      {liked.length ? <div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">{liked.map((look) => <LookTile key={look.id} look={look}/>)}</div> : <p className="mt-4 text-sm text-muted-foreground">Looks you like will appear in your wishlist.</p>}
    </section>
    <Button className="mt-10" asChild><Link to="/discover">Discover more looks</Link></Button>
  </main>;
}
function LookTile({ look }: { look: Look }) {
  return <Link to="/look/$lookId" params={{ lookId: look.id }} className="group block">
    <img src={look.image} alt={look.title} className="aspect-[3/4] w-full rounded-xl object-cover transition group-hover:opacity-90"/>
    <p className="mt-2 text-xs uppercase tracking-wider text-primary">{look.aesthetic}</p><p className="mt-1 font-medium">{look.title}</p>
  </Link>;
}
