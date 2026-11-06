import { useEffect, useMemo, useState } from "react";
import { Ruler, Sparkles, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

type SizeChart = { columns: string[]; rows: Array<{ label: string; values: string[] }>; unit?: string };
type Measurements = { height: string; bust: string; chest: string; waist: string; hips: string; shoulder: string; fit: "slim" | "regular" | "relaxed" };
type SizeMatch = { size: string; score: number; matched: number; available: boolean };
type SmartRecommendation = { best: SizeMatch; alternative: SizeMatch | null; confidence: "Strong" | "Good" | "Approximate"; unit: string; matchedLabels: string[]; unavailable: boolean };
const STORAGE_KEY = "offfeed-find-my-size-v1";
const blank: Measurements = { height: "", bust: "", chest: "", waist: "", hips: "", shoulder: "", fit: "regular" };

function readStored(): Measurements {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) return blank;
    const parsed = JSON.parse(value) as Partial<Measurements>;
    return {
      ...blank,
      ...Object.fromEntries(["height", "bust", "chest", "waist", "hips", "shoulder"].map((key) => {
        const raw = parsed[key as keyof Measurements];
        return [key, typeof raw === "string" || typeof raw === "number" ? String(raw) : ""];
      })),
      fit: parsed.fit === "slim" || parsed.fit === "relaxed" ? parsed.fit : "regular",
    };
  } catch { return blank; }
}

function rowMetric(label: string): keyof Measurements | null {
  const value = label.toLowerCase();
  if (/bust/.test(value)) return "bust";
  if (/chest/.test(value)) return "chest";
  if (/waist/.test(value)) return "waist";
  if (/hip/.test(value)) return "hips";
  if (/shoulder/.test(value)) return "shoulder";
  if (/height|body height/.test(value)) return "height";
  return null;
}

function parseChartMeasurement(value: string): { min: number; max: number } | null {
  const cleaned = value.replace(/,/g, "");
  const numbers = cleaned.match(/\d+(?:\.\d+)?/g)?.map(Number).filter(Number.isFinite) ?? [];
  if (!numbers.length) return null;
  const isRange = numbers.length >= 2 && /\d\s*[-–—]\s*\d/.test(cleaned);
  const first = numbers[0];
  const second = isRange ? numbers[1] : first;
  return { min: Math.min(first, second), max: Math.max(first, second) };
}

function categoryWeight(metric: keyof Measurements, category: string) {
  const value = category.toLowerCase();
  if (/bottom|trouser|pant|jean|skirt|short/.test(value)) {
    return metric === "waist" || metric === "hips" ? 2 : metric === "height" ? 0.35 : 0.5;
  }
  if (/top|shirt|blouse|kurta|shirt|jacket|coat/.test(value)) {
    return metric === "bust" || metric === "chest" || metric === "shoulder" ? 2 : metric === "waist" ? 0.8 : 0.35;
  }
  if (/dress|jumpsuit|one.?piece/.test(value)) {
    return ["bust", "chest", "waist", "hips", "shoulder"].includes(metric) ? 1.25 : 0.5;
  }
  return metric === "height" ? 0.5 : 1;
}

function recommendation(chart: SizeChart, measurements: Measurements, category: string, availableSizes: string[]): SmartRecommendation | null {
  const unit = (chart.unit ?? "cm").trim().toLowerCase();
  const chartUsesInches = /^(in|inch|inches)$/.test(unit);
  const toChartUnit = (value: number) => chartUsesInches ? value / 2.54 : value;
  const metrics = chart.rows.map((row) => ({ row, key: rowMetric(row.label) }))
    .filter((item): item is { row: SizeChart["rows"][number]; key: keyof Measurements } => Boolean(item.key && Number(measurements[item.key]) > 0))
    .map((item) => ({ ...item, rangeBySize: chart.columns.map((_, index) => parseChartMeasurement(item.row.values[index] ?? "")) }))
    .filter((item) => item.rangeBySize.some(Boolean));
  if (!metrics.length || !chart.columns.length) return null;

  const normalizedAvailable = availableSizes.map((size) => size.trim().toLowerCase().replace(/\s+/g, ""));
  const candidates: SizeMatch[] = chart.columns.map((size, index) => {
    let weightedError = 0;
    let totalWeight = 0;
    let matched = 0;
    for (const item of metrics) {
      const range = item.rangeBySize[index];
      if (!range) continue;
      const userValue = toChartUnit(Number(measurements[item.key]));
      const distance = userValue < range.min ? range.min - userValue : userValue > range.max ? userValue - range.max : 0;
      const midpoint = (range.min + range.max) / 2;
      const error = distance / Math.max(midpoint, 1);
      const weight = categoryWeight(item.key, category);
      weightedError += error * weight;
      totalWeight += weight;
      matched += 1;
    }
    const normalizedSize = size.trim().toLowerCase().replace(/\s+/g, "");
    const available = normalizedAvailable.length === 0 || normalizedAvailable.includes(normalizedSize);
    return { size, score: totalWeight ? weightedError / totalWeight : Number.POSITIVE_INFINITY, matched, available };
  }).filter((item) => Number.isFinite(item.score) && item.matched > 0);

  if (!candidates.length) return null;
  const fitOrder = (a: SizeMatch, b: SizeMatch) => {
    if (Math.abs(a.score - b.score) <= 0.015 && measurements.fit !== "regular") {
      const aIndex = chart.columns.indexOf(a.size);
      const bIndex = chart.columns.indexOf(b.size);
      return measurements.fit === "relaxed" ? bIndex - aIndex : aIndex - bIndex;
    }
    return a.score - b.score;
  };
  candidates.sort(fitOrder);
  const availableCandidates = candidates.filter((item) => item.available);
  const ranked = availableCandidates.length ? availableCandidates : candidates;
  const best = ranked[0];
  const alternative = ranked.find((item) => item.size !== best.size) ?? null;
  const confidence = best.matched < 2 || best.score > 0.12 ? "Approximate" : best.score <= 0.035 ? "Strong" : "Good";
  const matchedLabels = metrics.filter((item) => item.rangeBySize.some(Boolean)).map((item) => item.row.label);
  return { best, alternative, confidence, unit: chart.unit ?? "cm", matchedLabels, unavailable: availableCandidates.length === 0 && normalizedAvailable.length > 0 };
}

export function FindMySize({ chart, productName, category = "", availableSizes = [] }: { chart: SizeChart | null; productName: string; category?: string; availableSizes?: string[] }) {
  const [open, setOpen] = useState(false);
  const [measurements, setMeasurements] = useState<Measurements>(blank);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [accountLinked, setAccountLinked] = useState(false);

  useEffect(() => {
    const stored = readStored();
    setMeasurements(stored);
    void supabase.auth.getUser().then(({ data }) => {
      const profile = data.user?.user_metadata?.offfeed_size_profile as Partial<Measurements> | undefined;
      if (profile) {
        const merged = { ...stored, ...profile };
        setMeasurements(merged);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        setSaved(true);
      }
      setAccountLinked(Boolean(data.user));
    }).catch(() => undefined);
  }, []);

  const result = useMemo(() => chart ? recommendation(chart, measurements, category, availableSizes) : null, [chart, measurements, category, availableSizes]);
  const update = (key: keyof Measurements, value: string) => setMeasurements((current) => ({ ...current, [key]: value }));
  const measurementKeys: Array<keyof Measurements> = ["height", "bust", "chest", "waist", "hips", "shoulder"];
  const hasMeasurement = measurementKeys.some((key) => Number(measurements[key]) > 0);
  const invalidMeasurement = measurementKeys.some((key) => {
    const value = measurements[key];
    return value !== "" && (!Number.isFinite(Number(value)) || Number(value) <= 0 || Number(value) > 300);
  });

  const save = async () => {
    if (!hasMeasurement || invalidMeasurement) return;
    setSaving(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(measurements));
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const { error } = await supabase.auth.updateUser({ data: { ...data.user.user_metadata, offfeed_size_profile: measurements } });
        if (error) throw error;
        setAccountLinked(true);
      }
      setSaved(true);
    } catch {
      // Keep the profile available on this device if account sync is unavailable.
      setSaved(true);
    } finally { setSaving(false); }
  };

  return <div className="mt-3">
    <Button type="button" variant="outline" size="sm" className="w-full justify-center gap-2" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
      <Ruler className="size-4"/> {open ? "Close Smart Size Assistant" : "Find My Size"}
      {result && !open && <span className="ml-auto text-primary">Suggested: {result.best.size}</span>}
    </Button>
    {open && <section className="mt-3 rounded-xl border border-border/80 bg-card p-3 sm:p-4">
      <div className="flex items-start gap-2">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary"><UserRound className="size-4 text-primary"/></span>
        <div><h4 className="text-sm font-semibold">Your Smart Size Profile</h4><p className="mt-0.5 text-xs leading-5 text-muted-foreground">Enter your body measurements in centimetres. OFFFEED compares them with this brand's size chart and reuses your profile across products.</p></div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {([
          ["height", "Height (cm)"], ["bust", "Bust (cm)"], ["chest", "Chest (cm)"],
          ["waist", "Waist (cm)"], ["hips", "Hips (cm)"], ["shoulder", "Shoulder (cm)"],
        ] as const).map(([key, label]) => <label key={key} className="text-xs font-medium text-muted-foreground">{label}<Input className="mt-1 h-9" type="number" min="1" max="300" step="0.1" inputMode="decimal" placeholder="e.g. 90" value={measurements[key]} onChange={(event) => update(key, event.target.value)}/></label>)}
      </div>
      <label className="mt-3 block text-xs font-medium text-muted-foreground">Preferred fit
        <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" value={measurements.fit} onChange={(event) => update("fit", event.target.value as Measurements["fit"])}>
          <option value="slim">Slim — closer fit</option><option value="regular">Regular — true to size</option><option value="relaxed">Relaxed — roomier fit</option>
        </select>
      </label>
      {invalidMeasurement && <p role="alert" className="mt-2 text-xs text-destructive">Please enter valid measurements between 1 and 300 cm.</p>}
      <Button type="button" size="sm" className="mt-4 w-full" onClick={() => void save()} disabled={saving || !hasMeasurement || invalidMeasurement}>{saving ? "Saving…" : saved ? "Update size profile" : "Save size profile"}</Button>
      {saved && <p className="mt-2 text-center text-[11px] text-muted-foreground">{accountLinked ? "Saved to your OFFFEED account." : "Saved on this device. Sign in to sync across devices."}</p>}
      <div className="mt-4 border-t border-border/70 pt-3">
        {chart ? result ? <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10"><Sparkles className="size-5 text-primary"/></span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">OFFFEED recommendation · {productName}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2"><p className="text-xl font-semibold">{result.best.size}</p><span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium">{result.confidence} match</span></div>
              <p className="mt-1 text-xs text-muted-foreground">Based on {result.best.matched} matching measurement{result.best.matched === 1 ? "" : "s"} and your {measurements.fit} fit preference.</p>
            </div>
          </div>
          {result.alternative && <div className="rounded-lg bg-secondary/60 px-3 py-2 text-xs"><span className="font-medium">Also consider: {result.alternative.size}</span><span className="text-muted-foreground"> if you prefer a different feel or are between sizes.</span></div>}
          {result.unavailable && <p className="text-xs text-amber-700">The closest chart sizes don't match the sizes currently listed for this product. Check with the brand before ordering.</p>}
          <p className="text-[10px] leading-4 text-muted-foreground">Matched chart measurements: {result.matchedLabels.join(", ")}. Chart unit: {result.unit}. {result.confidence === "Approximate" ? "Add more measurements for a more reliable estimate." : "For a closer fit, compare the recommendation with the brand's full size guide."}</p>
        </div> : <p className="text-xs leading-5 text-muted-foreground">We couldn't find enough numeric measurements in this brand's chart to calculate a match. Check the brand's size guide before ordering.</p> : <p className="text-xs leading-5 text-muted-foreground">This brand hasn't provided a size chart for this product yet, so OFFFEED can't calculate a reliable recommendation.</p>}
        <p className="mt-2 text-[10px] leading-4 text-muted-foreground">Size recommendations are estimates, not a fit guarantee. Your measurements are saved to your device and, when signed in, your OFFFEED account.</p>
      </div>
    </section>}
  </div>;
}
