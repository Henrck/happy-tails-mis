// Makes every product photo the same size and framing before it is stored:
//  1. trims empty borders (transparent or near-white) around the product,
//  2. centres the product on an 800x800 white square with even padding,
//  3. saves a compressed WebP (JPEG fallback on browsers without WebP encode).
// Runs in the browser, so uploads are small and cards look consistent.

const OUTPUT_SIZE = 800;
const PADDING_RATIO = 0.08;   // 8% empty margin on every side
const MAX_SCAN = 1600;        // downscale huge photos before scanning pixels
const QUALITY = 0.85;

/** Marker in the storage path for images already processed by this function. */
export const NORMALIZED_IMAGE_MARKER = "-std-";

function isBackground(r: number, g: number, b: number, a: number) {
  return a < 16 || (r > 242 && g > 242 && b > 242);
}

async function loadBitmap(source: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try { return await createImageBitmap(source); } catch { /* fall back to <img> */ }
  }
  const url = URL.createObjectURL(source);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, type, QUALITY));
}

/** Returns a standardized square product image. Throws if the image can't be read. */
export async function normalizeProductImage(source: Blob): Promise<{ blob: Blob; extension: "webp" | "jpg" }> {
  const image = await loadBitmap(source);
  const width = "naturalWidth" in image ? image.naturalWidth : image.width;
  const height = "naturalHeight" in image ? image.naturalHeight : image.height;
  if (!width || !height) throw new Error("This image has no size.");

  // 1) Find the product's bounding box on a (possibly downscaled) copy.
  const scale = Math.min(1, MAX_SCAN / Math.max(width, height));
  const scanW = Math.max(1, Math.round(width * scale));
  const scanH = Math.max(1, Math.round(height * scale));
  const scan = document.createElement("canvas");
  scan.width = scanW; scan.height = scanH;
  const scanCtx = scan.getContext("2d", { willReadFrequently: true });
  if (!scanCtx) throw new Error("Image processing is not available in this browser.");
  scanCtx.drawImage(image, 0, 0, scanW, scanH);
  const pixels = scanCtx.getImageData(0, 0, scanW, scanH).data;
  let top = scanH, left = scanW, right = -1, bottom = -1;
  for (let y = 0; y < scanH; y++) {
    for (let x = 0; x < scanW; x++) {
      const i = (y * scanW + x) * 4;
      if (isBackground(pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3])) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  // Nothing but background: keep the whole image.
  if (right < 0) { left = 0; top = 0; right = scanW - 1; bottom = scanH - 1; }
  const crop = {
    x: left / scale, y: top / scale,
    w: (right - left + 1) / scale, h: (bottom - top + 1) / scale,
  };

  // 2) Centre it on a white square with even padding.
  const out = document.createElement("canvas");
  out.width = OUTPUT_SIZE; out.height = OUTPUT_SIZE;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Image processing is not available in this browser.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  ctx.imageSmoothingQuality = "high";
  const box = OUTPUT_SIZE * (1 - PADDING_RATIO * 2);
  const fit = Math.min(box / crop.w, box / crop.h);
  const drawW = crop.w * fit, drawH = crop.h * fit;
  ctx.drawImage(image, crop.x, crop.y, crop.w, crop.h, (OUTPUT_SIZE - drawW) / 2, (OUTPUT_SIZE - drawH) / 2, drawW, drawH);
  if ("close" in image) image.close();

  // 3) Encode.
  const webp = await canvasToBlob(out, "image/webp");
  if (webp && webp.type === "image/webp") return { blob: webp, extension: "webp" };
  const jpeg = await canvasToBlob(out, "image/jpeg");
  if (!jpeg) throw new Error("Could not encode the processed image.");
  return { blob: jpeg, extension: "jpg" };
}
