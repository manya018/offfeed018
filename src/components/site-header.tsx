import { Link } from "@tanstack/react-router";
import { Menu, Search, UserRound } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const links = [
  { label: "Home", to: "/" as const },
  { label: "Discover", to: "/discover" as const },
  { label: "Explore", to: "/explore" as const },
  { label: "Create", to: "/create" as const },
  { label: "About", to: "/about" as const },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-5 lg:px-10">
        <Link to="/" className="font-display text-2xl font-semibold tracking-[0.14em]">OFFFEED</Link>
        <nav className="hidden items-center gap-8 lg:flex">
          {links.map((link) => <Link key={link.label} to={link.to} className="text-sm text-muted-foreground transition-colors hover:text-foreground" activeProps={{ className: "text-foreground" }}>{link.label}</Link>)}
        </nav>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" aria-label="Search" asChild><Link to="/discover"><Search /></Link></Button>
          <Button variant="ghost" size="icon" aria-label="Profile" asChild><Link to="/profile"><UserRound /></Link></Button>
          <Button className="hidden sm:inline-flex" asChild><Link to="/discover">Get Off the Feed</Link></Button>
          <Button variant="ghost" size="icon" aria-label="Open navigation" className="lg:hidden" onClick={() => setOpen((value) => !value)}><Menu /></Button>
        </div>
      </div>
      {open && <nav className="grid border-t border-border bg-background px-5 py-4 lg:hidden">{links.map((link) => <Link key={link.label} to={link.to} className="py-3 text-sm" onClick={() => setOpen(false)}>{link.label}</Link>)}</nav>}
    </header>
  );
}