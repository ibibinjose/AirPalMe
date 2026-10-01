/**
 * Single source for the /trust page's FAQ and structured data.
 *
 * The visible FAQ and the FAQPage JSON-LD are built from the same strings,
 * so the schema can never claim something the page does not say. The
 * prerender step embeds the same blocks in static HTML for non-JS crawlers
 * (see scripts/prerender-routes.json, enforced by prerender.test.ts).
 *
 * Every fact here must be repo-verifiable or brand-supplied. Unknowns are
 * omitted, never guessed: no founder, founding date, ACN, street address,
 * sameAs profiles, ratings, counts, or customers.
 */

export interface TrustFaq {
  q: string;
  a: string;
}

export const TRUST_FAQ: TrustFaq[] = [
  {
    q: "Is AirPal.Me safe?",
    a: "AirPal.Me is built with email and phone verification, understandable reputation, reporting and blocking, human admin review of safety cases, and payments held inside the platform — but no marketplace where people meet in real life can guarantee personal safety. Meet in public places, keep chat and payment inside AirPal.Me, and read the safety guidance in our help center.",
  },
  {
    q: "Who owns AirPal.Me?",
    a: "AirPal.Me is operated by SarvamDaily Pty Ltd (ABN 83 702 462 977), trading as AirPal.Me, in New South Wales, Australia. You can check the ABN Lookup record yourself — the link is at the bottom of this page.",
  },
  {
    q: "Is AirPal.Me the same as AirPal mattresses?",
    a: "No. Arjo's AirPal is a medical patient-transfer mattress made by Arjo. AirPal.Me has no affiliation with Arjo, with the airpal.app flight-search tool, or with any other AirPal-named app.",
  },
  {
    q: "Do I need to download an app?",
    a: "No. Guests can browse places, stays, plans and events on the airpal.me website without an account. Native iOS and Android apps exist for members who want them; they require sign-in.",
  },
];

export const TRUST_ORG_JSON_LD: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "AirPal.Me",
  legalName: "SarvamDaily Pty Ltd",
  taxID: "83 702 462 977",
  url: "https://airpal.me/",
  logo: "https://airpal.me/brand/logo-full.jpg",
  foundingLocation: {
    "@type": "Place",
    name: "Sydney, New South Wales, Australia",
  },
  disambiguatingDescription:
    "AirPal.Me is a Sydney-built guest-companion and local-discovery platform operated by SarvamDaily Pty Ltd. It is not Arjo's AirPal patient-transfer mattress, the airpal.app flight-search tool, or any other AirPal-named app.",
  contactPoint: {
    "@type": "ContactPoint",
    url: "https://airpal.me/contact",
    contactType: "customer support",
  },
};

/** Organization + FAQPage blocks, in render order. */
export function buildTrustJsonLd(): Record<string, unknown>[] {
  return [
    TRUST_ORG_JSON_LD,
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: TRUST_FAQ.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
  ];
}
