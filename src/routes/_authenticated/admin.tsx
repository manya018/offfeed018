import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, ArrowUpRight, Bell, Boxes, Check, ChevronRight, CircleAlert, ClipboardList, ImagePlus, LayoutDashboard, LoaderCircle, Package, RefreshCw, Search, Settings, ShieldCheck, Store, Truck, Users, Wallet, X, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { verifyAdminAccess, getAdminOverview, getAdminBrands, getAdminProducts, updateAdminBrandStatus } from "@/lib/admin.functions";
import { getOwnerSpotlightCampaigns, updateOwnerSpotlightCampaign } from "@/lib/spotlight.functions";
import { OwnerSaleNotifications } from "@/components/owner-sale-notifications";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    try {
      await verifyAdminAccess();
    } catch {
      throw redirect({ to: "/" });
    }
  },
  head: () => ({ meta: [{ title: "Owner HQ — OFFFEED" }, { name: "description", content: "Private OFFFEED marketplace administration." }] }),
  component: OwnerAdminDashboard,
});

const navItems = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "brands", label: "Brands", icon: Store, count: true },
  { id: "products", label: "Products & Looks", icon: Boxes },
  { id: "spotlight", label: "Spotlight Campaigns", icon: Sparkles },
  { id: "orders", label: "Orders", icon: Package },
  { id: "customers", label: "Customers", icon: Users },
  { id: "trust", label: "OFFFEED TRUST", icon: ShieldCheck },
  { id: "returns", label: "Returns & Refunds", icon: RefreshCw },
  { id: "finance", label: "Payments & Payouts", icon: Wallet },
  { id: "shipping", label: "Shipping", icon: Truck },
  { id: "analytics", label: "Analytics", icon: Activity },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

type Section = typeof navItems[number]["id"];
type AdminOverview = Awaited<ReturnType<typeof getAdminOverview>>;
type AdminBrand = Awaited<ReturnType<typeof getAdminBrands>>[number];

function OwnerAdminDashboard() {
  const [section, setSection] = useState<Section>("overview");
  const [brandSearch, setBrandSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [productStatus, setProductStatus] = useState("all");
  const queryClient = useQueryClient();
  const overview = useQuery({ queryKey: ["owner-admin", "overview"], queryFn: () => getAdminOverview(), retry: 1 });
  const brands = useQuery({ queryKey: ["owner-admin", "brands"], queryFn: () => getAdminBrands(), enabled: section === "brands" || section === "overview", retry: 1 });
  const products = useQuery({ queryKey: ["owner-admin", "products"], queryFn: () => getAdminProducts(), enabled: section === "products", retry: 1 });
  const updateStatus = useMutation({
    mutationFn: (input: { brandId: string; status: "approved" | "declined" | "under_review" }) => updateAdminBrandStatus({ data: input }),
    onSuccess: (brand) => {
      if (brand.emailSent === false) toast.warning(`${brand.brand_name} status saved, but the decision email could not be sent.`);
      else toast.success(`${brand.brand_name} marked ${brand.status}.`);
      queryClient.invalidateQueries({ queryKey: ["owner-admin"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not update brand status."),
  });
  const filteredBrands = useMemo(() => (brands.data ?? []).filter((brand) => {
    const query = brandSearch.trim().toLowerCase();
    return !query || [brand.brand_name, brand.contact_name, brand.email, brand.social_handle].some((value) => value?.toLowerCase().includes(query));
  }), [brands.data, brandSearch]);
  const filteredProducts = useMemo(() => (products.data ?? []).filter((product) => {
    const query = productSearch.trim().toLowerCase();
    const matchesSearch = !query || [product.product_name, product.brand_name, product.brand_email, product.category, product.source].some((value) => value?.toLowerCase().includes(query));
    const matchesStatus = productStatus === "all" || product.status?.toLowerCase() === productStatus;
    return matchesSearch && matchesStatus;
  }), [products.data, productSearch, productStatus]);
  const activeNav = navItems.find((item) => item.id === section);
  const ActiveSectionIcon = activeNav?.icon ?? ClipboardList;

  return (
    <div className="min-h-screen bg-[#f7f4ef] text-[#302824]">
      <div className="flex min-h-screen">
        <aside className="hidden w-[260px] shrink-0 border-r border-[#e8dfd6] bg-[#fbf9f5] lg:flex lg:flex-col">
          <div className="border-b border-[#e8dfd6] px-6 py-6">
            <div className="font-serif text-[27px] tracking-[0.16em] text-[#76534b]">OFFFEED</div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9a8178]">Owner HQ · Control centre</div>
          </div>
          <div className="px-4 py-5">
            <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a28e84]">Workspace</div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const selected = section === item.id;
                return <button key={item.id} onClick={() => setSection(item.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] transition-colors ${selected ? "bg-[#eadbd5] font-semibold text-[#704d46]" : "text-[#766b64] hover:bg-[#f0eae4] hover:text-[#493a34]"}`}>
                  <Icon className="size-[17px]" strokeWidth={1.7}/>
                  <span className="flex-1">{item.label}</span>
                  {item.id === "brands" && (overview.data?.pendingBrands ?? 0) > 0 && <span className="rounded-full bg-[#a96f61] px-2 py-0.5 text-[10px] text-white">{overview.data?.pendingBrands}</span>}
                </button>;
              })}
            </nav>
          </div>
          <div className="mt-auto border-t border-[#e8dfd6] p-4">
            <div className="rounded-xl bg-[#f0e9e2] p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#6c5148]"><ShieldCheck className="size-4"/> Owner access</div>
              <p className="mt-1 break-all text-[11px] text-[#8d776e]">manyagupta018@gmail.com</p>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-[#e8dfd6] bg-[#fbf9f5]/95 px-5 backdrop-blur md:px-9">
            <div className="min-w-0">
              <div className="font-serif text-xl text-[#76534b] lg:hidden">OFFFEED <span className="font-sans text-[10px] tracking-widest text-[#9a8178]">OWNER HQ</span></div>
              <div className="hidden text-[11px] uppercase tracking-[0.18em] text-[#9a8178] lg:block">Marketplace administration</div>
              <div className="text-sm font-semibold text-[#493a34]">{activeNav?.label ?? "Overview"}</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="hidden border-[#d9c9bf] bg-[#f5eee8] text-[#76534b] sm:inline-flex">Private workspace</Badge>
              <div className="flex size-9 items-center justify-center rounded-full bg-[#e8d8d1] text-xs font-semibold text-[#76534b]">MG</div>
            </div>
          </header>

          <div className="border-b border-[#e8dfd6] bg-[#fbf9f5] px-4 py-2 lg:hidden">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {navItems.map((item) => <button key={item.id} onClick={() => setSection(item.id)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs ${section === item.id ? "bg-[#76534b] text-white" : "bg-[#f0eae4] text-[#766b64]"}`}>{item.label}</button>)}
            </div>
          </div>

          <div className="mx-auto max-w-[1440px] px-4 py-7 md:px-9 md:py-9">
            {section === "notifications" ? <OwnerSaleNotifications /> : null}
            {section === "overview" ? <OverviewSection overview={overview} brands={brands} onOpenBrands={() => setSection("brands")}/> : null}
            {section === "brands" ? <section>
              <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a28e84]">Marketplace management</p><h1 className="mt-1 font-serif text-3xl text-[#493a34]">Brand applications</h1><p className="mt-1 text-sm text-[#887a72]">Review applications and manage marketplace access.</p></div>
                <div className="relative w-full sm:max-w-xs"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#a28e84]"/><Input value={brandSearch} onChange={(event) => setBrandSearch(event.target.value)} placeholder="Search brands, email, handle…" className="border-[#e4d9d0] bg-[#fbf9f5] pl-9"/></div>
              </div>
              <div className="overflow-hidden rounded-2xl border border-[#e8dfd6] bg-[#fbf9f5]">
                {brands.isLoading ? <div className="flex items-center justify-center gap-2 p-12 text-sm text-[#887a72]"><LoaderCircle className="size-4 animate-spin"/> Loading applications…</div> : brands.isError ? <div className="p-8 text-sm text-red-700">{brands.error instanceof Error ? brands.error.message : "Could not load brands."}<Button variant="outline" size="sm" className="ml-3" onClick={() => brands.refetch()}>Retry</Button></div> : filteredBrands.length === 0 ? <div className="p-12 text-center"><Store className="mx-auto size-8 text-[#b9a79d]"/><p className="mt-3 font-medium text-[#57463e]">No brand applications found</p><p className="mt-1 text-sm text-[#94857d]">Applications will appear here when brands register.</p></div> : <div className="divide-y divide-[#eee6df]">
                  {filteredBrands.map((brand) => <div key={brand.id} className="flex flex-col gap-4 p-5 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><h3 className="font-serif text-xl text-[#493a34]">{brand.brand_name}</h3><Badge variant="outline" className={`capitalize ${brand.status === "approved" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : brand.status === "declined" ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}>{brand.status}</Badge></div>
                      <p className="mt-1 text-xs text-[#8b7d75]">{brand.contact_name} · {brand.email}</p>
                      <p className="mt-1 text-xs text-[#a08e84]">{brand.category} · {brand.social_handle || "No social handle"} · {new Date(brand.created_at).toLocaleDateString("en-IN")}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {brand.website_url && <Button asChild size="sm" variant="outline" className="border-[#e1d5cc]"><a href={brand.website_url} target="_blank" rel="noreferrer">Website <ArrowUpRight className="ml-1 size-3"/></a></Button>}
                      {brand.status !== "approved" && <Button size="sm" disabled={updateStatus.isPending} onClick={() => updateStatus.mutate({ brandId: brand.id, status: "approved" })} className="bg-[#76534b] text-white hover:bg-[#63443e]"><Check className="mr-1 size-3.5"/> Approve</Button>}
                      {brand.status !== "declined" && <Button size="sm" variant="outline" disabled={updateStatus.isPending} onClick={() => updateStatus.mutate({ brandId: brand.id, status: "declined" })} className="border-[#e5c9c3] text-[#9b5149] hover:bg-[#fbefed]"><X className="mr-1 size-3.5"/> Decline</Button>}
                    </div>
                  </div>)}
                </div>}
              </div>
            </section> : null}
            {section === "spotlight" ? <SpotlightAdminSection /> : null}\n            {section === "products" ? <section>
              <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a28e84]">Marketplace catalogue</p>
                  <h1 className="mt-1 font-serif text-3xl text-[#493a34]">Products & looks</h1>
                  <p className="mt-1 text-sm text-[#887a72]">Monitor product listings and complete looks submitted by OFFFEED brands. This view is read-only.</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#a28e84]"/>
                    <Input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Search listings or brands…" className="border-[#e4d9d0] bg-[#fbf9f5] pl-9"/>
                  </div>
                  <select aria-label="Filter products by status" value={productStatus} onChange={(event) => setProductStatus(event.target.value)} className="h-10 rounded-md border border-[#e4d9d0] bg-[#fbf9f5] px-3 text-sm text-[#57463e]">
                    <option value="all">All statuses</option>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>
              <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-[#887a72]">
                <Badge variant="outline" className="border-[#d9c9bf] bg-[#f5eee8] text-[#76534b]">{products.data?.length ?? 0} listings loaded</Badge>
                <span>{filteredProducts.length} matching your filters</span>
                <Button variant="ghost" size="sm" onClick={() => void products.refetch()} className="ml-auto text-[#76534b]"><RefreshCw className="mr-1 size-3.5"/>Refresh</Button>
              </div>
              <div className="overflow-hidden rounded-2xl border border-[#e8dfd6] bg-[#fbf9f5]">
                {products.isLoading ? <div className="flex items-center justify-center gap-2 p-12 text-sm text-[#887a72]"><LoaderCircle className="size-4 animate-spin"/>Loading marketplace listings…</div>
                  : products.isError ? <div className="p-8 text-sm text-red-700">{products.error instanceof Error ? products.error.message : "Could not load products and looks."}<Button variant="outline" size="sm" className="ml-3" onClick={() => void products.refetch()}>Retry</Button></div>
                  : filteredProducts.length === 0 ? <div className="p-12 text-center"><Boxes className="mx-auto size-8 text-[#b9a79d]"/><p className="mt-3 font-medium text-[#57463e]">{products.data?.length ? "No listings match these filters" : "No products or looks yet"}</p><p className="mt-1 text-sm text-[#94857d]">{products.data?.length ? "Try a different search or status filter." : "When approved brands add products or complete looks, they will appear here."}</p></div>
                  : <div className="divide-y divide-[#eee6df]">
                    {filteredProducts.map((product) => <article key={product.id} className="grid grid-cols-[76px_minmax(0,1fr)] gap-4 p-4 sm:grid-cols-[88px_minmax(0,1fr)_auto] sm:items-center">
                      <div className="size-[76px] overflow-hidden rounded-lg bg-[#f0eae4] sm:size-[88px]">{product.imageUrl ? <img src={product.imageUrl} alt={product.product_name} className="size-full object-cover"/> : <div className="grid size-full place-items-center"><ImagePlus className="size-5 text-[#b9a79d]"/></div>}</div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-serif text-lg text-[#493a34]">{product.product_name}</h3><Badge variant="outline" className={product.status === "published" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}>{product.status || "unknown"}</Badge>{product.source === "shopify" && <Badge variant="outline">Shopify</Badge>}</div>
                        <p className="mt-1 text-sm text-[#76534b]">{product.brand_name} <span className="text-[#a08e84]">· {product.brand_email || "No brand email"}</span></p>
                        <p className="mt-1 text-xs text-[#8b7d75]">{product.category} · {product.audience.map((item) => item === "her" ? "HER" : item === "him" ? "HIM" : item.toUpperCase()).join(" + ") || "No audience"} · {new Date(product.created_at).toLocaleDateString("en-IN")}</p>
                        <p className="mt-1 truncate text-xs text-[#a08e84]">{product.sizes.length ? "Sizes: " + product.sizes.join(", ") : "No sizes"}{product.colors.length ? " · Colours: " + product.colors.join(", ") : ""}</p>
                      </div>
                      <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:flex-col sm:items-end">
                        <p className="font-medium text-[#493a34]">{product.currency === "INR" ? "₹" : product.currency + " "}{Number(product.price).toLocaleString("en-IN")}</p>
                        {product.product_url && <a href={product.product_url} target="_blank" rel="noreferrer" className="text-xs text-[#76534b] underline underline-offset-2">Original listing</a>}
                      </div>
                    </article>)}
                  </div>}
              </div>
              <p className="mt-3 text-[11px] text-[#a08e84]">Showing the latest 500 listings at most. No listing status or brand data is changed from this screen.</p>
            </section> : null}
            {section !== "overview" && section !== "brands" && section !== "products" && section !== "spotlight" && section !== "notifications" ? <section className="rounded-2xl border border-[#e8dfd6] bg-[#fbf9f5] p-8 md:p-12">
              <div className="mx-auto max-w-lg text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#efe4de] text-[#76534b]">{activeNav ? <ActiveSectionIcon className="size-6"/> : <ClipboardList className="size-6"/>}</div>
                <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a28e84]">Owner HQ module</p>
                <h1 className="mt-2 font-serif text-3xl text-[#493a34]">{activeNav?.label}</h1>
                <p className="mt-2 text-sm leading-6 text-[#887a72]">This module is reserved in the admin navigation. Its operational data and actions will be connected in the next implementation pass, without showing placeholder metrics as real marketplace data.</p>
                <Button variant="outline" className="mt-6 border-[#d9c9bf] text-[#76534b]" onClick={() => setSection("overview")}>Back to overview</Button>
              </div>
            </section> : null}
            <div className="mt-8 flex items-center justify-between border-t border-[#e8dfd6] pt-4 text-[11px] text-[#a08e84]"><span>OFFFEED OWNER HQ · PRIVATE ADMINISTRATION</span><span>Owner access only</span></div>
          </div>
        </main>
      </div>
    </div>
  );
}

function OverviewSection({ overview, brands, onOpenBrands }: { overview: { data: AdminOverview | undefined; isLoading: boolean; isError: boolean; error: unknown; refetch: () => unknown }; brands: { data: AdminBrand[] | undefined; isLoading: boolean; refetch: () => unknown }; onOpenBrands: () => void }) {
  const stats = [
    { label: "Brand applications", value: overview.data?.totalBrands, icon: Store, note: "All submitted applications" },
    { label: "Pending review", value: overview.data?.pendingBrands, icon: CircleAlert, note: "Awaiting your decision" },
    { label: "Products & looks", value: overview.data?.totalProducts, icon: Boxes, note: "Marketplace listings" },
    { label: "Total orders", value: overview.data?.totalOrders, icon: Package, note: "Orders recorded" },
    { label: "Return cases", value: overview.data?.openReturns, icon: RefreshCw, note: "Recorded return requests" },
  ];
  return <section>
    <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a28e84]">Your marketplace, at a glance</p><h1 className="mt-1 font-serif text-4xl text-[#493a34]">Good evening.</h1><p className="mt-2 text-sm text-[#887a72]">Here’s what’s happening across OFFFEED.</p></div>
      <Button variant="outline" onClick={() => { overview.refetch(); brands.refetch(); }} className="w-fit border-[#e1d5cc] bg-[#fbf9f5] text-[#76534b]"><RefreshCw className="mr-2 size-4"/> Refresh data</Button>
    </div>
    {overview.isError ? <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{overview.error instanceof Error ? overview.error.message : "Overview could not be loaded."}</div> : null}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {stats.map((stat) => { const Icon = stat.icon; return <div key={stat.label} className="rounded-2xl border border-[#e8dfd6] bg-[#fbf9f5] p-5"><div className="flex items-center justify-between"><span className="text-xs text-[#8e7f76]">{stat.label}</span><Icon className="size-4 text-[#a17d70]"/></div><div className="mt-4 font-serif text-4xl text-[#493a34]">{overview.isLoading ? "—" : (stat.value ?? 0).toLocaleString("en-IN")}</div><p className="mt-2 text-[11px] text-[#a08e84]">{stat.note}</p></div>; })}
    </div>
    <div className="mt-6 grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
      <div className="rounded-2xl border border-[#e8dfd6] bg-[#fbf9f5] p-6">
        <div className="flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a28e84]">Needs attention</p><h2 className="mt-1 font-serif text-2xl text-[#493a34]">Brand review queue</h2></div><Button variant="ghost" size="sm" onClick={onOpenBrands} className="text-[#76534b]">View all <ChevronRight className="ml-1 size-4"/></Button></div>
        {brands.isLoading ? <div className="py-8 text-sm text-[#94857d]">Loading brand applications…</div> : (brands.data ?? []).filter((brand) => brand.status === "under_review").length === 0 ? <div className="py-8 text-sm text-[#94857d]">No brand applications are awaiting review right now.</div> : <div className="mt-4 divide-y divide-[#eee6df]">{(brands.data ?? []).filter((brand) => brand.status === "under_review").slice(0, 5).map((brand) => <div key={brand.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium text-[#57463e]">{brand.brand_name}</p><p className="text-xs text-[#9a8a81]">{brand.category} · {brand.email}</p></div><Badge className="bg-amber-50 text-amber-800 hover:bg-amber-50">Under review</Badge></div>)}</div>}
      </div>
      <div className="rounded-2xl border border-[#e8dfd6] bg-[#f0e8e1] p-6"><div className="flex items-center gap-2 text-[#76534b]"><ShieldCheck className="size-5"/><span className="text-xs font-semibold uppercase tracking-[0.16em]">Owner controls</span></div><h2 className="mt-4 font-serif text-2xl text-[#493a34]">Your marketplace. Your decisions.</h2><p className="mt-2 text-sm leading-6 text-[#806e64]">Review brands, monitor activity and manage OFFFEED operations from one private workspace.</p><div className="mt-5 rounded-xl border border-[#dfd0c6] bg-[#fbf9f5]/70 p-3"><p className="text-[10px] uppercase tracking-widest text-[#a08e84]">Signed-in owner</p><p className="mt-1 break-all text-sm font-medium text-[#76534b]">manyagupta018@gmail.com</p></div></div>
    </div>
  </section>;
}


function SpotlightAdminSection() {
  const queryClient = useQueryClient();
  const campaigns = useQuery({ queryKey: ["owner-spotlight-campaigns"], queryFn: () => getOwnerSpotlightCampaigns(), retry: 1 });
  const [drafts, setDrafts] = useState<Record<string, { status: "approved" | "active" | "rejected" | "completed"; paymentStatus: "pending" | "paid" | "refunded" | "waived"; price: string; startsAt: string; paymentReference: string; note: string }>>({});
  const update = useMutation({
    mutationFn: (input: { campaignId: string; status: "approved" | "active" | "rejected" | "completed"; paymentStatus: "pending" | "paid" | "refunded" | "waived"; campaignPrice: number; startsAt?: string; paymentReference: string; adminNote: string }) => updateOwnerSpotlightCampaign({ data: { ...input, ...(input.startsAt ? { startsAt: new Date(input.startsAt).toISOString() } : {}) } }),
    onSuccess: () => { toast.success("Spotlight campaign updated."); void queryClient.invalidateQueries({ queryKey: ["owner-spotlight-campaigns"] }); },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Campaign update failed."),
  });
  const getDraft = (campaign: any) => drafts[campaign.id] ?? {
    status: campaign.status === "submitted" ? "approved" : campaign.status,
    paymentStatus: campaign.payment_status,
    price: String(campaign.campaign_price ?? 0),
    startsAt: campaign.starts_at ? new Date(campaign.starts_at).toISOString().slice(0, 16) : "",
    paymentReference: campaign.payment_reference ?? "",
    note: campaign.admin_note ?? "",
  };
  const patch = (id: string, values: Partial<ReturnType<typeof getDraft>>) => setDrafts((current) => ({ ...current, [id]: { ...getDraft((campaigns.data ?? []).find((item: any) => item.id === id)), ...values } }));
  return <section>
    <div className="mb-6"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a28e84]">Campaign operations</p><h1 className="mt-1 font-serif text-3xl text-[#493a34]">Spotlight campaigns</h1><p className="mt-2 text-sm text-[#887a72]">Review brand selections, set campaign pricing, record payment confirmation and schedule approved features.</p></div>
    {campaigns.isLoading ? <div className="rounded-2xl border border-[#e8dfd6] bg-[#fbf9f5] p-10 text-sm text-[#887a72]">Loading Spotlight applications…</div> :
     campaigns.isError ? <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{campaigns.error instanceof Error ? campaigns.error.message : "Could not load campaigns."}<Button variant="outline" size="sm" className="ml-3" onClick={() => void campaigns.refetch()}>Retry</Button></div> :
     !campaigns.data?.length ? <div className="rounded-2xl border border-dashed border-[#e8dfd6] bg-[#fbf9f5] p-12 text-center text-sm text-[#887a72]">No Spotlight applications have been submitted yet.</div> :
     <div className="grid gap-5">{campaigns.data.map((campaign: any) => {
       const draft = getDraft(campaign);
       const brand = campaign.brand_applications;
       const selected = [...(campaign.spotlight_campaign_products ?? [])].sort((a: any,b: any) => a.position-b.position);
       return <article key={campaign.id} className="rounded-2xl border border-[#e8dfd6] bg-[#fbf9f5] p-5 sm:p-6">
         <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#a28e84]">{campaign.audience.toUpperCase()} · {campaign.duration_days}-DAY CAMPAIGN</p><h2 className="mt-1 font-serif text-2xl text-[#493a34]">{brand?.brand_name ?? "Brand"}</h2><p className="mt-1 text-xs text-[#887a72]">{brand?.email} · Applied {new Date(campaign.created_at).toLocaleDateString("en-IN")}</p></div><Badge variant="outline" className="capitalize">{campaign.status} · {campaign.payment_status}</Badge></div>
         <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{selected.map((item: any) => <div key={item.product_id} className="rounded-lg border border-[#eee6df] bg-white/70 p-3"><p className="text-sm font-medium text-[#57463e]">{item.brand_products?.product_name ?? "Product unavailable"}</p><p className="mt-1 text-xs text-[#887a72]">₹{Number(item.brand_products?.price ?? 0).toLocaleString("en-IN")} · {item.brand_products?.status ?? "unknown"}{item.brand_products?.brand_approved ? " · approved" : " · awaiting approval"}</p></div>)}</div>
         <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
           <label className="text-xs font-medium text-[#766b64]">Campaign status<select value={draft.status} onChange={(e) => patch(campaign.id,{status:e.target.value as any})} className="mt-2 h-10 w-full rounded-md border border-[#e4d9d0] bg-white px-3 text-sm"><option value="approved">Approved</option><option value="active">Active</option><option value="rejected">Rejected</option><option value="completed">Completed</option></select></label>
           <label className="text-xs font-medium text-[#766b64]">Payment status<select value={draft.paymentStatus} onChange={(e) => patch(campaign.id,{paymentStatus:e.target.value as any})} className="mt-2 h-10 w-full rounded-md border border-[#e4d9d0] bg-white px-3 text-sm"><option value="pending">Pending</option><option value="paid">Paid — verified</option><option value="waived">Waived</option><option value="refunded">Refunded</option></select></label>
           <label className="text-xs font-medium text-[#766b64]">Campaign price (₹)<Input type="number" min="0" step="0.01" value={draft.price} onChange={(e) => patch(campaign.id,{price:e.target.value})} className="mt-2 border-[#e4d9d0] bg-white"/></label>
           <label className="text-xs font-medium text-[#766b64]">Start date & time<Input type="datetime-local" value={draft.startsAt} onChange={(e) => patch(campaign.id,{startsAt:e.target.value})} className="mt-2 border-[#e4d9d0] bg-white"/></label>
           <label className="text-xs font-medium text-[#766b64]">Payment reference<Input value={draft.paymentReference} onChange={(e) => patch(campaign.id,{paymentReference:e.target.value})} placeholder="Transaction / receipt reference" className="mt-2 border-[#e4d9d0] bg-white"/></label>
           <label className="text-xs font-medium text-[#766b64] sm:col-span-2 lg:col-span-1">Internal note<Input value={draft.note} onChange={(e) => patch(campaign.id,{note:e.target.value})} placeholder="Notes for this campaign" className="mt-2 border-[#e4d9d0] bg-white"/></label>
         </div>
         <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="max-w-xl text-xs leading-5 text-[#887a72]">To activate: mark payment as Paid or Waived and set a start date. Products rotate weekly during the campaign.</p><Button disabled={update.isPending} onClick={() => update.mutate({campaignId:campaign.id,status:draft.status,paymentStatus:draft.paymentStatus,campaignPrice:Number(draft.price),startsAt:draft.startsAt || undefined,paymentReference:draft.paymentReference,adminNote:draft.note})}>{update.isPending ? <LoaderCircle className="size-4 animate-spin"/> : <Check className="size-4"/>}Save campaign</Button></div>
       </article>;
     })}</div>}
  </section>;
}
