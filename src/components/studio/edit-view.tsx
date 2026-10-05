import { Loader2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { assemblePdf, pdfFilename } from "@/lib/pdf/assemble";
import { ingestFiles } from "@/lib/pdf/ingest";
import { bytesToPdfFile } from "@/lib/pdf/share";
import type { Mark, MarkKind } from "@/lib/pdf/types";
import { cn, downloadBlob, uid } from "@/lib/utils";
import { useStudio } from "@/store/studio";
import { DocumentStage } from "./document-stage";
import { EditorBar } from "./editor-bar";
import { PageFilmstrip } from "./page-filmstrip";
import { PageFrame } from "./page-frame";
import { PrintPdfButton } from "./print-pdf-button";
import { SharePdfButton } from "./share-pdf-button";

type Tool = "select" | MarkKind;

const TOOLS: { id: Tool; label: string }[] = [
  { id: "select", label: "Move" },
  { id: "text", label: "Text" },
  { id: "highlight", label: "Highlight" },
  { id: "ink", label: "Draw" },
  { id: "whiteout", label: "Cover" },
  { id: "note", label: "Note" },
];

const COLORS = ["#0b2748", "#1c1916", "#c0392b", "#3d7dff", "#f5d76e"];

const ACCEPT =
  "image/jpeg,image/png,image/webp,application/pdf,.pdf,.docx,.txt,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,.xlsx,.xls,.csv";

export function EditView() {
  const inputRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    id: string;
    mode: "move" | "resize";
    startX: number;
    startY: number;
    nx: number;
    ny: number;
    nw: number;
    nh: number;
    points: Mark["points"];
  } | null>(null);
  const drawRef = useRef<{ kind: "highlight" | "whiteout" | "ink"; points: { x: number; y: number }[] } | null>(null);
  const [tool, setTool] = useState<Tool>("text");
  const [color, setColor] = useState("#0b2748");
  const [busy, setBusy] = useState<"add" | "pdf" | null>(null);
  const [lastPdf, setLastPdf] = useState<File | null>(null);
  const [draft, setDraft] = useState<Mark["points"] | null>(null);

  const pages = useStudio((state) => state.pages);
  const pageSize = useStudio((state) => state.pageSize);
  const stamps = useStudio((state) => state.stamps);
  const marks = useStudio((state) => state.marks);
  const activePageId = useStudio((state) => state.activePageId);
  const selectedMarkId = useStudio((state) => state.selectedMarkId);
  const addPages = useStudio((state) => state.addPages);
  const addMark = useStudio((state) => state.addMark);
  const updateMark = useStudio((state) => state.updateMark);
  const removeMark = useStudio((state) => state.removeMark);
  const selectMark = useStudio((state) => state.selectMark);
  const beginHistory = useStudio((state) => state.beginHistory);

  const page = pages.find((item) => item.id === activePageId) ?? pages[0];
  const pageMarks = marks.filter((mark) => mark.pageId === page?.id);
  const pageStamps = stamps.filter((stamp) => stamp.pageId === page?.id);
  const selected = pageMarks.find((mark) => mark.id === selectedMarkId) ?? null;

  function pointFromEvent(event: { clientX: number; clientY: number }) {
    const box = frameRef.current?.getBoundingClientRect();
    if (!box || box.width === 0 || box.height === 0) return { x: 0, y: 0 };
    return {
      x: Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)),
      y: Math.min(1, Math.max(0, (event.clientY - box.top) / box.height)),
    };
  }

  function placeText(kind: "text" | "note", at: { x: number; y: number }) {
    if (!page) return;
    addMark({
      id: uid(),
      pageId: page.id,
      kind,
      nx: Math.min(0.62, at.x),
      ny: Math.min(0.86, at.y),
      nw: kind === "note" ? 0.42 : 0.48,
      nh: kind === "note" ? 0.14 : 0.08,
      text: kind === "note" ? "Note" : "Text",
      color: kind === "note" ? "#3d2a00" : color,
      points: [],
    });
  }

  function finishDraw() {
    const draw = drawRef.current;
    drawRef.current = null;
    setDraft(null);
    if (!draw || !page || draw.points.length < 2) return;
    if (draw.kind === "ink") {
      const xs = draw.points.map((point) => point.x);
      const ys = draw.points.map((point) => point.y);
      const pad = 0.01;
      addMark({
        id: uid(),
        pageId: page.id,
        kind: "ink",
        nx: Math.max(0, Math.min(...xs) - pad),
        ny: Math.max(0, Math.min(...ys) - pad),
        nw: Math.min(1, Math.max(...xs) - Math.min(...xs) + pad * 2),
        nh: Math.min(1, Math.max(...ys) - Math.min(...ys) + pad * 2),
        text: "",
        color,
        points: draw.points,
      });
      return;
    }
    const start = draw.points[0];
    const end = draw.points[draw.points.length - 1];
    const nx = Math.min(start.x, end.x);
    const ny = Math.min(start.y, end.y);
    const nw = Math.abs(end.x - start.x);
    const nh = Math.abs(end.y - start.y);
    if (nw < 0.02 || nh < 0.015) return;
    addMark({
      id: uid(),
      pageId: page.id,
      kind: draw.kind,
      nx,
      ny,
      nw,
      nh,
      text: "",
      color: draw.kind === "highlight" ? (color === "#0b2748" ? "#f5d76e" : color) : "#ffffff",
      points: [],
    });
  }

  function onOverlayDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!page || tool === "select") {
      selectMark(null);
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    const at = pointFromEvent(event);
    if (tool === "text" || tool === "note") {
      placeText(tool, at);
      return;
    }
    drawRef.current = { kind: tool, points: [at, at] };
    setDraft([at, at]);
  }

  function onOverlayMove(event: React.PointerEvent<HTMLDivElement>) {
    const draw = drawRef.current;
    if (!draw) return;
    const at = pointFromEvent(event);
    if (draw.kind === "ink") draw.points.push(at);
    else draw.points = [draw.points[0], at];
    setDraft([...draw.points]);
  }

  function onMarkDown(mark: Mark, event: React.PointerEvent, mode: "move" | "resize") {
    if (tool !== "select") return;
    event.stopPropagation();
    event.preventDefault();
    beginHistory();
    selectMark(mark.id);
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    dragRef.current = {
      id: mark.id,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      nx: mark.nx,
      ny: mark.ny,
      nw: mark.nw,
      nh: mark.nh,
      points: mark.points,
    };
  }

  function onMarkMove(event: React.PointerEvent) {
    const drag = dragRef.current;
    const box = frameRef.current?.getBoundingClientRect();
    if (!drag || !box) return;
    const dx = (event.clientX - drag.startX) / box.width;
    const dy = (event.clientY - drag.startY) / box.height;
    if (drag.mode === "resize") {
      updateMark(drag.id, {
        nw: Math.min(1 - drag.nx, Math.max(0.08, drag.nw + dx)),
        nh: Math.min(1 - drag.ny, Math.max(0.04, drag.nh + dy)),
      });
      return;
    }
    const nx = Math.min(1 - drag.nw, Math.max(0, drag.nx + dx));
    const ny = Math.min(1 - drag.nh, Math.max(0, drag.ny + dy));
    const appliedX = nx - drag.nx;
    const appliedY = ny - drag.ny;
    updateMark(drag.id, {
      nx,
      ny,
      points: drag.points.map((point) => ({ x: point.x + appliedX, y: point.y + appliedY })),
    });
  }

  async function onFiles(list: FileList | File[]) {
    const files = Array.from(list);
    if (!files.length) return;
    setBusy("add");
    setLastPdf(null);
    try {
      const { pages: next, skipped } = await ingestFiles(files, pageSize);
      if (next.length) addPages(next);
      if (skipped.length) toast.error(skipped[0]);
      else if (next.length) toast.success(`${next.length} page${next.length === 1 ? "" : "s"} ready to edit`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open that file.");
    } finally {
      setBusy(null);
    }
  }

  async function buildPdf() {
    const bytes = await assemblePdf(pages, pageSize, stamps, marks);
    const file = bytesToPdfFile(pdfFilename("edited"), bytes);
    setLastPdf(file);
    return file;
  }

  async function download() {
    if (!pages.length) return;
    setBusy("pdf");
    try {
      const file = await buildPdf();
      downloadBlob(file.name, file);
      toast.success("Edited PDF saved on this device.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not build the PDF.");
    } finally {
      setBusy(null);
    }
  }

  const draftBox = draft && draft.length >= 2
    ? {
        nx: Math.min(draft[0].x, draft[draft.length - 1].x),
        ny: Math.min(draft[0].y, draft[draft.length - 1].y),
        nw: Math.abs(draft[draft.length - 1].x - draft[0].x),
        nh: Math.abs(draft[draft.length - 1].y - draft[0].y),
      }
    : null;

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        multiple
        accept={ACCEPT}
        onChange={(event) => {
          if (event.target.files) void onFiles(event.target.files);
          event.target.value = "";
        }}
      />

      {!page ? (
        <button
          type="button"
          className="drop-stage flex min-h-[280px] flex-col items-center justify-center gap-3 px-6 py-12 text-center"
          onClick={() => inputRef.current?.click()}
        >
          <p className="font-display text-2xl text-ink">Edit a PDF</p>
          <p className="max-w-[34ch] text-sm text-muted">
            Add text, highlight, draw, cover a line, or drop a note. It stays on this device.
          </p>
          <span className="btn-glass mt-2 inline-flex h-12 items-center rounded-full px-8 text-sm font-semibold">
            {busy === "add" ? "Reading…" : "Open a file"}
          </span>
        </button>
      ) : (
        <>
          <EditorBar />
          <div className="edit-tools">
            {TOOLS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={cn("edit-tool", tool === item.id && "is-on")}
                onClick={() => setTool(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {tool === "text" || tool === "ink" || tool === "highlight" ? (
            <div className="flex items-center gap-2">
              {COLORS.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  aria-label={`Color ${swatch}`}
                  className={cn("edit-swatch", color === swatch && "is-on")}
                  style={{ background: swatch }}
                  onClick={() => {
                    setColor(swatch);
                    if (selected && (selected.kind === "text" || selected.kind === "ink" || selected.kind === "highlight")) {
                      updateMark(selected.id, { color: swatch });
                    }
                  }}
                />
              ))}
            </div>
          ) : null}

          <DocumentStage innerRef={frameRef}>
            <div className="edit-stage relative w-full">
            <PageFrame page={page} pageSize={pageSize} stamps={pageStamps} className="w-full" />
            <div
              className={cn("absolute inset-0 z-30", tool === "select" ? "touch-manipulation" : "touch-none")}
              onPointerDown={onOverlayDown}
              onPointerMove={onOverlayMove}
              onPointerUp={finishDraw}
              onPointerCancel={finishDraw}
            >
              <svg className="pointer-events-none absolute inset-0 size-full" viewBox="0 0 1 1" preserveAspectRatio="none">
                {pageMarks
                  .filter((mark) => mark.kind === "ink")
                  .map((mark) => (
                    <polyline
                      key={mark.id}
                      points={mark.points.map((point) => `${point.x},${point.y}`).join(" ")}
                      fill="none"
                      stroke={mark.color}
                      strokeWidth="0.0045"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}
                {draft && tool === "ink" ? (
                  <polyline
                    points={draft.map((point) => `${point.x},${point.y}`).join(" ")}
                    fill="none"
                    stroke={color}
                    strokeWidth="0.0045"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null}
              </svg>
              {pageMarks
                .filter((mark) => mark.kind !== "ink")
                .map((mark) => (
                  <button
                    key={mark.id}
                    type="button"
                    className={cn(
                      "absolute overflow-hidden text-left",
                      tool === "select" ? "pointer-events-auto" : "pointer-events-none",
                      selected?.id === mark.id && "ring-2 ring-primary",
                    )}
                    style={{
                      left: `${mark.nx * 100}%`,
                      top: `${mark.ny * 100}%`,
                      width: `${mark.nw * 100}%`,
                      height: `${mark.nh * 100}%`,
                      background:
                        mark.kind === "highlight"
                          ? withCssAlpha(mark.color, 0.38)
                          : mark.kind === "whiteout"
                            ? "#ffffff"
                            : mark.kind === "note"
                              ? "#fff4c2"
                              : "transparent",
                      color: mark.color,
                      fontSize: "clamp(11px, 3.2cqw, 18px)",
                      fontWeight: 650,
                      lineHeight: 1.25,
                      padding: mark.kind === "text" || mark.kind === "note" ? "4px 6px" : 0,
                      border: mark.kind === "note" ? "1px solid rgba(11,39,72,0.2)" : undefined,
                    }}
                    onPointerDown={(event) => onMarkDown(mark, event, "move")}
                    onPointerMove={onMarkMove}
                    onPointerUp={() => {
                      dragRef.current = null;
                    }}
                  >
                    {mark.kind === "text" || mark.kind === "note" ? mark.text : null}
                    {tool === "select" && selected?.id === mark.id && mark.kind !== "ink" ? (
                      <span
                        className="absolute bottom-0 right-0 size-4 cursor-nwse-resize rounded-sm bg-primary"
                        onPointerDown={(event) => onMarkDown(mark, event, "resize")}
                      />
                    ) : null}
                  </button>
                ))}
              {pageMarks
                .filter((mark) => mark.kind === "ink" && tool === "select")
                .map((mark) => (
                  <button
                    key={`${mark.id}-hit`}
                    type="button"
                    aria-label="Move drawing"
                    className={cn("absolute", selected?.id === mark.id && "ring-2 ring-primary")}
                    style={{
                      left: `${mark.nx * 100}%`,
                      top: `${mark.ny * 100}%`,
                      width: `${Math.max(mark.nw, 0.04) * 100}%`,
                      height: `${Math.max(mark.nh, 0.03) * 100}%`,
                    }}
                    onPointerDown={(event) => onMarkDown(mark, event, "move")}
                    onPointerMove={onMarkMove}
                    onPointerUp={() => {
                      dragRef.current = null;
                    }}
                  />
                ))}
              {draftBox && tool !== "ink" ? (
                <div
                  className="pointer-events-none absolute"
                  style={{
                    left: `${draftBox.nx * 100}%`,
                    top: `${draftBox.ny * 100}%`,
                    width: `${draftBox.nw * 100}%`,
                    height: `${draftBox.nh * 100}%`,
                    background: tool === "whiteout" ? "rgba(255,255,255,0.9)" : withCssAlpha(color === "#0b2748" ? "#f5d76e" : color, 0.38),
                  }}
                />
              ) : null}
            </div>
          </div>
          </DocumentStage>

          <p className="text-center text-[12px] text-subtle">
            {tool === "select"
              ? "Drag a mark to move it. Drag the blue corner to resize."
              : tool === "text"
                ? "Tap the page to drop text, then type below."
                : tool === "highlight"
                  ? "Drag across a line to highlight it."
                  : tool === "ink"
                    ? "Draw with your finger. Switch to Move to reposition it."
                    : tool === "whiteout"
                      ? "Drag a white box to cover text."
                      : "Tap the page to drop a note."}
          </p>

          {selected && (selected.kind === "text" || selected.kind === "note") ? (
            <label className="block space-y-1">
              <span className="text-sm text-muted">{selected.kind === "note" ? "Note" : "Text"}</span>
              <textarea
                value={selected.text}
                rows={3}
                className="w-full rounded-2xl border border-white/80 bg-white/70 px-3 py-2 text-sm text-fg outline-none"
                onChange={(event) => updateMark(selected.id, { text: event.target.value })}
              />
            </label>
          ) : null}

          {selected ? (
            <Button variant="ghost" className="w-fit text-danger" onClick={() => removeMark(selected.id)}>
              <Trash2 />
              Remove mark
            </Button>
          ) : null}

          <PageFilmstrip />
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => inputRef.current?.click()} disabled={busy !== null}>
              {busy === "add" ? <Loader2 className="animate-spin" /> : null}
              Add files
            </Button>
          </div>
          <Button className="w-full" onClick={() => void download()} disabled={busy !== null}>
            {busy === "pdf" ? <Loader2 className="animate-spin" /> : null}
            Download PDF
          </Button>
          <SharePdfButton
            file={lastPdf}
            disabled={busy !== null}
            onNeedFile={async () => {
              setBusy("pdf");
              try {
                return await buildPdf();
              } finally {
                setBusy(null);
              }
            }}
          />
          <PrintPdfButton
            file={lastPdf}
            disabled={busy !== null}
            onNeedFile={async () => {
              setBusy("pdf");
              try {
                return await buildPdf();
              } finally {
                setBusy(null);
              }
            }}
          />
        </>
      )}
    </div>
  );
}

function withCssAlpha(color: string, alpha: number) {
  const hex = color.replace("#", "");
  if (hex.length !== 6) return `rgba(245, 215, 110, ${alpha})`;
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
