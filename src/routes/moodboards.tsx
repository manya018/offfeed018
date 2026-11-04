import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bookmark, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createMoodboard, deleteMoodboard, readMoodboards, removeMoodboardItem, moodboardsEventName, type Moodboard } from "@/lib/moodboards";

export const Route = createFileRoute("/moodboards")({
  head: () => ({ meta: [{ title: "My Moodboards — OFFFEED" }, { name: "description", content: "Collect the looks and pieces that inspire you." }] }),
  component: MoodboardsPage,
});
function MoodboardsPage() {
  const [boards, setBoards] = useState<Moodboard[]>([]);
  const [name, setName] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  useEffect(() => {
    const sync = () => setBoards(readMoodboards());
    sync();
    window.addEventListener(moodboardsEventName(), sync);
    return () => window.removeEventListener(moodboardsEventName(), sync);
  }, []);
  const active = boards.find((board) => board.id === activeId) ?? null;
  function addBoard() {
    const board = createMoodboard(name);
    if (!board) return;
    setName("");
    setActiveId(board.id);
    setBoards(readMoodboards());
  }
  return <main className="mx-auto min-h-[70vh] max-w-6xl px-5 py-12 lg:px-10">
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Your personal edit</p>
    <div className="mt-2 flex flex-wrap items-end justify-between gap-4"><div><h1 className="font-display text-5xl">My Moodboards</h1><p className="mt-3 max-w-xl text-muted-foreground">A place for the looks, pieces and ideas you want to come back to.</p></div><a href="/discover" className="text-sm font-medium text-primary underline underline-offset-4">Explore Discover ↗</a></div>
    <div className="mt-9 flex max-w-lg gap-2"><input value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addBoard(); }} maxLength={48} placeholder="Name your new moodboard…" className="h-11 min-w-0 flex-1 rounded-xl border border-input bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring" /><Button onClick={addBoard} disabled={!name.trim()}><Plus className="mr-1 size-4" />Create board</Button></div>
    {active ? <section className="mt-12">
      <div className="mb-5 flex items-center justify-between gap-3"><div><button type="button" onClick={() => setActiveId(null)} className="mb-2 text-xs text-muted-foreground hover:text-foreground">← All moodboards</button><h2 className="font-display text-3xl">{active.name}</h2><p className="mt-1 text-sm text-muted-foreground">{active.items.length} saved {active.items.length === 1 ? "item" : "items"}</p></div><Button variant="outline" size="sm" onClick={() => { deleteMoodboard(active.id); setActiveId(null); }}> <Trash2 className="mr-2 size-4" />Delete board</Button></div>
      {active.items.length ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{active.items.map((item) => <article key={item.type + item.id} className="group relative min-w-0"><a href={item.href} className="block"><div className="aspect-[4/5] overflow-hidden rounded-xl bg-muted"><img src={item.image} alt={item.title} loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-[1.03]" /></div><p className="mt-2 text-xs text-muted-foreground">{item.subtitle}</p><h3 className="mt-1 text-sm font-medium">{item.title}</h3>{typeof item.price === "number" && <p className="mt-1 text-sm">₹{item.price.toLocaleString("en-IN")}</p>}</a><button type="button" aria-label={`Remove ${item.title} from moodboard`} onClick={() => removeMoodboardItem(active.id, item.id, item.type)} className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-background/90 shadow hover:bg-background"><X className="size-4" /></button></article>)}</div> : <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center"><Bookmark className="mx-auto size-8 text-primary" /><h3 className="mt-3 font-display text-2xl">Your board is ready</h3><p className="mt-2 text-sm text-muted-foreground">Save products and looks from Discover using the bookmark button.</p><Button className="mt-5" asChild><a href="/discover">Find inspiration</a></Button></div>}
    </section> : <section className="mt-12">{boards.length ? <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{boards.map((board) => <button key={board.id} type="button" onClick={() => setActiveId(board.id)} className="overflow-hidden rounded-2xl border border-border bg-card text-left transition hover:-translate-y-0.5 hover:shadow-lg"><div className="grid aspect-[16/9] grid-cols-2 gap-1 bg-muted">{board.items.slice(0, 4).length ? board.items.slice(0, 4).map((item) => <img key={item.type + item.id} src={item.image} alt="" className="size-full min-h-0 object-cover" />) : <div className="col-span-2 grid place-items-center text-primary"><Bookmark className="size-8" /></div>}</div><div className="p-4"><h2 className="font-display text-2xl">{board.name}</h2><p className="mt-1 text-xs text-muted-foreground">{board.items.length} {board.items.length === 1 ? "item" : "items"}</p></div></button>)}</div> : <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center"><Bookmark className="mx-auto size-9 text-primary" /><h2 className="mt-3 font-display text-2xl">Start collecting your style</h2><p className="mt-2 text-sm text-muted-foreground">Create your first board, then save the products and looks you love from Discover.</p></div>}</section>}
  </main>;
}
