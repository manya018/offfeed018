import { Link } from "@tanstack/react-router";
import { Menu, Search, UserRound, ShoppingBag, Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useStyleSpace } from "@/lib/style-space";
import { offfeedCartEventName, readOfffeedCart } from "@/lib/cart";

const links = [
  { label: "Home", to: "/" as const },
  { label: "Discover", to: "/discover" as const },
  { label: "Explore", to: "/explore" as const },
  { label: "Create", to: "/create" as const },
  { label: "For Brands", to: "/for-brands/apply" as const },
  { label: "About", to: "/about" as const },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [bagCount, setBagCount] = useState(0);
  const { space, setSpace } = useStyleSpace();
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
      <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-5 lg:px-10">
        <Link to="/" className="font-display text-2xl font-semibold tracking-[0.14em]">OFFFEED</Link>
        <div className="flex shrink-0 items-center rounded-full border border-border bg-card p-1" aria-label="Choose your style space">
          {(["her", "him"] as const).map((option) => <Button key={option} size="sm" variant={space === option ? "default" : "ghost"} aria-pressed={space === option} onClick={() => setSpace(option)} className="h-8 min-w-10 rounded-full px-2.5">{option === "her" ? "Her" : "Him"}</Button>)}
        </div>
        <nav className="hidden items-center gap-8 lg:flex">
          {links.map((link) => <Link key={link.label} to={link.to} className="text-sm text-muted-foreground transition-colors hover:text-foreground" activeProps={{ className: "text-foreground" }}>{link.label}</Link>)}
          <Link to="/discover" search={{ category: "jewellery" }} className="text-sm text-muted-foreground transition-colors hover:text-foreground">Jewellery</Link>
          <Link to="/discover" search={{ category: "accessories" }} className="text-sm text-muted-foreground transition-colors hover:text-foreground">Accessories</Link>
        </nav>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" aria-label="Search" className="hidden sm:inline-flex" asChild><Link to="/discover"><Search /></Link></Button>
          <Button variant="ghost" size="icon" aria-label={`Shopping bag, ${bagCount} items`} className="relative" asChild><Link to="/checkout"><ShoppingBag />{bagCount > 0 && <span className="absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] leading-4 text-primary-foreground">{bagCount > 99 ? "99+" : bagCount}</span>}</Link></Button>
          <Button variant="ghost" size="icon" aria-label="Wishlist — liked looks" asChild><Link to="/wishlist"><Heart /></Link></Button>
          <Button variant="ghost" size="icon" aria-label="Profile" asChild><Link to="/profile"><UserRound /></Link></Button>
          <Button className="hidden sm:inline-flex" asChild><Link to="/discover">Get Off the Feed</Link></Button>
          <Button variant="ghost" size="icon" aria-label="Open navigation" className="lg:hidden" onClick={() => setOpen((value) => !value)}><Menu /></Button>
        </div>
      </div>
      {open && <nav className="border-t border-[#eadbd2] bg-[#fbf7f2] px-5 py-5 shadow-[0_18px_35px_-25px_rgba(70,45,35,0.35)] lg:hidden">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9a7b70]">Explore OFFFEED</p>
        <div className="grid grid-cols-2 gap-2">{links.map((link) => <Link key={link.label} to={link.to} className="rounded-xl border border-[#eadbd2] bg-white/75 px-4 py-3 text-sm text-[#5f493f] transition hover:bg-white" onClick={() => setOpen(false)}>{link.label}<span className="float-right text-[#b88a8b]">↗</span></Link>)}</div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link to="/discover" search={{ category: "jewellery" }} className="rounded-xl bg-[#f2e1df] px-4 py-3 text-sm text-[#76534f]" onClick={() => setOpen(false)}>Jewellery edit ↗</Link>
          <Link to="/discover" search={{ category: "accessories" }} className="rounded-xl bg-[#e8eee4] px-4 py-3 text-sm text-[#536a56]" onClick={() => setOpen(false)}>Accessories edit ↗</Link>
        </div>
        <Link to="/checkout" className="mt-3 block rounded-xl border border-[#d9c8bd] bg-white px-4 py-3 text-sm text-[#5f493f]" onClick={() => setOpen(false)}>Shopping bag / Checkout</Link>
      </nav>}
    </header>
  );
}