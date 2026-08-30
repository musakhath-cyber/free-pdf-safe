import { Link } from "@tanstack/react-router";
import { MessageCircle, X } from "lucide-react";
import { useState } from "react";

const HINTS = [
  { q: "Do files leave this phone?", a: "No. Convert, Sign, and Scan run in this tab." },
  { q: "Do I need an account?", a: "No. Accounts are only for the Owner’s Desk." },
  { q: "What can I drop?", a: "Photos, PDFs, Word, and text. Then download one PDF." },
];

export function HelpFab() {
  const [open, setOpen] = useState(false);

  return (
    <div className="help-dock">
      {open ? (
        <div className="help-sheet panel" role="dialog" aria-label="Quick help">
          <div className="flex items-center justify-between gap-3">
            <p className="font-display text-lg text-ink">Quick help</p>
            <button type="button" className="site-menu-btn" aria-label="Close help" onClick={() => setOpen(false)}>
              <X className="size-4" />
            </button>
          </div>
          <ul className="mt-3 grid gap-3">
            {HINTS.map((item) => (
              <li key={item.q}>
                <p className="text-sm font-semibold text-ink">{item.q}</p>
                <p className="mt-0.5 text-sm text-muted">{item.a}</p>
              </li>
            ))}
          </ul>
          <Link to="/faq" className="text-link mt-4 inline-block" onClick={() => setOpen(false)}>
            Open the full FAQ
          </Link>
        </div>
      ) : null}
      <button
        type="button"
        className="help-fab"
        aria-label={open ? "Close help" : "Open help"}
        onClick={() => setOpen((value) => !value)}
      >
        <MessageCircle className="size-5" />
        <span className="hidden sm:inline">Ask</span>
      </button>
    </div>
  );
}
