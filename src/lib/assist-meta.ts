/**
 * Single source for the /assist support page's FAQ and structured data.
 *
 * Mirrors trust-meta.ts: the visible FAQ and the FAQPage JSON-LD are built
 * from the same strings, so the schema can never claim something the page
 * does not say. The prerender step embeds the same block in static HTML for
 * non-JS crawlers (see scripts/prerender-routes.json, enforced by
 * prerender.test.ts).
 *
 * Every fact here must be repo-verifiable or brand-supplied. Unknowns are
 * omitted, never guessed: no response-time promises beyond the contact
 * page's own aim, no phone numbers, no street address, no ratings or counts.
 */

export interface AssistFaq {
  q: string;
  a: string;
}

export const ASSIST_FAQ: AssistFaq[] = [
  {
    q: "How do I contact AirPal.Me support?",
    a: "Write to us from the contact page, or email hello@airpal.me or AirPalMe@gmail.com directly. AirPal.Me is operated from Sydney, Australia by SarvamDaily Pty Ltd — we read every message and aim to reply within 30 days.",
  },
  {
    q: "Do I need an account to get help?",
    a: "No. On the airpal.me website you can read the help guides and contact us without signing in. The native iOS and Android apps require an account.",
  },
  {
    q: "I scanned a stay QR code — where is my help?",
    a: "Open the Staying guest guide in the help center for scans, Wi-Fi, dining and the front desk. For anything about your room or your booking, ask the property's reception directly.",
  },
  {
    q: "How do I report someone or stay safe?",
    a: "Use report and block inside the app — every safety case gets human review. Meet in public places and keep chat and payment inside AirPal.Me. No marketplace where people meet in real life can guarantee personal safety, so in an emergency call your local emergency number.",
  },
  {
    q: "How do I get a copy of my data or delete it?",
    a: "Choose “Copy of my data” or “Delete my data” as the topic on the contact page, and read the privacy policy for how we handle your information.",
  },
  {
    q: "Is AirPal.Me a real company?",
    a: "Yes. AirPal.Me is operated by SarvamDaily Pty Ltd (ABN 83 702 462 977) in Sydney, Australia. Company facts and verification links are on the trust page.",
  },
];

/** FAQPage block, in render order. */
export function buildAssistJsonLd(): Record<string, unknown>[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: ASSIST_FAQ.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
  ];
}
