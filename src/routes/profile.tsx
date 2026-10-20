import { createFileRoute, Link } from "@tanstack/react-router";
import { LoaderCircle, Package, MapPin, UserRound, LogIn, ArrowRight, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Order = { id: string; order_number: string; product_name: string; quantity: number; unit_price: number | string; status: string; created_at: string; estimated_delivery_start?: string | null; estimated_delivery_end?: string | null; tracking_url?: string | null };
type Address = { id: string; label: string; line1: string; line2?: string | null; city: string; state: string; pin_code: string; is_default: boolean };

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "My Account — OFFFEED" }, { name: "description", content: "Manage your OFFFEED account, orders and delivery addresses." }] }),
  component: ProfilePage,
});
function ProfilePage() {
  const [accountLoading, setAccountLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "orders" | "addresses" | "wishlist">("overview");

  const loadAccount = useCallback(async () => {
    setAccountLoading(true);
    try {
      const client = supabase as any;
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
      if (currentUser) {
        const [orderResult, addressResult] = await Promise.all([
          client.from("brand_orders").select("id,order_number,product_name,quantity,unit_price,status,created_at,estimated_delivery_start,estimated_delivery_end,tracking_url").eq("customer_user_id", currentUser.id).order("created_at", { ascending: false }),
          client.from("customer_addresses").select("id,label,line1,line2,city,state,pin_code,is_default").eq("user_id", currentUser.id).order("is_default", { ascending: false }).order("created_at", { ascending: false }),
        ]);
        if (orderResult.error) console.error("Could not load order history", orderResult.error);
        else setOrders(orderResult.data ?? []);
        if (addressResult.error) console.error("Could not load saved addresses", addressResult.error);
        else setAddresses(addressResult.data ?? []);
      } else { setOrders([]); setAddresses([]); }
    } catch (error) { console.error("Could not load account details", error); }
    finally { setAccountLoading(false); }
  }, []);

  useEffect(() => {
    void loadAccount();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => { void loadAccount(); }, 0)
    });
    return () => { subscription.unsubscribe(); };
  }, [loadAccount]);

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: UserRound },
    { id: "orders" as const, label: "My Orders", icon: Package },
    { id: "addresses" as const, label: "Addresses", icon: MapPin },
  ];
  return <main className="mx-auto max-w-6xl px-5 py-10 lg:px-10 lg:py-14">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">OFFFEED / PERSONAL SPACE</p><h1 className="mt-2 font-display text-5xl">{user ? `Hello, ${user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "there"}` : "My Account"}</h1><p className="mt-3 text-muted-foreground">Your account, orders, delivery details and favourite finds — all in one place.</p></div>
      <Button variant="outline" onClick={() => { void loadAccount(); void refreshWishlist(); }} disabled={accountLoading || loading}><RefreshCw className={`mr-2 size-4 ${accountLoading || loading ? "animate-spin" : ""}`}/>Refresh</Button>
    </div>

    {!accountLoading && !user && <div className="mt-8 flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-display text-2xl">Sign in to your OFFFEED account</h2><p className="mt-1 text-sm text-muted-foreground">Access your account details, orders and delivery addresses.</p></div><Button onClick={() => toast.info("Use the account sign-in option on OFFFEED to sign in.")}><LogIn className="mr-2 size-4"/>Account sign-in</Button></div>}

    <div className="mt-9 grid gap-8 lg:grid-cols-[230px_1fr]">
      <nav className="flex gap-2 overflow-x-auto lg:flex-col" aria-label="Account sections">
        {tabs.map(({id,label,icon:Icon}) => <button key={id} onClick={() => setActiveTab(id)} className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition ${activeTab===id ? "bg-primary text-primary-foreground" : "bg-card hover:bg-secondary"}`}><Icon className="size-4"/>{label}{id==="orders" && <span className="ml-auto text-xs opacity-80">{orders.length}</span>}</button>)}
      </nav>
      <div className="min-w-0">
        {activeTab==="overview" && <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-6"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-full bg-secondary"><UserRound/></span><div><h2 className="font-display text-2xl">Account details</h2><p className="text-sm text-muted-foreground">Your sign-in information</p></div></div>
            {accountLoading ? <p className="mt-5 text-sm text-muted-foreground">Loading account…</p> : user ? <dl className="mt-6 grid gap-4 sm:grid-cols-2"><div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Name</dt><dd className="mt-1 font-medium">{user.user_metadata?.full_name || user.user_metadata?.name || "Not set"}</dd></div><div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Email</dt><dd className="mt-1 break-all font-medium">{user.email || "Not available"}</dd></div><div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Phone</dt><dd className="mt-1 font-medium">{user.phone || user.user_metadata?.phone || "Not added"}</dd></div><div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Account status</dt><dd className="mt-1 font-medium">Signed in</dd></div></dl> : <p className="mt-5 text-sm text-muted-foreground">You’re browsing as a guest. Sign in to see your personal account details.</p>}
          </section>
          <div className="grid gap-4 sm:grid-cols-2">
            <button onClick={() => setActiveTab("orders")} className="rounded-2xl border border-border bg-card p-5 text-left transition hover:border-primary/50"><Package className="size-5 text-primary"/><p className="mt-4 font-display text-2xl">My Orders</p><p className="mt-1 text-sm text-muted-foreground">{orders.length} order items</p><span className="mt-4 inline-flex items-center text-sm">View orders <ArrowRight className="ml-2 size-4"/></span></button>
            <button onClick={() => setActiveTab("addresses")} className="rounded-2xl border border-border bg-card p-5 text-left transition hover:border-primary/50"><MapPin className="size-5 text-primary"/><p className="mt-4 font-display text-2xl">Addresses</p><p className="mt-1 text-sm text-muted-foreground">{addresses.length} saved addresses</p><span className="mt-4 inline-flex items-center text-sm">View addresses <ArrowRight className="ml-2 size-4"/></span></button>
          </div>
        </div>}

        {activeTab==="orders" && <section><div className="flex items-end justify-between gap-3"><div><h2 className="font-display text-3xl">My Orders</h2><p className="mt-1 text-sm text-muted-foreground">Track purchases made with your account.</p></div><span className="text-sm text-muted-foreground">{orders.length} items</span></div>
          {accountLoading ? <Loading/> : !user ? <Empty title="Sign in to view your orders" body="Your account orders will appear here after you sign in."/> : orders.length===0 ? <Empty title="No orders yet" body="When you place an order on OFFFEED, its status and delivery updates will appear here." action={<Button asChild><Link to="/discover">Discover brands</Link></Button>}/> : <div className="mt-5 space-y-3">{orders.map((order)=><article key={order.id} className="rounded-xl border border-border bg-card p-5"><div className="flex flex-wrap justify-between gap-3"><div><p className="text-xs text-muted-foreground">Order {order.order_number}</p><h3 className="mt-1 font-medium">{order.product_name} × {order.quantity}</h3><p className="mt-1 text-sm text-muted-foreground">Placed {new Date(order.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</p></div><div className="text-right"><p className="font-medium">₹{(Number(order.unit_price)*order.quantity).toLocaleString("en-IN")}</p><span className="mt-2 inline-block rounded-full bg-secondary px-3 py-1 text-xs capitalize">{order.status.replaceAll("_"," ")}</span></div></div>{(order.estimated_delivery_start || order.estimated_delivery_end) && <p className="mt-3 text-sm text-muted-foreground">Estimated delivery: {order.estimated_delivery_start ? new Date(order.estimated_delivery_start).toLocaleDateString("en-IN") : "—"} – {order.estimated_delivery_end ? new Date(order.estimated_delivery_end).toLocaleDateString("en-IN") : "—"}</p>}{order.tracking_url && <a className="mt-3 inline-block text-sm underline underline-offset-4" href={order.tracking_url} target="_blank" rel="noreferrer">Track shipment</a>}</article>)}</div>}
        </section>}

        {activeTab==="addresses" && <section><h2 className="font-display text-3xl">Saved addresses</h2><p className="mt-1 text-sm text-muted-foreground">Delivery addresses saved to your account.</p>
          {accountLoading ? <Loading/> : !user ? <Empty title="Sign in to view saved addresses" body="Sign in to sync delivery details across devices."/> : addresses.length===0 ? <Empty title="No saved addresses" body="Your address book will appear here after you save an address during checkout." action={<Button asChild><Link to="/checkout">Go to checkout</Link></Button>}/> : <div className="mt-5 grid gap-3 sm:grid-cols-2">{addresses.map((address)=><article key={address.id} className="rounded-xl border border-border bg-card p-5"><div className="flex items-center justify-between gap-2"><h3 className="font-medium">{address.label}</h3>{address.is_default && <span className="rounded-full bg-secondary px-2 py-1 text-xs">Default</span>}</div><p className="mt-3 text-sm leading-6 text-muted-foreground">{address.line1}{address.line2 ? `, ${address.line2}` : ""}<br/>{address.city}, {address.state} {address.pin_code}</p></article>)}</div>}
        </section>}

      </div>
    </div>
  </main>;
}
function Loading() { return <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin"/> Loading…</div>; }
function Empty({title,body,action}:{title:string;body:string;action?:ReactNode}) { return <div className="mt-5 rounded-2xl border border-dashed border-border px-6 py-12 text-center"><h3 className="font-display text-2xl">{title}</h3><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{body}</p>{action && <div className="mt-5">{action}</div>}</div>; }
