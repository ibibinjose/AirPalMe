# Reviewer notes (paste into App Store Connect / Play Console)

**App:** AirPal (`me.airpal.app`) 2.0.0 (iOS build 13)  
**Seller:** SarvamDaily Pty Ltd trading as AirPal.Me · ABN 83 702 462 977  
**Apple Team:** ZEN KAPITAL PTY LTD (`26WGXSNG58`)  
**Support:** AirPalMe@gmail.com · hello@airpal.me  
**Privacy:** https://airpal.me/privacy · Terms: https://airpal.me/terms

## How to review (sign-in required on iOS/Android)

The native app opens on a branded screen and requires an account. Create one in the app — no demo login is needed.

1. Open AirPal.
2. Tap **Continue with Apple**, **Continue with Google**, or **Create a free account**.
3. Email signup: password 8+ characters with a letter and a number. Phone SMS: use a Firebase test number if you cannot receive SMS.
4. After sign-in you land on home (What do you need? / What’s on).

Website https://airpal.me still browses without an account. Privacy and Terms are reachable from the opening screen before sign-in.

## Account deletion (Guideline 5.1.1)

Signed in → Settings → Delete account → type DELETE. This removes the login immediately and records a deletion request. You may also email AirPalMe@gmail.com.

## Sign in with Apple / Google

Both are offered on the opening screen. Sign in with Apple uses the system sheet. Google uses the Google account picker.

## Payments

No in-app digital goods and no IAP. Bookings for real-world experiences checkout with Stripe (card). Guests are not charged to create an account.

## Permissions (all optional after sign-in)

- **Camera:** Scan — place QR, stay key, event pass, Wave. You can type a code instead.
- **Location (when in use):** nearby places, plans, events. Not a home address. Deny → pick a city.
- **Photos:** profile, plan, or listing image you pick.
- **NFC:** optional Wave greeting.
- **Bluetooth (Android):** optional Wave scan. iOS does not request Bluetooth.
- Never requested: microphone, contacts, always-on location, tracking, advertising ID.

## Content

User-generated listings, plans, and reviews. Report/block is in the profile menu and match chat. 17+ / 18+.

## Demo

No demo login. Create an account, review, then delete it from Settings when finished.
