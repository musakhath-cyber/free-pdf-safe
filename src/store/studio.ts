import { create } from "zustand";
import { loadScans, loadSignatures, saveScans, saveSignatures } from "@/lib/pdf/storage";
import type { PageSizeId, ScanRecord, SignatureAsset, Stamp, StudioMode, StudioPage } from "@/lib/pdf/types";

type StudioState = {
  hydrated: boolean;
  mode: StudioMode;
  pageSize: PageSizeId;
  pages: StudioPage[];
  signatures: SignatureAsset[];
  stamps: Stamp[];
  scans: ScanRecord[];
  activeSignatureId: string | null;
  selectedStampId: string | null;
  hydrate: () => void;
  setMode: (mode: StudioMode) => void;
  setPageSize: (pageSize: PageSizeId) => void;
  addPages: (pages: StudioPage[]) => void;
  removePage: (id: string) => void;
  rotatePage: (id: string) => void;
  movePage: (id: string, dir: -1 | 1) => void;
  clearPages: () => void;
  addSignature: (signature: SignatureAsset) => void;
  removeSignature: (id: string) => void;
  setActiveSignature: (id: string | null) => void;
  addStamp: (stamp: Stamp) => void;
  updateStamp: (id: string, patch: Partial<Pick<Stamp, "nx" | "ny" | "nw" | "nh">>) => void;
  removeStamp: (id: string) => void;
  selectStamp: (id: string | null) => void;
  addScan: (scan: ScanRecord) => void;
  removeScan: (id: string) => void;
};

export const useStudio = create<StudioState>((set, get) => ({
  hydrated: false,
  mode: "convert",
  pageSize: "a4",
  pages: [],
  signatures: [],
  stamps: [],
  scans: [],
  activeSignatureId: null,
  selectedStampId: null,
  hydrate: () => {
    if (get().hydrated) return;
    const signatures = loadSignatures();
    set({
      hydrated: true,
      signatures,
      scans: loadScans(),
      activeSignatureId: signatures[0]?.id ?? null,
    });
  },
  setMode: (mode) => set({ mode }),
  setPageSize: (pageSize) => set({ pageSize }),
  addPages: (pages) =>
    set((state) => ({
      pages: [...state.pages, ...pages].slice(0, 40),
    })),
  removePage: (id) =>
    set((state) => ({
      pages: state.pages.filter((page) => page.id !== id),
      stamps: state.stamps.filter((stamp) => stamp.pageId !== id),
      selectedStampId: state.stamps.find((stamp) => stamp.id === state.selectedStampId)?.pageId === id
        ? null
        : state.selectedStampId,
    })),
  rotatePage: (id) =>
    set((state) => ({
      pages: state.pages.map((page) =>
        page.id === id
          ? { ...page, rotation: ((page.rotation + 90) % 360) as StudioPage["rotation"] }
          : page,
      ),
    })),
  movePage: (id, dir) =>
    set((state) => {
      const index = state.pages.findIndex((page) => page.id === id);
      const next = index + dir;
      if (index < 0 || next < 0 || next >= state.pages.length) return state;
      const pages = [...state.pages];
      const [item] = pages.splice(index, 1);
      pages.splice(next, 0, item);
      return { pages };
    }),
  clearPages: () => set({ pages: [], stamps: [], selectedStampId: null }),
  addSignature: (signature) => {
    const signatures = [signature, ...get().signatures].slice(0, 12);
    saveSignatures(signatures);
    set({ signatures, activeSignatureId: signature.id });
  },
  removeSignature: (id) => {
    const signatures = get().signatures.filter((item) => item.id !== id);
    saveSignatures(signatures);
    set({
      signatures,
      activeSignatureId: get().activeSignatureId === id ? (signatures[0]?.id ?? null) : get().activeSignatureId,
    });
  },
  setActiveSignature: (id) => set({ activeSignatureId: id, selectedStampId: null }),
  addStamp: (stamp) => set((state) => ({ stamps: [...state.stamps, stamp], selectedStampId: stamp.id })),
  updateStamp: (id, patch) =>
    set((state) => ({
      stamps: state.stamps.map((stamp) => (stamp.id === id ? { ...stamp, ...patch } : stamp)),
    })),
  removeStamp: (id) =>
    set((state) => ({
      stamps: state.stamps.filter((stamp) => stamp.id !== id),
      selectedStampId: state.selectedStampId === id ? null : state.selectedStampId,
    })),
  selectStamp: (id) => set({ selectedStampId: id }),
  addScan: (scan) => {
    const scans = [scan, ...get().scans.filter((item) => item.text !== scan.text)].slice(0, 20);
    saveScans(scans);
    set({ scans });
  },
  removeScan: (id) => {
    const scans = get().scans.filter((item) => item.id !== id);
    saveScans(scans);
    set({ scans });
  },
}));
