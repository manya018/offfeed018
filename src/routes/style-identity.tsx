import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, LoaderCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useStyleSpace, type StyleSpace } from "@/lib/style-space";
import { toast } from "sonner";

type Preferences = {
  style_space: StyleSpace;
  aesthetics: string[];
  colors: string[];
  fits: string[];
  categories: string[];
  occasions: string[];
  budget_min: number | null;
  budget_max: number | null;
};

const STORAGE_KEY = "offfeed-style-identity-v1";
const emptyPreferences = (space: StyleSpace): Preferences => ({
  style_space: space, aesthetics: [], colors: [], fits: [], categories: [], occasions: [],
  budget_min: null, budget_max: null,
});

const herAesthetics = ["Old Money", "Minimal", "Coquette", "Streetwear", "Boho", "Cottagecore", "Clean Girl", "Y2K", "Indo-Western", "Quiet Luxury", "Dark Academia", "Soft Girl"];
const himAesthetics = ["Old Money", "Minimal", "Streetwear", "Gorpcore", "Smart Casual", "Quiet Luxury", "Dark Academia", "Athleisure", "Vintage", "Ivy League", "Workwear", "Indo-Western"];
const colors = ["Black", "White", "Cream", "Beige", "Brown", "Grey", "Navy", "Blue", "Pink", "Red", "Green", "Pastels", "Earth tones", "Neutrals"];
const fits = ["Oversized", "Relaxed", "Regular", "Slim", "Tailored", "Bodycon", "Flowy", "Comfort-first"];
const herCategories = ["Tops", "Dresses", "Co-ord sets", "Jeans & trousers", "Skirts", "Kurtas & ethnic sets", "Sarees", "Jewellery", "Bags", "Footwear", "Accessories"];
const himCategories = ["T-shirts", "Shirts", "Jeans & trousers", "Co-ord sets", "Ethnic wear", "Outerwear", "Footwear", "Watches", "Jewellery", "Accessories"];
const occasions = ["Everyday", "College", "Work", "Brunch & outings", "Date nights", "Festive", "Wedding guest", "Travel", "Party"];

function ChoiceGroup({ title, description, options, selected, onToggle }: {
  title: string; description: string; options: string[]; selected: string[]; onToggle: (value: string) => void;
}) {
  return <section className="border-t border-border pt-7">
    <div><h2 className="font-display text-2xl">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>
    <div className="mt-4 flex flex-wrap gap-2">
      {options.map((option) => {
        const active = selected.includes(option);
        return <button key={option} type="button" aria-pressed={active} onClick={() => onToggle(option)}
          className={`rounded-full border px-4 py-2.5 text-sm transition-all ${active ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-card text-foreground hover:border-primary/60"}`}>
          {active && <Check className="mr-1.5 inline size-3.5" />}{option}
        </button>;
      })}
    </div>
  </section>;
}

export const Route = createFileRoute("/style-identity")({
  head: () => ({ meta: [
    { title: "Your Style Identity — OFFFEED" },
    { name: "description", content: "Tell OFFFEED what feels like you. Build a personal fashion profile for a more considered discovery experience." },
  ] }),
  component: StyleIdentityPage,
});

function StyleIdentityPage() {
  const { space, setSpace } = useStyleSpace();
  const [preferences, setPreferences] = useState<Preferences>(() => emptyPreferences(space));
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const client = useMemo(() => supabase as any, []);

  const applySpace = useCallback((next: StyleSpace) => {
    setSpace(next);
    setPreferences((current) => ({ ...current, style_space: next }));
  }, [setSpace]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!active) return;
        setUser(currentUser);
        if (currentUser) {
          const { data, error } = await client.from("customer_style_profiles").select("*").eq("user_id", currentUser.id).maybeSingle();
          if (error) throw error;
          if (data) {
            const next: Preferences = {
              style_space: data.style_space === "him" ? "him" : "her",
              aesthetics: data.aesthetics ?? [], colors: data.colors ?? [], fits: data.fits ?? [],
              categories: data.categories ?? [], occasions: data.occasions ?? [],
              budget_min: data.budget_min == null ? null : Number(data.budget_min),
              budget_max: data.budget_max == null ? null : Number(data.budget_max),
            };
            setPreferences(next);
            setSpace(next.style_space);
            setSavedAt(data.updated_at ?? null);
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          } else {
            const local = window.localStorage.getItem(STORAGE_KEY);
            if (local) {
              try { const parsed = JSON.parse(local) as Preferences; setPreferences({ ...emptyPreferences(space), ...parsed }); }
              catch { setPreferences(emptyPreferences(space)); }
            }
          }
        } else {
          const local = window.localStorage.getItem(STORAGE_KEY);
          if (local) {
            try { setPreferences({ ...emptyPreferences(space), ...JSON.parse(local) as Preferences }); }
            catch { setPreferences(emptyPreferences(space)); }
          }
        }
      } catch (error) {
        console.error("Could not load style identity", error);
        setNotice("We couldn't load your saved style profile. Your changes can still be saved on this device.");
      } finally { if (active) setLoading(false); }
    };
    void load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { window.setTimeout(() => { if (active) void load(); }, 0); });
    return () => { active = false; subscription.unsubscribe(); };
  // space is intentionally omitted: changing the Her/Him selector should not reload and overwrite edits.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, setSpace]);

  const toggle = (key: "aesthetics" | "colors" | "fits" | "categories" | "occasions", value: string) => {
    setPreferences((current) => {
      const values = current[key];
      return { ...current, [key]: values.includes(value) ? values.filter((item) => item !== value) : [...values, value] };
    });
  };

  const save = async () => {
    const next = { ...preferences, style_space: space };
    setSaving(true); setNotice("");
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      if (user) {
        const { data, error } = await client.from("customer_style_profiles").upsert({
          user_id: user.id, ...next, updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" }).select("updated_at").single();
        if (error) throw error;
        setSavedAt(data?.updated_at ?? new Date().toISOString());
        toast.success("Your Style Identity has been saved to your account.");
        setNotice("Your preferences are saved and will stay with your account across devices.");
      } else {
        toast.success("Style Identity saved on this device.");
        setNotice("Your style profile is saved on this device. Sign in to sync it across devices.");
      }
    } catch (error) {
      console.error("Style identity save failed", error);
      toast.error("Could not sync your Style Identity. Your selections remain saved on this device.");
      setNotice("Your selections are saved locally, but account sync failed. Please try again.");
    } finally { setSaving(false); }
  };

  const clear = () => {
    const reset = emptyPreferences(space);
    setPreferences(reset);
    window.localStorage.removeItem(STORAGE_KEY);
    setSavedAt(null);
    setNotice("Your selections have been cleared from this device. Save to update your account profile too.");
  };

  const activeAesthetics = space === "him" ? himAesthetics : herAesthetics;
  const activeCategories = space === "him" ? himCategories : herCategories;
  const selectedCount = preferences.aesthetics.length + preferences.colors.length + preferences.fits.length + preferences.categories.length + preferences.occasions.length;

  return <main className="mx-auto max-w-5xl px-5 py-10 lg:px-10 lg:py-14">
    <Link to="/profile" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"><ArrowLeft className="size-4" /> My account</Link>
    <div className="mt-8 overflow-hidden rounded-[2rem] border border-border bg-secondary/50 p-7 sm:p-10">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">OFFFEED / PERSONAL STYLE PROFILE</p>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-5">
        <div className="max-w-2xl"><h1 className="font-display text-4xl leading-tight sm:text-5xl">Your style, <em className="text-primary">your identity.</em></h1><p className="mt-4 max-w-xl leading-7 text-muted-foreground">Tell us what you love. We'll use your preferences to make fashion discovery feel more like you — not another algorithm telling you what to wear.</p></div>
        <div className="rounded-2xl border border-border bg-card p-4"><Sparkles className="size-6 text-primary"/><p className="mt-2 text-2xl font-display">{selectedCount}</p><p className="text-xs text-muted-foreground">preferences selected</p></div>
      </div>
      <div className="mt-7 flex flex-wrap items-center gap-2">
        <span className="mr-2 text-sm font-medium">I'm exploring for</span>
        {(["her", "him"] as const).map((option) => <Button key={option} type="button" variant={space === option ? "default" : "outline"} onClick={() => applySpace(option)}>{option === "her" ? "Her" : "Him"}</Button>)}
      </div>
    </div>

    {loading ? <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin"/>Loading your style profile…</div> : <>
      <div className="mt-9 space-y-8">
        <ChoiceGroup title="Your aesthetics" description="Choose the styles that feel most like you. Pick as many as you like." options={activeAesthetics} selected={preferences.aesthetics} onToggle={(value) => toggle("aesthetics", value)} />
        <ChoiceGroup title="Colours you gravitate towards" description="The shades you reach for most often." options={colors} selected={preferences.colors} onToggle={(value) => toggle("colors", value)} />
        <ChoiceGroup title="Your preferred fits" description="How you like your clothes to feel and fall." options={fits} selected={preferences.fits} onToggle={(value) => toggle("fits", value)} />
        <ChoiceGroup title="What you love shopping for" description="Choose the categories you'd like OFFFEED to prioritize." options={activeCategories} selected={preferences.categories} onToggle={(value) => toggle("categories", value)} />
        <ChoiceGroup title="Where you wear your style" description="We'll keep your everyday plans and special moments in mind." options={occasions} selected={preferences.occasions} onToggle={(value) => toggle("occasions", value)} />
      </div>
      <section className="mt-8 border-t border-border pt-7">
        <h2 className="font-display text-2xl">Your usual budget</h2><p className="mt-1 text-sm text-muted-foreground">Optional. Helps us keep recommendations within a comfortable range (INR).</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm">From (₹)<input type="number" min="0" max="1000000" value={preferences.budget_min ?? ""} onChange={(event) => setPreferences((current) => ({ ...current, budget_min: event.target.value === "" ? null : Math.max(0, Number(event.target.value)) }))} className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-3" placeholder="e.g. 500"/></label>
          <label className="text-sm">Up to (₹)<input type="number" min="0" max="1000000" value={preferences.budget_max ?? ""} onChange={(event) => setPreferences((current) => ({ ...current, budget_max: event.target.value === "" ? null : Math.max(0, Number(event.target.value)) }))} className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-3" placeholder="e.g. 3000"/></label>
        </div>
        {preferences.budget_min != null && preferences.budget_max != null && preferences.budget_min > preferences.budget_max && <p className="mt-2 text-sm text-destructive">Your minimum budget can't be higher than your maximum.</p>}
      </section>
      <div className="mt-9 flex flex-wrap items-center gap-3 border-t border-border pt-7">
        <Button size="lg" onClick={() => void save()} disabled={saving || (preferences.budget_min != null && preferences.budget_max != null && preferences.budget_min > preferences.budget_max)}>{saving ? <><LoaderCircle className="mr-2 size-4 animate-spin"/>Saving…</> : "Save my Style Identity"}</Button>
        <Button size="lg" variant="outline" onClick={clear} disabled={saving}>Clear selections</Button>
        {savedAt && <span className="text-xs text-muted-foreground">Last synced {new Date(savedAt).toLocaleDateString("en-IN")}</span>}
      </div>
      {notice && <p role="status" className="mt-4 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">{notice}</p>}
      {!user && <p className="mt-4 text-sm text-muted-foreground">Browsing as a guest? <Link to="/profile" className="font-medium text-primary underline underline-offset-4">Sign in or create an account</Link> to sync your style profile across devices.</p>}
    </>}
  </main>;
}
