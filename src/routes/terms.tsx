import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingPage } from "@/components/site/marketing-page";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [{ title: "Terms | Free PDF Safe" }],
    links: [{ rel: "canonical", href: "https://freepdfsafe.online/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <MarketingPage
      kicker="Terms"
      title="Using Free PDF Safe"
      lede="The studio is provided as-is. Convert, Sign, and Scan run on your device."
    >
      <h2>The service</h2>
      <p>
        You may convert files, stamp a signature, and read QR codes in this tab without an account. Optional ads may
        appear if the owner turns them on. They do not receive your documents.
      </p>
      <h2>Your files</h2>
      <p>
        You are responsible for the files you add and for how you use a downloaded PDF. A stamp is a convenience mark,
        not legal advice and not a certified signature.
      </p>
      <h2>Owner desk</h2>
      <p>
        Sign-in is only for the operator. Claiming the desk does not grant access to other people’s files — those files
        never leave their devices.
      </p>
      <h2>Availability</h2>
      <p>
        The site may change or pause. We do not promise uninterrupted service. Last updated 30 August 2026.
      </p>
      <p>
        See also the{" "}
        <Link to="/privacy" className="text-link">
          privacy policy
        </Link>
        .
      </p>
    </MarketingPage>
  );
}
