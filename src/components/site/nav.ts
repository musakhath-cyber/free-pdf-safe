export const SITE_NAV = [
  { to: "/how", label: "How it works" },
  { to: "/faq", label: "FAQ" },
  { to: "/about", label: "About" },
  { to: "/privacy", label: "Privacy" },
  { to: "/limitations", label: "Limits" },
] as const;

export const SITE_FOOTER = [
  ...SITE_NAV,
  { to: "/terms", label: "Terms" },
] as const;
