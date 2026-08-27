import { ChevronLeft, ChevronRight, FileStack, Loader2, RotateCw, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { assemblePdf, pdfFilename } from "@/lib/pdf/assemble";
import { ingestFiles } from "@/lib/pdf/ingest";
import { downloadBytes } from "@/lib/utils";
import { useStudio } from "@/store/studio";
import { PageFrame } from "./page-frame";

export function ConvertView() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"add" | "pdf" | null>(null);
  const { pages, pageSize, setPageSize, addPages, removePage, rotatePage, movePage, clearPages, setMode } =
    useStudio();
  const preview = pages[0];

  async function onFiles(list: FileList | File[]) {
    const files = Array.from(list);
    if (files.length === 0) return;
    setBusy("add");
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

  async function download() {
    if (!pages.length) return;
    setBusy("pdf");
    try {
      const bytes = await assemblePdf(pages, pageSize);
      downloadBytes(
        pdfFilename(pages.length === 1 ? pages[0].name.replace(/\.[^.]+$/, "") : "free-pdf-safe"),
        bytes,
        "application/pdf",
      );
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
          className="drop-stage flex min-h-[280px] flex-col items-center justify-center gap-3 px-6 py-10 text-center"
        >
          <span className="flex size-12 items-center justify-center rounded-lg bg-raised text-primary">
            <FileStack className="size-5" strokeWidth={1.75} />
          </span>
          <div className="space-y-1">
            <p className="font-display text-xl text-fg">Drop a stack of paper</p>
            <p className="max-w-[34ch] text-sm text-muted">
              Photos, scans, PDFs, Word, or text. Reorder, rotate, then download one PDF.
            </p>
          </div>
          <span className="mt-2 inline-flex h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-fg">
            {busy === "add" ? "Reading…" : "Add files"}
          </span>
        </button>
      ) : (
        <div className="space-y-4">
          {preview ? (
            <PageFrame page={preview} pageSize={pageSize} className="mx-auto w-full max-w-[360px]" />
          ) : null}

          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
            {pages.map((page, index) => (
              <div key={page.id} className="w-[92px] shrink-0 space-y-1.5">
                <PageFrame page={page} pageSize={pageSize} className="w-full" />
                <div className="flex items-center justify-between gap-0.5">
                  <span className="tabular-nums text-[11px] text-subtle">{index + 1}</span>
                  <div className="flex">
                    <button
                      type="button"
                      className="flex size-8 items-center justify-center text-muted"
                      aria-label="Move earlier"
                      onClick={() => movePage(page.id, -1)}
                    >
                      <ChevronLeft className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      className="flex size-8 items-center justify-center text-muted"
                      aria-label="Rotate"
                      onClick={() => rotatePage(page.id)}
                    >
                      <RotateCw className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      className="flex size-8 items-center justify-center text-muted"
                      aria-label="Move later"
                      onClick={() => movePage(page.id, 1)}
                    >
                      <ChevronRight className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      className="flex size-8 items-center justify-center text-danger"
                      aria-label="Remove page"
                      onClick={() => removePage(page.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
        {pages.length > 0 ? (
          <Button variant="ghost" onClick={() => clearPages()}>
            Clear
          </Button>
        ) : null}
      </div>

      {pages.length > 0 ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="flex-1" onClick={() => void download()} disabled={busy !== null}>
            {busy === "pdf" ? <Loader2 className="animate-spin" /> : null}
            Download PDF
          </Button>
          <Button variant="secondary" className="flex-1" onClick={() => setMode("sign")}>
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
