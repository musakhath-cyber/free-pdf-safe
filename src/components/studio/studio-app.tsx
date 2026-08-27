import { FileStack, PenLine, ScanLine } from "lucide-react";
import { useEffect } from "react";
import { Toaster } from "sonner";
import type { StudioMode } from "@/lib/pdf/types";
import { cn } from "@/lib/utils";
import { useStudio } from "@/store/studio";
import { ConvertView } from "./convert-view";
import { ScanView } from "./scan-view";
import { SignView } from "./sign-view";

const NAV: { id: StudioMode; label: string; icon: typeof FileStack }[] = [
  { id: "convert", label: "Convert", icon: FileStack },
  { id: "sign", label: "Sign", icon: PenLine },
  { id: "scan", label: "Scan", icon: ScanLine },
];

export function StudioApp() {
  const mode = useStudio((state) => state.mode);
  const setMode = useStudio((state) => state.setMode);
  const hydrate = useStudio((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <div className="studio-shell">
      <header className="studio-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="wordmark">Free PDF Safe</p>
            <p className="mt-1 max-w-[28ch] text-sm text-muted">
              Convert, sign, and scan. Files never leave this device.
            </p>
          </div>
          <span className="privacy-chip">On this device</span>
        </div>
      </header>

      <main className="studio-main">
        {mode === "convert" ? <ConvertView /> : null}
        {mode === "sign" ? <SignView /> : null}
        {mode === "scan" ? <ScanView /> : null}
      </main>

      <nav className="studio-nav" aria-label="Studio">
        {NAV.map((item) => {
          const Icon = item.icon;
          const on = mode === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setMode(item.id)}
              className={cn("nav-item", on && "is-on")}
              aria-current={on ? "page" : undefined}
            >
              <Icon className="size-5" strokeWidth={1.75} />
              {item.label}
            </button>
          );
        })}
      </nav>
      <Toaster position="top-center" theme="light" />
    </div>
  );
}
