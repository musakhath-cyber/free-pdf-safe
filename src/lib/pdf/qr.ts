export async function decodeQrFromCanvas(
  canvas: HTMLCanvasElement,
  video?: HTMLVideoElement,
): Promise<string | null> {
  if ("BarcodeDetector" in window) {
    try {
      const Detector = (
        window as unknown as {
          BarcodeDetector: new (opts: { formats: string[] }) => {
            detect: (source: CanvasImageSource) => Promise<Array<{ rawValue?: string }>>;
          };
        }
      ).BarcodeDetector;
      const detector = new Detector({ formats: ["qr_code"] });
      const codes = await detector.detect(video ?? canvas);
      const value = codes.find((code) => code.rawValue)?.rawValue;
      if (value) return value;
    } catch {
      // Fall through to jsQR.
    }
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const jsQR = (await import("jsqr")).default;
  const result = jsQR(image.data, image.width, image.height, {
    inversionAttempts: "attemptBoth",
  });
  return result?.data ?? null;
}

export async function decodeQrFromFile(file: File): Promise<string | null> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const maxEdge = 1800;
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return decodeQrFromCanvas(canvas);
}

export function isHttpUrl(text: string) {
  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
