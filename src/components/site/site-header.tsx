import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { BrandMark } from "@/components/brand/logo";
import { SITE_NAV } from "./nav";

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link to="/" className="site-brand" onClick={() => setOpen(false)}>
          <BrandMark className="size-8" />
          <span className="site-brand-name">Free PDF Safe</span>
        </Link>
        <nav className="site-nav-desktop" aria-label="Site">
          {SITE_NAV.map((item) => (
            <Link key={item.to} to={item.to} className="site-nav-link">
              {item.label}
            </Link>
          ))}
        </nav>
        <button
          type="button"
          className="site-menu-btn"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open ? (
        <nav className="site-nav-mobile" aria-label="Site">
          {SITE_NAV.map((item) => (
            <Link key={item.to} to={item.to} className="site-nav-mobile-link" onClick={() => setOpen(false)}>
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
