import { Loader2, PenLine, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { assemblePdf, pdfFilename } from "@/lib/pdf/assemble";
import { ingestFiles, makeSampleLetter } from "@/lib/pdf/ingest";
import { liftInkFromDataUrl, liftInkFromFile } from "@/lib/pdf/signature";
import { bytesToPdfFile, canSharePdf, sharePdfFile } from "@/lib/pdf/share";
import type { Stamp } from "@/lib/pdf/types";
import { downloadBlob, uid } from "@/lib/utils";
import { useStudio } from "@/store/studio";
import { PageFrame } from "./page-frame";
import { SharePdfButton } from "./share-pdf-button";

export function SignView() {
  const fileRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const drawRef = useRef<HTMLCanvasElement>(null);
  const drawBoxRef = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const [panel, setPanel] = useState<"none" | "photo" | "draw">("none");
  const [threshold, setThreshold] = useState(168);
  const [busy, setBusy] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [size, setSize] = useState(0.28);
  const [lastPdf, setLastPdf] = useState<File | null>(null);

  const {
    pages,
    pageSize,
    addPages,
    signatures,
    addSignature,
    removeSignature,
    activeSignatureId,
    setActiveSignature,
    stamps,
    addStamp,
    updateStamp,
    removeStamp,
    selectedStampId,
    selectStamp,
  } = useStudio();

  const active = signatures.find((item) => item.id === activeSignatureId) ?? signatures[0] ?? null;
  const currentPage = pages[0];
  const pageStamps = stamps.filter((stamp) => stamp.pageId === currentPage?.id);

  useEffect(() => {
    if (panel !== "photo" || !photoFile) return;
    let cancelled = false;
    void liftInkFromFile(photoFile, threshold).then((url) => {
      if (!cancelled) setPreview(url);
    });
    return () => {
      cancelled = true;
    };
  }, [panel, photoFile, threshold]);

  useEffect(() => {
    if (panel !== "draw") return;
    const canvas = drawRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    drawBoxRef.current?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "center",
    });
  }, [panel]);

  function startDraw(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = drawRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawing.current = true;
    canvas.setPointerCapture(event.pointerId);
    const rect = canvas.getBoundingClientRect();
    ctx.strokeStyle = "#1c1916";
    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(
      ((event.clientX - rect.left) / rect.width) * canvas.width,
      ((event.clientY - rect.top) / rect.height) * canvas.height,
    );
  }

  function moveDraw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const canvas = drawRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(
      ((event.clientX - rect.left) / rect.width) * canvas.width,
      ((event.clientY - rect.top) / rect.height) * canvas.height,
    );
    ctx.stroke();
  }

  function endDraw() {
    drawing.current = false;
  }

  async function saveDrawing() {
    const canvas = drawRef.current;
    if (!canvas) return;
    setBusy("ink");
    try {
      const dataUrl = canvas.toDataURL("image/png");
      const lifted = await liftInkFromDataUrl(dataUrl, threshold);
      addSignature({ id: uid(), name: "Drawn signature", dataUrl: lifted, createdAt: Date.now() });
      setPanel("none");
      toast.success("Signature saved on this device");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the drawing.");
    } finally {
      setBusy(null);
    }
  }

  async function savePhoto() {
    if (!preview) return;
    addSignature({ id: uid(), name: "Photographed signature", dataUrl: preview, createdAt: Date.now() });
    setPhotoFile(null);
    setPreview(null);
    setPanel("none");
    toast.success("Signature saved on this device");
  }

  async function loadDocument(list: FileList | null) {
    if (!list?.length) return;
    setBusy("doc");
    try {
      const { pages: next, skipped } = await ingestFiles(Array.from(list), pageSize);
      if (next.length) addPages(next);
      if (skipped.length) toast.error(skipped[0]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read that document.");
    } finally {
      setBusy(null);
    }
  }

  async function loadSample() {
    setBusy("sample");
    try {
      addPages(await makeSampleLetter(pageSize));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open the sample.");
    } finally {
      setBusy(null);
    }
  }

  function placeStamp(nx: number, ny: number) {
    if (!currentPage || !active) {
      toast.error("Save a signature first, then tap the page.");
      return;
    }
    const nw = size;
    const nh = size * 0.38;
    addStamp({
      id: uid(),
      pageId: currentPage.id,
      dataUrl: active.dataUrl,
      nx: Math.min(1 - nw, Math.max(0, nx - nw / 2)),
      ny: Math.min(1 - nh, Math.max(0, ny - nh / 2)),
      nw,
      nh,
    });
  }

  function onStampPointerDown(stamp: Stamp, event: React.PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    selectStamp(stamp.id);
    const target = event.currentTarget.parentElement;
    if (!target) return;
    const pointerId = event.pointerId;
    event.currentTarget.setPointerCapture(pointerId);
    const startX = event.clientX;
    const startY = event.clientY;
    const origin = { nx: stamp.nx, ny: stamp.ny };

    const move = (moveEvent: PointerEvent) => {
      const rect = target.getBoundingClientRect();
      const dx = (moveEvent.clientX - startX) / rect.width;
      const dy = (moveEvent.clientY - startY) / rect.height;
      updateStamp(stamp.id, {
        nx: Math.min(1 - stamp.nw, Math.max(0, origin.nx + dx)),
        ny: Math.min(1 - stamp.nh, Math.max(0, origin.ny + dy)),
      });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  async function download() {
    if (!pages.length) return;
    setBusy("pdf");
    try {
      const bytes = await assemblePdf(pages, pageSize, stamps);
      const file = bytesToPdfFile(pdfFilename("signed"), bytes);
      downloadBlob(file.name, file);
      setLastPdf(file);
      toast.success("Signed PDF saved on this device.", {
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
        ref={fileRef}
        type="file"
        className="hidden"
        accept="image/jpeg,image/png,image/webp,application/pdf,.pdf,.docx,.txt,text/plain"
        onChange={(event) => {
          void loadDocument(event.target.files);
          event.target.value = "";
        }}
      />
      <input
        ref={photoRef}
        type="file"
        className="hidden"
        accept="image/*"
        capture="environment"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          setPhotoFile(file);
          setPanel("photo");
        }}
      />

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => photoRef.current?.click()}>
          Photograph
        </Button>
        <Button onClick={() => setPanel("draw")}>
          Draw
        </Button>
      </div>

      {pages.length === 0 ? (
        <div className="drop-stage flex min-h-[220px] flex-col items-center justify-center gap-3 px-6 py-8 text-center">
          <span className="flex size-12 items-center justify-center rounded-lg bg-raised text-primary">
            <PenLine className="size-5" strokeWidth={1.75} />
          </span>
          <p className="font-display text-xl text-fg">Stamp a signature</p>
          <p className="max-w-[34ch] text-sm text-muted">
            Open a document, or practise on the sample letter. Ink stays in this browser.
          </p>
          <div className="mt-1 flex flex-wrap justify-center gap-2">
            <Button onClick={() => fileRef.current?.click()} disabled={busy !== null}>
              {busy === "doc" ? <Loader2 className="animate-spin" /> : null}
              Open document
            </Button>
            <Button variant="secondary" onClick={() => void loadSample()} disabled={busy !== null}>
              {busy === "sample" ? <Loader2 className="animate-spin" /> : null}
              Sample letter
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <PageFrame
            page={currentPage}
            pageSize={pageSize}
            stamps={pageStamps}
            selectedStampId={selectedStampId}
            interactive
            onPageClick={placeStamp}
            onStampPointerDown={onStampPointerDown}
            className="mx-auto w-full max-w-[360px]"
          />
          <p className="text-center text-sm text-muted">
            {active ? "Tap the page to stamp, then drag." : "Save a signature, then tap the page."}
          </p>
        </div>
      )}

      {pages.length > 0 ? (
        <div className="flex items-center gap-3">
          <label className="text-sm text-muted" htmlFor="stamp-size">
            Size
          </label>
          <input
            id="stamp-size"
            type="range"
            min={0.14}
            max={0.5}
            step={0.01}
            value={size}
            onChange={(event) => {
              const next = Number(event.target.value);
              setSize(next);
              if (selectedStampId) {
                const stamp = stamps.find((item) => item.id === selectedStampId);
                if (stamp) updateStamp(stamp.id, { nw: next, nh: next * 0.38 });
              }
            }}
            className="range flex-1"
          />
          {selectedStampId ? (
            <Button variant="ghost" size="icon-sm" aria-label="Remove stamp" onClick={() => removeStamp(selectedStampId)}>
              <Trash2 />
            </Button>
          ) : null}
        </div>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-fg">Signatures on this device</h2>
        </div>
        {signatures.length === 0 ? (
          <p className="text-sm text-muted">Photograph ink on paper, or draw with your finger. The white is lifted off.</p>
        ) : (
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5">
            {signatures.map((item) => (
              <div key={item.id} className="shrink-0 space-y-1">
                <button
                  type="button"
                  onClick={() => setActiveSignature(item.id)}
                  className={`flex h-16 w-28 items-center justify-center rounded-md border bg-white px-2 ${
                    active?.id === item.id ? "border-primary" : "border-border"
                  }`}
                >
                  <img src={item.dataUrl} alt="" className="max-h-12 max-w-full object-contain" />
                </button>
                <button
                  type="button"
                  className="text-[11px] text-subtle"
                  onClick={() => removeSignature(item.id)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {panel === "photo" ? (
        <div className="panel space-y-3 p-4">
          <p className="text-sm font-medium">Lift the ink</p>
          {preview ? (
            <div className="flex h-28 items-center justify-center rounded-md bg-white">
              <img src={preview} alt="Lifted signature" className="max-h-24 max-w-full object-contain" />
            </div>
          ) : (
            <p className="text-sm text-muted">Reading the photograph…</p>
          )}
          <label className="flex items-center gap-3 text-sm text-muted">
            Threshold
            <input
              type="range"
              min={90}
              max={220}
              value={threshold}
              onChange={(event) => setThreshold(Number(event.target.value))}
              className="range flex-1"
            />
          </label>
          <div className="flex gap-2">
            <Button onClick={() => savePhoto()} disabled={!preview}>
              Save signature
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setPanel("none");
                setPhotoFile(null);
                setPreview(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {panel === "draw" ? (
        <div ref={drawBoxRef} className="panel space-y-3 p-4">
          <p className="text-sm font-medium">Draw in ink</p>
          <canvas
            ref={drawRef}
            width={720}
            height={240}
            className="h-32 w-full touch-none rounded-md bg-white"
            onPointerDown={startDraw}
            onPointerMove={moveDraw}
            onPointerUp={endDraw}
            onPointerCancel={endDraw}
          />
          <label className="flex items-center gap-3 text-sm text-muted">
            Threshold
            <input
              type="range"
              min={90}
              max={220}
              value={threshold}
              onChange={(event) => setThreshold(Number(event.target.value))}
              className="range flex-1"
            />
          </label>
          <div className="flex gap-2">
            <Button onClick={() => void saveDrawing()} disabled={busy !== null}>
              {busy === "ink" ? <Loader2 className="animate-spin" /> : null}
              Save signature
            </Button>
            <Button variant="ghost" onClick={() => setPanel("none")}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {pages.length > 0 ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="flex-1" onClick={() => void download()} disabled={busy !== null}>
            {busy === "pdf" ? <Loader2 className="animate-spin" /> : null}
            Download signed PDF
          </Button>
          <SharePdfButton file={lastPdf} />
        </div>
      ) : null}
    </div>
  );
}
