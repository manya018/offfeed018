type OrtTensor = { data: Float32Array };
type OrtResult = { output_image: OrtTensor };
type OrtSession = { run(input: Record<string, unknown>): Promise<OrtResult> };
type OrtRuntime = {
  env: { wasm: { wasmPaths: string; numThreads: number } };
  Tensor: new (type: "float32", data: Float32Array, dimensions: number[]) => unknown;
  InferenceSession: {
    create(model: Uint8Array, options: { executionProviders: string[]; graphOptimizationLevel: "all" }): Promise<OrtSession>;
  };
};

declare global {
  interface Window { ort?: OrtRuntime }
}

// ISNet background model by chenjindu/browser-remove-background (Apache-2.0), pinned to a commit.
// ONNX Runtime Web is loaded from its npm distribution (MIT). Product photos stay in this browser.
const MODEL_BASE = "https://cdn.jsdelivr.net/gh/chenjindu/browser-remove-background@2d550542847cde6a8ba7c5128584de0fab32757b/model/";
const ORT_BASE = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/";
const modelParts = ["isnet-w8.part00", "isnet-w8.part01", "isnet-w8.part02"];
let runtimePromise: Promise<OrtRuntime> | null = null;
let sessionPromise: Promise<OrtSession> | null = null;

function loadRuntime(): Promise<OrtRuntime> {
  if (window.ort) return Promise.resolve(window.ort);
  if (!runtimePromise) {
    runtimePromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = ORT_BASE + "ort.min.js";
      script.crossOrigin = "anonymous";
      script.onload = () => window.ort ? resolve(window.ort) : reject(new Error("The local image model could not start."));
      script.onerror = () => reject(new Error("The free on-device image model could not be downloaded. Check your connection and retry."));
      document.head.appendChild(script);
    });
  }
  return runtimePromise;
}

async function loadModel(): Promise<Uint8Array> {
  const responses = await Promise.all(modelParts.map((part) => fetch(MODEL_BASE + part, { cache: "force-cache" })));
  if (responses.some((response) => !response.ok)) throw new Error("The free on-device image model could not be downloaded. Check your connection and retry.");
  const parts = await Promise.all(responses.map((response) => response.arrayBuffer()));
  const length = parts.reduce((total, part) => total + part.byteLength, 0);
  const model = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    model.set(new Uint8Array(part), offset);
    offset += part.byteLength;
  }
  return model;
}

async function getSession(runtime: OrtRuntime): Promise<OrtSession> {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      runtime.env.wasm.wasmPaths = ORT_BASE;
      runtime.env.wasm.numThreads = 1;
      return runtime.InferenceSession.create(await loadModel(), {
        executionProviders: ["wasm"],
        graphOptimizationLevel: "all",
      });
    })();
  }
  return sessionPromise;
}

/** Removes a product photo's background on the current device; no image-removal API is called. */
export async function removeBackgroundLocally(source: Blob): Promise<Blob> {
  if (!source.type.startsWith("image/")) throw new Error("Choose a supported product image.");
  if (source.size > 12 * 1024 * 1024) throw new Error("The product photo must be 12 MB or smaller.");

  const runtime = await loadRuntime();
  const session = await getSession(runtime);
  const bitmap = await createImageBitmap(source, { imageOrientation: "from-image" });
  try {
    const inputCanvas = document.createElement("canvas");
    inputCanvas.width = 1024;
    inputCanvas.height = 1024;
    const inputContext = inputCanvas.getContext("2d", { willReadFrequently: true });
    if (!inputContext) throw new Error("Image processing is unavailable in this browser.");
    inputContext.drawImage(bitmap, 0, 0, 1024, 1024);
    const pixels = inputContext.getImageData(0, 0, 1024, 1024).data;
    const pixelCount = 1024 * 1024;
    const tensorData = new Float32Array(pixelCount * 3);
    for (let i = 0; i < pixelCount; i++) {
      tensorData[i] = pixels[i * 4] / 255 - 0.5;
      tensorData[pixelCount + i] = pixels[i * 4 + 1] / 255 - 0.5;
      tensorData[pixelCount * 2 + i] = pixels[i * 4 + 2] / 255 - 0.5;
    }

    const result = await session.run({
      input_image: new runtime.Tensor("float32", tensorData, [1, 3, 1024, 1024]),
    });
    const mask = result.output_image.data;
    let min = Infinity;
    let max = -Infinity;
    for (const value of mask) {
      if (value < min) min = value;
      if (value > max) max = value;
    }
    if (!Number.isFinite(min) || !Number.isFinite(max) || max - min < 1e-6) {
      throw new Error("The product photo could not be separated from its background.");
    }

    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = 1024;
    maskCanvas.height = 1024;
    const maskContext = maskCanvas.getContext("2d");
    if (!maskContext) throw new Error("Image processing is unavailable in this browser.");
    const maskImage = maskContext.createImageData(1024, 1024);
    for (let i = 0; i < pixelCount; i++) {
      const alpha = Math.max(0, Math.min(255, Math.round(((mask[i] - min) / (max - min)) * 255)));
      const at = i * 4;
      maskImage.data[at] = 255;
      maskImage.data[at + 1] = 255;
      maskImage.data[at + 2] = 255;
      maskImage.data[at + 3] = alpha;
    }
    maskContext.putImageData(maskImage, 0, 0);

    const outputCanvas = document.createElement("canvas");
    const outputScale = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
    outputCanvas.width = Math.max(1, Math.round(bitmap.width * outputScale));
    outputCanvas.height = Math.max(1, Math.round(bitmap.height * outputScale));
    const outputContext = outputCanvas.getContext("2d");
    if (!outputContext) throw new Error("Image processing is unavailable in this browser.");
    outputContext.drawImage(bitmap, 0, 0);
    outputContext.globalCompositeOperation = "destination-in";
    outputContext.drawImage(maskCanvas, 0, 0, bitmap.width, bitmap.height);
    const output = await new Promise<Blob>((resolve, reject) => {
      outputCanvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("A transparent cutout could not be created.")), "image/png");
    });
    if (output.size > 8 * 1024 * 1024) throw new Error("The transparent cutout is over 8 MB. Try a smaller product photo.");
    return output;
  } finally {
    bitmap.close();
  }
}
