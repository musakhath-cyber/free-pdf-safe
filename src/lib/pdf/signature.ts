import { canvasToPng } from "./canvas";

export function liftInkFromCanvas(source: HTMLCanvasElement, threshold: number): HTMLCanvasElement {
  const src = source.getContext("2d");
  if (!src) throw new Error("Canvas is not available.");
  const { width, height } = source;
  const image = src.getImageData(0, 0, width, height);
  const { data } = image;
  const t = Math.min(250, Math.max(20, threshold));

  for (let i = 0; i < data.length; i += 4) {
    const luma = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    if (luma > t) {
      data[i + 3] = 0;
    } else {
      const ink = Math.round(255 * (1 - luma / t));
      data[i] = 28;
      data[i + 1] = 25;
      data[i + 2] = 22;
      data[i + 3] = Math.min(255, ink + 40);
    }
  }

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const a = data[(y * width + x) * 4 + 3];
      if (a > 12) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  const inked = document.createElement("canvas");
  inked.width = width;
  inked.height = height;
  const inkedCtx = inked.getContext("2d");
  if (!inkedCtx) throw new Error("Canvas is not available.");
  inkedCtx.putImageData(image, 0, 0);

  if (maxX <= minX || maxY <= minY) {
    const empty = document.createElement("canvas");
    empty.width = 4;
    empty.height = 4;
    return empty;
  }

  const pad = 8;
  const sx = Math.max(0, minX - pad);
  const sy = Math.max(0, minY - pad);
  const sw = Math.min(width - sx, maxX - minX + pad * 2);
  const sh = Math.min(height - sy, maxY - minY + pad * 2);
  const cropped = document.createElement("canvas");
  cropped.width = sw;
  cropped.height = sh;
  const croppedCtx = cropped.getContext("2d");
  if (!croppedCtx) throw new Error("Canvas is not available.");
  croppedCtx.drawImage(inked, sx, sy, sw, sh, 0, 0, sw, sh);
  return cropped;
}

function fitCanvas(width: number, height: number, maxEdge = 1600) {
  const scale = Math.min(1, maxEdge / Math.max(width, height, 1));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  return canvas;
}

async function rasterizePdfFirstPage(file: File) {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = fitCanvas(viewport.width, viewport.height);
  const scale = canvas.width / viewport.width;
  const fitted = page.getViewport({ scale: 2 * scale });
  canvas.width = Math.max(1, Math.round(fitted.width));
  canvas.height = Math.max(1, Math.round(fitted.height));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport: fitted, canvas }).promise;
  return canvas;
}

async function bitmapToCanvas(bitmap: ImageBitmap) {
  const canvas = fitCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

async function imageUrlToCanvas(url: string) {
  const img = new Image();
  img.decoding = "async";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Could not read that file as an image."));
    img.src = url;
  });
  const canvas = fitCanvas(img.naturalWidth || 1, img.naturalHeight || 1);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export async function fileToInkCanvas(file: File) {
  const name = file.name.toLowerCase();
  const type = file.type;
  if (type === "application/pdf" || name.endsWith(".pdf")) {
    return rasterizePdfFirstPage(file);
  }
  try {
    return await bitmapToCanvas(await createImageBitmap(file));
  } catch {
    const url = URL.createObjectURL(file);
    try {
      return await imageUrlToCanvas(url);
    } catch {
      if (/\.(heic|heif)$/i.test(name) || type.includes("heic") || type.includes("heif")) {
        throw new Error("This phone could not read HEIC. Save it as JPEG or PNG, or take a screenshot.");
      }
      throw new Error("Use a JPEG, PNG, WebP, GIF, BMP, SVG, or PDF of the signature.");
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

export async function liftInkFromFile(file: File, threshold: number): Promise<string> {
  const canvas = await fileToInkCanvas(file);
  return canvasToPng(liftInkFromCanvas(canvas, threshold));
}

export async function liftInkFromDataUrl(dataUrl: string, threshold: number): Promise<string> {
  const canvas = await imageUrlToCanvas(dataUrl);
  return canvasToPng(liftInkFromCanvas(canvas, threshold));
}
