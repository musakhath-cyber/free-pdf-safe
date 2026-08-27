import { uid } from "@/lib/utils";
import { canvasToJpeg, pagePixelSize } from "./canvas";
import { PAGE_DPI, type PageSizeId, type StudioPage } from "./types";

const IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);

function isPdf(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function isDocx(file: File) {
  return (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.name.toLowerCase().endsWith(".docx")
  );
}

function isText(file: File) {
  return file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt");
}

function isImage(file: File) {
  if (IMAGE_TYPES.has(file.type)) return true;
  return /\.(jpe?g|png|webp|gif)$/i.test(file.name);
}

export function describeUnsupported(file: File) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".heic") || name.endsWith(".heif")) {
    return `${file.name} is HEIC. Convert it to JPEG first, or take a screenshot.`;
  }
  if (name.endsWith(".doc") && !name.endsWith(".docx")) {
    return `${file.name} is an old Word file. Save it as .docx and try again.`;
  }
  return `${file.name} is not a photo, PDF, Word, or text file.`;
}

export function canIngest(file: File) {
  return isPdf(file) || isDocx(file) || isText(file) || isImage(file);
}

async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  return pdfjs;
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = [];
  for (const raw of text.replace(/\r\n/g, "\n").split("\n")) {
    const paragraph = raw.length === 0 ? " " : raw;
    const words = paragraph.split(/\s+/);
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width <= maxWidth) {
        line = next;
      } else {
        if (line) lines.push(line);
        line = word;
      }
    }
    lines.push(line || " ");
  }
  return lines;
}

function rasterizeTextPages(
  text: string,
  name: string,
  size: PageSizeId,
  heading?: string,
): Promise<StudioPage[]> {
  const { width, height } = pagePixelSize(size);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available.");

  const margin = Math.round(width * 0.1);
  const bodySize = Math.round(width * 0.032);
  const titleSize = Math.round(width * 0.048);
  const lineHeight = Math.round(bodySize * 1.55);
  ctx.font = `500 ${bodySize}px "Source Sans 3", system-ui, sans-serif`;
  const maxWidth = width - margin * 2;
  const lines = wrapLines(ctx, text.trim() || " ", maxWidth);
  const titleLines = heading ? wrapLines(ctx, heading, maxWidth) : [];
  const usable = height - margin * 2;
  const titleBlock = titleLines.length ? titleLines.length * Math.round(titleSize * 1.3) + lineHeight : 0;
  const linesPerPage = Math.max(8, Math.floor((usable - titleBlock) / lineHeight));
  const chunks: string[][] = [];
  for (let i = 0; i < lines.length; i += linesPerPage) {
    chunks.push(lines.slice(i, i + linesPerPage));
  }
  if (chunks.length === 0) chunks.push([" "]);

  return Promise.all(
    chunks.map(async (chunk, index) => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#1c1916";
      let y = margin + titleSize;
      if (heading && index === 0) {
        ctx.font = `600 ${titleSize}px Fraunces, Georgia, serif`;
        for (const title of titleLines) {
          ctx.fillText(title, margin, y);
          y += Math.round(titleSize * 1.3);
        }
        y += Math.round(lineHeight * 0.4);
      }
      ctx.font = `400 ${bodySize}px "Source Sans 3", system-ui, sans-serif`;
      ctx.fillStyle = "#2a2723";
      for (const line of chunk) {
        ctx.fillText(line === " " ? "" : line, margin, y);
        y += lineHeight;
      }
      const dataUrl = await canvasToJpeg(canvas, 0.92);
      return {
        id: uid(),
        name: chunks.length > 1 ? `${name} · ${index + 1}` : name,
        dataUrl,
        width,
        height,
        rotation: 0 as const,
        marginPt: 0,
      };
    }),
  );
}

async function ingestImage(file: File, size: PageSizeId): Promise<StudioPage> {
  const bitmap = await createImageBitmap(file);
  const { width: pageW, height: pageH } = pagePixelSize(size);
  const maxEdge = Math.max(pageW, pageH) * 1.5;
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return {
    id: uid(),
    name: file.name,
    dataUrl: await canvasToJpeg(canvas, 0.9),
    width: w,
    height: h,
    rotation: 0,
    marginPt: 36,
  };
}

async function ingestPdf(file: File): Promise<StudioPage[]> {
  const pdfjs = await loadPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  const pages: StudioPage[] = [];
  const count = Math.min(doc.numPages, 40);
  for (let i = 1; i <= count; i += 1) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: PAGE_DPI / 72 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(viewport.width));
    canvas.height = Math.max(1, Math.round(viewport.height));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    pages.push({
      id: uid(),
      name: `${file.name} · ${i}`,
      dataUrl: await canvasToJpeg(canvas, 0.9),
      width: canvas.width,
      height: canvas.height,
      rotation: 0,
      marginPt: 0,
    });
  }
  return pages;
}

async function ingestDocx(file: File, size: PageSizeId): Promise<StudioPage[]> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  const text = result.value.replace(/\n{3,}/g, "\n\n").trim();
  if (!text) throw new Error(`${file.name} has no readable text.`);
  return rasterizeTextPages(text, file.name, size);
}

async function ingestText(file: File, size: PageSizeId): Promise<StudioPage[]> {
  const text = (await file.text()).replace(/\n{3,}/g, "\n\n");
  return rasterizeTextPages(text, file.name, size);
}

export async function ingestFiles(files: File[], size: PageSizeId): Promise<{
  pages: StudioPage[];
  skipped: string[];
}> {
  const pages: StudioPage[] = [];
  const skipped: string[] = [];
  for (const file of files) {
    try {
      if (isPdf(file)) pages.push(...(await ingestPdf(file)));
      else if (isDocx(file)) pages.push(...(await ingestDocx(file, size)));
      else if (isText(file)) pages.push(...(await ingestText(file, size)));
      else if (isImage(file)) pages.push(await ingestImage(file, size));
      else skipped.push(describeUnsupported(file));
    } catch (error) {
      skipped.push(error instanceof Error ? error.message : `Could not read ${file.name}.`);
    }
  }
  return { pages, skipped };
}

export async function makeSampleLetter(size: PageSizeId): Promise<StudioPage[]> {
  const today = new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
  const body = [
    "Free PDF Safe",
    "On-device studio",
    "",
    today,
    "",
    "Dear reader,",
    "",
    "This is a sample letter. Photograph a signature on paper, or draw one with your finger, then stamp it below. The file never leaves this device — conversion, ink cleanup, and the finished PDF all run in the browser.",
    "",
    "Use Convert to add your own photos, scans, PDFs, or Word files. Use Scan to read a QR code with the camera.",
    "",
    "Yours sincerely,",
    "",
    "",
    "______________________________",
    "Signature",
  ].join("\n");
  return rasterizeTextPages(body, "Sample letter", size, "Sample letter");
}
