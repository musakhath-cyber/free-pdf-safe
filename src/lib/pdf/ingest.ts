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

function isSpreadsheet(file: File) {
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".xlsx") ||
    name.endsWith(".xlsm") ||
    name.endsWith(".xls") ||
    name.endsWith(".csv") ||
    file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.type === "application/vnd.ms-excel" ||
    file.type === "text/csv" ||
    file.type === "application/csv"
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
  if (name.endsWith(".xlsb") || name.endsWith(".ods")) {
    return `${file.name} needs to be saved as .xlsx or .csv first.`;
  }
  return `${file.name} is not a photo, PDF, Word, Excel, or text file.`;
}

export function canIngest(file: File) {
  return isPdf(file) || isDocx(file) || isText(file) || isSpreadsheet(file) || isImage(file);
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

function cellText(value: unknown) {
  if (value == null || value === "") return "";
  if (value instanceof Date) {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(value);
  }
  return String(value).replace(/\s+/g, " ").trim();
}

function fitLabel(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let slice = text;
  while (slice.length > 1 && ctx.measureText(`${slice}…`).width > maxWidth) {
    slice = slice.slice(0, -1);
  }
  return slice.length ? `${slice}…` : "";
}

async function rasterizeTablePages(
  rows: string[][],
  name: string,
  size: PageSizeId,
  heading: string,
): Promise<StudioPage[]> {
  const { width, height } = pagePixelSize(size);
  const margin = Math.round(width * 0.06);
  const tableW = width - margin * 2;
  const colCount = Math.min(16, Math.max(1, ...rows.map((row) => row.length), 1));
  const trimmed = rows
    .map((row) => {
      const next = row.slice(0, colCount).map((cell) => cell ?? "");
      while (next.length < colCount) next.push("");
      return next;
    })
    .filter((row) => row.some((cell) => cell.length > 0));
  const data = trimmed.length ? trimmed : [Array.from({ length: colCount }, () => "")];

  const samples = data.slice(0, 80);
  const rawWidths = Array.from({ length: colCount }, (_, col) => {
    let longest = 4;
    for (const row of samples) {
      longest = Math.max(longest, (row[col] ?? "").length);
    }
    return Math.min(28, Math.max(6, longest));
  });
  const totalUnits = rawWidths.reduce((sum, w) => sum + w, 0) || colCount;
  const colWidths = rawWidths.map((w) => Math.max(36, (w / totalUnits) * tableW));
  const scale = tableW / colWidths.reduce((sum, w) => sum + w, 0);
  const widths = colWidths.map((w) => w * scale);

  const fontSize = Math.max(11, Math.min(15, Math.round(width * 0.022)));
  const rowH = Math.round(fontSize * 1.7);
  const titleSize = Math.round(width * 0.032);
  const titleBlock = Math.round(titleSize * 1.8);
  const usable = height - margin * 2 - titleBlock;
  const rowsPerPage = Math.max(8, Math.floor(usable / rowH));
  const pages: StudioPage[] = [];
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available.");

  for (let start = 0; start < data.length && pages.length < 40; start += rowsPerPage) {
    const chunk = data.slice(start, start + rowsPerPage);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#0b2748";
    ctx.font = `600 ${titleSize}px Fraunces, Georgia, serif`;
    ctx.fillText(fitLabel(ctx, heading, tableW), margin, margin + titleSize);

    let y = margin + titleBlock;
    chunk.forEach((row, rowIndex) => {
      const isHeader = start === 0 && rowIndex === 0;
      if (isHeader) {
        ctx.fillStyle = "#eef2f7";
        ctx.fillRect(margin, y, tableW, rowH);
      }
      ctx.strokeStyle = "rgba(11, 39, 72, 0.12)";
      ctx.lineWidth = 1;
      ctx.strokeRect(margin, y, tableW, rowH);
      let x = margin;
      ctx.font = `${isHeader ? 600 : 400} ${fontSize}px "Source Sans 3", system-ui, sans-serif`;
      ctx.fillStyle = "#1c1916";
      ctx.textBaseline = "middle";
      for (let c = 0; c < colCount; c += 1) {
        ctx.strokeRect(x, y, widths[c], rowH);
        const label = fitLabel(ctx, row[c] ?? "", widths[c] - 10);
        ctx.fillText(label, x + 5, y + rowH / 2);
        x += widths[c];
      }
      y += rowH;
    });

    const index = pages.length + 1;
    pages.push({
      id: uid(),
      name: `${name} · ${index}`,
      dataUrl: await canvasToJpeg(canvas, 0.92),
      width,
      height,
      rotation: 0,
      marginPt: 0,
    });
  }
  return pages;
}

async function ingestSpreadsheet(file: File, size: PageSizeId): Promise<StudioPage[]> {
  const mod = await import("xlsx");
  const XLSX = (mod as { default?: typeof import("xlsx") }).default ?? mod;
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  if (!wb.SheetNames.length) throw new Error(`${file.name} has no sheets.`);
  const pages: StudioPage[] = [];
  for (const sheetName of wb.SheetNames) {
    if (pages.length >= 40) break;
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;
    const rows = (XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: false,
      defval: "",
      blankrows: false,
    }) as unknown[][]).map((row) => row.map((cell) => cellText(cell)));
    if (!rows.length) continue;
    const heading = wb.SheetNames.length > 1 ? `${file.name} · ${sheetName}` : file.name;
    pages.push(...(await rasterizeTablePages(rows, heading, size, heading)));
  }
  if (!pages.length) throw new Error(`${file.name} has no readable cells.`);
  return pages.slice(0, 40);
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
      else if (isSpreadsheet(file)) pages.push(...(await ingestSpreadsheet(file, size)));
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
    "Use Convert to add your own photos, scans, PDFs, Word, or Excel files. Use Scan to read a QR code with the camera.",
    "",
    "Yours sincerely,",
    "",
    "",
    "______________________________",
    "Signature",
  ].join("\n");
  return rasterizeTextPages(body, "Sample letter", size, "Sample letter");
}
