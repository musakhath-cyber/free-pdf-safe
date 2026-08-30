import { Link } from "@tanstack/react-router";
import { FileStack, PenLine, ScanLine } from "lucide-react";

export function HomeSections() {
  return (
    <div className="home-sections">
      <section>
        <p className="site-kicker">How it works</p>
        <h2 className="site-h2">Three tools. Then a PDF you keep.</h2>
        <div className="step-grid">
          <article className="surface-card">
            <p className="step-num">01</p>
            <span className="step-icon">
              <FileStack className="size-5" />
            </span>
            <h3 className="step-title">Drop a stack</h3>
            <p className="step-copy">Photos, scans, PDFs, Word, or text. Reorder and rotate in this tab.</p>
          </article>
          <article className="surface-card">
            <p className="step-num">02</p>
            <span className="step-icon">
              <PenLine className="size-5" />
            </span>
            <h3 className="step-title">Stamp a signature</h3>
            <p className="step-copy">Draw or type a mark. Place it on the page. Nothing is uploaded to sign.</p>
          </article>
          <article className="surface-card">
            <p className="step-num">03</p>
            <span className="step-icon">
              <ScanLine className="size-5" />
            </span>
            <h3 className="step-title">Read a QR code</h3>
            <p className="step-copy">Camera or a photo. The frame is read here, then discarded.</p>
          </article>
        </div>
        <p className="mt-6 text-sm text-muted">
          Want the longer tour?{" "}
          <Link to="/how" className="text-link">
            How it works
          </Link>
        </p>
      </section>

      <section className="mt-16">
        <h2 className="site-h2">What we can read</h2>
        <ul className="cap-grid">
          <li className="surface-card px-5 py-4">
            <p className="font-medium text-ink">Convert</p>
            <p className="mt-1 text-sm text-muted">JPEG, PNG, WebP, PDF, Word, and text into one document.</p>
          </li>
          <li className="surface-card px-5 py-4">
            <p className="font-medium text-ink">Sign</p>
            <p className="mt-1 text-sm text-muted">A drawn or typed stamp. Not a cryptographic digital signature.</p>
          </li>
          <li className="surface-card px-5 py-4">
            <p className="font-medium text-ink">Scan</p>
            <p className="mt-1 text-sm text-muted">QR codes from the camera or a still. Not a multi-page document scanner.</p>
          </li>
          <li className="surface-card px-5 py-4">
            <p className="font-medium text-ink">Download</p>
            <p className="mt-1 text-sm text-muted">The PDF saves to your own storage. Clearing this site clears local pages.</p>
          </li>
        </ul>
        <p className="mt-4 text-xs text-muted">
          Files stay on this device. Read the{" "}
          <Link to="/limitations" className="text-link">
            limits
          </Link>{" "}
          before you treat a stamp as a contract.
        </p>
      </section>
    </div>
  );
}
