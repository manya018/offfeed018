import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ExternalLink, FileText, LoaderCircle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { decideBrandApplication, getBrandReview } from "@/lib/brand-review.functions";

export const Route = createFileRoute("/brand-review")({
  head: () => ({ meta: [
    { title: "Review brand application — OFFFEED" },
    { name: "description", content: "Securely review an OFFFEED brand application." },
    { property: "og:title", content: "Review brand application — OFFFEED" },
    { property: "og:description", content: "Securely review an OFFFEED brand application." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: BrandReviewPage,
});

function BrandReviewPage() {
  const token = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search).get("token") ?? "";
  const [application, setApplication] = useState<Awaited<ReturnType<typeof getBrandReview>> | null>(null);
  const [busy, setBusy] = useState(true);
  const [decision, setDecision] = useState<"approve" | "decline" | null>(null);
  const [notice, setNotice] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!token) { setNotice("This review link is missing its secure token."); setBusy(false); return; }
    void getBrandReview({ data: { token } }).then(setApplication).catch((error: unknown) => setNotice(error instanceof Error ? error.message : "This review link could not be opened.")).finally(() => setBusy(false));
  }, [token]);

  const decide = async (action: "approve" | "decline") => {
    setDecision(action); setNotice("");
    try {
      const result = await decideBrandApplication({ data: { token, action, reason: reason || undefined } });
      setApplication((current) => current ? { ...current, status: result.status } : current);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The decision could not be saved.");
    } finally { setDecision(null); }
  };

  if (busy) return <main className="grid min-h-[calc(100svh-5rem)] place-items-center"><LoaderCircle className="size-6 animate-spin text-primary" aria-label="Loading application" /></main>;
  if (!application) return <ReviewMessage title="Review link unavailable" message={notice || "This application could not be loaded."} />;
  const decided = application.status !== "under_review";
  return <main className="min-h-[calc(100svh-5rem)] px-5 py-10 sm:px-8 sm:py-16">
    <div className="mx-auto max-w-5xl">
      <Link to="/" className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">OFFFEED</Link>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_0.8fr]">
        <section>
          {application.coverUrl && <img src={application.coverUrl} alt={`${application.brandName} cover`} className="aspect-[16/8] w-full rounded-xl object-cover shadow-soft" />}
          <div className="mt-7 flex items-start gap-4">{application.logoUrl && <img src={application.logoUrl} alt="" className="size-16 rounded-lg object-cover" />}<div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Brand application</p><h1 className="mt-2 font-display text-5xl leading-none">{application.brandName}</h1><p className="mt-2 text-sm text-muted-foreground">{application.category} · {application.contactName}</p></div></div>
          <p className="mt-7 max-w-2xl whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{application.description}</p>
          <div className="mt-7 flex flex-wrap gap-3 text-sm"><a href={application.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-primary underline underline-offset-4">Website <ExternalLink className="size-3.5" /></a>{application.socialHandle && <span className="text-muted-foreground">{application.socialHandle}</span>}</div>
        </section>
        <aside className="h-fit border-y border-border/70 py-6 lg:sticky lg:top-28">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Decision</p>
          <h2 className="mt-3 font-display text-3xl">{decided ? `Application ${application.status}.` : "Ready for your call."}</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{decided ? "This application has already received a decision." : "Review the brand details and files, then approve or decline from here."}</p>
          <div className="mt-6 border-y border-border/70 py-4 text-sm"><div className="flex justify-between gap-4 py-2"><span className="text-muted-foreground">Platform commission</span><span className="font-medium">{application.commissionRate * 100}%</span></div><div className="flex justify-between gap-4 py-2"><span className="text-muted-foreground">Brand net payout</span><span className="font-medium">{100 - application.commissionRate * 100}%</span></div><div className="flex justify-between gap-4 py-2"><span className="text-muted-foreground">Agreement accepted</span><span className="font-medium">{application.commissionAgreedAt ? "Yes" : "No"}</span></div></div>
          <a href={application.proofUrl ?? undefined} target="_blank" rel="noreferrer" className={`mt-5 inline-flex items-center gap-2 text-sm ${application.proofUrl ? "text-primary underline underline-offset-4" : "pointer-events-none text-muted-foreground"}`}><FileText className="size-4" />{application.proofUrl ? "Open business proof" : "No business proof provided"}</a>
          {!decided && <><textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Optional note for a decline" className="mt-6 min-h-24 w-full resize-y rounded-lg border border-border bg-card px-3 py-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring" maxLength={500} /><div className="mt-4 grid gap-3 sm:grid-cols-2"><Button onClick={() => void decide("approve")} disabled={Boolean(decision)}><Check />{decision === "approve" ? "Approving…" : "Approve brand"}</Button><Button variant="outline" onClick={() => void decide("decline")} disabled={Boolean(decision)}><X />{decision === "decline" ? "Declining…" : "Decline"}</Button></div></>}
          {notice && <p role="alert" className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm text-destructive">{notice}</p>}
        </aside>
      </div>
    </div>
  </main>;
}

function ReviewMessage({ title, message }: { title: string; message: string }) { return <main className="grid min-h-[calc(100svh-5rem)] place-items-center px-5 text-center"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">OFFFEED</p><h1 className="mt-4 font-display text-5xl">{title}</h1><p className="mt-4 text-sm text-muted-foreground">{message}</p><Button asChild className="mt-7"><Link to="/">Back to OFFFEED</Link></Button></div></main>; }