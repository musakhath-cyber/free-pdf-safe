import { Link } from "@tanstack/react-router";
import { BrandMark } from "@/components/brand/logo";
import { SITE_FOOTER } from "./nav";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="max-w-sm">
          <div className="flex items-center gap-2">
            <BrandMark className="size-7" />
            <span className="site-brand-name">Free PDF Safe</span>
          </div>
          <p className="mt-3 text-sm text-muted">
            Convert, sign, and scan in this tab. Files never leave this device.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
          {SITE_FOOTER.map((item) => (
            <Link key={item.to} to={item.to} className="hover:text-ink">
              {item.label}
            </Link>
          ))}
        </div>
      </div>
      <p className="site-footer-copy">© {new Date().getFullYear()} Free PDF Safe. On this device, not on our servers.</p>
    </footer>
  );
}
