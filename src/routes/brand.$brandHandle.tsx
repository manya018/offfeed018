import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight, Instagram, Store } from "lucide-react";
import { useStyleSpace } from "@/lib/style-space";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PublicProductCard } from "@/components/public-product-card";
import { getPublicBrandProfile } from "@/lib/public-brand.functions";

export const Route = createFileRoute("/brand/$brandHandle")({
  loader: async ({ params }) => {
    const profile = await getPublicBrandProfile({ data: { brandHandle: params.brandHandle } });
    if (!profile) throw notFound();
    return profile;
  },
  head: ({ loaderData }) => {
    const brandName = loaderData?.brand.name ?? "Brand storefront";
    const description = loaderData?.brand.description ?? "Explore independent fashion brands on OFFFEED.";
    const meta = [
      { title: `${brandName} — OFFFEED` },
      { name: "description", content: description },
      { property: "og:title", content: `${brandName} — OFFFEED` },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ];
    if (loaderData?.brand.coverUrl) {
      meta.push({ property: "og:image", content: loaderData.brand.coverUrl });
      meta.push({ name: "twitter:image", content: loaderData.brand.coverUrl });
    }
    return { meta };
  },
  notFoundComponent: BrandNotFound,
  errorComponent: BrandPageError,
  component: BrandProfilePage,
});

function BrandProfilePage() {
  const { brand, products } = Route.useLoaderData();
  const { space } = useStyleSpace();
  const availableAudience = brand.audience.includes(space) ? space : brand.audience[0] ?? "her";
  const visibleProducts = products.filter((product) => product.audience.includes(availableAudience));
  const socialUrl = brand.socialHandle
    ? `https://www.instagram.com/${brand.socialHandle.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/\/$/, "")}`
    : null;
  let websiteUrl: string | null = null;
  try {
    const parsed = new URL(brand.website);
    if (parsed.protocol === "https:") websiteUrl = parsed.toString();
  } catch {
    websiteUrl = null;
  }

  return (
    <main className="mx-auto max-w-7xl px-5 pb-16 pt-7 sm:px-8 lg:px-12">
      <Button variant="ghost" asChild><Link to="/discover"><ArrowLeft />Back to discovery</Link></Button>
      <section className="mt-5">
        <div className="relative aspect-[2.8/1] min-h-48 overflow-hidden bg-secondary sm:min-h-64">
          {brand.coverUrl && <img src={brand.coverUrl} alt={`${brand.name} campaign`} className="size-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/45 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 flex items-end gap-4 sm:bottom-7 sm:left-8">
            {brand.logoUrl && <img src={brand.logoUrl} alt={`${brand.name} logo`} className="size-16 rounded-full border-2 border-background object-cover sm:size-24" />}
            <div className="pb-1 text-background">
              <Badge variant="secondary" className="mb-2">OFFFEED brand</Badge>
              <p className="text-xs font-medium uppercase tracking-[0.16em]">@{brand.handle}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-7 border-b border-border/70 py-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{brand.category}</p>
            <h1 className="mt-2 font-display text-5xl font-medium sm:text-6xl">{brand.name}</h1>
            <p className="mt-4 max-w-2xl whitespace-pre-line text-sm leading-7 text-muted-foreground">{brand.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {brand.audience.map((item) => <Badge key={item} variant="outline">{item === "her" ? "Her edit" : "Him edit"}</Badge>)}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {websiteUrl && <Button asChild><a href={websiteUrl} target="_blank" rel="noreferrer"><Store />Shop website<ArrowUpRight /></a></Button>}
            {socialUrl && <Button variant="outline" asChild><a href={socialUrl} target="_blank" rel="noreferrer"><Instagram />Instagram</a></Button>}
          </div>
        </div>
      </section>

      <section className="pt-8" aria-labelledby="brand-products-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">The collection</p>
            <h2 id="brand-products-heading" className="mt-2 font-display text-3xl">Published pieces</h2>
          </div>
          <Badge variant="secondary">{availableAudience === "her" ? "Her space" : "Him space"}</Badge>
        </div>
        {visibleProducts.length ? (
          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4">
            {visibleProducts.map((product) => (
              <PublicProductCard key={product.id} product={{
                ...product,
                brand: { name: brand.name, handle: brand.handle, category: brand.category },
              }} />
            ))}
          </div>
        ) : (
          <div className="mt-7 border-y border-dashed border-border/70 py-14 text-center">
            <h3 className="font-display text-2xl">A new collection is on its way.</h3>
            <p className="mt-2 text-sm text-muted-foreground">There are no published pieces in this edit just yet.</p>
          </div>
        )}
      </section>
    </main>
  );
}

function BrandNotFound() {
  return <main className="mx-auto max-w-2xl px-5 py-20 text-center"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">OFFFEED · BRANDS</p><h1 className="mt-3 font-display text-4xl">This brand isn’t here yet.</h1><p className="mt-3 text-sm text-muted-foreground">The storefront may be private or its address may have changed.</p><Button className="mt-6" asChild><Link to="/discover">Explore discovery</Link></Button></main>;
}

function BrandPageError({ reset }: { reset: () => void }) {
  return <main className="mx-auto max-w-2xl px-5 py-20 text-center"><h1 className="font-display text-4xl">This storefront couldn’t load.</h1><p className="mt-3 text-sm text-muted-foreground">Please try again in a moment.</p><Button className="mt-6" onClick={reset}>Try again</Button></main>;
}