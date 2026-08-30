import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingPage } from "@/components/site/marketing-page";

export const Route = createFileRoute("/how")({
  head: () => ({
    meta: [{ title: "How it works | Free PDF Safe" }],
    links: [{ rel: "canonical", href: "https://freepdfsafe.online/how" }],
  }),
  component: HowPage,
});

function HowPage() {
  return (
    <MarketingPage
      kicker="How it works"
      title="A studio in this tab."
      lede="Drop paper, stamp a mark, or read a QR code. Convert, Sign, and Scan never send your files to our servers."
    >
      <h2>Step one — you bring the file</h2>
      <p>
        Photos, scans, PDFs, Word, or text. Add them on Convert. Reorder and rotate until the stack looks right. No
        account. No queue.
      </p>
      <h2>Step two — we stay on this device</h2>
      <p>
        Pages are assembled in the browser. A signature is a stamp you draw or type. Scan reads a camera frame or a
        photo for a QR code, then lets go of the stream.
      </p>
      <h2>Step three — you keep the PDF</h2>
      <p>
        Download saves to your own storage. Clearing this site’s data in the browser removes local studio pages. We do
        not keep a copy.
      </p>
      <h2>What we will not pretend</h2>
      <p>
        A stamp is not a notary, and a QR result is not a full document scan.{" "}
        <Link to="/limitations" className="text-link">
          Read the limits
        </Link>{" "}
        before you rely on a file in court or at a bank.
      </p>
      <p>
        <Link to="/" hash="studio" className="text-link">
          Open the studio
        </Link>
      </p>
    </MarketingPage>
  );
}
