import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearOfffeedCart, offfeedCartEventName, readOfffeedCart, writeOfffeedCart, type OfffeedCartItem } from "@/lib/cart";
import { createOfffeedCheckoutOrders, type OfffeedCheckoutResult } from "@/lib/checkout.functions";
import { supabase } from "@/integrations/supabase/client";

type SavedAddress = { id: string; label: string; line1: string; line2: string; city: string; state: string; landmark: string; pinCode: string; isDefault: boolean };
const ADDRESS_BOOK_KEY = "offfeed-address-book-v1";
function readAddressBook(): SavedAddress[] { try { const value = JSON.parse(localStorage.getItem(ADDRESS_BOOK_KEY) ?? "[]"); return Array.isArray(value) ? value : []; } catch { return []; } }
function persistAddressBook(value: SavedAddress[]) { localStorage.setItem(ADDRESS_BOOK_KEY, JSON.stringify(value)); }

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [
    { title: "Checkout — OFFFEED" },
    { name: "description", content: "Checkout securely on OFFFEED and have independent-brand finds delivered to your door." },
  ] }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const [items, setItems] = useState<OfffeedCartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState<OfffeedCheckoutResult[]>([]);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [addressLabel, setAddressLabel] = useState("Home");
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [form, setForm] = useState({
    customerName: "", customerEmail: "", customerPhone: "",
    line1: "", line2: "", city: "", state: "", landmark: "", pinCode: "",
  });

  useEffect(() => {
    const sync = () => setItems(readOfffeedCart());
    sync();
    void loadSavedAddresses();
    window.addEventListener(offfeedCartEventName(), sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(offfeedCartEventName(), sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const total = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);

  async function loadSavedAddresses() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error: addressError } = await supabase.from("customer_addresses").select("*").eq("user_id", user.id).order("is_default", { ascending: false }).order("created_at", { ascending: true });
      if (addressError) {
        console.error("Could not load account delivery addresses:", addressError);
        setError("We couldn't load your saved addresses. You can enter an address manually or try again.");
        setAddresses([]);
        return;
      }
      const savedAddresses: SavedAddress[] = (data ?? []).map((row) => ({ id: row.id, label: row.label, line1: row.line1, line2: row.line2 ?? "", city: row.city, state: row.state, landmark: row.landmark ?? "", pinCode: row.pin_code, isDefault: row.is_default }));
      setAddresses(savedAddresses);
      const preferred = savedAddresses.find((address) => address.isDefault) ?? savedAddresses[0];
      if (preferred) {
        setSelectedAddressId(preferred.id);
        setAddressLabel(preferred.label);
        setForm((current) => ({ ...current, line1: preferred.line1, line2: preferred.line2, city: preferred.city, state: preferred.state, landmark: preferred.landmark, pinCode: preferred.pinCode }));
      }
      return;
    }
    const savedAddresses = readAddressBook(); setAddresses(savedAddresses);
    const preferred = savedAddresses.find((address) => address.isDefault) ?? savedAddresses[0];
    if (preferred) { setSelectedAddressId(preferred.id); setForm((current) => ({ ...current, line1: preferred.line1, line2: preferred.line2, city: preferred.city, state: preferred.state, landmark: preferred.landmark, pinCode: preferred.pinCode })); }
  }

  async function saveCurrentAddress() {
    if (!form.line1.trim() || !form.city.trim() || !form.state.trim() || !/^[1-9][0-9]{5}$/.test(form.pinCode)) {
      setError("Enter a complete address and valid 6-digit PIN code before saving."); return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    const existing = addresses.find((address) => address.id === selectedAddressId);
    const nextAddress: SavedAddress = {
      id: selectedAddressId || (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now())),
      label: addressLabel.trim() || "Other", line1: form.line1.trim(), line2: form.line2.trim(),
      city: form.city.trim(), state: form.state.trim(), landmark: form.landmark.trim(),
      pinCode: form.pinCode.trim(), isDefault: existing?.isDefault ?? addresses.length === 0,
    };
    if (user) {
      const payload = { user_id: user.id, label: nextAddress.label, line1: nextAddress.line1, line2: nextAddress.line2 || null, city: nextAddress.city, state: nextAddress.state, landmark: nextAddress.landmark || null, pin_code: nextAddress.pinCode, is_default: nextAddress.isDefault };
      try {
        if (nextAddress.isDefault) {
          const cleared = await supabase.from("customer_addresses").update({ is_default: false }).eq("user_id", user.id);
          if (cleared.error) throw cleared.error;
        }
        const result = existing
          ? await supabase.from("customer_addresses").update(payload).eq("id", existing.id).eq("user_id", user.id).select("id").single()
          : await supabase.from("customer_addresses").insert(payload).select("id").single();
        if (result.error) throw result.error;
        const savedId = result.data.id;
        await loadSavedAddresses();
        setSelectedAddressId(savedId);
        setAddressLabel(nextAddress.label);
        setForm((current) => ({ ...current, line1: nextAddress.line1, line2: nextAddress.line2, city: nextAddress.city, state: nextAddress.state, landmark: nextAddress.landmark, pinCode: nextAddress.pinCode }));
        setError("");
      } catch (cause) {
        console.error("Could not save delivery address:", cause);
        setError("Could not save this address to your account. Please try again.");
      }
      return;
    }
    const next = existing ? addresses.map((address) => address.id === selectedAddressId ? nextAddress : address) : [...addresses, nextAddress];
    setAddresses(next); persistAddressBook(next); setSelectedAddressId(nextAddress.id); setAddressLabel(nextAddress.label); setError("");
  }
  function chooseAddress(id: string) {
    setSelectedAddressId(id);
    const address = addresses.find((entry) => entry.id === id);
    if (!address) return;
    setAddressLabel(address.label);
    setForm((current) => ({ ...current, line1: address.line1, line2: address.line2, city: address.city, state: address.state, landmark: address.landmark, pinCode: address.pinCode }));
  }
  async function setDefaultAddress(id: string) {
    const next = addresses.map((address) => ({ ...address, isDefault: address.id === id }));
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const cleared = await supabase.from("customer_addresses").update({ is_default: false }).eq("user_id", user.id);
      if (cleared.error) { setError("Could not update your default address. Please try again."); return; }
      const selected = await supabase.from("customer_addresses").update({ is_default: true }).eq("id", id).eq("user_id", user.id);
      if (selected.error) { setError("Could not update your default address. Please try again."); await loadSavedAddresses(); return; }
      await loadSavedAddresses();
    } else {
      setAddresses(next); persistAddressBook(next);
    }
    setError("");
  }

  async function deleteAddress(id: string) {
    const target = addresses.find((address) => address.id === id);
    if (!target) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const removed = await supabase.from("customer_addresses").delete().eq("id", id).eq("user_id", user.id);
      if (removed.error) { setError("Could not delete this address. Please try again."); return; }
      const remaining = addresses.filter((address) => address.id !== id);
      if (target.isDefault && remaining.length) {
        const defaulted = await supabase.from("customer_addresses").update({ is_default: true }).eq("id", remaining[0].id).eq("user_id", user.id);
        if (defaulted.error) { setError("Address deleted, but the default could not be updated. Please choose a default address."); await loadSavedAddresses(); return; }
      }
      await loadSavedAddresses();
    } else {
      const remaining = addresses.filter((address) => address.id !== id);
      if (target.isDefault && remaining.length) remaining[0] = { ...remaining[0], isDefault: true };
      setAddresses(remaining); persistAddressBook(remaining);
    }
    if (selectedAddressId === id) {
      setSelectedAddressId("");
      setAddressLabel("Home");
      setForm((current) => ({ ...current, line1: "", line2: "", city: "", state: "", landmark: "", pinCode: "" }));
    }
    setError("");
  }

  function updateItem(index: number, patch: Partial<OfffeedCartItem>) {
    const next = items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item);
    setItems(next);
    writeOfffeedCart(next);
  }

  function removeItem(index: number) {
    const next = items.filter((_, itemIndex) => itemIndex !== index);
    setItems(next);
    writeOfffeedCart(next);
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!items.length) return;
    for (const item of items) {
      if (item.sizes.length && !item.size) {
        setError(`Choose a size for ${item.productName}.`);
        return;
      }
      if (item.colors.length && !item.color) {
        setError(`Choose a colour for ${item.productName}.`);
        return;
      }
    }
    setLoading(true);
    try {
      const created = await createOfffeedCheckoutOrders({
        data: {
          customerName: form.customerName,
          customerEmail: form.customerEmail,
          customerPhone: form.customerPhone,
          address: {
            line1: form.line1,
            line2: form.line2,
            city: form.city,
            state: form.state,
            landmark: form.landmark,
          },
          pinCode: form.pinCode,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            size: item.size,
            color: item.color,
          })),
        },
      });
      setOrders(created);
      clearOfffeedCart();
      setItems([]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't place your order. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (orders.length) {
    const grandTotal = orders.reduce((sum, order) => sum + Number(order.line_total), 0);
    return (
      <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
        <div className="border border-border/70 p-7 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Order placed</p>
          <h1 className="mt-3 font-display text-4xl sm:text-5xl">Your finds are on their way to becoming yours.</h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">Your Cash on Delivery order has been created on OFFFEED. Each independent brand will prepare and dispatch its own item.</p>
          <div className="mt-7 divide-y divide-border/70 border-y border-border/70">
            {orders.map((order) => (
              <div key={order.order_id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                <div>
                  <p className="font-medium">{order.product_name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{order.brand_name} · Qty {order.quantity}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Order {order.order_number}</p>
                </div>
                <p className="font-medium">₹{Number(order.line_total).toLocaleString("en-IN")}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-between font-medium"><span>Product subtotal</span><span>₹{grandTotal.toLocaleString("en-IN")}</span></div>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">Save your order numbers for reference. The final amount due may include shipping confirmed by each brand before dispatch. Delivery estimates and courier tracking will appear once each brand confirms dispatch.</p>
          <Button className="mt-7" asChild><Link to="/discover">Continue discovering</Link></Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-5 pb-16 pt-8 sm:px-8 lg:px-12">
      <Button variant="ghost" asChild className="mb-5"><Link to="/discover"><ArrowLeft />Continue shopping</Link></Button>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">OFFFEED checkout</p>
          <h1 className="mt-2 font-display text-5xl">Your bag, your finds.</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Order directly through OFFFEED. Each independent brand ships its own products; no detours to another website.</p>

          {!items.length ? (
            <div className="mt-8 border border-dashed border-border p-10 text-center">
              <ShoppingBag className="mx-auto size-8 text-muted-foreground" />
              <h2 className="mt-4 text-lg font-medium">Your bag is waiting for something good.</h2>
              <p className="mt-2 text-sm text-muted-foreground">Add products from Discover to check out here.</p>
              <Button className="mt-5" asChild><Link to="/discover">Explore products</Link></Button>
            </div>
          ) : (
            <div className="mt-7 divide-y divide-border/70 border-y border-border/70">
              {items.map((item, index) => (
                <article key={item.productId} className="flex gap-4 py-5">
                  <div className="size-28 shrink-0 overflow-hidden bg-secondary sm:size-32">
                    {item.imageUrl && <img src={item.imageUrl} alt={item.productName} className="size-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">{item.brandName}</p>
                    <h2 className="mt-1 font-medium">{item.productName}</h2>
                    <p className="mt-1 text-sm">₹{item.price.toLocaleString("en-IN")}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.sizes.length > 0 && <select aria-label={`Size for ${item.productName}`} value={item.size} onChange={(event) => updateItem(index, { size: event.target.value })} className="h-9 max-w-32 border border-input bg-background px-2 text-sm"><option value="">Choose size</option>{item.sizes.map((size) => <option key={size} value={size}>{size}</option>)}</select>}
                      {item.colors.length > 0 && <select aria-label={`Colour for ${item.productName}`} value={item.color} onChange={(event) => updateItem(index, { color: event.target.value })} className="h-9 max-w-36 border border-input bg-background px-2 text-sm"><option value="">Choose colour</option>{item.colors.map((color) => <option key={color} value={color}>{color}</option>)}</select>}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Button type="button" variant="outline" size="icon" className="size-8" aria-label="Decrease quantity" disabled={item.quantity <= 1} onClick={() => updateItem(index, { quantity: item.quantity - 1 })}><Minus className="size-3.5" /></Button>
                      <span className="w-5 text-center text-sm">{item.quantity}</span>
                      <Button type="button" variant="outline" size="icon" className="size-8" aria-label="Increase quantity" disabled={item.quantity >= 10} onClick={() => updateItem(index, { quantity: item.quantity + 1 })}><Plus className="size-3.5" /></Button>
                      <button type="button" onClick={() => removeItem(index)} className="ml-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><Trash2 className="size-3.5" /> Remove</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="lg:pt-12">
          <div className="border border-border/70 p-5 sm:p-6">
            <h2 className="font-display text-2xl">Delivery details</h2>
            <p className="mt-1 text-xs text-muted-foreground">Where should your independent-brand finds go?</p>
            {addresses.length > 0 && <div className="mt-5 space-y-2"><label className="block text-xs font-medium">Choose a saved address<select value={selectedAddressId} onChange={(event) => chooseAddress(event.target.value)} className="mt-1.5 h-10 w-full border border-input bg-background px-3 text-sm"><option value="">Enter a new address</option>{addresses.map((address) => <option key={address.id} value={address.id}>{address.label} — {address.city}{address.isDefault ? " (Default)" : ""}</option>)}</select></label><div className="flex flex-wrap gap-2">{addresses.filter((address) => address.id === selectedAddressId).map((address) => <div key={address.id} className="flex flex-wrap items-center gap-2 text-xs"><button type="button" className="underline" onClick={() => setDefaultAddress(address.id)}>{address.isDefault ? "Default address" : "Set as default"}</button><button type="button" className="underline text-destructive" onClick={() => deleteAddress(address.id)}>Delete address</button></div>)}</div></div>}
            <form onSubmit={submitOrder} className="mt-5 space-y-4">
              <Field label="Full name" value={form.customerName} onChange={(value) => setForm({ ...form, customerName: value })} required autoComplete="name" />
              <Field label="Email address" type="email" value={form.customerEmail} onChange={(value) => setForm({ ...form, customerEmail: value })} required autoComplete="email" />
              <Field label="Phone number" type="tel" value={form.customerPhone} onChange={(value) => setForm({ ...form, customerPhone: value })} required autoComplete="tel" />
              <div className="rounded-md border border-border/70 p-3"><label className="block text-xs font-medium">Address label<input value={addressLabel} onChange={(event) => setAddressLabel(event.target.value)} maxLength={40} placeholder="Home, Office, Other" className="mt-1.5 h-10 w-full border border-input bg-background px-3 text-sm" /></label></div>
              <Field label="House / flat, street, area" value={form.line1} onChange={(value) => setForm({ ...form, line1: value })} required autoComplete="address-line1" />
              <Field label="Apartment / landmark (optional)" value={form.line2} onChange={(value) => setForm({ ...form, line2: value })} autoComplete="address-line2" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="City" value={form.city} onChange={(value) => setForm({ ...form, city: value })} required autoComplete="address-level2" />
                <Field label="State" value={form.state} onChange={(value) => setForm({ ...form, state: value })} required autoComplete="address-level1" />
              </div>
              <Field label="PIN code" value={form.pinCode} onChange={(value) => setForm({ ...form, pinCode: value.replace(/\D/g, "").slice(0, 6) })} required inputMode="numeric" autoComplete="postal-code" />
              <Field label="Nearby landmark (optional)" value={form.landmark} onChange={(value) => setForm({ ...form, landmark: value })} />
              <Button type="button" variant="outline" className="w-full" onClick={saveCurrentAddress}><Plus className="size-4" /> {selectedAddressId ? "Update saved address" : "Save this address"}</Button>
              {error && <p role="alert" className="border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
              <div className="border-y border-border/70 py-4">
                <div className="flex items-center justify-between text-sm"><span>Items subtotal</span><span>₹{total.toLocaleString("en-IN")}</span></div>
                <div className="mt-2 flex items-center justify-between text-sm"><span>Shipping</span><span>Confirmed by each brand</span></div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">Shipping charges are not yet calculated at checkout. Each brand must confirm any shipping charge before dispatch, so the final amount due may change.</p>
              </div>
              <div className="flex items-center justify-between text-base font-semibold"><span>Product subtotal</span><span>₹{total.toLocaleString("en-IN")}</span></div>
              <Button type="submit" className="w-full" disabled={!items.length || loading}>{loading ? "Placing order…" : "Place COD order"}</Button>
              <p className="text-center text-[11px] leading-5 text-muted-foreground">Cash on Delivery · Product subtotal shown; shipping, if charged, is confirmed by the brand before dispatch.</p>
            </form>
          </div>
        </aside>
      </div>
    </main>
  );
}

function Field({ label, value, onChange, required = false, type = "text", autoComplete, inputMode }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  autoComplete?: string;
  inputMode?: "text" | "numeric";
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <label htmlFor={id} className="block text-xs font-medium">
      {label}{required ? " *" : ""}
      <input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} autoComplete={autoComplete} inputMode={inputMode} maxLength={type === "tel" ? 30 : undefined} className="mt-1.5 h-10 w-full border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
    </label>
  );
}
