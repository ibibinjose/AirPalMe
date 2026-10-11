import { Link } from "wouter";
import { LegalDoc } from "@/components/legal/LegalDoc";
import { LEGAL } from "@/lib/legal";

export function CookiesPage() {
  return (
    <LegalDoc
      kicker="Legal"
      title="Cookie Policy"
      lede={`This Cookie Policy is part of our Privacy Policy. It explains the cookies and similar technologies ${LEGAL.brand} uses, why, and how you can control them. It is written to meet the expectations of the EU ePrivacy rules, UK PECR, and California’s “do not sell/share” disclosures.`}
    >
      <div className="callout">
        <p>
          We do not use advertising or social-media tracking pixels. We do not sell or share personal information for
          cross-context behavioural advertising. Most of what we store on your device is localStorage or sessionStorage,
          not a classic HTTP cookie. First-party product analytics (QR scans, stay actions) use the same anonymous
          Firebase session — not ad cookies.
        </p>
      </div>

      <h2>1. What we mean by “cookies”</h2>
      <p>
        Cookies are small files a site stores on your device. Similar technologies include localStorage, sessionStorage,
        IndexedDB, and pixels. Browsers treat them differently, but they can identify a device or remember a setting.
        This policy covers all of them on AirPal.me.
      </p>

      <h2>2. How we use them</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Purpose</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Firebase Auth (IndexedDB / cookies)</td>
            <td>Strictly necessary</td>
            <td>Keep a signed-in host or an anonymous session so listings, bios, and functions work.</td>
            <td>Session / until you sign out or clear site data</td>
          </tr>
          <tr>
            <td>airpal.lang</td>
            <td>Functional</td>
            <td>Remember English or 中文.</td>
            <td>Until you change it or clear storage</td>
          </tr>
          <tr>
            <td>airpal.cohort / airpal.marker</td>
            <td>Strictly necessary</td>
            <td>Remember the scanned building cohort, room token, marker, or campus for this tab.</td>
            <td>Session</td>
          </tr>
          <tr>
            <td>airpal.local-now.v2</td>
            <td>Functional</td>
            <td>
              Cache weather for the current precinct anchor or GPS origin so we do not re-query Open-Meteo every load.
            </td>
            <td>Session (about 15 minutes of usefulness)</td>
          </tr>
          <tr>
            <td>airpal.listings.v1 / airpal.bios.v1 / event keys</td>
            <td>Functional</td>
            <td>Draft listings, bios, events, and saved stalls on this browser (including demo mode).</td>
            <td>Until you clear storage</td>
          </tr>
          <tr>
            <td>airpal.bio-claims.v1</td>
            <td>Functional</td>
            <td>Remember a till code you already claimed.</td>
            <td>Until expiry (~24 hours of usefulness) or you clear storage</td>
          </tr>
          <tr>
            <td>airpal.bio-taps.v1 / airpal.ratings.v1 / checklist keys</td>
            <td>Functional</td>
            <td>Tap counts, emoji ratings, packing checklist on this device.</td>
            <td>Until you clear storage</td>
          </tr>
          <tr>
            <td>airpal.analytics.buffer.v1</td>
            <td>Functional / first-party analytics</td>
            <td>
              Queue product events (QR scan, Wi-Fi, map, questions) if the network is down, then send them with your
              anonymous session.
            </td>
            <td>Until sent or you clear storage</td>
          </tr>
          <tr>
            <td>Firebase Analytics (only if a measurement ID is configured)</td>
            <td>Analytics</td>
            <td>
              First-party product metrics via Google Analytics for Firebase. Not used for ads. No third-party ad pixels.
            </td>
            <td>Set by Google; typically up to 2 years for the client id</td>
          </tr>
          <tr>
            <td>Firebase Hosting / Google infrastructure</td>
            <td>Strictly necessary</td>
            <td>Deliver the site, TLS, App Check, and abuse protection. Server logs include IP address.</td>
            <td>Set by Google; logs typically weeks</td>
          </tr>
        </tbody>
      </table>

      <h2>3. Third parties that may set their own cookies</h2>
      <ul>
        <li>
          <strong>Google Fonts.</strong> The page loads type from fonts.googleapis.com. Google may process your IP
          address. We do not control Google’s cookies on their domains.
        </li>
        <li>
          <strong>Google Maps.</strong> Only if you tap Walk or Maps. Google’s cookie and privacy notices then apply.
        </li>
        <li>
          <strong>Open-Meteo.</strong> Weather API. Typically no cookies on your device; we send coordinates from the
          request.
        </li>
        <li>
          <strong>Unsplash or other image hosts</strong> when a seed photo is loaded from their CDN.
        </li>
      </ul>
      <p>
        We do not load Facebook, TikTok, LinkedIn, or advertising tags. Social buttons on a bio open that network only
        when you tap them.
      </p>

      <h2>4. Legal basis and consent</h2>
      <p>
        Strictly necessary storage does not require consent. Functional storage (language, drafts, till codes, stay
        context) is used to provide a feature you asked for. First-party product events (QR scan, Wi-Fi reveal, map
        open) are stored with the anonymous Firebase session so we can measure whether a scanned code helped a guest. We
        do not run advertising cookies. Firebase Analytics measurement cookies are used only when a measurement ID is
        configured, and only for product metrics.
      </p>
      <p>
        Optional device permissions are separate: camera (scan) and geolocation (local time, weather, and nearby
        distances). The browser asks you. Refusing them still lets you use AirPal with stay or precinct weather and demo
        scan tiles.
      </p>

      <h2>5. How to refuse or delete</h2>
      <ul>
        <li>
          Browser settings: block cookies or clear data for airpal.me. That signs you out and removes local drafts.
        </li>
        <li>
          Safari / Chrome / Firefox / Edge each have a “cookies and site data” panel. AirPal.me will appear as a site
          you can remove.
        </li>
        <li>iOS and Android “clear website data” in the in-app browser or Chrome.</li>
        <li>
          Do Not Track: we do not follow a DNT signal because we do not run third-party ad trackers. California GPC: we
          treat a Global Privacy Control signal as a request not to sell or share — we already do not sell or share.
        </li>
      </ul>
      <p>Blocking all storage may break sign-in, stay context, and till codes. That is expected.</p>

      <h2>6. California and EU / UK</h2>
      <p>
        Cookie identifiers can be personal information. We do not sell them. We do not share them for cross-context
        advertising. EU/UK visitors: see also the <Link href="/privacy">Privacy Policy</Link> for international
        transfers (Google) and your rights of access and erasure.
      </p>

      <h2>7. Changes</h2>
      <p>
        If we add advertising, a new processor, or extra analytics cookies, we will update this page and, where
        required, ask for consent before those cookies run. Effective date: {LEGAL.updated}.
      </p>
    </LegalDoc>
  );
}
