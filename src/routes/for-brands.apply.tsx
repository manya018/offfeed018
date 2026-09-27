import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, CircleHelp, FileCheck2, ImagePlus, LoaderCircle, LockKeyhole, MailCheck, ShieldCheck, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { getMyBrandApplication, submitBrandApplication } from "@/lib/brand-applications.functions";

const brandCategories = ["Fashion", "Jewelry", "Beauty", "Accessories", "Independent designer", "Other"] as const;
const acceptedImageTypes = ["image/jpeg", "image/png", "image/webp"];
const maxUploadBytes = 20 * 1024 * 1024;
type UploadKind = "logo" | "cover" | "proof";
type UploadItem = { file: File; preview?: string };
type ApplicationValues = {
  contactName: string;
  email: string;
  brandName: string;
  category: string;
  description: string;
  website: string;
  socialHandle: string;
};

const defaultValues: ApplicationValues = {
  contactName: "", email: "", brandName: "", category: "", description: "", website: "https://", socialHandle: "",
};

const accountSchema = z.object({
  contactName: z.string().trim().min(2, "Please enter your full name.").max(120),
  email: z.string().trim().email("Enter a valid email address.").max(255),
  password: z.string().min(8, "Use at least 8 characters.").max(128),
});

const applicationFormSchema = z.object({
  contactName: z.string().trim().min(2, "Please enter your full name.").max(120),
  email: z.string().trim().email("Enter a valid email address.").max(255),
  brandName: z.string().trim().min(2, "Please enter your brand name.").max(120),
  category: z.string().min(1, "Choose a category."),
  description: z.string().trim().min(20, "Add at least 20 characters about your brand.").max(1000, "Keep your introduction under 1,000 characters."),
  website: z.string().trim().url("Enter a full website address, starting with https://").max(2048),
  socialHandle: z.string().trim().max(120, "Keep your social handle under 120 characters."),
});

export const Route = createFileRoute("/for-brands/apply")({
  head: () => ({ meta: [
    { title: "Apply to OFFFEED — For Brands" },
    { name: "description", content: "Introduce your brand to OFFFEED. Share your story, identity and details for our team to review." },
    { property: "og:title", content: "Apply to OFFFEED — For Brands" },
    { property: "og:description", content: "A considered space for independent labels and brands to meet personal style." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: BrandApplicationPage,
});

function BrandApplicationPage() {
  const [step, setStep] = useState(1);
  const [values, setValues] = useState<ApplicationValues>(defaultValues);
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"signup" | "signin">("signup");
  const [userId, setUserId] = useState<string | null>(null);
  const [uploads, setUploads] = useState<Record<UploadKind, UploadItem | null>>({ logo: null, cover: null, proof: null });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<{ brandName: string; status: string } | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const fileRefs = {
    logo: useRef<HTMLInputElement>(null),
    cover: useRef<HTMLInputElement>(null),
    proof: useRef<HTMLInputElement>(null),
  };

  useEffect(() => {
    let alive = true;
    const syncApplication = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!alive) return;
      setUserId(session?.user.id ?? null);
      if (session?.user.email) setValues((current) => ({ ...current, email: session.user.email ?? current.email }));
      const fullName = session?.user.user_metadata?.full_name;
      if (typeof fullName === "string" && fullName.trim()) setValues((current) => ({ ...current, contactName: current.contactName || fullName.trim() }));
      if (session) {
        try {
          const application = await getMyBrandApplication();
          if (alive && application) setConfirmation({ brandName: application.brand_name, status: application.status });
        } catch {
          if (alive) setNotice("We couldn't check your application yet. You can continue and try again shortly.");
        }
        if (alive) setStep(2);
      }
      if (alive) setAuthReady(true);
    };
    void syncApplication();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      setUserId(session?.user.id ?? null);
      if (session?.user.email) setValues((current) => ({ ...current, email: session.user.email ?? current.email }));
      const fullName = session?.user.user_metadata?.full_name;
      if (typeof fullName === "string" && fullName.trim()) setValues((current) => ({ ...current, contactName: current.contactName || fullName.trim() }));
    });
    return () => {
      alive = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => () => {
    Object.values(uploads).forEach((item) => { if (item?.preview) URL.revokeObjectURL(item.preview); });
  }, [uploads]);

  const update = (key: keyof ApplicationValues, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  const setUpload = (kind: UploadKind, file?: File) => {
    if (!file) return;
    if (file.size > maxUploadBytes) {
      setErrors((current) => ({ ...current, [kind]: "This file is over 20 MB. Choose a smaller file." }));
      return;
    }
    if (kind !== "proof" && !acceptedImageTypes.includes(file.type)) {
      setErrors((current) => ({ ...current, [kind]: "Choose a JPG, PNG or WebP image." }));
      return;
    }
    if (kind === "proof" && ![...acceptedImageTypes, "application/pdf"].includes(file.type)) {
      setErrors((current) => ({ ...current, [kind]: "Choose a JPG, PNG, WebP or PDF file." }));
      return;
    }
    setUploads((current) => {
      const previous = current[kind];
      if (previous?.preview) URL.revokeObjectURL(previous.preview);
      return { ...current, [kind]: { file, preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined } };
    });
    setErrors((current) => ({ ...current, [kind]: "" }));
  };

  const validateStep = () => {
    const nextErrors: Record<string, string> = {};
    if (step === 1) {
      const parsed = userId
        ? applicationFormSchema.pick({ contactName: true, email: true }).safeParse(values)
        : accountSchema.safeParse({ contactName: values.contactName, email: values.email, password });
      if (!parsed.success) for (const issue of parsed.error.issues) nextErrors[issue.path[0]?.toString() ?? "form"] = issue.message;
    }
    if (step === 2) {
      const parsed = formSchema.pick({ brandName: true, category: true, description: true }).safeParse(values);
      if (!parsed.success) for (const issue of parsed.error.issues) nextErrors[issue.path[0]?.toString() ?? "form"] = issue.message;
    }
    if (step === 3) {
      const parsed = formSchema.pick({ website: true, socialHandle: true }).safeParse(values);
      if (!parsed.success) for (const issue of parsed.error.issues) nextErrors[issue.path[0]?.toString() ?? "form"] = issue.message;
      if (!uploads.logo) nextErrors.logo = "Add a logo so people can recognize you.";
      if (!uploads.cover) nextErrors.cover = "Add a cover image for your brand.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const authenticate = async () => {
    if (userId) {
      const parsed = applicationFormSchema.pick({ contactName: true, email: true }).safeParse(values);
      if (!parsed.success) {
        setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [issue.path[0]?.toString() ?? "form", issue.message])));
        return;
      }
      setNotice(""); setStep(2); return;
    }
    if (!validateStep()) return;
    setBusy(true); setNotice("");
    try {
      const result = authMode === "signup"
        ? await supabase.auth.signUp({ email: values.email.trim(), password, options: { data: { full_name: values.contactName.trim() } } })
        : await supabase.auth.signInWithPassword({ email: values.email.trim(), password });
      if (result.error) {
        if (authMode === "signup" && /already registered|already exists/i.test(result.error.message)) {
          setAuthMode("signin");
          setNotice("This email already has an account. Sign in with it to continue.");
        } else setNotice(result.error.message.includes("Email not confirmed")
          ? "Confirm your email from the message we sent, then sign in here to continue."
          : "We couldn't verify that account. Check your details and try again.");
        return;
      }
      const session = result.data.session;
      if (!session) {
        setAuthMode("signin");
        setNotice("Check your inbox to confirm your email. Once confirmed, sign in here to continue your application.");
        return;
      }
      setUserId(session.user.id);
      setStep(2);
    } catch {
      setNotice("We couldn't connect securely. Please try again.");
    } finally { setBusy(false); }
  };

  const signInWithGoogle = async () => {
    if (!validateStep()) return;
    setBusy(true); setNotice("");
    try {
      window.sessionStorage.setItem("offfeed-brand-application-draft", JSON.stringify(values));
      const { error } = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/for-brands/apply` });
      if (error) setNotice("Google sign-in couldn't start. Please try email instead.");
    } catch { setNotice("Google sign-in couldn't start. Please try email instead."); }
    finally { setBusy(false); }
  };

  const submitApplication = async () => {
    const parsed = applicationFormSchema.safeParse(values);
    if (!parsed.success || !userId || !uploads.logo || !uploads.cover) {
      setNotice("Please complete the required details and uploads before sending.");
      return;
    }
    setBusy(true); setNotice("");
    const storage = supabase.storage.from("brand-applications");
    const uploadedPaths: string[] = [];
    const uploadOne = async (kind: UploadKind, item: UploadItem) => {
      const safeName = item.file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "-").slice(-90) || `${kind}`;
      const path = `${userId}/${crypto.randomUUID()}-${safeName}`;
      const { error } = await storage.upload(path, item.file, { upsert: false, contentType: item.file.type, cacheControl: "3600" });
      if (error) throw new Error("One of your files couldn't be uploaded. Please try again.");
      uploadedPaths.push(path);
      return path;
    };
    try {
      const logoPath = await uploadOne("logo", uploads.logo);
      const coverPath = await uploadOne("cover", uploads.cover);
      const proofPath = uploads.proof ? await uploadOne("proof", uploads.proof) : null;
      const application = await submitBrandApplication({ data: {
        contactName: parsed.data.contactName,
        email: parsed.data.email,
        brandName: parsed.data.brandName,
        category: parsed.data.category as (typeof brandCategories)[number],
        description: parsed.data.description,
        website: parsed.data.website,
        socialHandle: parsed.data.socialHandle || null,
        logoPath,
        coverPath,
        proofPath,
      } });
      setConfirmation({ brandName: application.brand_name, status: application.status });
    } catch (error) {
      if (uploadedPaths.length) await storage.remove(uploadedPaths);
      setNotice(error instanceof Error ? error.message : "Your application couldn't be submitted. Please try again.");
    } finally { setBusy(false); }
  };

  const removeUpload = (kind: UploadKind) => {
    setUploads((current) => {
      const item = current[kind];
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return { ...current, [kind]: null };
    });
    if (fileRefs[kind].current) fileRefs[kind].current.value = "";
  };

  if (!authReady) return <main className="grid min-h-[70vh] place-items-center"><LoaderCircle className="size-6 animate-spin text-primary" aria-label="Loading application" /></main>;
  if (confirmation) return <ReviewConfirmation brandName={confirmation.brandName} confirmed={confirmed} setConfirmed={setConfirmed} />;

  const fieldClass = "mt-2 h-12 rounded-lg border-border/80 bg-card px-4";
  const labelClass = "text-sm font-medium";

  return (
    <main className="min-h-[calc(100svh-5rem)] px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto grid max-w-6xl items-start gap-10 lg:grid-cols-[minmax(260px,0.72fr)_minmax(0,1.28fr)] lg:gap-16">
        <aside className="lg:sticky lg:top-28">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">OFFFEED · FOR BRANDS</p>
          <h1 className="mt-5 max-w-sm font-display text-5xl font-medium leading-[0.98] sm:text-6xl">Good things find their people.</h1>
          <p className="mt-5 max-w-sm text-sm leading-7 text-muted-foreground">Tell us what you make. We’ll get to know your brand before it finds a place on OFFFEED.</p>
          <div className="mt-8 hidden border-y border-border/70 py-5 sm:block">
            {[
              { icon: Sparkles, text: "Built around personal taste" },
              { icon: ShieldCheck, text: "Every brand is reviewed" },
              { icon: LockKeyhole, text: "Your application stays private" },
            ].map(({ icon: Icon, text }) => <div key={text} className="flex items-center gap-3 py-2 text-sm"><Icon className="size-4 text-primary"/><span>{text}</span></div>)}
          </div>
        </aside>

        <section className="min-w-0" aria-label="Brand application">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div><p className="text-sm font-medium">{confirmation ? "Application status" : `Step ${step} of 4`}</p><p className="mt-1 text-xs text-muted-foreground">{step === 1 ? "Your account" : step === 2 ? "Your brand" : step === 3 ? "Brand identity" : "Review & send"}</p></div>
            <p className="text-xs text-muted-foreground">{step === 1 ? "About 3 minutes" : "Almost there"}</p>
          </div>
          <div className="mb-8 grid grid-cols-4 gap-2" aria-label={`Step ${step} of 4`}>
            {[1, 2, 3, 4].map((number) => <div key={number} className={`h-1.5 rounded-full transition-colors ${number <= step ? "bg-primary" : "bg-border"}`} />)}
          </div>

          <div className="border-t border-border/70 pt-7">
            {step === 1 && <div>
              <div className="mb-7"><h2 className="font-display text-3xl">Let’s start with you.</h2><p className="mt-2 text-sm text-muted-foreground">{userId ? "Your account is ready. Confirm your contact details to continue." : "Create an account to keep your application safe."}</p></div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Your name" error={errors.contactName}><Input autoComplete="name" value={values.contactName} onChange={(event) => update("contactName", event.target.value)} placeholder="Alex Morgan" className={fieldClass} maxLength={120} aria-invalid={Boolean(errors.contactName)} /></Field>
                <Field label="Work email" error={errors.email}><Input type="email" autoComplete="email" value={values.email} onChange={(event) => update("email", event.target.value)} placeholder="you@yourbrand.com" className={fieldClass} maxLength={255} aria-invalid={Boolean(errors.email)} /></Field>
                {!userId && <Field label={authMode === "signup" ? "Create a password" : "Password"} error={errors.password}><Input type="password" autoComplete={authMode === "signup" ? "new-password" : "current-password"} value={password} onChange={(event) => { setPassword(event.target.value); setErrors((current) => ({ ...current, password: "" })); }} placeholder="At least 8 characters" className={fieldClass} maxLength={128} aria-invalid={Boolean(errors.password)} /></Field>}</div>
              </div>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Button onClick={() => void authenticate()} disabled={busy}>{busy && <LoaderCircle className="animate-spin"/>}{userId ? "Continue" : authMode === "signup" ? "Create account & continue" : "Sign in & continue"}<ArrowRight/></Button>
                {!userId && <Button variant="outline" onClick={() => void signInWithGoogle()} disabled={busy}><span className="font-semibold">G</span> Continue with Google</Button>}
              </div>
              {!userId && <p className="mt-4 text-xs text-muted-foreground">{authMode === "signup" ? <>Already have an account? <button type="button" onClick={() => { setAuthMode("signin"); setNotice(""); }} className="font-medium text-primary underline underline-offset-4">Sign in</button></> : <>New to OFFFEED? <button type="button" onClick={() => { setAuthMode("signup"); setNotice(""); }} className="font-medium text-primary underline underline-offset-4">Create an account</button></>}</p>}
              {notice && <p role="status" className="mt-4 rounded-md border border-primary/25 bg-secondary px-4 py-3 text-sm leading-6">{notice}</p>}
            </div>}

            {step === 2 && <div>
              <div className="mb-7"><h2 className="font-display text-3xl">Tell us what you make.</h2><p className="mt-2 text-sm text-muted-foreground">A little context helps us understand where your brand belongs.</p></div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Brand name" error={errors.brandName}><Input value={values.brandName} onChange={(event) => update("brandName", event.target.value)} placeholder="The name people know you by" className={fieldClass} maxLength={120} aria-invalid={Boolean(errors.brandName)} /></Field>
                <Field label="Category" error={errors.category}><select value={values.category} onChange={(event) => update("category", event.target.value)} className={`${fieldClass} w-full rounded-lg border px-4 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring`} aria-invalid={Boolean(errors.category)}><option value="">Choose a category</option>{brandCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></Field>
                <div className="sm:col-span-2"><Field label="A short introduction" error={errors.description}><Textarea value={values.description} onChange={(event) => update("description", event.target.value)} placeholder="What inspires your work? Who is it for?" className="mt-2 min-h-36 resize-y rounded-lg border-border/80 bg-card px-4 py-3" maxLength={1000} aria-invalid={Boolean(errors.description)} /><p className="mt-1 text-right text-xs text-muted-foreground">{values.description.length} / 1,000</p></Field></div>
              </div>
              <StepButtons onBack={() => setStep(1)} onNext={() => { if (validateStep()) setStep(3); }} />
            </div>}

            {step === 3 && <div>
              <div className="mb-7"><h2 className="font-display text-3xl">Show us your world.</h2><p className="mt-2 text-sm text-muted-foreground">These images help our team get a feel for your identity.</p></div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Website" error={errors.website}><Input type="url" inputMode="url" value={values.website} onChange={(event) => update("website", event.target.value)} placeholder="https://yourbrand.com" className={fieldClass} maxLength={2048} aria-invalid={Boolean(errors.website)} /></Field>
                <Field label="Instagram or social handle" error={errors.socialHandle}><Input value={values.socialHandle} onChange={(event) => update("socialHandle", event.target.value)} placeholder="@yourbrand" className={fieldClass} maxLength={120} aria-invalid={Boolean(errors.socialHandle)} /></Field>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <UploadCard title="Brand logo" detail="JPG, PNG or WebP · up to 20 MB" item={uploads.logo} error={errors.logo} inputRef={fileRefs.logo} onPick={(file) => setUpload("logo", file)} onRemove={() => removeUpload("logo")} required />
                <UploadCard title="Cover image" detail="A wide image · JPG, PNG or WebP" item={uploads.cover} error={errors.cover} inputRef={fileRefs.cover} onPick={(file) => setUpload("cover", file)} onRemove={() => removeUpload("cover")} required />
              </div>
              <div className="mt-5">
                <UploadCard title="Proof of business" detail="Optional · business registration, portfolio or press feature" item={uploads.proof} error={errors.proof} inputRef={fileRefs.proof} onPick={(file) => setUpload("proof", file)} onRemove={() => removeUpload("proof")} />
              </div>
              <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted-foreground"><LockKeyhole className="mt-0.5 size-3.5 shrink-0"/>Your files are kept private and are only used to review your application.</p>
              <StepButtons onBack={() => setStep(2)} onNext={() => { if (validateStep()) setStep(4); }} />
            </div>}

            {step === 4 && <div>
              <div className="mb-7"><h2 className="font-display text-3xl">A final look, then hello.</h2><p className="mt-2 text-sm text-muted-foreground">Check your details before sending them to our team.</p></div>
              <div className="divide-y divide-border/70 border-y border-border/70">
                <ReviewRow label="Your account" value={`${values.contactName} · ${values.email}`} onEdit={() => setStep(1)} />
                <ReviewRow label="Brand" value={values.brandName || "Not added yet"} onEdit={() => setStep(2)} />
                <ReviewRow label="Category" value={values.category || "Not selected"} onEdit={() => setStep(2)} />
                <ReviewRow label="Website" value={values.website || "Not added yet"} onEdit={() => setStep(3)} />
                <div className="flex items-center justify-between gap-4 py-4"><div className="min-w-0"><p className="text-xs text-muted-foreground">Brand identity</p><p className="mt-1 text-sm">{uploads.logo ? "Logo added" : "Logo missing"} · {uploads.cover ? "Cover added" : "Cover missing"}{uploads.proof ? " · Proof added" : ""}</p></div><Button variant="ghost" size="sm" onClick={() => setStep(3)}>Edit</Button></div>
              </div>
              <label className="mt-6 flex cursor-pointer items-start gap-3 text-sm leading-6"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 size-4 accent-primary"/><span>I confirm that these details are accurate and agree to have my brand reviewed by OFFFEED.</span></label>
              {notice && <p role="alert" className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm leading-6 text-destructive">{notice}</p>}
              <div className="mt-7 flex flex-wrap gap-3"><Button variant="outline" onClick={() => setStep(3)} disabled={busy}><ArrowLeft/>Back</Button><Button onClick={() => void submitApplication()} disabled={busy || !confirmed}>{busy ? <LoaderCircle className="animate-spin"/> : <FileCheck2/>}Send for review</Button></div>
              <p className="mt-4 text-xs leading-5 text-muted-foreground">We review every application before a brand is featured. Sending this form won’t publish your brand.</p>
            </div>}
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <div className="min-w-0"><label className="text-sm font-medium">{label}</label>{children}{error && <p role="alert" className="mt-1 text-xs text-destructive">{error}</p>}</div>;
}

function StepButtons({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  return <div className="mt-8 flex flex-wrap gap-3"><Button variant="outline" onClick={onBack}><ArrowLeft/>Back</Button><Button onClick={onNext}>Continue<ArrowRight/></Button></div>;
}

function UploadCard({ title, detail, item, error, inputRef, onPick, onRemove, required = false }: {
  title: string; detail: string; item: UploadItem | null; error?: string;
  inputRef: React.RefObject<HTMLInputElement | null>; onPick: (file?: File) => void; onRemove: () => void; required?: boolean;
}) {
  return <div className="min-w-0">
    <div className="mb-2 flex items-center justify-between gap-2"><p className="text-sm font-medium">{title}{required && <span className="ml-1 text-primary">*</span>}</p>{item && <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${title.toLowerCase()}`} onClick={onRemove}><X/></Button>}</div>
    <input ref={inputRef} type="file" accept={title === "Proof of business" ? ".jpg,.jpeg,.png,.webp,.pdf,application/pdf,image/jpeg,image/png,image/webp" : ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"} className="sr-only" onChange={(event) => onPick(event.target.files?.[0])} />
    <button type="button" onClick={() => inputRef.current?.click()} className={`group relative flex min-h-40 w-full items-center justify-center overflow-hidden rounded-lg border border-dashed bg-card transition-colors hover:border-primary/50 ${error ? "border-destructive" : "border-border/80"}`}>
      {item?.preview ? <><img src={item.preview} alt={`${title} preview`} className="absolute inset-0 size-full object-cover"/><span className="absolute inset-x-3 bottom-3 flex items-center gap-2 rounded-md bg-card/95 px-3 py-2 text-left text-xs"><CheckCircle2 className="size-4 shrink-0 text-primary"/><span className="truncate">{item.file.name}</span></span></> : item ? <span className="flex flex-col items-center gap-2 px-4 text-sm"><FileCheck2 className="size-7 text-primary"/><span className="max-w-full truncate">{item.file.name}</span><span className="text-xs text-muted-foreground">Ready to upload</span></span> : <span className="flex flex-col items-center gap-2 px-4 text-center"><span className="grid size-10 place-items-center rounded-full bg-secondary"><ImagePlus className="size-5 text-primary"/></span><span className="text-sm font-medium">Choose a file</span><span className="max-w-56 text-xs leading-5 text-muted-foreground">{detail}</span></span>}
      <span className="sr-only">Upload {title}</span>
    </button>
    {error && <p role="alert" className="mt-1 text-xs text-destructive">{error}</p>}
  </div>;
}

function ReviewRow({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return <div className="flex items-center justify-between gap-4 py-4"><div className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 truncate text-sm">{value}</p></div><Button variant="ghost" size="sm" onClick={onEdit}>Edit</Button></div>;
}

function ReviewConfirmation({ brandName, confirmed, setConfirmed }: { brandName: string; confirmed: boolean; setConfirmed: (value: boolean) => void }) {
  return <main className="grid min-h-[calc(100svh-5rem)] place-items-center px-5 py-14">
    <section className="w-full max-w-xl text-center">
      <div className="mx-auto grid size-16 place-items-center rounded-full bg-secondary text-primary"><MailCheck className="size-8"/></div>
      <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-primary">OFFFEED · FOR BRANDS</p>
      <h1 className="mt-4 font-display text-5xl leading-tight">{confirmed ? "Your application is with us." : "You’re on our list."}</h1>
      <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-muted-foreground">{confirmed ? `Thanks for introducing ${brandName} to OFFFEED. Our team will review your application and follow up by email.` : `${brandName} already has an application under review. We’ll be in touch by email when there’s an update.`}</p>
      <div className="mt-9 border-y border-border/70 py-5 text-left">
        <div className="flex items-start gap-4 py-2"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-primary"><Check className="size-4"/></span><div><p className="text-sm font-medium">Application received</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Your brand details are safely with our review team.</p></div></div>
        <div className="flex items-start gap-4 py-2"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-primary"><CircleHelp className="size-4"/></span><div><p className="text-sm font-medium">We’ll take a closer look</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Every application is reviewed by a person before any brand is featured.</p></div></div>
      </div>
      <Button variant="outline" className="mt-7" onClick={() => setConfirmed(true)}>Got it</Button>
    </section>
  </main>;
}