import { useEffect } from "react";
import type { PublicSiteSettings } from "@/lib/site-settings";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export function AdSlot({ settings }: { settings: PublicSiteSettings }) {
  const ready = settings.adsEnabled && Boolean(settings.adsensePublisherId);

  useEffect(() => {
    if (!ready) return;
    const src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(settings.adsensePublisherId)}`;
    if (!document.querySelector(`script[src="${src}"]`)) {
      const script = document.createElement("script");
      script.async = true;
      script.crossOrigin = "anonymous";
      script.src = src;
      document.head.appendChild(script);
    }
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* AdSense may not be approved yet */
    }
  }, [ready, settings.adsensePublisherId]);

  if (!settings.adsEnabled) return null;

  return (
    <aside className="ad-well" aria-label="Advertisement">
      {ready ? (
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client={settings.adsensePublisherId}
          data-ad-slot={settings.adsenseSlotId || undefined}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      ) : (
        <p className="ad-placeholder">Ad space</p>
      )}
      <p className="ad-note">Ads load from Google. Your PDFs still stay on this device.</p>
    </aside>
  );
}
