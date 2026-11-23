import { createFileRoute } from "@tanstack/react-router";
import { Camera, CameraOff, Glasses, Gem, House, Shirt, Sparkles, X } from "lucide-react";
import { FaceLandmarker, FilesetResolver, HandLandmarker, PoseLandmarker } from "@mediapipe/tasks-vision";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { removeBackgroundLocally } from "@/lib/local-ar-cutout";

export const Route = createFileRoute("/ar")({
  validateSearch: (search: Record<string, unknown>) => ({
    productName: typeof search.productName === "string" ? search.productName : undefined,
    productCategory: typeof search.productCategory === "string" ? search.productCategory.slice(0, 80) : undefined,
    imageUrl: typeof search.imageUrl === "string" && search.imageUrl.startsWith("https://") ? search.imageUrl : undefined,
    arImageUrl: typeof search.arImageUrl === "string" && search.arImageUrl.startsWith("https://") ? search.arImageUrl : undefined,
    arWidthMm: parsePositiveDimension(search.arWidthMm),
    arHeightMm: parsePositiveDimension(search.arHeightMm),
  }),
  head: () => ({
    meta: [
      { title: "OFFFEED AR Studio — Jewellery & Accessories Try-On" },
      { name: "description", content: "Preview jewellery, sunglasses, watches and handbags with OFFFEED's on-device AR try-on." },
    ],
  }),
  component: ARStudio,
});

const experiences = [
  { id: "jewellery", title: "Jewellery", description: "Try jewellery with live face, hand, and body tracking.", icon: Gem, status: "Live preview" },
  { id: "accessories", title: "Accessories", description: "Try sunglasses, watches and handbags with live camera tracking.", icon: Glasses, status: "Live preview" },
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

type EarringPairAssets = { left: HTMLImageElement; right: HTMLImageElement; mirrorRight: boolean; urls: string[] };

async function createEarringPairAssets(source: HTMLImageElement): Promise<EarringPairAssets> {
  const width = source.naturalWidth;
  const height = source.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context || !width || !height) throw new Error("The transparent earring image couldn't be read.");
  context.drawImage(source, 0, 0);
  const data = context.getImageData(0, 0, width, height).data;

  const boundsIn = (rangeStart: number, rangeEnd: number) => {
    let minX = rangeEnd;
    let minY = height;
    let maxX = rangeStart - 1;
    let maxY = -1;
    for (let y = 0; y < height; y++) {
      for (let x = rangeStart; x < rangeEnd; x++) {
        if (data[(y * width + x) * 4 + 3] <= 32) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    return maxX < minX || maxY < minY ? null : { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
  };
  const fullBounds = boundsIn(0, width);
  if (!fullBounds) throw new Error("No earring pixels were found in the transparent image.");

  const alphaByColumn = new Uint32Array(width);
  for (let x = fullBounds.x; x < fullBounds.x + fullBounds.width; x++) {
    for (let y = fullBounds.y; y < fullBounds.y + fullBounds.height; y++) {
      if (data[(y * width + x) * 4 + 3] > 32) alphaByColumn[x]++;
    }
  }
  const start = fullBounds.x;
  const end = start + fullBounds.width;
  const bandStart = Math.floor(start + fullBounds.width * 0.32);
  const bandEnd = Math.ceil(start + fullBounds.width * 0.68);
  let splitX = Math.floor((start + end) / 2);
  let valley = Infinity;
  for (let x = bandStart; x < bandEnd; x++) {
    if (alphaByColumn[x] < valley) {
      valley = alphaByColumn[x];
      splitX = x;
    }
  }
  const leftPeak = Math.max(...alphaByColumn.slice(start, splitX));
  const rightPeak = Math.max(...alphaByColumn.slice(splitX, end));
  const hasPairGap = leftPeak > 0 && rightPeak > 0 && valley < Math.min(leftPeak, rightPeak) * 0.35;
  const regions = hasPairGap
    ? [[start, splitX], [splitX, end]] as const
    : [[start, end], [start, end]] as const;

  const loadImage = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("A cropped earring image couldn't be loaded."));
    image.src = url;
  });
  const makeCroppedImage = async (rangeStart: number, rangeEnd: number) => {
    const bounds = boundsIn(rangeStart, rangeEnd);
    if (!bounds) throw new Error("An earring couldn't be separated from its pair photo.");
    const padding = Math.max(2, Math.round(Math.max(bounds.width, bounds.height) * 0.025));
    const x = Math.max(rangeStart, bounds.x - padding);
    const y = Math.max(0, bounds.y - padding);
    const right = Math.min(rangeEnd, bounds.x + bounds.width + padding);
    const bottom = Math.min(height, bounds.y + bounds.height + padding);
    const crop = document.createElement("canvas");
    crop.width = right - x;
    crop.height = bottom - y;
    const cropContext = crop.getContext("2d");
    if (!cropContext) throw new Error("The earring crop couldn't be created.");
    cropContext.drawImage(canvas, x, y, crop.width, crop.height, 0, 0, crop.width, crop.height);
    const blob = await new Promise<Blob>((resolve, reject) => crop.toBlob((value) => value ? resolve(value) : reject(new Error("The earring crop couldn't be saved.")), "image/png"));
    const url = URL.createObjectURL(blob);
    return { image: await loadImage(url), url };
  };
  const left = await makeCroppedImage(...regions[0]);
  const right = hasPairGap ? await makeCroppedImage(...regions[1]) : left;
  return { left: left.image, right: right.image, mirrorRight: !hasPairGap, urls: hasPairGap ? [left.url, right.url] : [left.url] };
}

function getJewelleryKind(category: string, name: string): "earrings" | "neck" | "ring" | "wrist" | "ankle" | "nose" | "forehead" | "brooch" | "sunglasses" | "watch" | "handbag" | "other" {
  const value = `${category} ${name}`.toLowerCase();
  if (/sunglasses|sun glasses|eyewear|spectacles|shades/.test(value)) return "sunglasses";
  if (/handbag|hand bag|purse|tote|crossbody|cross body|sling bag|shoulder bag/.test(value)) return "handbag";
  if (/watch|timepiece/.test(value)) return "watch";
  if (/earring|stud|hoop|jhumka|drop/.test(value)) return "earrings";
  if (/nose.?pin|nose.?ring/.test(value)) return "nose";
  if (/maang.?tikka|forehead/.test(value)) return "forehead";
  if (/anklet/.test(value)) return "ankle";
  if (/ring/.test(value)) return "ring";
  if (/bracelet|bangle|wrist/.test(value)) return "wrist";
  if (/brooch/.test(value)) return "brooch";
  if (/necklace|pendant|jewellery set|jewelry set|set/.test(value)) return "neck";
  return "other";
}

async function trimTransparentImage(source: HTMLImageElement, requireTransparency = false): Promise<{ image: HTMLImageElement; url: string }> {
  const width = source.naturalWidth;
  const height = source.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context || !width || !height) throw new Error("The jewellery cutout could not be read.");
  context.drawImage(source, 0, 0);
  const alpha = context.getImageData(0, 0, width, height).data;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  let transparentPixels = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const alphaValue = alpha[(y * width + x) * 4 + 3];
    if (alphaValue < 248) transparentPixels++;
    if (alphaValue <= 16) continue;
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  if (maxX < minX || maxY < minY) throw new Error("The transparent product cutout is empty.");
  if (requireTransparency && transparentPixels === 0) {
    throw new Error("Upload a transparent PNG containing only the accessory, with no model or background.");
  }
  const padding = Math.max(2, Math.round(Math.max(maxX - minX + 1, maxY - minY + 1) * 0.025));
  const left = Math.max(0, minX - padding), top = Math.max(0, minY - padding);
  const cropWidth = Math.min(width, maxX + padding + 1) - left;
  const cropHeight = Math.min(height, maxY + padding + 1) - top;
  const crop = document.createElement("canvas"); crop.width = cropWidth; crop.height = cropHeight;
  const cropContext = crop.getContext("2d");
  if (!cropContext) throw new Error("The jewellery cutout could not be trimmed.");
  cropContext.drawImage(canvas, left, top, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
  const blob = await new Promise<Blob>((resolve, reject) => crop.toBlob((value) => value ? resolve(value) : reject(new Error("The jewellery cutout could not be saved.")), "image/png"));
  const url = URL.createObjectURL(blob);
  const image = new Image();
  await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("The trimmed jewellery cutout could not be loaded.")); image.src = url; });
  return { image, url };
}

function parsePositiveDimension(value: unknown): number | undefined {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(number) && number > 0 && number <= 500 ? number : undefined;
}

function ARStudio() {
  const { productName, productCategory, imageUrl, arImageUrl, arWidthMm, arHeightMm } = Route.useSearch();
  const jewelleryKind = getJewelleryKind(productCategory ?? "", productName ?? "");
  const accessoryProduct = ["sunglasses", "watch", "handbag"].includes(jewelleryKind);
  const [active, setActive] = useState<(typeof experiences)[number]["id"]>(accessoryProduct ? "accessories" : "jewellery");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [trackingState, setTrackingState] = useState<TrackingState>("idle");
  const [cutoutState, setCutoutState] = useState<"loading" | "ready" | "error">("loading");
  const [cutoutError, setCutoutError] = useState("");
  const [earringStyle, setEarringStyle] = useState<EarringStyle>("hoop");
  const [metal, setMetal] = useState<Metal>("gold");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const productEarringRef = useRef<EarringPairAssets | null>(null);
  const productOverlayRef = useRef<HTMLImageElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const styleRef = useRef<EarringStyle>(earringStyle);
  const metalRef = useRef<Metal>(metal);
  const activeExperience = experiences.find((item) => item.id === active)!;

  styleRef.current = earringStyle;
  metalRef.current = metal;

  useEffect(() => {
    productEarringRef.current = null;
    productOverlayRef.current = null;
    setCutoutError("");
    let cancelled = false;
    const objectUrls: string[] = [];
    const loadImage = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("The product image couldn't be loaded."));
      image.src = url;
    });
    const finishProductAsset = async (image: HTMLImageElement) => {
      if (jewelleryKind === "earrings") {
        const pair = await createEarringPairAssets(image);
        objectUrls.push(...pair.urls);
        if (!cancelled) productEarringRef.current = pair;
      } else if (!cancelled) {
        const trimmed = await trimTransparentImage(image, accessoryProduct);
        objectUrls.push(trimmed.url);
        productOverlayRef.current = trimmed.image;
      }
      if (!cancelled) setCutoutState("ready");
    };
    const prepareProductCutout = async () => {
      if (accessoryProduct && !arImageUrl) {
        setCutoutState("error");
        setCutoutError("This photo includes the model. To show only the accessory, the brand must upload a transparent PNG cutout containing just the product.");
        return;
      }
      if (arImageUrl) {
        try {
          const response = await fetch(arImageUrl, { mode: "cors", credentials: "omit" });
          if (!response.ok) throw new Error("The saved product cutout could not be downloaded.");
          const url = URL.createObjectURL(await response.blob());
          objectUrls.push(url);
          await finishProductAsset(await loadImage(url));
        } catch (error) {
          if (!cancelled) {
            setCutoutState("error");
            setCutoutError(error instanceof Error ? error.message : "The saved product cutout could not be loaded.");
          }
        }
        return;
      }
      if (!imageUrl) {
        setCutoutState("error");
        setCutoutError("No product photo was provided for this AR preview.");
        return;
      }
      setCutoutState("loading");
      try {
        const response = await fetch(imageUrl, { mode: "cors", credentials: "omit" });
        if (!response.ok) throw new Error("The product photo could not be downloaded.");
        const cutout = await removeBackgroundLocally(await response.blob());
        if (cancelled) return;
        const url = URL.createObjectURL(cutout);
        objectUrls.push(url);
        await finishProductAsset(await loadImage(url));
      } catch (error) {
        if (!cancelled) {
          setCutoutState("error");
          setCutoutError(error instanceof Error ? error.message : "The free cutout could not be created. Try a clear product photo or upload an accessory-only transparent PNG.");
        }
      }
    };
    void prepareProductCutout();
    return () => {
      cancelled = true;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
      productEarringRef.current = null;
    };
  }, [arImageUrl, imageUrl, jewelleryKind]);

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
    let handLandmarker: HandLandmarker | null = null;
    let poseLandmarker: PoseLandmarker | null = null;

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
        const needsFace = ["earrings", "nose", "forehead", "sunglasses"].includes(jewelleryKind);
        const needsHands = ["ring", "wrist", "watch"].includes(jewelleryKind);
        const needsPose = ["neck", "ankle", "brooch", "handbag", "other"].includes(jewelleryKind);
        if (needsFace) {
          try { landmarker = await FaceLandmarker.createFromOptions(vision, options); }
          catch { landmarker = await FaceLandmarker.createFromOptions(vision, { ...options, baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" as const } }); }
        }
        if (needsHands) {
          const handOptions = { baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task", delegate: "GPU" as const }, runningMode: "VIDEO" as const, numHands: 2, minHandDetectionConfidence: 0.5, minHandPresenceConfidence: 0.5, minTrackingConfidence: 0.5 };
          try { handLandmarker = await HandLandmarker.createFromOptions(vision, handOptions); }
          catch { handLandmarker = await HandLandmarker.createFromOptions(vision, { ...handOptions, baseOptions: { ...handOptions.baseOptions, delegate: "CPU" as const } }); }
        }
        if (needsPose) {
          const poseOptions = { baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task", delegate: "GPU" as const }, runningMode: "VIDEO" as const, numPoses: 1, minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5 };
          try { poseLandmarker = await PoseLandmarker.createFromOptions(vision, poseOptions); }
          catch { poseLandmarker = await PoseLandmarker.createFromOptions(vision, { ...poseOptions, baseOptions: { ...poseOptions.baseOptions, delegate: "CPU" as const } }); }
        }
        if (cancelled) {
          landmarker?.close(); handLandmarker?.close(); poseLandmarker?.close();
          return;
        }
        setTrackingState("searching");

        const render = () => {
          if (cancelled) return;
          const videoElement = videoRef.current;
          const canvas = canvasRef.current;
          if (!videoElement || !canvas || (!landmarker && !handLandmarker && !poseLandmarker)) return;
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
              const timestamp = performance.now();
              const face = landmarker?.detectForVideo(videoElement, timestamp).faceLandmarks[0];
              const scale = Math.max(rect.width / videoElement.videoWidth, rect.height / videoElement.videoHeight);
              const offsetX = (rect.width - videoElement.videoWidth * scale) / 2;
              const offsetY = (rect.height - videoElement.videoHeight * scale) / 2;
              const point = (index: number) => ({ x: face?.[index] ? (1 - face[index].x) * videoElement.videoWidth * scale + offsetX : 0, y: face?.[index] ? face[index].y * videoElement.videoHeight * scale + offsetY : 0 });
              const faceWidth = face?.[234] && face?.[454] ? Math.abs(point(234).x - point(454).x) : 0;
              const mapPoint = (p: { x: number; y: number }) => ({ x: (1 - p.x) * videoElement.videoWidth * scale + offsetX, y: p.y * videoElement.videoHeight * scale + offsetY });
              if (face && face[177] && face[401] && face[234] && face[454]) {
                setTrackingState("found");

                const left = point(177);
                const right = point(401);
                const faceWidth = Math.abs(point(234).x - point(454).x);
                const outward = faceWidth * 0.035;
                const size = Math.max(11, Math.min(27, faceWidth * 0.045));
                const leftX = left.x + (left.x < rect.width / 2 ? -outward : outward);
                const rightX = right.x + (right.x < rect.width / 2 ? -outward : outward);
                const productEarring = productEarringRef.current;
                if (jewelleryKind === "earrings" && productEarring?.left.complete && productEarring.left.naturalWidth > 0 && productEarring.right.complete && productEarring.right.naturalWidth > 0) {
                  const referenceFaceWidthMm = 145;
                  const measuredWidth = arWidthMm && arHeightMm ? (faceWidth * arWidthMm) / referenceFaceWidthMm : faceWidth * 0.10;
                  const measuredHeight = arWidthMm && arHeightMm ? (faceWidth * arHeightMm) / referenceFaceWidthMm : measuredWidth * (productEarring.left.naturalHeight / productEarring.left.naturalWidth);
                  const overlayWidth = Math.max(8, Math.min(faceWidth * 0.42, measuredWidth));
                  const overlayHeight = Math.max(10, Math.min(faceWidth * 0.9, measuredHeight));
                  const drawProductAt = (image: HTMLImageElement, x: number, y: number, mirror: boolean) => {
                    ctx.save();
                    if (mirror) {
                      ctx.translate(x * 2, 0);
                      ctx.scale(-1, 1);
                    }
                    ctx.drawImage(image, x - overlayWidth / 2, y - overlayHeight * 0.06, overlayWidth, overlayHeight);
                    ctx.restore();
                  };
                  drawProductAt(productEarring.left, leftX, left.y, false);
                  drawProductAt(productEarring.right, rightX, right.y, productEarring.mirrorRight);
                } else if (jewelleryKind === "earrings" && (!productName || !imageUrl)) {
                  drawEarring(ctx, leftX, left.y, size, styleRef.current, metalRef.current);
                  drawEarring(ctx, rightX, right.y, size, styleRef.current, metalRef.current);
                }
              } else if (jewelleryKind === "earrings") {
                setTrackingState("searching");
              }
              const productOverlay = productOverlayRef.current;
              if (jewelleryKind === "sunglasses" && face && productOverlay?.complete && productOverlay.naturalWidth > 0) {
                const leftEye = point(33);
                const rightEye = point(263);
                const eyeDistance = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y);
                if (eyeDistance > 0) {
                  const width = eyeDistance * 1.48;
                  const height = width * productOverlay.naturalHeight / productOverlay.naturalWidth;
                  const angle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
                  ctx.save();
                  ctx.translate((leftEye.x + rightEye.x) / 2, (leftEye.y + rightEye.y) / 2);
                  ctx.rotate(angle);
                  ctx.drawImage(productOverlay, -width / 2, -height * 0.48, width, height);
                  ctx.restore();
                }
              }
              if (face && productOverlay?.complete && productOverlay.naturalWidth > 0) {
                const drawFaceAsset = (x: number, y: number, width: number) => {
                  const drawWidth = Math.max(8, Math.min(faceWidth * 0.6, arWidthMm ? faceWidth * arWidthMm / 145 : width));
                  const drawHeight = drawWidth * productOverlay.naturalHeight / productOverlay.naturalWidth;
                  ctx.drawImage(productOverlay, x - drawWidth / 2, y - drawHeight / 2, drawWidth, drawHeight);
                };
                if (jewelleryKind === "nose") drawFaceAsset(point(1).x, point(1).y, faceWidth * 0.12);
                if (jewelleryKind === "forehead") drawFaceAsset((point(10).x + point(168).x) / 2, point(10).y + faceWidth * 0.1, faceWidth * 0.28);
              }
              const drawBodyAsset = (x: number, y: number, baseWidth: number, referenceMm: number, rotation = 0, alignTop = false) => {
                const image = productOverlayRef.current;
                if (!image?.complete || image.naturalWidth <= 0) return false;
                const ringScale = jewelleryKind === "ring" ? 0.95 : 0.55;
                const drawWidth = Math.max(8, Math.min(baseWidth * 1.2, arWidthMm ? baseWidth * arWidthMm / referenceMm : baseWidth * ringScale));
                const aspectHeight = drawWidth * image.naturalHeight / image.naturalWidth;
                const measuredHeight = arHeightMm ? baseWidth * arHeightMm / referenceMm : aspectHeight;
                const drawHeight = Math.max(8, Math.min(rect.height * 0.65, measuredHeight));
                ctx.save();
                ctx.translate(x, y);
                if (rotation) ctx.rotate(rotation);
                ctx.drawImage(image, -drawWidth / 2, alignTop ? 0 : -drawHeight / 2, drawWidth, drawHeight);
                ctx.restore();
                return true;
              };
              let bodyTracked = false;
              if (handLandmarker) {
                const hand = handLandmarker.detectForVideo(videoElement, timestamp).landmarks[0];
                if (hand?.[0] && hand?.[5] && hand?.[13] && hand?.[14] && hand?.[17]) {
                  const wrist = mapPoint(hand[0]); const mcp = mapPoint(hand[13]); const pip = mapPoint(hand[14]);
                  const palmWidth = Math.hypot(mapPoint(hand[5]).x - mapPoint(hand[17]).x, mapPoint(hand[5]).y - mapPoint(hand[17]).y);
                  const atRing = jewelleryKind === "ring";
                  const ringX = mcp.x + (pip.x - mcp.x) * 0.35;
                  const ringY = mcp.y + (pip.y - mcp.y) * 0.35;
                  const fingerAngle = Math.atan2(pip.y - mcp.y, pip.x - mcp.x) + Math.PI / 2;
                  const wristAngle = Math.atan2(mcp.y - wrist.y, mcp.x - wrist.x);
                  bodyTracked = drawBodyAsset(
                    atRing ? ringX : wrist.x,
                    atRing ? ringY : wrist.y,
                    Math.max(18, palmWidth * (atRing ? 0.30 : jewelleryKind === "watch" ? 0.9 : 0.72)),
                    atRing ? 18 : jewelleryKind === "watch" ? 85 : 65,
                    atRing ? fingerAngle : jewelleryKind === "watch" ? wristAngle : 0,
                  );
                }
              }
              if (poseLandmarker && !bodyTracked) {
                const pose = poseLandmarker.detectForVideo(videoElement, timestamp).landmarks[0];
                if (pose) {
                  if (jewelleryKind === "ankle" && pose[27] && pose[28]) {
                    const ankle = mapPoint((pose[27].visibility ?? 0) >= (pose[28].visibility ?? 0) ? pose[27] : pose[28]);
                    bodyTracked = drawBodyAsset(ankle.x, ankle.y, Math.max(20, rect.width * 0.065), 65);
                  } else if (jewelleryKind === "handbag" && pose[11] && pose[12] && pose[23] && (pose[11].visibility ?? 0) > 0.35 && (pose[23].visibility ?? 0) > 0.35) {
                    const shoulder = mapPoint(pose[11]);
                    const hip = mapPoint(pose[23]);
                    const oppositeShoulder = mapPoint(pose[12]);
                    const shoulderWidth = Math.hypot(shoulder.x - oppositeShoulder.x, shoulder.y - oppositeShoulder.y);
                    const bagX = hip.x + shoulderWidth * 0.42;
                    const bagY = hip.y - shoulderWidth * 0.02;
                    bodyTracked = drawBodyAsset(bagX, bagY, Math.max(28, shoulderWidth * 0.48), 300, 0.04);
                  } else if ((jewelleryKind === "neck" || jewelleryKind === "brooch" || jewelleryKind === "other") && pose[11] && pose[12] && (pose[11].visibility ?? 0) > 0.35 && (pose[12].visibility ?? 0) > 0.35) {
                    const left = mapPoint(pose[11]); const right = mapPoint(pose[12]);
                    const shoulderWidth = Math.hypot(left.x - right.x, left.y - right.y);
                    const x = jewelleryKind === "brooch" ? left.x : (left.x + right.x) / 2;
                    const isNecklace = jewelleryKind === "neck";
                    const y = jewelleryKind === "brooch" ? left.y : isNecklace ? (left.y + right.y) / 2 - shoulderWidth * 0.12 : (left.y + right.y) / 2 + shoulderWidth * 0.22;
                    bodyTracked = drawBodyAsset(x, y, jewelleryKind === "brooch" ? shoulderWidth * 0.2 : shoulderWidth * 0.9, 380, 0, isNecklace);
                  }
                }
              }
              if (bodyTracked) setTrackingState("found");
              else if (!face && !bodyTracked) setTrackingState("searching");
            }
          }
          animationFrame = requestAnimationFrame(render);
        };
        animationFrame = requestAnimationFrame(render);
      } catch (error) {
        if (!cancelled) {
          setTrackingState("error");
          setCameraError(error instanceof Error ? error.message : "Jewellery tracking could not be loaded. Check your internet connection and try again.");
        }
      }
    };

    void initialise();
    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrame);
      landmarker?.close(); handLandmarker?.close(); poseLandmarker?.close();
      const canvas = canvasRef.current;
      if (canvas) canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [cameraReady, jewelleryKind]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const statusText: Record<TrackingState, string> = {
    idle: "Camera off",
    loading: "Preparing AR tracking…",
    searching: ["ring", "wrist", "watch"].includes(jewelleryKind) ? "Show your hand and wrist" : jewelleryKind === "ankle" ? "Move your ankle into the frame" : jewelleryKind === "handbag" ? "Show your upper body and hips" : "Move your face into the frame",
    found: jewelleryKind === "sunglasses" ? "Face detected · sunglasses aligned" : jewelleryKind === "watch" ? "Wrist detected · watch aligned" : jewelleryKind === "handbag" ? "Body detected · bag positioned" : jewelleryKind === "earrings" ? "Face detected · earrings aligned" : "Product aligned to live landmarks",
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
            Try it on, <em className="text-primary">your way.</em>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            Try jewellery, sunglasses, watches and handbags with live face, hand and body tracking.
          </p>
        </div>

        <div className="mt-10 grid gap-7 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {experiences.map((experience) => {
              const Icon = experience.icon;
              const selected = active === experience.id;
              const available = experience.id === "jewellery" || experience.id === "accessories";
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
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Selected {accessoryProduct ? "accessory" : "jewellery"}</p>
                  <h3 className="mt-1 line-clamp-2 font-medium">{productName}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">This is the product you selected from Discover.</p>
                  <p className="mt-1 text-xs text-muted-foreground">{cutoutState === "loading" ? "Preparing this product’s free cutout on your device…" : cutoutState === "ready" ? arWidthMm && arHeightMm ? `Measured size: ${arWidthMm} × ${arHeightMm} mm per earring.` : "Cutout ready. Add exact earring measurements in Brand Workspace for measured scale." : cutoutError || "The cutout could not be prepared from this photo."}</p>
                </div>
              </div>
            )}
            <div className="relative aspect-[4/3] overflow-hidden bg-[#241f20]">
              {cameraOpen ? (
                <>
                  <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 h-full w-full object-cover [transform:scaleX(-1)]" />
                  <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-label="Virtual accessory preview" />
                  <div className="absolute inset-x-3 top-3 flex justify-center">
                    <span className="rounded-full border border-white/20 bg-black/55 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">{statusText[trackingState]}</span>
                  </div>
                  {trackingState === "searching" && <div className="pointer-events-none absolute inset-0 grid place-items-center"><span className="rounded-full bg-black/55 px-4 py-2 text-sm text-white backdrop-blur">{["ring", "wrist", "watch"].includes(jewelleryKind) ? "Keep your hand and wrist visible" : jewelleryKind === "handbag" ? "Keep your upper body visible" : "Keep your face visible"}</span></div>}
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center text-white">
                  {active === "accessories" && !productName
                    ? <span className="mb-5 grid h-16 w-16 place-items-center rounded-full border border-white/20 bg-white/10"><Camera className="h-7 w-7" /></span>
                    : <button type="button" aria-label="Start camera try-on" title="Start camera try-on" onClick={() => void startCamera()} className="mb-5 grid h-16 w-16 place-items-center rounded-full border border-white/20 bg-white/10 transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><Camera className="h-7 w-7" /></button>}
                  <h3 className="font-display text-3xl">{productName ? "Try this piece on." : active === "accessories" ? "Choose an accessory to try on." : "Find your next favourite."}</h3>
                  <p className="mt-3 max-w-sm text-sm leading-6 text-white/70">
                    {active === "accessories" && !productName
                      ? "Open a sunglasses, watch or handbag product in Discover and tap Try in AR. Its product photo will be placed on your live camera preview."
                      : "Your camera preview stays on this device. Body landmarks are processed in your browser; OFFFEED does not upload your camera stream."}
                  </p>
                  {!(active === "accessories" && !productName) && <Button className="mt-6" onClick={startCamera}><Camera className="mr-2 h-4 w-4" /> Start try-on</Button>}
                </div>
              )}
            </div>
            <div className="space-y-5 p-5">
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{jewelleryKind === "earrings" ? "Choose your earring" : accessoryProduct ? "Live accessory placement" : "Live product placement"}</p>
                {jewelleryKind === "earrings" && <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: "stud", label: "Studs" },
                    { id: "hoop", label: "Hoops" },
                    { id: "drop", label: "Drops" },
                  ] as const).map((item) => (
                    <button key={item.id} type="button" onClick={() => setEarringStyle(item.id)} aria-pressed={earringStyle === item.id} className={`rounded-xl border px-3 py-3 text-sm font-medium transition ${earringStyle === item.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-background hover:border-primary/40"}`}>
                      {item.label}
                    </button>
                  ))}
                </div>}
              </div>
              {jewelleryKind === "earrings" && <div>
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
              </div>}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <p className="max-w-sm text-xs leading-5 text-muted-foreground">{cutoutState === "ready" && productName ? arWidthMm && arHeightMm ? "The product uses the brand’s entered measurements. Landmark placement and on-screen scale are estimates and can vary with camera distance." : "The product cutout is aligned to a live body landmark. Ask the brand to enter its width and height to improve scale; camera distance still affects the preview." : cutoutState === "loading" && productName ? "Creating a free product cutout on this device. The first use downloads the image model; the product photo is not sent to a cutout service." : cutoutState === "error" && productName ? "No sample jewellery is shown for this product. Try a clear product photo with the jewellery separated from the background." : "Preview shapes are illustrative overlays. Select an earring from Discover to preview that product."}</p>

              </div>
              {cameraError && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{cameraError}</p>}
              <div className="flex items-start gap-3 rounded-xl bg-muted/60 p-4">
                <CameraOff className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="text-xs leading-5 text-muted-foreground">
                  Face, hand, and body tracking run locally in the browser using MediaPipe. Models are downloaded from public CDNs; camera frames are not sent to those servers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
