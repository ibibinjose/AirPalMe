export const LEGAL = {
  brand: "AirPal.Me",
  site: "https://airpal.me",
  company: "SarvamDaily Pty Ltd",
  tradingAs: "AirPal.Me",
  abn: "83 702 462 977",
  /** ASIC-style line for terms, privacy, invoices. */
  operator: "SarvamDaily Pty Ltd trading as AirPal.Me",
  /** Public byline. */
  byline: "AirPal.Me by SarvamDaily Pty Ltd",
  location: "New South Wales, Australia",
  law: "the laws of New South Wales, Australia",
  courts: "the courts of New South Wales, Australia",
  email: "hello@airpal.me",
  /** Direct mailbox for App Store / Play support and the contact form. */
  contacts: "AirPalMe@gmail.com",
  updated: "18 September 2026",
} as const;

export const LEGAL_NAV = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/cookies", label: "Cookies" },
  { href: "/terms", label: "Terms" },
] as const;
