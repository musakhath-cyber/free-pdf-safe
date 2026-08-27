import { FileStack, PenLine, ScanLine } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { AdSlot } from "@/components/ads/ad-slot";
import { BrandLockup } from "@/components/brand/logo";
import { getPublicSettings, type PublicSiteSettings } from "@/lib/site-settings";
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

const FALLBACK: PublicSiteSettings = {
  adsEnabled: false,
  adsensePublisherId: "",
  adsenseSlotId: "",
  siteNotice: "",
  tagline: "Convert, sign, and scan. Files never leave this device.",
};

export function StudioApp() {
  const mode = useStudio((state) => state.mode);
  const setMode = useStudio((state) => state.setMode);
  const hydrate = useStudio((state) => state.hydrate);
  const [settings, setSettings] = useState<PublicSiteSettings>(FALLBACK);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    getPublicSettings()
      .then(setSettings)
      .catch(() => setSettings(FALLBACK));
  }, []);

  return (
    <div className="studio-shell">
      <header className="studio-header">
        <div className="flex items-start justify-between gap-4">
          <BrandLockup subtitle={settings.tagline} />
          <span className="privacy-chip">On this device</span>
        </div>
        {settings.siteNotice ? <p className="studio-notice">{settings.siteNotice}</p> : null}
      </header>

      <main className="studio-main">
        {mode === "convert" ? <ConvertView /> : null}
        {mode === "sign" ? <SignView /> : null}
        {mode === "scan" ? <ScanView /> : null}
        <AdSlot settings={settings} />
        <p className="owner-link">
          <Link to="/admin">Owner desk</Link>
        </p>
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
