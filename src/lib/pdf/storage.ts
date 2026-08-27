import type { ScanRecord, SignatureAsset } from "./types";

const SIGNATURES_KEY = "free-pdf-safe:signatures";
const SCANS_KEY = "free-pdf-safe:scans";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota — ignore; the session still works.
  }
}

export function loadSignatures(): SignatureAsset[] {
  const rows = readJson<SignatureAsset[]>(SIGNATURES_KEY, []);
  return Array.isArray(rows) ? rows.filter((row) => row?.id && row?.dataUrl) : [];
}

export function saveSignatures(rows: SignatureAsset[]) {
  writeJson(SIGNATURES_KEY, rows.slice(0, 12));
}

export function loadScans(): ScanRecord[] {
  const rows = readJson<ScanRecord[]>(SCANS_KEY, []);
  return Array.isArray(rows) ? rows.filter((row) => row?.id && row?.text) : [];
}

export function saveScans(rows: ScanRecord[]) {
  writeJson(SCANS_KEY, rows.slice(0, 20));
}
