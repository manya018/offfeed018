import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

type DemoListing = {
  id: string; type: "product" | "bundle"; name: string; price: string;
  category: string; description: string; pieces: string; image?: string;
};
const seed: DemoListing[] = [
  { id: "sample-1", type: "product", name: "Sample Linen Shirt", price: "1499", category: "Clothing", description: "Relaxed-fit sample shirt for demo only.", pieces: "", image: "" },
  { id: "sample-2", type: "bundle", name: "Weekend Streetwear Look", price: "3499", category: "Complete Look", description: "A sample outfit bundle, not real inventory.", pieces: "Oversized tee, cargo trousers, cap", image: "" },
];
export const Route = createFileRoute("/demo-brand")({ component: DemoBrand });
function DemoBrand() {
  const [listings, setListings] = useState<DemoListing[]>(() => {
    try { const saved = localStorage.getItem("offfeed-demo-brand-v1"); return saved ? JSON.parse(saved) as DemoListing[] : seed; }
    catch { return seed; }
  });
  const [type, setType] = useState<"product" | "bundle">("product");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Clothing");
  const [description, setDescription] = useState("");
  const [pieces, setPieces] = useState("");
  const [image, setImage] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const persist = (next: DemoListing[]) => { setListings(next); localStorage.setItem("offfeed-demo-brand-v1", JSON.stringify(next)); };
  const total = useMemo(() => listings.reduce((sum, item) => sum + (Number(item.price) || 0), 0), [listings]);
  const clearForm = () => { setName(""); setPrice(""); setCategory("Clothing"); setDescription(""); setPieces(""); setImage(""); setEditing(null); setType("product"); };
  const save = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (type === "bundle" && !pieces.trim()) { setNotice("Add the included pieces for this complete look."); return; }
    const item: DemoListing = { id: editing ?? crypto.randomUUID(), type, name: name.trim(), price, category: type === "bundle" ? "Complete Look" : category, description: description.trim(), pieces: type === "bundle" ? pieces.trim() : "", image };
    persist(editing ? listings.map((x) => x.id === editing ? item : x) : [item, ...listings]);
    setNotice(editing ? "Sample listing updated." : "Sample listing created."); clearForm();
  };
  const edit = (item: DemoListing) => { setEditing(item.id); setType(item.type); setName(item.name); setPrice(item.price); setCategory(item.category); setDescription(item.description); setPieces(item.pieces); setImage(item.image ?? ""); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const reset = () => { persist(seed); clearForm(); setNotice("Demo samples reset. No real listings were changed."); };
  return <main className="min-h-screen bg-[#fff9f7] px-4 py-8 text-[#342522] sm:px-8">
    <div className="mx-auto max-w-6xl space-y-7">
      <header className="rounded-3xl border border-[#ead5d0] bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[.24em] text-[#a05e64]">OFFFEED · BRAND STUDIO</p><h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Demo brand testing</h1><p className="mt-2 max-w-2xl text-sm text-[#795f59]">Try individual product listings and complete outfit looks in a safe sandbox before using real brand inventory.</p></div>
          <span className="rounded-full border border-[#d7a4a0] bg-[#fff0ed] px-4 py-2 text-xs font-bold tracking-wide text-[#914c52]">DEMO / SAMPLE DATA ONLY</span>
        </div>
        <div className="mt-5 rounded-xl bg-[#fff5e9] p-3 text-sm">Nothing here is sent to OFFFEED's database. Sample listings stay in this browser only; they do not appear in Discover, checkout, or real brand dashboards.</div>
      </header>
      <div className="grid gap-7 lg:grid-cols-[minmax(300px,390px)_1fr]">
        <section className="h-fit rounded-2xl border border-[#ead5d0] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">{editing ? "Edit sample listing" : "Create a sample listing"}</h2>
          <form className="mt-5 space-y-4" onSubmit={save}>
            <div><label className="mb-1 block text-sm font-medium">Listing type</label><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setType("product")} className={`rounded-xl border p-3 text-sm ${type === "product" ? "border-[#a05e64] bg-[#fff0ed] font-semibold" : "border-gray-200"}`}>Individual product</button><button type="button" onClick={() => setType("bundle")} className={`rounded-xl border p-3 text-sm ${type === "bundle" ? "border-[#a05e64] bg-[#fff0ed] font-semibold" : "border-gray-200"}`}>Complete look</button></div></div>
            <div><label className="mb-1 block text-sm font-medium">Listing name *</label><input required value={name} onChange={e => setName(e.target.value)} placeholder={type === "bundle" ? "e.g. City Weekend Look" : "e.g. Linen Shirt"} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-[#a05e64]" /></div>
            <div className="grid grid-cols-2 gap-3"><div><label className="mb-1 block text-sm font-medium">Price (₹) *</label><input required type="number" min="1" step="1" value={price} onChange={e => setPrice(e.target.value)} placeholder="1499" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-[#a05e64]" /></div>{type === "product" && <div><label className="mb-1 block text-sm font-medium">Category</label><input value={category} onChange={e => setCategory(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-[#a05e64]" /></div>}</div>
            {type === "bundle" && <div><label className="mb-1 block text-sm font-medium">Included pieces *</label><textarea required value={pieces} onChange={e => setPieces(e.target.value)} rows={3} placeholder="Top, trousers, shoes, accessories…" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-[#a05e64]" /><p className="mt-1 text-xs text-gray-500">Describe what the customer gets in this outfit bundle.</p></div>}
            <div><label className="mb-1 block text-sm font-medium">Garment / outfit photo</label><input type="file" accept="image/*" onChange={e => { const file = e.target.files?.[0]; if (!file) return; if (file.size > 4 * 1024 * 1024) { setNotice("Please choose an image smaller than 4 MB."); e.target.value = ""; return; } const reader = new FileReader(); reader.onload = () => setImage(typeof reader.result === "string" ? reader.result : ""); reader.readAsDataURL(file); }} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" /><p className="mt-1 text-xs text-gray-500">Upload an image up to 4 MB. It stays in this browser demo only.</p>{image && <div className="mt-3 flex items-center gap-3"><img src={image} alt="Selected garment preview" className="h-24 w-20 rounded-lg border object-cover" /><button type="button" onClick={() => setImage("")} className="text-sm text-red-700 underline">Remove photo</button></div>}</div>
            <div><label className="mb-1 block text-sm font-medium">Description</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Fit, fabric, styling notes…" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-[#a05e64]" /></div>
            <div className="flex gap-2"><button type="submit" className="flex-1 rounded-xl bg-[#633d3d] px-4 py-3 text-sm font-semibold text-white hover:bg-[#4d3030]">{editing ? "Save changes" : "Add sample listing"}</button>{editing && <button type="button" onClick={clearForm} className="rounded-xl border px-4 py-3 text-sm">Cancel</button>}</div>
            {notice && <p role="status" className="text-sm text-[#80504f]">{notice}</p>}
          </form>
        </section>
        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-2xl font-semibold">Listing preview</h2><p className="mt-1 text-sm text-[#795f59]">{listings.length} sample listings · sample prices total ₹{total.toLocaleString("en-IN")}</p></div><button onClick={reset} className="rounded-xl border border-[#d9c3bd] bg-white px-4 py-2.5 text-sm font-medium hover:bg-[#fff0ed]">Reset demo data</button></div>
          {listings.length === 0 ? <div className="rounded-2xl border border-dashed border-[#d9c3bd] bg-white p-10 text-center text-sm text-[#795f59]">No sample listings yet. Use the form to create one.</div> : <div className="grid gap-4 sm:grid-cols-2">{listings.map(item => <article key={item.id} className="overflow-hidden rounded-2xl border border-[#ead5d0] bg-white shadow-sm"><div className="flex h-52 items-center justify-center overflow-hidden bg-gradient-to-br from-[#f7e5e0] via-[#fdf4ed] to-[#e8d9c9]">{item.image ? <img src={item.image} alt={item.name} className="h-full w-full object-cover" /> : <span className="text-4xl">{item.type === "bundle" ? "✧" : "◇"}</span>}</div><div className="p-4"><div className="flex flex-wrap gap-2"><span className="rounded-full bg-[#fff0ed] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#914c52]">{item.type === "bundle" ? "Complete look · sample" : "Product · sample"}</span></div><h3 className="mt-3 text-lg font-semibold">{item.name}</h3><p className="mt-1 text-sm text-[#795f59]">{item.category}</p><p className="mt-2 font-semibold">₹{Number(item.price).toLocaleString("en-IN")}</p>{item.description && <p className="mt-2 text-sm text-gray-600">{item.description}</p>}{item.type === "bundle" && <div className="mt-3 rounded-lg bg-[#fff8f5] p-3 text-sm"><p className="font-semibold">Included pieces</p><p className="mt-1 text-gray-600">{item.pieces}</p></div>}<div className="mt-4 flex gap-2"><button onClick={() => edit(item)} className="flex-1 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50">Edit</button><button onClick={() => { persist(listings.filter(x => x.id !== item.id)); setNotice("Sample listing removed."); }} className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50">Delete</button></div></div></article>)}</div>}
        </section>
      </div>
      <footer className="text-center text-xs text-[#927a73]">Testing sandbox only · No real inventory, approvals, customer data, or orders are modified.</footer>
    </div>
  </main>;
}
