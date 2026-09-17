import { Link } from "wouter";
import { LegalDoc } from "@/components/legal/LegalDoc";
import { LEGAL } from "@/lib/legal";

export function PrivacyPage() {
  return (
    <LegalDoc
      kicker="Legal"
      title="Privacy Policy"
      lede={`This Privacy Policy explains what personal information ${LEGAL.brand} collects, how we collect it, why we use it, who we share it with, and the rights you have. It is written for visitors in Australia, the European Economic Area, the United Kingdom, and California, and it applies wherever we offer the service.`}
    >
      <div className="callout">
        <p>
          Controller: {LEGAL.operator} (ABN {LEGAL.abn}), based in {LEGAL.location}. Privacy contact:{" "}
          <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> or the{" "}
          <Link href="/contact">contact form</Link>. Last updated {LEGAL.updated}.
        </p>
      </div>

      <h2>1. Who we are</h2>
      <p>
        {LEGAL.brand} ({LEGAL.site}) is a scan-first guest concierge and local guide: discovery of nearby places, stay tools for hotel and campus guests, public bios at airpal.me/@handle, and market or expo directories. Guests may browse without an account. Individuals and hosts use one login. After sign-in you choose a personal @handle. You may add a registered-business handle later.
      </p>
      <p>
        We do not currently process card payments on the site. If that changes, this notice will be updated before we take payment details.
      </p>

      <h2>2. What we collect</h2>
      <p>Depending on how you use AirPal, we may collect:</p>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Examples</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Identity and contact</td>
            <td>Name, email address, password (stored as a hash by our auth provider), mobile number and SMS one-time codes for login, display name, personal @handle, city, phone you choose to publish.</td>
          </tr>
          <tr>
            <td>Account and role</td>
            <td>User ID, whether you are a guest, host, venue, organiser, or platform admin, property membership.</td>
          </tr>
          <tr>
            <td>Business and listing content</td>
            <td>Business @handle, registered business name, registration number (for example ABN), domain, trade mark details you give us, bio copy, hours, offers, products, services, social links, photos you upload, stall and event details, Maps place ID. We use registration and mark details to match and, where needed, recover a handle for the rightful owner.</td>
          </tr>
          <tr>
            <td>Stay and scan context</td>
            <td>Property or marker scanned, room token, campus, saved stalls, packing checklist, messages you send a host.</td>
          </tr>
          <tr>
            <td>Device and log data</td>
            <td>IP address, user-agent, approximate network location, timestamps, Cloud Function and hosting logs, crash diagnostics.</td>
          </tr>
          <tr>
            <td>Approximate location</td>
            <td>If you allow it, GPS is used on-device for time, weather, hours, and walk times. You can also pick a city. If you opt in to “Share city with my Circle”, we store only that city name (not exact GPS) so people you follow, who follow you, or who you met can see you are nearby. Turn sharing off anytime.</td>
          </tr>
          <tr>
            <td>Camera</td>
            <td>QR frames are read on your device to open a stay, marker, or bio. We do not upload the camera stream.</td>
          </tr>
          <tr>
            <td>Usage on AirPal</td>
            <td>Bio taps (view, deal, maps, call), deal claim codes, emoji ratings and optional notes, language preference.</td>
          </tr>
          <tr>
            <td>Anonymous identifier</td>
            <td>On load we may create an anonymous Firebase Auth session so demo and live features can run without sign-in.</td>
          </tr>
        </tbody>
      </table>
      <p>We do not intentionally collect government ID numbers, payment card numbers, or special-category health data.</p>

      <h2>3. How we collect it</h2>
      <ul>
        <li>Forms you submit: host sign-up, business join, bio setup, attendee account, organiser CSV, contact form.</li>
        <li>Content you publish: bios, listings, deals, stall rows, photos.</li>
        <li>Automatic collection: server logs (including IP address), Firebase Auth, Firestore, Storage, Functions, and Hosting.</li>
        <li>Device storage: cookies, localStorage, and sessionStorage as described in the <Link href="/cookies">Cookie Policy</Link>.</li>
        <li>Your device: optional geolocation for local time, weather, and nearby distances; optional camera for scan.</li>
        <li>Third-party services when you tap Maps, open a booking URL, or load a venue photo hosted elsewhere.</li>
      </ul>

      <h2>4. Why we collect it</h2>
      <p>We use personal information to:</p>
      <ul>
        <li>Provide the service: open a scanned stay, show What’s around, publish your @handle, run a market directory.</li>
        <li>Create and secure accounts for hosts, venues, organisers, and attendees who choose to register, including sending an SMS login code, a verification email, and a password-reset email when you ask for one.</li>
        <li>Fulfil a request you make: claim a handle, save a stall, show a till code, message a host, contact us.</li>
        <li>Operate, debug, and protect the service (security, abuse, uptime).</li>
        <li>Measure product use: QR scans, page/context views, first useful action, map open, Wi-Fi reveal, questions, offer claims, event saves, operator activation, offer redemption, and support resolution. The north-star metric is weekly qualified guest actions per active QR context.</li>
        <li>Remember language, stay context, and drafts on your device.</li>
        <li>Comply with law and respond to lawful requests.</li>
      </ul>
      <p>
        We do not sell your personal information. We do not run advertising networks or marketing pixels on AirPal.me today. If you join AirPal Club or a venue guest list, your name and email stay on this device so a host can open their own mail app with the list on BCC. We do not send bulk mail from our servers yet. You can leave AirPal Club on /club.
      </p>
      <h3>Legal bases (EEA / UK)</h3>
      <p>Where GDPR or UK GDPR applies, we rely on: contract (to provide an account or listing you requested); legitimate interests (to run a public directory, keep the service secure, understand feature use at a coarse level); consent (camera, precise location, optional cookies if we introduce non-essential ones); and legal obligation.</p>
      <h3>Australia</h3>
      <p>We handle personal information in line with the Australian Privacy Principles in the Privacy Act 1988 (Cth), as applicable to our size and activities.</p>
      <h3>California</h3>
      <p>
        We do not sell or share personal information as those terms are used in the CCPA/CPRA. We do not use or disclose sensitive personal information for inferring characteristics. To request know, delete, or correct, use <Link href="/contact">Contact</Link> and choose the matching topic. You will not be discriminated against for exercising these rights.
      </p>

      <h2>5. Who we share it with</h2>
      <p>We share personal information only as needed to run AirPal:</p>
      <table>
        <thead>
          <tr>
            <th>Party</th>
            <th>Why</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Google / Firebase (United States and other regions)</td>
            <td>Authentication, Firestore database, Cloud Functions, Hosting, Storage for photos you upload, and transactional account emails (confirm your address, reset your password). Logs may include IP address and user-agent.</td>
          </tr>
          <tr>
            <td>Google Fonts</td>
            <td>To render type. Your browser requests fonts.googleapis.com / fonts.gstatic.com.</td>
          </tr>
          <tr>
            <td>Google Maps</td>
            <td>Stay local favorites load Google Maps JavaScript and Places (New) in the browser with our Maps API key when configured. Tapping Walk or Maps also opens Google’s pages. Google’s terms then apply.</td>
          </tr>
          <tr>
            <td>Open-Meteo</td>
            <td>Weather for the local-now bar. We send coordinates (GPS if allowed, otherwise the stay pin or precinct).</td>
          </tr>
          <tr>
            <td>Image hosts (for example Unsplash)</td>
            <td>Some seed place photos are loaded from those hosts.</td>
          </tr>
          <tr>
            <td>Hosts, venues, organisers</td>
            <td>If you message a host, rate a stall, or claim a deal, the relevant operator may see that content.</td>
          </tr>
          <tr>
            <td>The public</td>
            <td>Anything you put on a public bio, listing, or stall directory is visible to anyone with the link.</td>
          </tr>
        </tbody>
      </table>
      <p>
        We do not use a payment processor or a mail-marketing platform. Account verification and password-reset emails are sent by Google Firebase Authentication when you create an account or use Forgot password — not bulk or promotional mail. If we add Stripe, a marketing-mail vendor, or similar, we will name them here before they receive your data. We may disclose information if required by law or to protect a person from serious harm.
      </p>

      <h2>6. International transfers</h2>
      <p>
        Our operator is in Australia. Infrastructure is provided by Google Firebase, which may process data in the United States and other countries. Where GDPR applies, those transfers rely on Google’s customer agreements and standard contractual clauses. You can ask us for more detail via <Link href="/contact">Contact</Link>.
      </p>

      <h2>7. Cookies and similar technologies</h2>
      <p>
        We use cookies, localStorage, and sessionStorage to keep you signed in, remember language and stay context, and store drafts on your device. We do not set advertising cookies. The full list, purposes, and how to refuse are in the <Link href="/cookies">Cookie Policy</Link>, which forms part of this Privacy Policy.
      </p>

      <h2>8. Retention</h2>
      <ul>
        <li>Account, listing, and bio records: while the account is open, then a short period for backup and dispute handling.</li>
        <li>Deal claim codes: about 24 hours after issue, then as needed for abuse review.</li>
        <li>Daily bio tap counters: short operational windows.</li>
        <li>Server logs: typically weeks, unless needed for security.</li>
        <li>Device storage: until you clear site data or we change the key.</li>
        <li>Contact emails: as long as needed to handle the request.</li>
      </ul>

      <h2>9. Security</h2>
      <p>
        We use HTTPS, hashed passwords via Firebase Auth, and access rules on Firestore and Storage. No method of transmission or storage is perfectly secure. Do not put secrets (Wi-Fi passwords for a live property, payment data) in a public bio.
      </p>

      <h2>10. Your rights</h2>
      <p>Subject to law, you may:</p>
      <ul>
        <li>Request a copy of the personal information we hold about you.</li>
        <li>Ask us to correct it.</li>
        <li>Ask us to delete it (including closing a host or business account and releasing an @handle where we can).</li>
        <li>Object to or restrict certain processing, or withdraw consent for camera/location.</li>
        <li>Ask for portability of data you provided, where GDPR applies.</li>
        <li>Lodge a complaint with the Office of the Australian Information Commissioner, your EEA supervisory authority, the UK ICO, or the California Privacy Protection Agency.</li>
      </ul>
      <p>
        How to ask: delete your account in <Link href="/settings">Settings</Link> (type DELETE), or use <Link href="/contact">Contact</Link> and choose “Copy of my data” or “Delete my data” from the address on the account. We may need to verify you. We aim to respond within 30 days (or the shorter period your law requires).
      </p>
      <p>
        You can also delete much on-device data yourself: browser settings → clear data for airpal.me. That removes local listings, checklists, till codes, and language.
      </p>

      <h2>11. Age requirement (18+)</h2>
      <p>
        AirPal is for adults aged 18 and over. You must be 18 or older to create an account or use the app. We do not knowingly collect personal information of anyone under 18. If you believe we have, write to us and we will delete it.
      </p>

      <h2>12. Automated decisions</h2>
      <p>We do not make solely automated decisions that produce legal or similarly significant effects about you.</p>

      <h2>13. Changes</h2>
      <p>
        We will post updates on this page and change the effective date. Material changes to how we use personal information will be highlighted on the site or sent to the email on your account where we have it.
      </p>
    </LegalDoc>
  );
}
