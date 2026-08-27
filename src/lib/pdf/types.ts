export const PAGE_SIZES = {
  a4: { id: "a4", label: "A4", widthPt: 595.28, heightPt: 841.89 },
  letter: { id: "letter", label: "Letter", widthPt: 612, heightPt: 792 },
} as const;

export type PageSizeId = keyof typeof PAGE_SIZES;

export const PAGE_DPI = 144;

export type StudioPage = {
  id: string;
  name: string;
  dataUrl: string;
  width: number;
  height: number;
  rotation: 0 | 90 | 180 | 270;
  marginPt: number;
};

export type SignatureAsset = {
  id: string;
  name: string;
  dataUrl: string;
  createdAt: number;
};

export type Stamp = {
  id: string;
  pageId: string;
  dataUrl: string;
  nx: number;
  ny: number;
  nw: number;
  nh: number;
};

export type ScanRecord = {
  id: string;
  text: string;
  at: number;
};

export type StudioMode = "convert" | "sign" | "scan";
