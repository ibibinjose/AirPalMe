# Reviewer notes — AirPal Pass (paste into App Store Connect / Play Console)

**App:** AirPal Pass (`me.airpal.pass`) 2.0.0  
**Seller:** SarvamDaily Pty Ltd trading as AirPal.Me · ABN 83 702 462 977  
**Apple Team:** ZEN KAPITAL PTY LTD (`26WGXSNG58`)  
**Support:** AirPalMe@gmail.com · hello@airpal.me  
**Privacy:** https://airpal.me/privacy · Terms: https://airpal.me/terms

Same AirPal account as the AirPal app — one account, tickets everywhere.

## How to review (sign-in required on iOS/Android)

The native app opens on a branded screen and requires an account — same gate as the AirPal app (`NativeAuthGate`; only legal/onboarding paths are public). Create one in the app — no demo login is needed.

1. Open AirPal Pass — after sign-in you land on Pass (events, deals, passbook).
2. Sign in: **Continue with Apple**, **Continue with Google**, or email.
3. Email signup: password 8+ characters with a letter and a number.
4. Tap **Open Wallet** or any **Get Pass** flow to hold a pass.

Website https://airpal.me shows the same events and browses without an account. Privacy and Terms are reachable before sign-in.

## Account deletion (Guideline 5.1.1)

Signed in → Settings → Delete account → type DELETE. This removes the login immediately and records a deletion request. You may also email AirPalMe@gmail.com.

## Sign in with Apple / Google

Both are offered wherever sign-in is requested. Sign in with Apple uses the system sheet. Google uses the Google account picker.

## Payments

No in-app digital goods and no IAP. Paid tickets are real-world event entry and check out with Stripe (card).

## Permissions (all optional)

- **Camera:** door scanner for event check-in. You can type a code instead.
- **Location (when in use):** nearby events. Deny → pick a city.
- Never requested: microphone, contacts, always-on location, tracking, advertising ID.

## Content

Event listings and deals from organisers and local businesses. 17+ / 18+.

## Demo

No demo login. Create an account, hold a pass, review, then delete it from Settings when finished.
