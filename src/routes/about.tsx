import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingPage } from "@/components/site/marketing-page";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [{ title: "About | Free PDF Safe" }],
    links: [{ rel: "canonical", href: "https://freepdfsafe.online/about" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <MarketingPage
      kicker="About"
      title="Built to stay in your browser."
      lede="Free PDF Safe is a small studio for people who need a PDF without sending the paper somewhere else."
    >
      <h2>What this is</h2>
      <p>
        A Convert, Sign, and Scan studio at freepdfsafe.online. Drop photos and documents, stamp a mark, read a QR
        code. The work happens in this tab.
      </p>
      <h2>Who it is for</h2>
      <p>
        Anyone who needs a clean PDF on a phone: forms, letters, a stack of pictures, a signature stamp, a code on a
        poster. No account for those tools.
      </p>
      <h2>Who runs it</h2>
      <p>
        The site is run from an Owner’s Desk behind an email login. That desk can turn optional ads on and edit the
        public tagline. It cannot see your files — they never arrive.
      </p>
      <p>
        <Link to="/limitations" className="text-link">
          What this studio is — and is not
        </Link>
      </p>
    </MarketingPage>
  );
}
