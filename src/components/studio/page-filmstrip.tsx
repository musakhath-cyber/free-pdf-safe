import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useStudio } from "@/store/studio";
import { PageFrame } from "./page-frame";

export function PageFilmstrip() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    id: string;
    from: number;
    startX: number;
    startY: number;
    dragging: boolean;
    timer: number;
  } | null>(null);
  const lastTapRef = useRef<{ id: string; at: number } | null>(null);
  const [liftId, setLiftId] = useState<string | null>(null);
  const pages = useStudio((state) => state.pages);
  const pageSize = useStudio((state) => state.pageSize);
  const activePageId = useStudio((state) => state.activePageId);
  const setActivePageId = useStudio((state) => state.setActivePageId);
  const beginHistory = useStudio((state) => state.beginHistory);
  const reorderPages = useStudio((state) => state.reorderPages);

  function indexFromX(clientX: number) {
    const row = scrollerRef.current;
    if (!row) return 0;
    const cards = [...row.querySelectorAll<HTMLElement>("[data-page-id]")];
    for (let i = 0; i < cards.length; i += 1) {
      const rect = cards[i].getBoundingClientRect();
      if (clientX < rect.left + rect.width / 2) return i;
    }
    return Math.max(0, cards.length - 1);
  }

  function clearTimer() {
    const drag = dragRef.current;
    if (drag?.timer) window.clearTimeout(drag.timer);
  }

  function onPointerDown(id: string, index: number, event: React.PointerEvent<HTMLButtonElement>) {
    clearTimer();
    const timer = window.setTimeout(() => {
      const drag = dragRef.current;
      if (!drag) return;
      drag.dragging = true;
      beginHistory();
      setLiftId(id);
      event.currentTarget.setPointerCapture(event.pointerId);
      try {
        navigator.vibrate?.(12);
      } catch {
        /* ignore */
      }
    }, 380);
    dragRef.current = { id, from: index, startX: event.clientX, startY: event.clientY, dragging: false, timer };
  }

  function onPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.dragging && Math.hypot(dx, dy) > 10) {
      clearTimer();
      return;
    }
    if (!drag.dragging) return;
    event.preventDefault();
    const to = indexFromX(event.clientX);
    if (to !== drag.from) {
      reorderPages(drag.from, to);
      drag.from = to;
    }
  }

  function onPointerUp() {
    const drag = dragRef.current;
    clearTimer();
    if (drag && !drag.dragging) {
      const now = Date.now();
      const last = lastTapRef.current;
      if (last && last.id === drag.id && now - last.at < 420) {
        setActivePageId(drag.id);
        lastTapRef.current = null;
      } else {
        lastTapRef.current = { id: drag.id, at: now };
      }
    }
    dragRef.current = null;
    setLiftId(null);
  }

  if (pages.length === 0) return null;

  return (
    <div
      ref={scrollerRef}
      className="filmstrip -mx-5 flex gap-2 overflow-x-auto px-5 pb-1"
    >
      {pages.map((page, index) => {
        const selected = (activePageId ?? pages[0]?.id) === page.id;
        return (
          <button
            key={page.id}
            type="button"
            data-page-id={page.id}
            aria-label={`Page ${index + 1}`}
            aria-pressed={selected}
            className={cn("film-card w-[92px] shrink-0 space-y-1.5 text-left", selected && "is-on", liftId === page.id && "is-lift")}
            onPointerDown={(event) => onPointerDown(page.id, index, event)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <PageFrame page={page} pageSize={pageSize} className="pointer-events-none w-full" />
            <span className="block tabular-nums text-[11px] text-subtle">{index + 1}</span>
          </button>
        );
      })}
    </div>
  );
}
