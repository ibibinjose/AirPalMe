# Wallet Passes (Apple + Google) — AirPal Pass & AirPal.Me

Status: Apple signer is `pass.me.airpal.wallet` (team `26WGXSNG58`).
The Pass Type ID certificate and encrypted key are Functions secrets;
`walletPass` must be redeployed after any secret change because
Functions pin secret versions at deploy time. Google uses the
`wallet-passes` service account. `GOOGLE_WALLET_ISSUER_ID` is `3388000000023208916`
(configured in Google Pay & Wallet Console).

## Ecosystem Integration

- **AirPal Pass:** Event tickets, festival passes, and member vouchers booked on AirPal Pass
  render in the digital Passbook (`/me/tickets` and `/pass`) and sync to Apple Wallet and Google Wallet.
- **AirPal.Me:** Personal identity cards from `/@handle` can also be added to Apple Wallet / Google Pay
  for quick offline contact sharing.

## Pass design (both wallets)

Luma-style event ticket on AirPal Blue (`#1805db`), white text,
"AirPal Pass" / "AirPal.Me" branding: date/time header, big event title, LOCATION row,
GUEST + HOST row, QR barcode of the same gate URL as the on-screen
ticket (`/e/:id?ticket=`, `/plan/:id?ticket=`, or `/ticket/:id`).
Profile cards read `name` and `shortWhy` (city on the front when set),
QR to the profile URL.

## Apple Wallet

- Client: `src/lib/wallet.ts` builds `/api/wallet/ticket/:id.pkpass` and
  `/api/wallet/card/:handle.pkpass`, HEAD-preflights, then navigates so iOS
  opens the native Add-to-Wallet sheet.
- Server: `functions/src/wallet.ts` (`walletPass`, rewrites in
  `firebase.json`) loads the booking/profile from Firestore, builds an
  event-ticket or generic pass with `passkit-generator`, signs it with the
  brand Pass Type ID certificate, and serves
  `application/vnd.apple.pkpass`.
- Status contract: `200` signed pass · `404` unknown booking/handle ·
  `501` signer not configured · `500` signing failed (logged, no leak).

### Apple one-time setup (needs the Apple Developer account holder)

1. Apple Developer → Certificates, Identifiers & Profiles → Identifiers →
   create a **Pass Type ID** (e.g. `pass.me.airpal.wallet`).
2. Create a **Pass Type ID certificate** for it, download the `.cer`,
   double-click to install into Keychain.
3. Keychain → export the certificate **with its private key** as `.p12`.
4. Split the `.p12` into PEM (never commit these):
   `openssl pkcs12 -in airpal.p12 -clcerts -nokeys -out signer-cert.pem`
   `openssl pkcs12 -in airpal.p12 -nocerts -nodes -out signer-key.pem`
5. Store as Functions secrets (values, not files):
   `firebase functions:secrets:set WALLET_PASS_TYPE_ID` (= `pass.me.airpal.wallet`)
   `firebase functions:secrets:set WALLET_TEAM_ID` (= 10-char Team ID)
   `firebase functions:secrets:set WALLET_SIGNER_CERT` (= signer-cert.pem contents)
   `firebase functions:secrets:set WALLET_SIGNER_KEY` (= signer-key.pem contents)
   `firebase functions:secrets:set WALLET_KEY_PASSPHRASE` (= p12 export password, if any)
6. `firebase deploy --only functions:walletPass` and test:
   `curl -I https://airpal.me/api/wallet/ticket/<liveBookingId>.pkpass`
   → `200` + `application/vnd.apple.pkpass`. Then open the URL on an iPhone.

### Apple notes

- The Apple WWDR G4 intermediate is public and embedded in
  `functions/src/wallet.ts` (expires Dec 2030 — refetch from Apple PKI when
  rotating).
- The pass icon is `public/favicon-32.png`, embedded as base64. To change
  it, swap the file and re-embed.
- Emulator: secrets fall back to `process.env` (`WALLET_*`), so local pass
  generation works with the PEM files exported above.

## Google Wallet

- Client: `src/lib/wallet.ts` fetches `/api/wallet/google/ticket/:id` or
  `/api/wallet/google/card/:handle` (`{ saveUrl }` JSON) and opens the
  `pay.google.com/gp/v/save/` link, which installs the pass. Buttons sit
  next to the Apple buttons on tickets (`AirPalTicketPass`) and business
  cards (`BioShareModal`).
- Server: `functions/src/google-wallet.ts` (`googleWalletPass`) loads the
  same booking/profile data, builds an EventTicket (tickets) or Generic
  (cards) class + object in one JWT, and signs it RS256 with the
  service-account key. Class and object travel together, so no
  pre-provisioning is needed beyond the issuer.
- Status contract: `200` `{ saveUrl }` · `404` unknown booking/handle ·
  `501` service account not configured · `500` signing failed (logged).

Google Wallet API is enabled on `airpalme-app`. The service account
`wallet-passes@airpalme-app.iam.gserviceaccount.com` is granted Developer access
on issuer `3388000000023208916`, and `GOOGLE_WALLET_ISSUER_ID` is stored in
Secret Manager. The `googleWalletPass` endpoint mints live signed save links.

### Google one-time setup (needs a Google Cloud owner)

1. Create (or pick) a Google Cloud project → enable the **Google Wallet API**.
2. Google Pay & Wallet Console → create a **Wallet issuer account** for the
   project; note the **Issuer ID** (digits).
3. Cloud Console → IAM & Admin → Service Accounts → create one (e.g.
   `wallet-passes`) → grant nothing extra → create a **JSON key**, download
   it (never commit this file).
4. Store as Functions secrets:
   `firebase functions:secrets:set GOOGLE_WALLET_ISSUER_ID` (= Issuer ID)
   `firebase functions:secrets:set GOOGLE_WALLET_SA_JSON` (= whole key-file JSON)
5. `firebase deploy --only functions:googleWalletPass` and test:
   `curl https://airpal.me/api/wallet/google/ticket/<liveBookingId>`
   → `200` + `saveUrl`. Open the URL on Android (or any signed-in Chrome).
6. Before public launch, request production access in the Wallet Console
   (demo mode works for test accounts until then).

### Google notes

- Pass datetimes use the stored local date/time with `Australia/Sydney`
  attached; Sydney is the product beachhead, so this is honest, not a guess.
- Object ids are sanitized to Wallet-safe characters; booking ids and
  handles already qualify.
- Emulator: secrets fall back to `process.env` (`GOOGLE_WALLET_*`).
