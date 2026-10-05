import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useStudio } from "@/store/studio";

export function EditorBar() {
  const [confirm, setConfirm] = useState(false);
  const pages = useStudio((state) => state.pages);
  const undoStack = useStudio((state) => state.undoStack);
  const undo = useStudio((state) => state.undo);
  const cancelWork = useStudio((state) => state.cancelWork);
  const zoom = useStudio((state) => state.zoom);
  const setZoom = useStudio((state) => state.setZoom);

  if (pages.length === 0) return null;

  if (confirm) {
    return (
      <div className="panel space-y-3 p-4">
        <p className="text-sm text-fg">Cancel this work? Pages on screen will be cleared. Saved signatures stay on this device.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setConfirm(false)}>
            Keep working
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              cancelWork();
              setConfirm(false);
            }}
          >
            Yes, cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => undo()} disabled={undoStack.length === 0}>
          Back
        </Button>
        <Button variant="ghost" onClick={() => setConfirm(true)}>
          Cancel
        </Button>
      </div>
      <label className="zoom-bar">
        <span>Zoom</span>
        <input
          type="range"
          className="range"
          min={0.7}
          max={2.5}
          step={0.05}
          value={zoom}
          aria-label="Zoom"
          onChange={(event) => setZoom(Number(event.target.value))}
        />
        <span className="tabular-nums">{Math.round(zoom * 100)}%</span>
      </label>
    </div>
  );
}
