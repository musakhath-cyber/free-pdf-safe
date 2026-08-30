import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingPage } from "@/components/site/marketing-page";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [{ title: "FAQ | Free PDF Safe" }],
    links: [{ rel: "canonical", href: "https://freepdfsafe.online/faq" }],
  }),
  component: FaqPage,
});

const FAQS = [
  {
    q: "Do files leave this device?",
    a: "No. Convert, Sign, and Scan run in this tab. We do not upload your PDFs, photos, Word files, signatures, or QR frames.",
  },
  {
    q: "Which files can I drop?",
    a: "JPEG, PNG, WebP, PDF, Word, and plain text on Convert. Sign works on a page in the studio. Scan reads a QR code from the camera or a photo.",
  },
  {
    q: "Do I have to leave this site?",
    a: "No. The studio is this page. Download saves the PDF to your own storage.",
  },
  {
    q: "Do I need an account?",
    a: "No. Convert, Sign, and Scan are free and anonymous. Sign-in exists only for the Owner’s Desk.",
  },
  {
    q: "Is the signature legally binding?",
    a: "It is a stamp you place on a page, not a cryptographic digital signature and not a notary. Use it as a convenience mark. Read the limits before you treat it as a contract.",
  },
  {
    q: "What does Scan do?",
    a: "It reads a QR code. It does not photograph a whole stack of paper into a PDF — that is Convert.",
  },
  {
    q: "Do you show ads?",
    a: "Ads are off unless the owner turns them on. If ads are on, they sit beside the studio. They never touch your documents.",
  },
  {
    q: "Why is the Play listing called PDF Safe?",
    a: "Play does not like the word Free in an app name. The site stays Free PDF Safe. Same studio.",
  },
  {
    q: "Who can I ask?",
    a: "The Ask button in the corner is a shortcut into this FAQ. Owner login is only for the person who runs the site.",
  },
];

function FaqPage() {
  return (
    <MarketingPage
      kicker="FAQ"
      title="Questions, answered"
      lede="Short answers for the studio. Files stay here. Accounts are only for the owner."
    >
      {FAQS.map((item) => (
        <div key={item.q}>
          <h2>{item.q}</h2>
          <p>{item.a}</p>
        </div>
      ))}
      <p>
        <Link to="/limitations" className="text-link">
          What this studio is — and is not
        </Link>
      </p>
    </MarketingPage>
  );
}
