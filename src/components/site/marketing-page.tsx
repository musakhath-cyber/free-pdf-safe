import type { ReactNode } from "react";
import { HelpFab } from "./help-fab";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

export function MarketingPage({
  kicker,
  title,
  lede,
  children,
}: {
  kicker: string;
  title: string;
  lede?: string;
  children: ReactNode;
}) {
  return (
    <div className="site-page">
      <SiteHeader />
      <main className="site-main">
        <p className="site-kicker">{kicker}</p>
        <h1 className="site-h1">{title}</h1>
        {lede ? <p className="site-lede">{lede}</p> : null}
        <article className="legal-prose mt-8">{children}</article>
      </main>
      <SiteFooter />
      <HelpFab />
    </div>
  );
}
