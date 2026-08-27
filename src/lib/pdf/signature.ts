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

export async function liftInkFromFile(file: File, threshold: number): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const maxEdge = 1600;
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvasToPng(liftInkFromCanvas(canvas, threshold));
}

export async function liftInkFromDataUrl(dataUrl: string, threshold: number): Promise<string> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Could not read the drawing."));
    img.src = dataUrl;
  });
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || 1;
  canvas.height = img.naturalHeight || 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);
  return canvasToPng(liftInkFromCanvas(canvas, threshold));
}
