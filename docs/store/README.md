# AirPal store submission pack

App: **AirPal** · ID `me.airpal.app` · version 2.0.0 (iOS build 2, Android versionCode 2)
Legal entity: **SarvamDaily Pty Ltd** trading as **AirPal.Me** · ABN **83 702 462 977** · Apple Team ID **26WGXSNG58**
Web: https://airpal.me · Privacy: https://airpal.me/privacy · Terms: https://airpal.me/terms · Contact: https://airpal.me/contact
Support email: hello@airpal.me (forwards to the operator inbox — see `docs/email-setup.md`)

## What Apple review / Play review will check

- Sign-in works without a prior account: email, phone (SMS), and anonymous QR-guest sessions. No OAuth in the app, so no external-login headaches.
- Camera permission → QR deal-scan and photo upload. Location permission → nearby stays and business locate-me. Photo library → profile/venue photos.
- Paid paths are real-world services only: experience bookings and stay food orders check out with Stripe card payment (live when `STRIPE_SECRET_KEY` is set, sandbox otherwise). No digital goods or in-app currency, so no in-app-purchase conflict — still, re-read both stores' payments policies before release.
- Reviewer path (no demo account needed): open the app → continue as guest (Scan/Start works with no account). Host features need any email account; food ordering works in sandbox mode. Account deletion: Settings → Delete account (type DELETE), or hello@airpal.me. Paste `docs/store/reviewer-notes.md` into the review notes field.
- Content: user-generated venues, plans, and reviews. Safety tooling in-app: safety reports, blocks, manual claim review, admin audit log.

## Data safety (Play) / privacy labels (App Store) — fill verbatim

| Data | Collected? | Why (in-app wording for the reviewer) |
|---|---|---|
| Precise location | Yes, optional | Nearby stays, locate-my-business. Runtime prompt, per-use. |
| Photos / camera | Yes, optional | QR deal scan, profile and venue photos. |
| Email, phone, name | Yes | Account sign-in and booking contact. |
| App activity (taps, claims, RSVPs) | Yes | Core features: vouchers, plans, analytics in `admin_audits`. |
| Purchase history (order/booking totals) | Yes | Experience bookings + stay food orders. Card numbers never touch the app — Stripe processes payment. |
| Contacts | No | Never requested. |
| Data is encrypted in transit (HTTPS + HSTS) and users can request deletion via Contact/support email. Data is not sold. |

## Needs-you (cannot be done from this checkout)

1. **Play App Signing SHA-256** → paste into `public/.well-known/assetlinks.json` (replacing `REPLACE_WITH_PLAY_APP_SIGNING_SHA256`), redeploy hosting.
2. **Apple Team ID** → `26WGXSNG58` is in `apple-app-site-association`. Redeploy hosting after any change. Universal Links then verify automatically.
3. **Screenshots + feature graphic + descriptions** → `docs/store/listing.md` has the copy; upload in Play Console / App Store Connect yourself.
4. **Signing & upload** → run these on your Mac (builds need your keychain/keys; they cannot run in a sandboxed agent):
   ```sh
   npm run build && npx cap sync
   cd android && ./gradlew :app:bundleRelease   # → app/build/outputs/bundle/release/app-release.aab
   ```
   Upload the AAB to Play Console (first upload uses your keystore; Play App Signing after that). iOS: `npx cap open ios`, pick your Team (automatic signing already on), Product → Archive → Distribute to App Store Connect. Then fill the SHA-256/Team-ID placeholders (items 1–2) and redeploy hosting so App Links verify.
5. **Questionnaires** → content-rating (17+ App Store / Mature 18+ Play — the app is 18+ only), ads declaration (none), data-safety form (answers above).

## Store images

| Asset | Status | File |
|---|---|---|
| App Store icon 1024×1024, flattened RGB (no alpha) | Ready | `docs/store/images/app-store-icon-1024.png` |
| Play icon 512×512 | Ready | `public/icon-512.png` |
| Feature graphic 1024×500 | Ready | `docs/store/images/play-feature-graphic-1024x500.png` |
| Promo page `airpal.me/getAirPal` (badges, QR, share) | Live in app | `src/pages/GetAirPalPage.tsx` |
| Phone screenshots (1080×1920, 1290×2796, 1320×2868 = 6.9", 1242×2688 = 6.5") + tablets (2064×2752 iPad, 1920×1200 Play) — Start, Discover, Plan, Experiences, Solutions, Giveaways, Promotions, getAirPal | Run on your Mac | `npm run screenshots` → `docs/store/images/screenshots/` (cold/guest state — sign-in-gated screens capture their auth gate, so shoot Circle/Host by hand if you want them) |
| Marketing poster 1080×1350 (social/store creative) | Run on your Mac | `npm run screenshots` → `docs/store/images/marketing-poster-1080x1350.png` |

## Promotion images (giveaways & campaigns)

Campaigns use their own `heroImage` when set. Otherwise cards and detail pages
fall back to the bundled Kerala set via `promoArtFor()` in `src/lib/promotions.ts`:
Stays→`room.jpg`, Experiences→`walk.jpg`, Travel→`harbour.jpg`,
Local→`laneway.jpg`, Events→`campus.jpg`, AirPal→`og-share-preview.jpg`.
Demo seeds ship with real art. Food/Fashion/Family/Lifestyle keep the gradient
card until you add photos to `public/media/`.

## Push notifications (web + native)

- Web push works once `VITE_FIREBASE_VAPID_KEY` is set: users tap the bell →
  Turn on push → FCM token stored at `users/{uid}/fcmTokens`. Transactional
  mail always pushes; marketing kinds (`giveaway_launched`,
  `promotion_ending_soon`) are skipped when the user opted out.
- Native push (iOS/Android) needs one Mac step:
  `npm i @capacitor/push-notifications && npx cap sync`
  (APNs key / FCM config per Capacitor docs). The app already registers and
  saves native tokens through the same `fcmTokens` collection — no code change.
- NFC in the native app needs one Mac step: install any maintained
  `capacitor-nfc` fork (they share `isSupported`/`startScan`/`writeNDEF`),
  `npx cap sync`, and add the NFC tag-reading entitlement
  (`com.apple.developer.nfc.readersession.formats`) to the App target in Xcode.
  The usage string is already in `Info.plist` and Android already declares the
  NFC permission as `required=false`. `src/lib/nfc.ts` shape-checks the plugin
  at runtime — no code change. Web NFC on Android Chrome works with no plugin.

## In-repo status (done)

- Web PWA: manifest, 192/512 icons, apple-touch-icon, offline page, service worker, no-cache for `sw.js`, immutable assets, full CSP/HSTS headers — `firebase.json`.
- Deep links: Android App Links intent-filter (autoVerify) + iOS `applinks:airpal.me` entitlement; verification files staged under `public/.well-known/` with correct Content-Type headers.
- Android: `ACCESS_COARSE/FINE_LOCATION` (runtime-prompted), camera `uses-feature required=false` so camera-less devices aren't filtered. No `google-services.json` needed — Firebase runs through the web SDK, no native push plugin.
- iOS: bundle id, 2.0.0 (2), camera/photo/location/NFC usage strings, `ITSAppUsesNonExemptEncryption`, associated domains, automatic signing, `PrivacyInfo.xcprivacy` (tracking off; UserDefaults/file-timestamp/boot-time/disk-space reasons declared) wired into the Xcode project.
