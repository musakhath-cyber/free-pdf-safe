export const APP_SHARE_URL = "https://freepdfsafe.online";
export const APP_SHARE_TEXT =
  "Made with Free PDF Safe. Convert, sign, and scan on this device — files never upload.\nhttps://freepdfsafe.online";

export function bytesToPdfFile(filename: string, bytes: Uint8Array) {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return new File([copy], filename, { type: "application/pdf" });
}

export function canSharePdf(file: File) {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") return false;
  try {
    if (navigator.canShare) return navigator.canShare({ files: [file] }) || navigator.canShare({ url: APP_SHARE_URL });
  } catch {
    return true;
  }
  return true;
}

export async function sharePdfFile(file: File): Promise<"shared" | "copied" | "skipped"> {
  const withFile = { files: [file], title: file.name, text: APP_SHARE_TEXT };
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share(withFile);
      return "shared";
    }
    if (typeof navigator.share === "function") {
      await navigator.share({
        title: "Free PDF Safe",
        text: APP_SHARE_TEXT,
        url: APP_SHARE_URL,
      });
      return "shared";
    }
    await navigator.clipboard.writeText(APP_SHARE_URL);
    return "copied";
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") return "skipped";
    throw error;
  }
}
