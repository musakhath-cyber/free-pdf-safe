import { PAGE_DPI, PAGE_SIZES, type PageSizeId, type Stamp, type StudioPage } from "./types";

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

export async function flattenPage(
  page: StudioPage,
  size: PageSizeId,
  stamps: Stamp[],
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
  return canvas;
}
