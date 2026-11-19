import { useEffect, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronUp, LoaderCircle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getProductReviewEligibility, getPublicProductReviews, submitProductReview } from "@/lib/product-reviews.functions";

type Review = { id: string; displayName: string; rating: number; title: string; body: string; verifiedPurchase: boolean; createdAt: string };
type Eligibility = { canReview: boolean; reason: string };

export function ProductReviews({ productId, productName }: { productId: string; productName: string }) {
  const [open, setOpen] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [rating, setRating] = useState(5);
  const [displayName, setDisplayName] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function refreshReviews() {
    const result = await getPublicProductReviews({ data: { productId } });
    setReviews(result);
    setLoaded(true);
  }

  useEffect(() => {
    if (!open || loaded) return;
    let active = true;
    setLoading(true);
    void Promise.all([
      getPublicProductReviews({ data: { productId } }),
      supabase.auth.getUser(),
    ]).then(async ([result, auth]) => {
      if (!active) return;
      setReviews(result);
      setLoaded(true);
      const id = auth.data.user?.id ?? null;
      setUserId(id);
      if (id) {
        try {
          const state = await getProductReviewEligibility({ data: { productId } });
          if (active) setEligibility(state);
        } catch (error) {
          if (active) setEligibility({ canReview: false, reason: error instanceof Error ? error.message : "Could not check review access." });
        }
      }
    }).catch((error) => {
      if (active) setMessage(error instanceof Error ? error.message : "Reviews could not be loaded.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, loaded, productId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await submitProductReview({ data: { productId, rating, displayName, title, body } });
      setMessage("Thanks! Your verified review is now visible to everyone.");
      setTitle(""); setBody("");
      await refreshReviews();
      const next = await getProductReviewEligibility({ data: { productId } });
      setEligibility(next);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Your review could not be submitted.");
    } finally {
      setBusy(false);
    }
  }

  const average = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;

  return (
    <section className="mt-4 border-t border-border/70 pt-3">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}
        className="flex w-full items-center justify-between text-left text-sm font-medium">
        <span>Customer reviews{loaded ? ` · ${reviews.length}` : ""}</span>
        {open ? <ChevronUp className="size-4"/> : <ChevronDown className="size-4"/>}
      </button>
      {open && <div className="pt-3">
        {loading ? <div className="flex items-center gap-2 text-xs text-muted-foreground"><LoaderCircle className="size-4 animate-spin"/> Loading reviews…</div> : <>
          {reviews.length > 0 ? <div className="mb-4 flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 font-semibold"><Star className="size-3.5 fill-current text-amber-500"/>{average.toFixed(1)}</span>
            <span className="text-muted-foreground">from {reviews.length} verified {reviews.length === 1 ? "review" : "reviews"}</span>
          </div> : <p className="mb-4 text-xs text-muted-foreground">No reviews yet. Be the first to share your experience.</p>}
          <div className="space-y-3">
            {reviews.map((review) => <article key={review.id} className="rounded-lg bg-secondary/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1 text-xs font-medium"><Star className="size-3 fill-current text-amber-500"/>{review.rating}/5</span>
                <span className="text-[10px] text-muted-foreground">Verified purchase · {new Date(review.createdAt).toLocaleDateString("en-IN")}</span>
              </div>
              <h4 className="mt-2 text-sm font-medium">{review.title}</h4>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{review.body}</p>
              <p className="mt-2 text-[11px] font-medium">{review.displayName}</p>
            </article>)}
          </div>
          <div className="mt-4 border-t border-border/70 pt-4">
            <h4 className="text-sm font-semibold">Write a review for {productName}</h4>
            {!userId ? <p className="mt-2 text-xs text-muted-foreground"><Link to="/profile" className="font-medium text-primary underline">Sign in or create an account</Link> to check whether this delivered order can be reviewed.</p>
            : eligibility?.canReview ? <form onSubmit={submit} className="mt-3 space-y-3">
              <label className="block text-xs font-medium">Your public name<input required minLength={2} maxLength={60} value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"/></label>
              <label className="block text-xs font-medium">Rating<select value={rating} onChange={(event) => setRating(Number(event.target.value))} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{[5,4,3,2,1].map((value) => <option key={value} value={value}>{value} star{value > 1 ? "s" : ""}</option>)}</select></label>
              <label className="block text-xs font-medium">Review title<input required minLength={3} maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"/></label>
              <label className="block text-xs font-medium">Your review<textarea required minLength={10} maxLength={1500} rows={4} value={body} onChange={(event) => setBody(event.target.value)} className="mt-1 w-full rounded-md border border-input bg-background p-3 text-sm"/></label>
              <Button type="submit" size="sm" disabled={busy}>{busy ? "Posting…" : "Post review"}</Button>
            </form> : <p className="mt-2 text-xs text-muted-foreground">{eligibility?.reason ?? "Checking your order eligibility…"}</p>}
            {message && <p role="status" className="mt-3 text-xs text-muted-foreground">{message}</p>}
          </div>
        </>}
      </div>}
    </section>
  );
}
