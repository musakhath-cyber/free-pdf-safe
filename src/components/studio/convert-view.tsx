import { Loader2, RotateCw, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { assemblePdf, pdfFilename } from "@/lib/pdf/assemble";
import { ingestFiles } from "@/lib/pdf/ingest";
import { bytesToPdfFile, canSharePdf, sharePdfFile } from "@/lib/pdf/share";
import { downloadBlob } from "@/lib/utils";
import { useStudio } from "@/store/studio";
import { EditorBar } from "./editor-bar";
import { PageFilmstrip } from "./page-filmstrip";
import { PageFrame } from "./page-frame";
import { PrintPdfButton } from "./print-pdf-button";
import { SharePdfButton } from "./share-pdf-button";

export function ConvertView() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"add" | "pdf" | null>(null);
  const [lastPdf, setLastPdf] = useState<File | null>(null);
  const pages = useStudio((state) => state.pages);
  const pageSize = useStudio((state) => state.pageSize);
  const setPageSize = useStudio((state) => state.setPageSize);
  const addPages = useStudio((state) => state.addPages);
  const removePage = useStudio((state) => state.removePage);
  const rotatePage = useStudio((state) => state.rotatePage);
  const activePageId = useStudio((state) => state.activePageId);
  const setMode = useStudio((state) => state.setMode);
  const preview = pages.find((page) => page.id === activePageId) ?? pages[0];

  async function onFiles(list: FileList | File[]) {
    const files = Array.from(list);
    if (files.length === 0) return;
    setBusy("add");
    setLastPdf(null);
    try {
      const { pages: next, skipped } = await ingestFiles(files, pageSize);
      if (next.length) addPages(next);
      if (skipped.length) toast.error(skipped[0]);
      else if (next.length) toast.success(`${next.length} page${next.length === 1 ? "" : "s"} added`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read those files.");
    } finally {
      setBusy(null);
    }
  }

  async function buildPdf() {
    const bytes = await assemblePdf(pages, pageSize);
    const name = pdfFilename(pages.length === 1 ? pages[0].name.replace(/\.[^.]+$/, "") : "free-pdf-safe");
    const file = bytesToPdfFile(name, bytes);
    setLastPdf(file);
    return file;
  }

  async function ensurePdf() {
    if (lastPdf) return lastPdf;
    setBusy("pdf");
    try {
      return await buildPdf();
    } finally {
      setBusy(null);
    }
  }

  async function download() {
    if (!pages.length) return;
    setBusy("pdf");
    try {
      const file = await buildPdf();
      downloadBlob(file.name, file);
      toast.success("PDF saved on this device.", {
        action: canSharePdf(file)
          ? {
              label: "Share",
              onClick: () => {
                void sharePdfFile(file).then((result) => {
                  if (result === "shared") toast.success("Shared with a link to Free PDF Safe.");
                  if (result === "copied") toast.success("App link copied.");
                });
              },
            }
          : undefined,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not build the PDF.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        multiple
        accept="image/jpeg,image/png,image/webp,application/pdf,.pdf,.docx,.txt,text/plain"
        onChange={(event) => {
          if (event.target.files) void onFiles(event.target.files);
          event.target.value = "";
        }}
      />

      {pages.length === 0 ? (
        <button
          type="button"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            void onFiles(event.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className="drop-stage flex min-h-[320px] flex-col items-center justify-center gap-3 px-6 py-12 text-center"
        >
          <GlassPapers />
          <div className="space-y-1">
            <p className="font-display text-2xl text-ink">Drop a stack of paper</p>
            <p className="max-w-[34ch] text-sm text-muted">
              Photos, scans, PDFs, Word, or text. Reorder, rotate, then download one PDF.
            </p>
          </div>
          <span className="btn-glass mt-3 inline-flex h-12 items-center rounded-full px-8 text-sm font-semibold">
            {busy === "add" ? "Reading…" : "Add files"}
          </span>
        </button>
      ) : (
        <div className="space-y-4">
          <EditorBar />
          {preview ? (
            <PageFrame page={preview} pageSize={pageSize} className="mx-auto w-full max-w-[360px]" />
          ) : null}
          {preview ? (
            <div className="flex items-center justify-center gap-1">
              <button
                type="button"
                className="flex size-10 items-center justify-center text-muted"
                aria-label="Rotate page"
                onClick={() => rotatePage(preview.id)}
              >
                <RotateCw className="size-4" />
              </button>
              <button
                type="button"
                className="flex size-10 items-center justify-center text-danger"
                aria-label="Remove page"
                onClick={() => removePage(preview.id)}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ) : null}
          <PageFilmstrip />
          <p className="text-center text-[12px] text-subtle">Tap a page to open it. Hold, then drag to reorder.</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="segmented">
          <button type="button" className={pageSize === "a4" ? "is-on" : ""} onClick={() => setPageSize("a4")}>
            A4
          </button>
          <button
            type="button"
            className={pageSize === "letter" ? "is-on" : ""}
            onClick={() => setPageSize("letter")}
          >
            Letter
          </button>
        </div>
        <Button variant="secondary" onClick={() => inputRef.current?.click()} disabled={busy !== null}>
          {busy === "add" ? <Loader2 className="animate-spin" /> : null}
          Add files
        </Button>
      </div>

      {pages.length > 0 ? (
        <div className="flex flex-col gap-2">
          <Button className="w-full" onClick={() => void download()} disabled={busy !== null}>
            {busy === "pdf" ? <Loader2 className="animate-spin" /> : null}
            Download PDF
          </Button>
          <SharePdfButton file={lastPdf} disabled={busy !== null} onNeedFile={ensurePdf} />
          <PrintPdfButton file={lastPdf} disabled={busy !== null} onNeedFile={ensurePdf} />
          <Button variant="secondary" className="w-full" onClick={() => setMode("sign")}>
            Sign this
          </Button>
        </div>
      ) : (
        <button
          type="button"
          className="text-left text-sm text-muted underline-offset-4 hover:text-fg hover:underline"
          onClick={() => setMode("sign")}
        >
          Or open a sample letter to practise a signature.
        </button>
      )}
    </div>
  );
}

function GlassPapers() {
  return (
    <svg className="glass-papers" viewBox="0 0 120 96" fill="none" aria-hidden>
      <rect x="8" y="22" width="52" height="64" rx="10" fill="url(#p1)" stroke="rgba(255,255,255,.8)" />
      <rect x="60" y="28" width="48" height="56" rx="10" fill="url(#p2)" stroke="rgba(255,255,255,.75)" />
      <rect x="28" y="8" width="58" height="70" rx="11" fill="url(#p3)" stroke="rgba(255,255,255,.9)" />
      <path d="M40 28h34M40 40h28M40 52h22" stroke="rgba(90,130,190,.35)" strokeWidth="3" strokeLinecap="round" />
      <defs>
        <linearGradient id="p1" x1="8" y1="22" x2="60" y2="86">
          <stop stopColor="#9ec0ff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#cfe0ff" stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id="p2" x1="60" y1="28" x2="108" y2="84">
          <stop stopColor="#d7e6ff" stopOpacity="0.7" />
          <stop offset="1" stopColor="#f4f8ff" stopOpacity="0.45" />
        </linearGradient>
        <linearGradient id="p3" x1="28" y1="8" x2="86" y2="78">
          <stop stopColor="#ffffff" stopOpacity="0.92" />
          <stop offset="1" stopColor="#c5d8f5" stopOpacity="0.55" />
        </linearGradient>
      </defs>
    </svg>
  );
}
