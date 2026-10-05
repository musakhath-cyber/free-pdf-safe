import { create } from "zustand";
import { loadScans, loadSignatures, saveScans, saveSignatures } from "@/lib/pdf/storage";
import type { Mark, PageSizeId, ScanRecord, SignatureAsset, Stamp, StudioMode, StudioPage } from "@/lib/pdf/types";

type Snapshot = {
  pages: StudioPage[];
  stamps: Stamp[];
  marks: Mark[];
  activePageId: string | null;
  signatures: SignatureAsset[];
  activeSignatureId: string | null;
  selectedStampId: string | null;
  selectedMarkId: string | null;
};

type StudioState = {
  hydrated: boolean;
  mode: StudioMode;
  pageSize: PageSizeId;
  pages: StudioPage[];
  signatures: SignatureAsset[];
  stamps: Stamp[];
  marks: Mark[];
  scans: ScanRecord[];
  activePageId: string | null;
  activeSignatureId: string | null;
  selectedStampId: string | null;
  selectedMarkId: string | null;
  undoStack: Snapshot[];
  hydrate: () => void;
  setMode: (mode: StudioMode) => void;
  setPageSize: (pageSize: PageSizeId) => void;
  setActivePageId: (id: string | null) => void;
  beginHistory: () => void;
  undo: () => void;
  addPages: (pages: StudioPage[]) => void;
  removePage: (id: string) => void;
  rotatePage: (id: string) => void;
  movePage: (id: string, dir: -1 | 1) => void;
  reorderPages: (from: number, to: number) => void;
  clearPages: () => void;
  cancelWork: () => void;
  addSignature: (signature: SignatureAsset) => void;
  removeSignature: (id: string) => void;
  setActiveSignature: (id: string | null) => void;
  addStamp: (stamp: Stamp) => void;
  updateStamp: (id: string, patch: Partial<Pick<Stamp, "nx" | "ny" | "nw" | "nh">>) => void;
  removeStamp: (id: string) => void;
  selectStamp: (id: string | null) => void;
  addMark: (mark: Mark) => void;
  updateMark: (id: string, patch: Partial<Omit<Mark, "id" | "pageId" | "kind">>) => void;
  removeMark: (id: string) => void;
  selectMark: (id: string | null) => void;
  addScan: (scan: ScanRecord) => void;
  removeScan: (id: string) => void;
};

function shot(state: StudioState): Snapshot {
  return {
    pages: state.pages,
    stamps: state.stamps,
    marks: state.marks,
    activePageId: state.activePageId,
    signatures: state.signatures,
    activeSignatureId: state.activeSignatureId,
    selectedStampId: state.selectedStampId,
    selectedMarkId: state.selectedMarkId,
  };
}

export const useStudio = create<StudioState>((set, get) => ({
  hydrated: false,
  mode: "convert",
  pageSize: "a4",
  pages: [],
  signatures: [],
  stamps: [],
  marks: [],
  scans: [],
  activePageId: null,
  activeSignatureId: null,
  selectedStampId: null,
  selectedMarkId: null,
  undoStack: [],
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
  setActivePageId: (id) => set({ activePageId: id, selectedStampId: null, selectedMarkId: null }),
  beginHistory: () => {
    const state = get();
    set({ undoStack: [...state.undoStack, shot(state)].slice(-40) });
  },
  undo: () => {
    const stack = get().undoStack;
    if (!stack.length) return;
    const prev = stack[stack.length - 1];
    saveSignatures(prev.signatures);
    set({
      undoStack: stack.slice(0, -1),
      pages: prev.pages,
      stamps: prev.stamps,
      marks: prev.marks,
      activePageId: prev.activePageId,
      signatures: prev.signatures,
      activeSignatureId: prev.activeSignatureId,
      selectedStampId: prev.selectedStampId,
      selectedMarkId: prev.selectedMarkId,
    });
  },
  addPages: (pages) => {
    get().beginHistory();
    set((state) => ({
      pages: [...state.pages, ...pages].slice(0, 40),
      activePageId: state.activePageId ?? pages[0]?.id ?? null,
    }));
  },
  removePage: (id) => {
    get().beginHistory();
    set((state) => {
      const index = state.pages.findIndex((page) => page.id === id);
      const pages = state.pages.filter((page) => page.id !== id);
      const neighbor = pages[index] ?? pages[index - 1] ?? null;
      return {
        pages,
        stamps: state.stamps.filter((stamp) => stamp.pageId !== id),
        marks: state.marks.filter((mark) => mark.pageId !== id),
        activePageId: state.activePageId === id ? (neighbor?.id ?? null) : state.activePageId,
        selectedStampId: state.stamps.find((stamp) => stamp.id === state.selectedStampId)?.pageId === id
          ? null
          : state.selectedStampId,
      };
    });
  },
  rotatePage: (id) => {
    get().beginHistory();
    set((state) => ({
      pages: state.pages.map((page) =>
        page.id === id
          ? { ...page, rotation: ((page.rotation + 90) % 360) as StudioPage["rotation"] }
          : page,
      ),
    }));
  },
  movePage: (id, dir) => {
    get().beginHistory();
    set((state) => {
      const index = state.pages.findIndex((page) => page.id === id);
      const next = index + dir;
      if (index < 0 || next < 0 || next >= state.pages.length) return state;
      const pages = [...state.pages];
      const [item] = pages.splice(index, 1);
      pages.splice(next, 0, item);
      return { pages };
    });
  },
  reorderPages: (from, to) => {
    set((state) => {
      if (from === to || from < 0 || to < 0 || from >= state.pages.length || to >= state.pages.length) {
        return state;
      }
      const pages = [...state.pages];
      const [item] = pages.splice(from, 1);
      pages.splice(to, 0, item);
      return { pages };
    });
  },
  clearPages: () => set({ pages: [], stamps: [], marks: [], selectedStampId: null, selectedMarkId: null, activePageId: null }),
  cancelWork: () =>
    set({
      pages: [],
      stamps: [],
      marks: [],
      selectedStampId: null,
      selectedMarkId: null,
      activePageId: null,
      undoStack: [],
    }),
  addSignature: (signature) => {
    get().beginHistory();
    const signatures = [signature, ...get().signatures].slice(0, 12);
    saveSignatures(signatures);
    set({ signatures, activeSignatureId: signature.id });
  },
  removeSignature: (id) => {
    get().beginHistory();
    const signatures = get().signatures.filter((item) => item.id !== id);
    saveSignatures(signatures);
    set({
      signatures,
      activeSignatureId: get().activeSignatureId === id ? (signatures[0]?.id ?? null) : get().activeSignatureId,
    });
  },
  setActiveSignature: (id) => set({ activeSignatureId: id, selectedStampId: null }),
  addStamp: (stamp) => {
    get().beginHistory();
    set((state) => ({ stamps: [...state.stamps, stamp], selectedStampId: stamp.id }));
  },
  updateStamp: (id, patch) =>
    set((state) => ({
      stamps: state.stamps.map((stamp) => (stamp.id === id ? { ...stamp, ...patch } : stamp)),
    })),
  removeStamp: (id) => {
    get().beginHistory();
    set((state) => ({
      stamps: state.stamps.filter((stamp) => stamp.id !== id),
      selectedStampId: state.selectedStampId === id ? null : state.selectedStampId,
    }));
  },
  selectStamp: (id) => set({ selectedStampId: id }),
  addMark: (mark) => {
    get().beginHistory();
    set((state) => ({ marks: [...state.marks, mark], selectedMarkId: mark.id }));
  },
  updateMark: (id, patch) =>
    set((state) => ({
      marks: state.marks.map((mark) => (mark.id === id ? { ...mark, ...patch } : mark)),
    })),
  removeMark: (id) => {
    get().beginHistory();
    set((state) => ({
      marks: state.marks.filter((mark) => mark.id !== id),
      selectedMarkId: state.selectedMarkId === id ? null : state.selectedMarkId,
    }));
  },
  selectMark: (id) => set({ selectedMarkId: id }),
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
