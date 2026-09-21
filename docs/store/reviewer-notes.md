# Reviewer notes (paste into App Store Connect / Play Console)

**App:** AirPal (`me.airpal.app`) 2.0.0  
**Seller:** SarvamDaily Pty Ltd trading as AirPal.Me · ABN 83 702 462 977  
**Support:** AirPalMe@gmail.com · hello@airpal.me

## How to review without an account

Open the app and stay a guest. Home, Discover, Stay/Concierge, Scan, Events, and Experiences browse without sign-in.

## Sign-in (optional features)

Settings or Start → Create account (email + password, 8+ characters with a letter and a number) or Sign in. Phone SMS uses Firebase test numbers if you cannot receive SMS.

## Account deletion (Guideline 5.1.1)

Signed in → Settings → Delete account → type DELETE. This removes the login immediately and records a deletion request.

## Payments

No in-app digital goods. Bookings for real-world experiences may show as unpaid until Stripe checkout is live. Guests are not charged to browse.

## Permissions (all optional — deny and the app still browses)

- **Camera:** Scan tab — place QR, stay key, event pass, Wave. Guest browse works without it (type a code).
- **Location (when in use):** nearby places, plans, events. Not a home address. Deny → pick any city in the location pin.
- **Photos:** profile, plan, or listing image you pick. Not required to browse.
- **NFC:** optional Wave greeting. No NFC hardware required.
- **Bluetooth (Android):** optional Wave scan. iOS does not request Bluetooth.
- Never requested: microphone, contacts, always-on location, tracking.

## Content

User-generated listings, plans, and reviews. Report/block is in the profile menu and match chat.

## Demo

No demo login required. If you create an account, delete it from Settings when finished.
