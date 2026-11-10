import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBrandWorkspace } from "@/lib/brand-products.functions";
import { BrandSpotlightSection } from "./dashboard";

export const Route = createFileRoute("/_authenticated/brand/spotlight")({
  head: () => ({ meta: [
    { title: "Apply for Spotlight — OFFFEED" },
    { name: "description", content: "Choose a Spotlight package and reserve a weekly edition for your brand." },
  ] }),
  component: BrandSpotlightPage,
});

function BrandSpotlightPage() {
  const workspace = useQuery({ queryKey: ["brand-workspace"], queryFn: () => getBrandWorkspace() });
  const application = workspace.data?.application;
  const audiences = (application?.audience ?? ["her"]).filter(
    (item): item is "her" | "him" | "home" => item === "her" || item === "him" || item === "home",
  );
  const products = (workspace.data?.products ?? []).map((product: any) => ({
    id: product.id,
    product_name: product.product_name,
    price: product.price,
    status: product.status,
    audience: product.audience ?? [],
    imageUrl: product.imageUrl ?? product.image_url ?? null,
  }));

  return <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
    <div className="mb-5"><Button asChild variant="ghost" className="-ml-3"><Link to="/_authenticated/brand/dashboard"><ArrowLeft className="size-4"/>Back to Brand Dashboard</Link></Button></div>
    {workspace.isLoading ? <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin"/>Loading your brand workspace…</div> :
      workspace.isError ? <div className="rounded-xl border border-destructive/30 p-5 text-sm text-muted-foreground">Your brand workspace couldn't be loaded. Please refresh the page.</div> :
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 rounded-2xl border border-border/70 bg-card p-5 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">THE OFFFEED EDIT · SPOTLIGHT</p>
          <h1 className="mt-2 font-display text-3xl sm:text-4xl">Apply for The Spotlight Edit</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">This is your dedicated Spotlight booking page. Review the packages, choose an audience and available Monday, and reserve your brand's place.</p>
        </div>
        <section className="mb-7 border-b border-border/70 pb-7">
          <h2 className="font-display text-2xl">How Spotlight works</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Feature 2–4 existing products from your collection in a dedicated brand row. Choose a 1, 2 or 4-week campaign. Each audience has up to 10 brand places per weekly edition.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[{name:"1 week",price:"₹1,499"},{name:"2 weeks",price:"₹2,499"},{name:"4 weeks",price:"₹3,999"}].map((item) => <div key={item.name} className="rounded-xl border border-border/70 p-4"><p className="text-sm text-muted-foreground">{item.name}</p><p className="mt-1 font-display text-2xl">{item.price}</p></div>)}
          </div>
        </section>
        <BrandSpotlightSection products={products} audiences={audiences}/>
      </div>}
  </main>;
}
