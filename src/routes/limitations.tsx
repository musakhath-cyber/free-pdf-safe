import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingPage } from "@/components/site/marketing-page";

export const Route = createFileRoute("/limitations")({
  head: () => ({
    meta: [{ title: "Limits | Free PDF Safe" }],
    links: [{ rel: "canonical", href: "https://freepdfsafe.online/limitations" }],
  }),
  component: LimitsPage,
});

function LimitsPage() {
  return (
    <MarketingPage
      kicker="Limits"
      title="What this studio is — and is not"
      lede="Useful, on this device, and honest about the gaps."
    >
      <h2>A stamp is not a notary</h2>
      <p>
        Sign places a drawn or typed mark on a page. It is not a cryptographic digital signature, not a bank-grade
        certificate, and not a witness. Do not treat it as the only proof of a contract.
      </p>
      <h2>Scan is QR, not a photocopier</h2>
      <p>
        Scan reads a QR code from the camera or a photo. To turn a pile of paper into a PDF, use Convert and add
        pictures of the pages.
      </p>
      <h2>Heavy files can struggle</h2>
      <p>
        Very large PDFs or dozens of high-resolution photos may slow or fail in the browser. Split the stack if the
        studio stalls.
      </p>
      <h2>Image-only scans</h2>
      <p>
        Convert can place a photo of a page into a PDF. It does not retype the words. If you need selectable text,
        start from a real text file or Word document.
      </p>
      <h2>Clearing the browser clears the desk</h2>
      <p>
        Pages you are working on live in this browser until you download or clear site data. We do not keep a backup.
      </p>
      <p>
        Ready anyway?{" "}
        <Link to="/" hash="studio" className="text-link">
          Open the studio
        </Link>
      </p>
    </MarketingPage>
  );
}
