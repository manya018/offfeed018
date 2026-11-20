import { createFileRoute } from "@tanstack/react-router";
import { Camera, CameraOff, Glasses, Gem, House, Shirt, Sparkles, X } from "lucide-react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { removeBackgroundLocally } from "@/lib/local-ar-cutout";

export const Route = createFileRoute("/ar")({
  validateSearch: (search: Record<string, unknown>) => ({
    productName: typeof search.productName === "string" ? search.productName : undefined,
    imageUrl: typeof search.imageUrl === "string" && search.imageUrl.startsWith("https://") ? search.imageUrl : undefined,
    arImageUrl: typeof search.arImageUrl === "string" && search.arImageUrl.startsWith("https://") ? search.arImageUrl : undefined,
  }),
  head: () => ({
    meta: [
      { title: "OFFFEED AR Studio — Jewellery Try-On" },
      { name: "description", content: "Preview earrings with OFFFEED's on-device camera try-on." },
    ],
  }),
  component: ARStudio,
});

const experiences = [
  { id: "jewellery", title: "Jewellery", description: "Try earrings with live face tracking and on-screen placement.", icon: Gem, status: "Live preview" },
  { id: "accessories", title: "Accessories", description: "Explore sunglasses, watches and everyday finishing touches.", icon: Glasses, status: "Coming next" },
  { id: "living", title: "Home & Living", description: "See how decor and furniture could look in your own space.", icon: House, status: "Coming next" },
  { id: "clothing", title: "Clothing", description: "Explore AI-powered outfit previews using a photo you choose.", icon: Shirt, status: "Coming next" },
] as const;

type EarringStyle = "stud" | "hoop" | "drop";
type Metal = "gold" | "silver" | "rose";
type TrackingState = "idle" | "loading" | "searching" | "found" | "error";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm";

const metalColors: Record<Metal, { main: string; light: string; dark: string }> = {
  gold: { main: "#d6a94d", light: "#fff0ae", dark: "#8f5d17" },
  silver: { main: "#c7cbd2", light: "#ffffff", dark: "#727985" },
  rose: { main: "#d99a91", light: "#ffe0d7", dark: "#9e5e59" },
};

function drawEarring(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  style: EarringStyle,
  metal: Metal,
) {
  const color = metalColors[metal];
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = "rgba(0,0,0,.32)";
  ctx.shadowBlur = size * 0.35;
  ctx.shadowOffsetY = size * 0.12;

  if (style === "stud") {
    const gem = ctx.createRadialGradient(x - size * 0.22, y - size * 0.25, size * 0.05, x, y, size * 0.72);
    gem.addColorStop(0, color.light);
    gem.addColorStop(0.42, color.main);
    gem.addColorStop(1, color.dark);
    ctx.fillStyle = gem;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color.light;
    ctx.lineWidth = Math.max(1, size * 0.09);
    ctx.stroke();
  } else if (style === "hoop") {
    ctx.strokeStyle = color.dark;
    ctx.lineWidth = size * 0.2;
    ctx.beginPath();
    ctx.arc(x, y + size * 0.7, size * 0.78, 0.08 * Math.PI, 0.92 * Math.PI);
    ctx.stroke();
    ctx.strokeStyle = color.light;
    ctx.lineWidth = size * 0.09;
    ctx.beginPath();
    ctx.arc(x, y + size * 0.7, size * 0.78, 0.08 * Math.PI, 0.92 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = color.main;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = color.main;
    ctx.lineWidth = size * 0.13;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + size * 1.55);
    ctx.stroke();
    const gem = ctx.createLinearGradient(x - size * 0.5, y + size, x + size * 0.5, y + size * 2.1);
    gem.addColorStop(0, color.light);
    gem.addColorStop(0.5, color.main);
    gem.addColorStop(1, color.dark);
    ctx.fillStyle = gem;
    ctx.beginPath();
    ctx.moveTo(x, y + size * 1.15);
    ctx.lineTo(x + size * 0.48, y + size * 1.8);
    ctx.lineTo(x, y + size * 2.45);
    ctx.lineTo(x - size * 0.48, y + size * 1.8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = color.light;
    ctx.lineWidth = Math.max(1, size * 0.07);
    ctx.stroke();
  }
  ctx.restore();
}

function ARStudio() {
  const { productName, imageUrl, arImageUrl } = Route.useSearch();
  const [active, setActive] = useState<(typeof experiences)[number]["id"]>("jewellery");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [trackingState, setTrackingState] = useState<TrackingState>("idle");
  const [cutoutState, setCutoutState] = useState<"loading" | "ready" | "error">("loading");
  const [earringStyle, setEarringStyle] = useState<EarringStyle>("hoop");
  const [metal, setMetal] = useState<Metal>("gold");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const productEarringRef = useRef<HTMLImageElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const styleRef = useRef<EarringStyle>(earringStyle);
  const metalRef = useRef<Metal>(metal);
  const activeExperience = experiences.find((item) => item.id === active)!;

  styleRef.current = earringStyle;
  metalRef.current = metal;

  useEffect(() => {
    productEarringRef.current = null;
    let cancelled = false;
    let objectUrl: string | null = null;
    const loadImage = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("The product image could not be loaded."));
      image.src = url;
    });
    const prepareProductCutout = async () => {
      if (arImageUrl) {
        try {
          const image = await loadImage(arImageUrl);
          if (!cancelled) {
            productEarringRef.current = image;
            setCutoutState("ready");
          }
        } catch {
          if (!cancelled) setCutoutState("error");
        }
        return;
      }
      if (!imageUrl) {
        setCutoutState("error");
        return;
      }
      setCutoutState("loading");
      try {
        const response = await fetch(imageUrl, { mode: "cors", credentials: "omit" });
        if (!response.ok) throw new Error("The product photo could not be downloaded.");
        const cutout = await removeBackgroundLocally(await response.blob());
        if (cancelled) return;
        objectUrl = URL.createObjectURL(cutout);
        const image = await loadImage(objectUrl);
        if (!cancelled) {
          productEarringRef.current = image;
          setCutoutState("ready");
        }
      } catch {
        if (!cancelled) setCutoutState("error");
      }
    };
    void prepareProductCutout();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      productEarringRef.current = null;
    };
  }, [arImageUrl, imageUrl]);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setCameraReady(false);
    setTrackingState("idle");
    setCameraOpen(false);
  };

  const startCamera = async () => {
    setCameraError("");
    setTrackingState("loading");
    if (!navigator.mediaDevices?.getUserMedia) {
      setTrackingState("error");
      setCameraError("Camera access requires a supported browser and a secure HTTPS connection. Open OFFFEED using its HTTPS website.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "user" }, width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
    } catch (error) {
      setTrackingState("error");
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
    let cancelled = false;
    void video.play().then(() => {
      if (!cancelled) setCameraReady(true);
    }).catch(() => {
      if (!cancelled) {
        setTrackingState("error");
        setCameraError("The camera opened, but video playback was blocked. Check browser permissions and try again.");
      }
    });
    return () => { cancelled = true; };
  }, [cameraOpen]);

  useEffect(() => {
    if (!cameraReady || !videoRef.current || !canvasRef.current) return;
    let cancelled = false;
    let animationFrame = 0;
    let lastVideoTime = -1;
    let landmarker: FaceLandmarker | null = null;

    const initialise = async () => {
      setTrackingState("loading");
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        if (cancelled) return;
        const options = {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" as const },
          runningMode: "VIDEO" as const,
          numFaces: 1,
          minFaceDetectionConfidence: 0.55,
          minFacePresenceConfidence: 0.55,
          minTrackingConfidence: 0.55,
        };
        try {
          landmarker = await FaceLandmarker.createFromOptions(vision, options);
        } catch {
          landmarker = await FaceLandmarker.createFromOptions(vision, {
            ...options,
            baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" as const },
          });
        }
        if (cancelled) {
          landmarker.close();
          return;
        }
        setTrackingState("searching");

        const render = () => {
          if (cancelled) return;
          const videoElement = videoRef.current;
          const canvas = canvasRef.current;
          if (!videoElement || !canvas || !landmarker) return;
          if (videoElement.readyState >= 2 && videoElement.videoWidth > 0 && videoElement.currentTime !== lastVideoTime) {
            lastVideoTime = videoElement.currentTime;
            const rect = canvas.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const width = Math.max(1, Math.round(rect.width * dpr));
            const height = Math.max(1, Math.round(rect.height * dpr));
            if (canvas.width !== width || canvas.height !== height) {
              canvas.width = width;
              canvas.height = height;
            }
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
              ctx.clearRect(0, 0, rect.width, rect.height);
              const result = landmarker.detectForVideo(videoElement, performance.now());
              const face = result.faceLandmarks[0];
              if (face && face[177] && face[401] && face[234] && face[454]) {
                setTrackingState("found");
                const scale = Math.max(rect.width / videoElement.videoWidth, rect.height / videoElement.videoHeight);
                const offsetX = (rect.width - videoElement.videoWidth * scale) / 2;
                const offsetY = (rect.height - videoElement.videoHeight * scale) / 2;
                const point = (index: number) => ({
                  x: (1 - face[index].x) * videoElement.videoWidth * scale + offsetX,
                  y: face[index].y * videoElement.videoHeight * scale + offsetY,
                });
                const left = point(177);
                const right = point(401);
                const faceWidth = Math.abs(point(234).x - point(454).x);
                const outward = faceWidth * 0.035;
                const size = Math.max(11, Math.min(27, faceWidth * 0.045));
                const leftX = left.x + (left.x < rect.width / 2 ? -outward : outward);
                const rightX = right.x + (right.x < rect.width / 2 ? -outward : outward);
                const productEarring = productEarringRef.current;
                if (productEarring?.complete && productEarring.naturalWidth > 0) {
                  const overlayWidth = Math.max(22, Math.min(96, faceWidth * 0.16));
                  const overlayHeight = overlayWidth * (productEarring.naturalHeight / productEarring.naturalWidth);
                  const drawProductAt = (x: number, y: number, mirror: boolean) => {
                    ctx.save();
                    if (mirror) {
                      ctx.translate(x * 2, 0);
                      ctx.scale(-1, 1);
                    }
                    ctx.drawImage(productEarring, x - overlayWidth / 2, y - overlayHeight * 0.08, overlayWidth, overlayHeight);
                    ctx.restore();
                  };
                  drawProductAt(leftX, left.y, false);
                  drawProductAt(rightX, right.y, true);
                } else if (!productName || !imageUrl) {
                  drawEarring(ctx, leftX, left.y, size, styleRef.current, metalRef.current);
                  drawEarring(ctx, rightX, right.y, size, styleRef.current, metalRef.current);
                }
              } else {
                setTrackingState("searching");
              }
            }
          }
          animationFrame = requestAnimationFrame(render);
        };
        animationFrame = requestAnimationFrame(render);
      } catch (error) {
        if (!cancelled) {
          setTrackingState("error");
          setCameraError(error instanceof Error ? error.message : "Face tracking could not be loaded. Check your internet connection and try again.");
        }
      }
    };

    void initialise();
    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrame);
      landmarker?.close();
      const canvas = canvasRef.current;
      if (canvas) canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [cameraReady]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const statusText: Record<TrackingState, string> = {
    idle: "Camera off",
    loading: "Preparing face tracking…",
    searching: "Move into the frame",
    found: "Face detected · earrings aligned",
    error: "Tracking unavailable",
  };

  return (
    <main className="min-h-[calc(100svh-5rem)]">
      <section className="mx-auto max-w-7xl px-5 py-10 sm:py-14 lg:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <Sparkles className="h-4 w-4" /> OFFFEED AR Studio
          </div>
          <h1 className="font-display text-5xl font-medium leading-[0.98] sm:text-7xl">
            Jewellery, <em className="text-primary">your way.</em>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            Try a look before you make it yours. Turn on your camera and see earrings follow your face in real time.
          </p>
        </div>

        <div className="mt-10 grid gap-7 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {experiences.map((experience) => {
              const Icon = experience.icon;
              const selected = active === experience.id;
              const available = experience.id === "jewellery";
              return (
                <button
                  key={experience.id}
                  type="button"
                  disabled={!available}
                  onClick={() => { setActive(experience.id); if (cameraOpen) stopCamera(); }}
                  className={`group flex items-start gap-4 rounded-2xl border p-5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60 ${selected ? "border-primary bg-primary/5 shadow-soft" : "border-border bg-card hover:border-primary/40"}`}
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
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Live try-on</p>
                <h2 className="mt-1 font-display text-2xl">{activeExperience.title}</h2>
              </div>
              {cameraOpen && <Button variant="ghost" size="icon" onClick={stopCamera} aria-label="Close camera"><X /></Button>}
            </div>
            {productName && (
              <div className="flex items-center gap-4 border-b border-border bg-muted/30 p-4">
                {imageUrl ? (
                  <img src={imageUrl} alt={productName} className="h-24 w-24 shrink-0 rounded-xl bg-background object-contain p-2" />
                ) : (
                  <span className="grid h-24 w-24 shrink-0 place-items-center rounded-xl bg-background text-muted-foreground"><Gem className="h-8 w-8" /></span>
                )}
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Selected jewellery</p>
                  <h3 className="mt-1 line-clamp-2 font-medium">{productName}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">This is the product you selected from Discover.</p>
                  <p className="mt-1 text-xs text-muted-foreground">{cutoutState === "loading" ? "Preparing this product’s free cutout on your device…" : cutoutState === "ready" ? "This product’s cutout is ready for the live preview." : "The cutout could not be prepared from this photo. The sample overlay is hidden."}</p>
                </div>
              </div>
            )}
            <div className="relative aspect-[4/3] overflow-hidden bg-[#241f20]">
              {cameraOpen ? (
                <>
                  <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 h-full w-full object-cover [transform:scaleX(-1)]" />
                  <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-label="Virtual earring preview" />
                  <div className="absolute inset-x-3 top-3 flex justify-center">
                    <span className="rounded-full border border-white/20 bg-black/55 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">{statusText[trackingState]}</span>
                  </div>
                  {trackingState === "searching" && <div className="pointer-events-none absolute inset-0 grid place-items-center"><span className="rounded-full bg-black/55 px-4 py-2 text-sm text-white backdrop-blur">Keep your face visible</span></div>}
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center text-white">
                  <span className="mb-5 grid h-16 w-16 place-items-center rounded-full border border-white/20 bg-white/10"><Camera className="h-7 w-7" /></span>
                  <h3 className="font-display text-3xl">{productName ? "Try this piece on." : "Find your next favourite."}</h3>
                  <p className="mt-3 max-w-sm text-sm leading-6 text-white/70">
                    Your camera preview stays on this device. Face landmarks are processed in your browser; OFFFEED does not upload your camera stream.
                  </p>
                  <Button className="mt-6" onClick={startCamera}><Camera className="mr-2 h-4 w-4" /> Start try-on</Button>
                </div>
              )}
            </div>
            <div className="space-y-5 p-5">
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Choose your earring</p>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: "stud", label: "Studs" },
                    { id: "hoop", label: "Hoops" },
                    { id: "drop", label: "Drops" },
                  ] as const).map((item) => (
                    <button key={item.id} type="button" onClick={() => setEarringStyle(item.id)} aria-pressed={earringStyle === item.id} className={`rounded-xl border px-3 py-3 text-sm font-medium transition ${earringStyle === item.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-background hover:border-primary/40"}`}>
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Metal finish</p>
                <div className="flex flex-wrap gap-2">
                  {([
                    { id: "gold", label: "Gold", swatch: "#d6a94d" },
                    { id: "silver", label: "Silver", swatch: "#c7cbd2" },
                    { id: "rose", label: "Rose gold", swatch: "#d99a91" },
                  ] as const).map((item) => (
                    <button key={item.id} type="button" onClick={() => setMetal(item.id)} aria-pressed={metal === item.id} className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition ${metal === item.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}>
                      <span className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ backgroundColor: item.swatch }} />
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <p className="max-w-sm text-xs leading-5 text-muted-foreground">{cutoutState === "ready" && productName ? "This product image is cut out on your device and aligned over both earlobes. Alignment is an approximate 2D preview and may vary by camera angle." : cutoutState === "loading" && productName ? "Creating a free product cutout on this device. The first use downloads the image model; the product photo is not sent to a cutout service." : cutoutState === "error" && productName ? "No generic earrings are shown. Try a clear product photo with the jewellery separated from the background." : "Preview shapes are illustrative overlays. Select an earring from Discover to preview that product."}</p>

              </div>
              {cameraError && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{cameraError}</p>}
              <div className="flex items-start gap-3 rounded-xl bg-muted/60 p-4">
                <CameraOff className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="text-xs leading-5 text-muted-foreground">
                  Face detection runs locally in the browser using MediaPipe. The model and browser runtime are downloaded from their public CDNs; camera frames are not sent to those servers. MediaPipe may send anonymous SDK usage metrics.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
