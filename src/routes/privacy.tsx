import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandMark } from "@/components/brand/logo";

export const Route = createFileRoute("/privacy")({ component: PrivacyPage });

function PrivacyPage() {
  return (
    <main className="legal-shell">
      <header className="mb-6 flex items-center gap-3">
        <Link to="/" aria-label="Back to Free PDF Safe" className="shrink-0">
          <BrandMark />
        </Link>
        <div>
          <p className="form-kicker">Free PDF Safe</p>
          <h1 className="section-title">Privacy policy</h1>
        </div>
      </header>

      <article className="legal-prose panel p-5">
        <p>Last updated 28 August 2026. This policy is for the Free PDF Safe website and any store listing that opens this same app.</p>

        <h2>What this app does</h2>
        <p>
          Free PDF Safe lets you convert photos, scans, PDFs, Word, and text into a PDF, stamp a signature, and read QR
          codes. Convert, Sign, and Scan run in your browser on this device.
        </p>

        <h2>Files stay on your device</h2>
        <p>
          Documents you add are processed on your device. We do not upload your PDFs, photos, Word files, signatures, or
          QR scans to our servers. Downloading a PDF saves it to your own storage. Clearing the browser data for this
          site removes local studio pages from that browser.
        </p>

        <h2>Camera</h2>
        <p>
          Scan can use the camera only after you tap to start a live scan. Frames are read on this device to detect a QR
          code. We do not record or send the camera stream. You can also pick an image from your library instead.
        </p>

        <h2>Accounts</h2>
        <p>
          You do not need an account to convert, sign, or scan. Sign-in exists only for the Owner desk, which controls
          optional ads and public site copy. Owner login is stored as a session with the operator of this site.
        </p>

        <h2>Ads</h2>
        <p>
          Ads are off unless the owner turns them on. If ads are on, Google AdSense may set cookies and collect standard
          advertising data as described in Google’s policies. Your documents still stay on this device.
        </p>

        <h2>What we store</h2>
        <ul>
          <li>On your device: pages you are working on, until you clear them or your browser data.</li>
          <li>On our servers: owner-desk settings (ads on/off, AdSense IDs, tagline, notice) and the owner account if one exists.</li>
          <li>We do not sell your documents. We do not use your files to train models.</li>
        </ul>

        <h2>Children</h2>
        <p>This app is a general productivity tool. It is not directed at children under 13.</p>

        <h2>Contact</h2>
        <p>
          The operator of this site can be reached through the{" "}
          <Link to="/admin" className="text-link">
            Owner desk
          </Link>
          . The public site is{" "}
          <a href="https://freepdfsafe.online" className="text-link">
            freepdfsafe.online
          </a>
          .
        </p>
      </article>

      <p className="owner-link">
        <Link to="/">Back to the studio</Link>
      </p>
    </main>
  );
}
