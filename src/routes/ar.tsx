import { createFileRoute } from "@tanstack/react-router";
import { Camera, CameraOff, Glasses, Gem, House, Shirt, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/ar")({
  head: () => ({
    meta: [
      { title: "OFFFEED AR Studio — Try before you discover" },
      { name: "description", content: "Explore OFFFEED's augmented reality shopping experiences." },
    ],
  }),
  component: ARStudio,
});

const experiences = [
  { id: "jewellery", title: "Jewellery", description: "Preview earrings and statement pieces with a camera-assisted try-on.", icon: Gem, status: "First experience" },
  { id: "accessories", title: "Accessories", description: "Explore sunglasses, watches and everyday finishing touches.", icon: Glasses, status: "Coming next" },
  { id: "living", title: "Home & Living", description: "See how decor and furniture could look in your own space.", icon: House, status: "Coming next" },
  { id: "clothing", title: "Clothing", description: "Explore AI-powered outfit previews using a photo you choose.", icon: Shirt, status: "Coming next" },
] as const;

function ARStudio() {
  const [active, setActive] = useState<(typeof experiences)[number]["id"]>("jewellery");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const activeExperience = experiences.find((item) => item.id === active)!;

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
    setCameraOpen(false);
  };

  const startCamera = async () => {
    setCameraError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera access requires a supported browser and a secure HTTPS connection. Open OFFFEED on your phone using its HTTPS website.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
    } catch (error) {
      const name = error instanceof Error ? error.name : "";
      setCameraError(
        name === "NotAllowedError"
          ? "Camera permission was denied. Allow camera access in your browser settings and try again."
          : name === "NotFoundError"
            ? "No camera was found on this device."
            : "The camera could not be started. Check browser permissions and try again.",
      );
    }
  };

  useEffect(() => {
    if (!cameraOpen || !videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    video.srcObject = streamRef.current;
    void video.play().then(() => setCameraReady(true)).catch(() => {
      setCameraError("The camera opened, but video playback was blocked. Check browser permissions and try again.");
    });
  }, [cameraOpen]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  return (
    <main className="min-h-[calc(100svh-5rem)]">
      <section className="mx-auto max-w-7xl px-5 py-12 sm:py-16 lg:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <Sparkles className="h-4 w-4" /> OFFFEED AR Studio
          </div>
          <h1 className="font-display text-5xl font-medium leading-[0.98] sm:text-7xl">
            See it in your <em className="text-primary">world.</em>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            A more personal way to discover. Explore camera-assisted previews today, with richer virtual try-on experiences being developed in stages.
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {experiences.map((experience) => {
              const Icon = experience.icon;
              const selected = active === experience.id;
              return (
                <button
                  key={experience.id}
                  type="button"
                  onClick={() => { setActive(experience.id); if (cameraOpen) stopCamera(); }}
                  className={`group flex items-start gap-4 rounded-2xl border p-5 text-left transition-all ${selected ? "border-primary bg-primary/5 shadow-soft" : "border-border bg-card hover:border-primary/40"}`}
                  aria-pressed={selected}
                >
                  <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${selected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{experience.title}</span>
                      <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{experience.status}</span>
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-muted-foreground">{experience.description}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-soft">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Try it</p>
                <h2 className="mt-1 font-display text-2xl">{activeExperience.title} preview</h2>
              </div>
              {cameraOpen && <Button variant="ghost" size="icon" onClick={stopCamera} aria-label="Close camera"><X /></Button>}
            </div>
            <div className="relative aspect-[4/3] overflow-hidden bg-[#241f20]">
              {cameraOpen ? (
                <>
                  <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
                  {!cameraReady && <div className="absolute inset-0 grid place-items-center text-sm text-white/80">Starting camera…</div>}
                  <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-xl border border-white/20 bg-black/55 px-4 py-3 text-center text-xs text-white backdrop-blur">
                    Camera preview is active. Product tracking and automatic placement are the next AR development step.
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center text-white">
                  <span className="mb-5 grid h-16 w-16 place-items-center rounded-full border border-white/20 bg-white/10"><Camera className="h-7 w-7" /></span>
                  <h3 className="font-display text-3xl">Your preview starts here.</h3>
                  <p className="mt-3 max-w-sm text-sm leading-6 text-white/70">
                    Allow camera access to open a live preview on your device. Your camera stream stays in this browser session and is not uploaded.
                  </p>
                  <Button className="mt-6" onClick={startCamera}><Camera className="mr-2 h-4 w-4" /> Open camera</Button>
                </div>
              )}
            </div>
            <div className="space-y-3 p-5">
              {cameraError && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{cameraError}</p>}
              <div className="flex items-start gap-3 rounded-xl bg-muted/60 p-4">
                <CameraOff className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="text-xs leading-5 text-muted-foreground">
                  This first build verifies mobile camera access only. It does not yet detect faces, attach jewellery to landmarks, place 3D objects in rooms, or generate clothing try-on images.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">Camera access is optional. Close the preview at any time to stop the camera.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
