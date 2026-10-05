import type { ReactNode, Ref } from "react";
import { useStudio } from "@/store/studio";

export function DocumentStage({
  children,
  innerRef,
}: {
  children: ReactNode;
  innerRef?: Ref<HTMLDivElement>;
}) {
  const zoom = useStudio((state) => state.zoom);
  return (
    <div className="doc-viewport">
      <div ref={innerRef} className="doc-sheet" style={{ width: `${Math.round(zoom * 100)}%` }}>
        {children}
      </div>
    </div>
  );
}
