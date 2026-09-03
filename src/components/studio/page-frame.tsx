import { useEffect, useRef } from "react";
import { drawPageContent, loadImage, pagePixelSize } from "@/lib/pdf/canvas";
import { PAGE_SIZES, type PageSizeId, type Stamp, type StudioPage } from "@/lib/pdf/types";
import { cn } from "@/lib/utils";

type PageFrameProps = {
  page: StudioPage;
  pageSize: PageSizeId;
  stamps?: Stamp[];
  selectedStampId?: string | null;
  onPageClick?: (nx: number, ny: number) => void;
  onStampPointerDown?: (stamp: Stamp, event: React.PointerEvent<HTMLButtonElement>) => void;
  onStampCommit?: (stamp: Stamp) => void;
  className?: string;
  interactive?: boolean;
};

export function PageFrame({
  page,
  pageSize,
  stamps = [],
  selectedStampId,
  onPageClick,
  onStampPointerDown,
  onStampCommit,
  className,
  interactive,
}: PageFrameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastStampTap = useRef<{ id: string; at: number } | null>(null);
  const spec = PAGE_SIZES[pageSize];
  const pixels = pagePixelSize(pageSize);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = pixels.width;
    canvas.height = pixels.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    void loadImage(page.dataUrl).then((img) => {
      if (cancelled) return;
      drawPageContent(ctx, img, page, pixels.width, pixels.height, pageSize);
    });
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, pixels.height, pixels.width]);

  function commitStamp(stamp: Stamp) {
    lastStampTap.current = null;
    onStampCommit?.(stamp);
  }

  return (
    <div
      className={cn("page-sheet relative overflow-hidden bg-white", className)}
      style={{ aspectRatio: `${spec.widthPt} / ${spec.heightPt}` }}
    >
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 size-full" />
      {interactive ? (
        <div
          role="button"
          tabIndex={0}
          aria-label="Commit signature"
          className="absolute inset-0 z-10 touch-manipulation"
          onPointerUp={(event) => {
            if (event.button !== 0) return;
            const rect = event.currentTarget.getBoundingClientRect();
            onPageClick?.((event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height);
          }}
        />
      ) : null}
      {stamps.map((stamp) => (
        <button
          key={stamp.id}
          type="button"
          aria-label="Move or double-tap to commit signature"
          className={cn(
            "absolute z-20 cursor-grab touch-none overflow-hidden rounded-sm p-0",
            selectedStampId === stamp.id ? "ring-2 ring-primary" : "ring-0",
          )}
          style={{
            left: `${stamp.nx * 100}%`,
            top: `${stamp.ny * 100}%`,
            width: `${stamp.nw * 100}%`,
            height: `${stamp.nh * 100}%`,
          }}
          onPointerDown={(event) => {
            event.stopPropagation();
            onStampPointerDown?.(stamp, event);
          }}
          onPointerUp={(event) => {
            event.stopPropagation();
            const now = Date.now();
            const last = lastStampTap.current;
            if (last && last.id === stamp.id && now - last.at < 420) {
              commitStamp(stamp);
              return;
            }
            lastStampTap.current = { id: stamp.id, at: now };
          }}
          onDoubleClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            commitStamp(stamp);
          }}
        >
          <img src={stamp.dataUrl} alt="" className="pointer-events-none size-full object-contain" />
        </button>
      ))}
    </div>
  );
}
