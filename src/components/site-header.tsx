import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, Search, UserRound, ShoppingBag, Heart, Bookmark, Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useStyleSpace } from "@/lib/style-space";
import { offfeedCartEventName, readOfffeedCart } from "@/lib/cart";
import { supabase } from "@/integrations/supabase/client";
import { getMyNotifications, markMyNotificationRead } from "@/lib/sale-notifications.functions";

const links = [
  { label: "Home", to: "/" as const },
  { label: "Discover", to: "/discover" as const },
  { label: "The EDIT", to: "/edit" as const },
  { label: "Explore", to: "/explore" as const },
  { label: "Create", to: "/create" as const },
  { label: "For Brands", to: "/for-brands/apply" as const },
  { label: "About", to: "/about" as const },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [bagCount, setBagCount] = useState(0);
  const [notifications, setNotifications] = useState<Array<{id:string;title:string;body:string;href:string;read_at:string|null;created_at:string}>>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const { space, setSpace } = useStyleSpace();
  const currentSearch = useRouterState({ select: (state) => state.location.search as { category?: string; view?: string } });
  const isHomeCollection = currentSearch.category === "home" || space === "home";
  useEffect(() => {
    let alive = true;
    void supabase.auth.getUser().then(async ({data}) => { if (!alive || !data.user) return; setSignedIn(true); try { const rows = await getMyNotifications(); if (alive) setNotifications(rows as typeof notifications); } catch { /* Inbox may not be deployed yet. */ } });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => { setSignedIn(Boolean(session?.user)); if (!session?.user) setNotifications([]); });
    return () => { alive = false; authListener.subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    const syncBag = () => setBagCount(readOfffeedCart().reduce((sum, item) => sum + item.quantity, 0));
    syncBag();
    window.addEventListener(offfeedCartEventName(), syncBag);
    window.addEventListener("storage", syncBag);
    return () => {
      window.removeEventListener(offfeedCartEventName(), syncBag);
      window.removeEventListener("storage", syncBag);
    };
  }, []);
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur-xl">
      <div className="site-header-inner mx-auto flex h-20 w-full items-center justify-between px-5 lg:px-10">
        <Link to="/" className="site-header-logo shrink-0 font-display text-2xl font-semibold tracking-[0.14em]">OFFFEED</Link>
        <div className="site-header-spaces flex shrink-0 items-center gap-2" aria-label="Choose a collection">
          <div className="flex items-center rounded-full border border-border bg-card p-1">
            {(["her", "him"] as const).map((option) => (
              <Button key={option} asChild size="sm" variant={!isHomeCollection && space === option ? "default" : "ghost"} className="h-8 min-w-10 rounded-full px-2.5 text-xs font-semibold uppercase">
                <Link to="/discover" onClick={() => setSpace(option)} aria-pressed={!isHomeCollection && space === option}>{option === "her" ? "HER" : "HIM"}</Link>
              </Button>
            ))}
          </div>
          <Button asChild size="sm" variant={isHomeCollection ? "default" : "ghost"} className={`h-10 min-w-[88px] rounded-full px-4 text-xs font-semibold uppercase tracking-wide ${isHomeCollection ? "" : "border border-border bg-card text-muted-foreground hover:bg-accent"}`}>
            <Link to="/discover" search={{ category: "home" }} onClick={() => setSpace("home")} aria-pressed={isHomeCollection}>LIVING</Link>
          </Button>
        </div>
        <nav className="site-header-nav hidden min-w-0 items-center gap-8 lg:flex">
          {links.map((link) => link.label === "Home" ? <Link key={link.label} to={isHomeCollection ? "/discover" : "/"} search={isHomeCollection ? { category: "home" } : undefined} onClick={() => { if (isHomeCollection) setSpace("home"); }} className="text-sm text-muted-foreground transition-colors hover:text-foreground" activeProps={{ className: "text-foreground" }}>Home</Link> : <Link key={link.label} to={link.to} search={link.label === "Discover" && isHomeCollection ? { category: "home", view: "discover" } : link.label === "The EDIT" && isHomeCollection ? { collection: "home" } : link.label === "Explore" && isHomeCollection ? { space: "home" } : link.label === "Create" && isHomeCollection ? { space: "home" } : undefined} onClick={() => { if (link.label === "Discover" || link.label === "The EDIT" || link.label === "Explore" || link.label === "Create") setSpace(isHomeCollection ? "home" : space === "home" ? "her" : space); }} className="text-sm text-muted-foreground transition-colors hover:text-foreground" activeProps={{ className: "text-foreground" }}>{link.label}</Link>)}
          {!isHomeCollection && <><Link to="/discover" search={{ category: "jewellery" }} className="text-sm text-muted-foreground transition-colors hover:text-foreground">Jewellery</Link><Link to="/discover" search={{ category: "accessories" }} className="text-sm text-muted-foreground transition-colors hover:text-foreground">Accessories</Link></>}
        </nav>
        <div className="site-header-actions flex shrink-0 items-center gap-1.5">
          <Button variant="ghost" size="icon" aria-label="Search" className="hidden sm:inline-flex" asChild><Link to="/discover"><Search /></Link></Button>
          <Button variant="ghost" size="icon" aria-label={`Shopping bag, ${bagCount} items`} className="relative" asChild><Link to="/checkout"><ShoppingBag />{bagCount > 0 && <span className="absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] leading-4 text-primary-foreground">{bagCount > 99 ? "99+" : bagCount}</span>}</Link></Button>
          <Button variant="ghost" size="icon" aria-label="My Moodboards" title="My Moodboards" asChild><a href="/moodboards"><Bookmark /></a></Button>
          <Button variant="ghost" size="icon" aria-label="Wishlist — liked looks" asChild><Link to="/wishlist"><Heart /></Link></Button>
          {signedIn && <div className="relative"><Button variant="ghost" size="icon" aria-label="Notifications" onClick={() => setNotificationsOpen(v => !v)}><Bell />{notifications.some(n => !n.read_at) && <span className="absolute right-0 top-0 size-2 rounded-full bg-primary" />}</Button>{notificationsOpen && <div className="absolute right-0 top-12 z-[70] w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-border bg-background shadow-xl"><div className="flex items-center justify-between border-b border-border px-4 py-3"><p className="font-medium">Notifications</p><span className="text-xs text-muted-foreground">{notifications.filter(n => !n.read_at).length} unread</span></div><div className="max-h-[420px] overflow-y-auto">{notifications.length ? notifications.map(n => <button key={n.id} type="button" onClick={async () => { if (!n.read_at) { try { await markMyNotificationRead({data:{id:n.id}}); setNotifications(rows => rows.map(x => x.id === n.id ? {...x,read_at:new Date().toISOString()} : x)); } catch { /* Keep unread on failure. */ } } setNotificationsOpen(false); window.location.href=n.href; }} className="block w-full border-b border-border/60 px-4 py-3 text-left hover:bg-muted/50"><span className="flex items-start justify-between gap-2"><span className="text-sm font-medium">{n.title}</span>{!n.read_at && <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{n.body}</span><span className="mt-2 block text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString("en-IN")}</span></button>) : <p className="p-6 text-center text-sm text-muted-foreground">You’re all caught up.</p>}</div></div>}</div>}
          <Button variant="ghost" size="icon" aria-label="Profile" asChild><Link to="/profile"><UserRound /></Link></Button>
          <Button className="site-header-cta hidden shrink-0 whitespace-nowrap px-4 sm:inline-flex" asChild><Link to="/discover">Get Off the Feed</Link></Button>
          <Button variant="ghost" size="icon" aria-label="Open navigation" className="lg:hidden" onClick={() => setOpen((value) => !value)}><Menu /></Button>
        </div>
      </div>
      {open && <nav className="border-t border-[#eadbd2] bg-[#fbf7f2] px-5 py-5 shadow-[0_18px_35px_-25px_rgba(70,45,35,0.35)] lg:hidden">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9a7b70]">Explore OFFFEED</p>
        <div className="grid grid-cols-2 gap-2">{links.map((link) => <Link key={link.label} to={link.label === "Home" && isHomeCollection ? "/discover" : link.to} search={link.label === "Home" && isHomeCollection ? { category: "home" } : link.label === "Discover" && isHomeCollection ? { category: "home" } : link.label === "The EDIT" && isHomeCollection ? { collection: "home" } : link.label === "Explore" && isHomeCollection ? { space: "home" } : link.label === "Create" && isHomeCollection ? { space: "home" } : undefined} className="rounded-xl border border-[#eadbd2] bg-white/75 px-4 py-3 text-sm text-[#5f493f] transition hover:bg-white" onClick={() => { if (link.label === "Home" && isHomeCollection) setSpace("home"); if (link.label === "Discover" || link.label === "The EDIT" || link.label === "Explore" || link.label === "Create") setSpace(isHomeCollection ? "home" : space === "home" ? "her" : space); setOpen(false); }}>{link.label}<span className="float-right text-[#b88a8b]">↗</span></Link>)}</div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {!isHomeCollection && <><Link to="/discover" search={{ category: "jewellery" }} className="rounded-xl bg-[#f2e1df] px-4 py-3 text-sm text-[#76534f]" onClick={() => setOpen(false)}>Jewellery edit ↗</Link><Link to="/discover" search={{ category: "accessories" }} className="rounded-xl bg-[#e8eee4] px-4 py-3 text-sm text-[#536a56]" onClick={() => setOpen(false)}>Accessories edit ↗</Link></>}
          <Link to="/discover" search={{ category: "home" }} className="col-span-2 rounded-xl border border-[#d9c3a7] bg-[#f2e7d6] px-4 py-3 text-sm text-[#76563d]" onClick={() => { setSpace("home"); setOpen(false); }}>LIVING · The living edit ↗</Link>
        </div>
        <Link to="/checkout" className="mt-3 block rounded-xl border border-[#d9c8bd] bg-white px-4 py-3 text-sm text-[#5f493f]" onClick={() => setOpen(false)}>Shopping bag / Checkout</Link>
      </nav>}
    </header>
  );
}