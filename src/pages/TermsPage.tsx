import { Link } from "wouter";
import { LegalDoc } from "@/components/legal/LegalDoc";
import { LEGAL } from "@/lib/legal";

export function TermsPage() {
  return (
    <LegalDoc
      kicker="Legal"
      title="Terms & Conditions"
      lede={`These Terms & Conditions (“Terms”) govern access to and use of ${LEGAL.brand}, including airpal.me, related QR destinations, and host tools. By using the service you agree to these Terms. If you do not agree, do not use it.`}
    >
      <div className="callout">
        <p>
          Operator: {LEGAL.operator}, {LEGAL.location}. Governing law: {LEGAL.law}. Contact:{" "}
          <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>. Effective {LEGAL.updated}.
        </p>
      </div>

      <h2>1. The service</h2>
      <p>
        AirPal is a guest concierge and local guide. Hosts print QR codes for rooms, lobbies, campuses, and streets. Visitors scan to see What’s around, stay answers, tours, events, and public bios. Local businesses may claim an @handle. Organisers may run a market or expo directory.
      </p>
      <p>
        We may change, suspend, or discontinue features. Information about places, hours, deals, weather, and walking times is provided as a convenience and may be incomplete or out of date.
      </p>

      <h2>2. Eligibility and accounts</h2>
      <p>
        Guests may browse without an account. There is one login for individuals and hosts. Anyone who creates an account must be 18 or over (or have a parent’s consent) and provide accurate details. After you sign in you choose a personal @handle. You may then host a registered business under a separate business handle.
      </p>
      <p>
        You are responsible for the email and password on your account and for activity under it. We may send a verification email when you create an account, and a password-reset email when you use Forgot password on the sign-in page. Tell us promptly if you think the account is compromised, or reset the password from{" "}
        <Link href="/start?tab=reset">/start?tab=reset</Link>.
      </p>
      <h3>Account termination</h3>
      <p>You may close an account by writing to us from the registered email via <Link href="/contact">Contact</Link> and asking us to delete it. We may suspend or terminate an account, listing, @handle, or event if:</p>
      <ul>
        <li>you breach these Terms or the law;</li>
        <li>you impersonate a place, host, or person;</li>
        <li>content is fraudulent, harmful, or infringing;</li>
        <li>we must do so to protect guests, hosts, or the service;</li>
        <li>the account is unused for a long period.</li>
      </ul>
      <p>We may reclaim reserved or inactive handles. Termination does not affect rights or liabilities accrued before it.</p>

      <h2>3. Handles, registered names, and trade marks</h2>
      <p>
        An @handle is a public address on AirPal (for example airpal.me/@cutbar). First to claim is not the last word. Handles are a licence to use that address on our service. We can move or cancel a handle.
      </p>
      <h3>AirPal Club and guest lists</h3>
      <p>
        AirPal Club is an optional list for invites and offers from AirPal. A club or venue may keep its own guest list and email people who asked to be on it. Joining a venue list may also join AirPal Club when the form says so. You can leave AirPal Club at any time. We are not a bulk-mail house: invites today open the sender’s own mail app with the list on BCC.
      </p>
      <h3>Personal handles</h3>
      <p>Your first handle is personal. It should be yours. Do not take a handle that is someone else’s name, brand, or domain in order to sell it or to pass yourself off as them.</p>
      <h3>Business handles</h3>
      <p>To host a business on AirPal the business must be registered (for example an Australian ABN or company number, or the equivalent where you operate). The business @handle must match the registered business name, a registered trade mark you own, or a domain name you own (the registrable part, such as cutbar from cutbar.com.au). We suggest the matching handle from that name or domain. You warrant that you are authorised to represent that business.</p>
      <h3>Trade mark and domain priority</h3>
      <p>
        If someone has claimed a handle that matches a registered business name, a registered trade mark, or a domain the owner controls, we will give that handle to the owner when they prove it. Typical evidence is a current registration extract, a trade mark certificate or official extract, and/or registrar proof for the domain. We may also look at the public register ourselves. The previous holder may keep a different personal handle. We are not a trade mark office and this process does not decide ownership of a mark in general — only who may use that @handle on AirPal.
      </p>
      <p>
        Request recovery at <Link href="/bio/recover">Recover a handle</Link> or <Link href="/contact">Contact</Link>. We aim to decide reasonably and in good faith. We may freeze the handle while we look. We are not liable to the squatting holder for moving it.
      </p>
      <p>You must not register a handle you do not have rights in. Squatting, impersonation, and selling handles are grounds for immediate removal.</p>

      <h2>4. Rules for using the website</h2>
      <p>You agree not to:</p>
      <ul>
        <li>scrape, overload, or reverse engineer the service except as allowed by law;</li>
        <li>interfere with QR tokens, room tokens, or another host’s property;</li>
        <li>post malware, spam, or illegal content;</li>
        <li>claim a handle or listing you do not operate, or squat a trade mark or registered name;</li>
        <li>use AirPal to mislead guests about prices, hours, or deals;</li>
        <li>collect personal information of others from the service without a lawful basis;</li>
        <li>use the service for anything that would make us a payment facilitator or marketplace escrow — we are not that.</li>
      </ul>
      <p>Public bios, stall rows, and listings must be accurate to a reasonable standard. Deals must be honoured on the terms you publish (for example “show this at the till”).</p>

      <h2>5. User content</h2>
      <p>
        You retain ownership of content you submit (photos, copy, offers, CSV stalls). You grant us a worldwide, non-exclusive, royalty-free licence to host, display, and distribute that content solely to operate AirPal, including public pages and QR destinations, until you remove it or we delete the account.
      </p>
      <p>You warrant you have the rights to that content and that it does not infringe others. We may remove content without notice if we reasonably believe it breaches these Terms.</p>

      <h2>6. Intellectual property</h2>
      <p>
        AirPal.me, the AirPal name and mark, the layout, software, and original text and images we publish are owned by us or our licensors. You may not copy, scrape, or reuse them except for a short quotation with credit, or as required by law (including fair dealing in Australia).
      </p>
      <p>
        Venue names, logos, and photographs supplied by hosts or appearing as seed discovery content remain the property of their owners. Seed place copy is for demonstration of the precinct guide and is not an endorsement or a paid advertisement unless marked as such.
      </p>
      <p>If you believe content infringes your copyright or that an @handle infringes your trade mark, registered name, or domain, write to {LEGAL.email} or use <Link href="/bio/recover">handle recovery</Link>.</p>

      <h2>7. Disclaimers</h2>
      <p>
        AirPal is a guide and a messaging layer. It is not a booking engine, a licensed travel agent, an insurer, or professional advice. Information on the site — including walking times, hours, Wi-Fi, house rules, deals, weather, and “open now” — is for general information and educational use in the sense of helping a guest find their way. It may be wrong. Confirm anything important with the host or venue before you rely on it.
      </p>
      <p>
        Maps and walking directions are provided by Google or similar third parties when you tap through. Their terms and privacy notices apply to that hop. We are not responsible for the safety of a walk, a venue, or a market stall.
      </p>
      <p>
        Till codes and “show AirPal” offers are between the guest and the venue. We do not guarantee a venue will honour a deal.
      </p>
      <p>
        Nothing in these Terms excludes, restricts, or modifies any consumer guarantee, right, or remedy conferred by the Australian Consumer Law or any other law that cannot be excluded. Where we are allowed to limit liability for a breach of a non-excludable guarantee, we limit it to resupplying the service or paying the cost of resupply.
      </p>

      <h2>8. Liability</h2>
      <p>
        To the maximum extent permitted by law, we are not liable for indirect, incidental, special, or consequential loss, lost profit, lost data, or business interruption, whether in contract, tort (including negligence), or otherwise, arising from your use of AirPal or from third-party places you visit after using it.
      </p>
      <p>
        Our aggregate liability to you in connection with the service is limited to AUD 100 or the amount you paid us in the 12 months before the claim, whichever is greater. You have not paid us for guest browsing.
      </p>

      <h2>9. Indemnity</h2>
      <p>
        If you are a host, venue, organiser, or business user, you will indemnify us against claims, damages, and reasonable legal costs arising from your listings, deals, stalls, guest communications, or your breach of these Terms, except to the extent we caused the loss.
      </p>

      <h2>10. Privacy</h2>
      <p>
        Personal information is handled as described in the <Link href="/privacy">Privacy Policy</Link> and <Link href="/cookies">Cookie Policy</Link>. Those documents form part of the agreement between you and us.
      </p>

      <h2>11. Third-party services</h2>
      <p>
        Firebase, Google Fonts, Google Maps, Open-Meteo, and image hosts are third parties. We are not responsible for their availability or their terms. Links to restaurants, tickets, or booking pages leave AirPal.
      </p>

      <h2>12. Governing law</h2>
      <p>
        These Terms are governed by {LEGAL.law}. You and we submit to the exclusive jurisdiction of {LEGAL.courts}, except that we may seek injunctive relief in any jurisdiction to protect intellectual property or confidential tokens.
      </p>
      <p>
        If a court finds a clause unenforceable, the rest remains in effect. A failure to enforce a right is not a waiver. You may not assign these Terms without our consent. We may assign them in connection with a restructure or sale of the service.
      </p>

      <h2>13. Changes</h2>
      <p>
        We may update these Terms by posting a new version on this page. Continued use after the effective date is acceptance. If you use AirPal under an account, material changes may also be notified to the email on that account.
      </p>
    </LegalDoc>
  );
}
