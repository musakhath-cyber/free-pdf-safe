import { PAGE_DPI, PAGE_SIZES, type Mark, type PageSizeId, type Stamp, type StudioPage } from "./types";

export function pagePixelSize(size: PageSizeId) {
  const page = PAGE_SIZES[size];
  return {
    width: Math.round((page.widthPt / 72) * PAGE_DPI),
    height: Math.round((page.heightPt / 72) * PAGE_DPI),
  };
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read that image."));
    img.src = src;
  });
}

export function canvasToJpeg(canvas: HTMLCanvasElement, quality = 0.88): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not encode the page."));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not read the page."));
        reader.readAsDataURL(blob);
      },
      "image/jpeg",
      quality,
    );
  });
}

export function canvasToPng(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not encode the image."));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not read the image."));
        reader.readAsDataURL(blob);
      },
      "image/png",
    );
  });
}

export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(",");
  const binary = atob(comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function drawPageContent(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource & { width: number; height: number },
  page: StudioPage,
  destW: number,
  destH: number,
  size: PageSizeId,
) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, destW, destH);

  const iw = "naturalWidth" in img && typeof img.naturalWidth === "number" && img.naturalWidth
    ? img.naturalWidth
    : img.width;
  const ih = "naturalHeight" in img && typeof img.naturalHeight === "number" && img.naturalHeight
    ? img.naturalHeight
    : img.height;
  const rotated = page.rotation === 90 || page.rotation === 270;
  const contentW = rotated ? ih : iw;
  const contentH = rotated ? iw : ih;
  const spec = PAGE_SIZES[size];
  const marginX = (page.marginPt / spec.widthPt) * destW;
  const marginY = (page.marginPt / spec.heightPt) * destH;
  const maxW = Math.max(1, destW - marginX * 2);
  const maxH = Math.max(1, destH - marginY * 2);
  const scale = Math.min(maxW / contentW, maxH / contentH);
  const dw = contentW * scale;
  const dh = contentH * scale;
  const x = (destW - dw) / 2;
  const y = (destH - dh) / 2;
  const drawW = iw * scale;
  const drawH = ih * scale;

  ctx.save();
  ctx.translate(x + dw / 2, y + dh / 2);
  ctx.rotate((page.rotation * Math.PI) / 180);
  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();
}

export function drawMarks(
  ctx: CanvasRenderingContext2D,
  marks: Mark[],
  width: number,
  height: number,
) {
  const order = ["whiteout", "highlight", "ink", "note", "text"];
  const sorted = [...marks].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
  for (const mark of sorted) {
    const x = mark.nx * width;
    const y = mark.ny * height;
    const w = Math.max(1, mark.nw * width);
    const h = Math.max(1, mark.nh * height);
    if (mark.kind === "whiteout") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x, y, w, h);
      continue;
    }
    if (mark.kind === "highlight") {
      ctx.fillStyle = withAlpha(mark.color, 0.38);
      ctx.fillRect(x, y, w, h);
      continue;
    }
    if (mark.kind === "ink") {
      if (mark.points.length < 2) continue;
      ctx.strokeStyle = mark.color;
      ctx.lineWidth = Math.max(2.5, width * 0.0045);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      mark.points.forEach((point, index) => {
        const px = point.x * width;
        const py = point.y * height;
        if (index === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
      continue;
    }
    if (mark.kind === "note") {
      ctx.fillStyle = "#fff4c2";
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "rgba(11, 39, 72, 0.22)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);
    }
    const pad = 6;
    const fontSize = Math.max(13, Math.min(h * 0.42, w * 0.16));
    ctx.fillStyle = mark.color || "#0b2748";
    ctx.font = `600 ${fontSize}px "Source Sans 3", system-ui, sans-serif`;
    ctx.textBaseline = "top";
    const lines = wrapCanvasLines(ctx, mark.text || " ", w - pad * 2);
    let ty = y + pad;
    for (const line of lines) {
      if (ty > y + h - fontSize) break;
      ctx.fillText(line, x + pad, ty);
      ty += fontSize * 1.25;
    }
  }
}

function withAlpha(color: string, alpha: number) {
  const hex = color.replace("#", "");
  if (hex.length !== 6) return `rgba(245, 215, 110, ${alpha})`;
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function wrapCanvasLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = [];
  for (const raw of text.split("\n")) {
    const words = raw.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width <= maxWidth) line = next;
      else {
        if (line) lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
  }
  return lines.length ? lines : [""];
}

export async function flattenPage(
  page: StudioPage,
  size: PageSizeId,
  stamps: Stamp[],
  marks: Mark[] = [],
): Promise<HTMLCanvasElement> {
  const { width, height } = pagePixelSize(size);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available.");
  const img = await loadImage(page.dataUrl);
  drawPageContent(ctx, img, page, width, height, size);
  for (const stamp of stamps.filter((item) => item.pageId === page.id)) {
    const mark = await loadImage(stamp.dataUrl);
    ctx.drawImage(mark, stamp.nx * width, stamp.ny * height, stamp.nw * width, stamp.nh * height);
  }
  drawMarks(
    ctx,
    marks.filter((item) => item.pageId === page.id),
    width,
    height,
  );
  return canvas;
}
