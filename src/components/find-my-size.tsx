import { useEffect, useMemo, useState } from "react";
import { Ruler, Sparkles, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

type SizeChart = { columns: string[]; rows: Array<{ label: string; values: string[] }>; unit?: string };
type Measurements = { height: string; bust: string; chest: string; waist: string; hips: string; shoulder: string; fit: "slim" | "regular" | "relaxed" };
const STORAGE_KEY = "offfeed-find-my-size-v1";
const blank: Measurements = { height: "", bust: "", chest: "", waist: "", hips: "", shoulder: "", fit: "regular" };

function readStored(): Measurements {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value ? { ...blank, ...JSON.parse(value) } : blank;
  } catch { return blank; }
}

function rowMetric(label: string): keyof Measurements | null {
  const value = label.toLowerCase();
  if (/bust/.test(value)) return "bust";
  if (/chest/.test(value)) return "chest";
  if (/waist/.test(value)) return "waist";
  if (/hip/.test(value)) return "hips";
  if (/shoulder/.test(value)) return "shoulder";
  return null;
}

function recommendation(chart: SizeChart, measurements: Measurements) {
  const unit = (chart.unit ?? "cm").toLowerCase();
  const toChartUnit = (value: number) => /^(in|inch|inches)$/.test(unit) ? value / 2.54 : value;
  const metrics = chart.rows.map((row) => ({ row, key: rowMetric(row.label) })).filter((item) => item.key && measurements[item.key]);
  if (!metrics.length) return null;
  const scored = chart.columns.map((size, index) => {
    let total = 0; let count = 0;
    for (const { row, key } of metrics) {
      const userValue = Number(measurements[key!]);
      const chartValue = Number(String(row.values[index] ?? "").replace(/[^0-9.]/g, ""));
      if (!Number.isFinite(userValue) || !Number.isFinite(chartValue) || chartValue <= 0) continue;
      const delta = Math.abs(toChartUnit(userValue) - chartValue) / Math.max(chartValue, 1);
      total += delta; count += 1;
    }
    return { size, score: count ? total / count : Number.POSITIVE_INFINITY, count };
  }).filter((item) => Number.isFinite(item.score)).sort((a, b) => a.score - b.score);
  return scored[0] ?? null;
}

export function FindMySize({ chart, productName }: { chart: SizeChart | null; productName: string }) {
  const [open, setOpen] = useState(false);
  const [measurements, setMeasurements] = useState<Measurements>(blank);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [accountLinked, setAccountLinked] = useState(false);

  useEffect(() => {
    const stored = readStored();
    setMeasurements(stored);
    void supabase.auth.getUser().then(({ data }) => {
      const profile = data.user?.user_metadata?.offfeed_size_profile as Measurements | undefined;
      if (profile) {
        const merged = { ...blank, ...profile };
        setMeasurements(merged);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        setSaved(true);
      }
      setAccountLinked(Boolean(data.user));
    }).catch(() => undefined);
  }, []);

  const result = useMemo(() => chart ? recommendation(chart, measurements) : null, [chart, measurements]);
  const update = (key: keyof Measurements, value: string) => setMeasurements((current) => ({ ...current, [key]: value }));

  const save = async () => {
    const hasMeasurement = [measurements.bust, measurements.chest, measurements.waist, measurements.hips, measurements.shoulder].some((value) => Number(value) > 0);
    if (!hasMeasurement) return;
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
      // The local profile remains available on this device if account sync is unavailable.
      setSaved(true);
    } finally { setSaving(false); }
  };

  return <div className="mt-3">
    <Button type="button" variant="outline" size="sm" className="w-full justify-center gap-2" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
      <Ruler className="size-4"/> {open ? "Close Find My Size" : "Find My Size"}
      {result && !open && <span className="ml-auto text-primary">Suggested: {result.size}</span>}
    </Button>
    {open && <section className="mt-3 rounded-xl border border-border/80 bg-card p-3 sm:p-4">
      <div className="flex items-start gap-2">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary"><UserRound className="size-4 text-primary"/></span>
        <div><h4 className="text-sm font-semibold">Your size profile</h4><p className="mt-0.5 text-xs leading-5 text-muted-foreground">Enter body measurements in centimetres. Your profile can be reused across OFFFEED.</p></div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {([
          ["height", "Height (cm)"], ["bust", "Bust (cm)"], ["chest", "Chest (cm)"],
          ["waist", "Waist (cm)"], ["hips", "Hips (cm)"], ["shoulder", "Shoulder (cm)"],
        ] as const).map(([key, label]) => <label key={key} className="text-xs font-medium text-muted-foreground">{label}<Input className="mt-1 h-9" type="number" min="1" max="300" step="0.1" inputMode="decimal" placeholder="e.g. 90" value={measurements[key]} onChange={(event) => update(key, event.target.value)}/></label>)}
      </div>
      <label className="mt-3 block text-xs font-medium text-muted-foreground">Preferred fit
        <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" value={measurements.fit} onChange={(event) => update("fit", event.target.value as Measurements["fit"])}>
          <option value="slim">Slim</option><option value="regular">Regular</option><option value="relaxed">Relaxed</option>
        </select>
      </label>
      <Button type="button" size="sm" className="mt-4 w-full" onClick={() => void save()} disabled={saving || ![measurements.bust, measurements.chest, measurements.waist, measurements.hips, measurements.shoulder].some((value) => Number(value) > 0)}>{saving ? "Saving…" : saved ? "Update size profile" : "Save size profile"}</Button>
      {saved && <p className="mt-2 text-center text-[11px] text-muted-foreground">{accountLinked ? "Saved to your OFFFEED account." : "Saved on this device. Sign in to sync across devices."}</p>}
      <div className="mt-4 border-t border-border/70 pt-3">
        {chart ? result ? <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-primary/10"><Sparkles className="size-5 text-primary"/></span><div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Closest chart match · {productName}</p><p className="text-lg font-semibold">{result.size}</p></div></div> : <p className="text-xs leading-5 text-muted-foreground">Add measurements that match this brand's chart to get a recommendation. We won't guess if the chart doesn't contain comparable measurements.</p> : <p className="text-xs leading-5 text-muted-foreground">This brand hasn't provided a size chart for this product yet, so OFFFEED can't calculate a reliable recommendation.</p>}
        <p className="mt-2 text-[10px] leading-4 text-muted-foreground">This is an estimate based on the closest numeric match in the brand's chart, not a fit guarantee. Check the brand's chart before ordering.</p>
      </div>
    </section>}
  </div>;
}
