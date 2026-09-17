export const LEGAL = {
  brand: "AirPal.Me",
  site: "https://airpal.me",
  operator: "the operator of AirPal.Me",
  location: "New South Wales, Australia",
  law: "the laws of New South Wales, Australia",
  courts: "the courts of New South Wales, Australia",
  email: "hello@airpal.me",
  updated: "17 September 2026",
} as const;

export const LEGAL_NAV = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/cookies", label: "Cookies" },
  { href: "/terms", label: "Terms" },
] as const;
