import { FileStack, PenLine, ScanLine } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { AdSlot } from "@/components/ads/ad-slot";
import { HelpFab } from "@/components/site/help-fab";
import { HeroVideo } from "@/components/site/hero-video";
import { HomeSections } from "@/components/site/home-sections";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { InstallLink } from "@/components/pwa/register";
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
      <SiteHeader />
      <div className="studio-hero">
        <div className="hero-copy">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="site-kicker">freepdfsafe.online</p>
              <h1 className="hero-title">A PDF studio that never uploads.</h1>
              <p className="hero-lede">{settings.tagline}</p>
            </div>
            <span className="privacy-chip">On this device</span>
          </div>
          <ul className="hero-chips">
            <li>No account</li>
            <li>Stays in this tab</li>
            <li>Convert · Sign · Scan</li>
          </ul>
          {settings.siteNotice ? <p className="studio-notice">{settings.siteNotice}</p> : null}
        </div>
        <HeroVideo />
      </div>

      <main id="studio" className="studio-main">
        {mode === "convert" ? <ConvertView /> : null}
        {mode === "sign" ? <SignView /> : null}
        {mode === "scan" ? <ScanView /> : null}
        <AdSlot settings={settings} />
        <p className="owner-link">
          <InstallLink />
          <Link to="/privacy">Privacy</Link>
          {" · "}
          <Link to="/faq">FAQ</Link>
          {" · "}
          <Link to="/admin">Owner’s Desk</Link>
        </p>
      </main>

      <HomeSections />
      <SiteFooter />

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
            >
              <Icon className="size-5" strokeWidth={1.75} />
              {item.label}
            </button>
          );
        })}
      </nav>
      <HelpFab />
      <Toaster position="top-center" theme="light" />
    </div>
  );
}
