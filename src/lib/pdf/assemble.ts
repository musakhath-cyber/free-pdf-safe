import { canvasToJpeg, dataUrlToBytes, flattenPage } from "./canvas";
import type { PageSizeId, Stamp, StudioPage } from "./types";
import { PAGE_SIZES } from "./types";

export async function assemblePdf(
  pages: StudioPage[],
  size: PageSizeId,
  stamps: Stamp[] = [],
): Promise<Uint8Array> {
  if (pages.length === 0) throw new Error("Add a page first.");
  const { PDFDocument } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const spec = PAGE_SIZES[size];
  for (const page of pages) {
    const canvas = await flattenPage(page, size, stamps);
    const jpeg = await canvasToJpeg(canvas, 0.9);
    const image = await pdf.embedJpg(dataUrlToBytes(jpeg));
    const sheet = pdf.addPage([spec.widthPt, spec.heightPt]);
    sheet.drawImage(image, {
      x: 0,
      y: 0,
      width: spec.widthPt,
      height: spec.heightPt,
    });
  }
  return pdf.save();
}

export function pdfFilename(stem = "document") {
  const safe = stem.replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").slice(0, 40) || "document";
  return `${safe}.pdf`;
}
