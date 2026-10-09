# Permissions for Web, iOS, and Android

AirPal only asks for access it actually uses. Microphone, contacts, always-on location, and Face ID are **not** requested.

App IDs: `me.airpal.app` (AirPal) · `me.airpal.pass` (AirPal Pass) · Team: `26WGXSNG58`

## What the app uses

| Access                    | Why                                                    | Web                                                 | iOS                                                           | Android                                                        |
| ------------------------- | ------------------------------------------------------ | --------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------- |
| Camera                    | Scan QR (Stay keys, places, Wave)                      | `getUserMedia` + Permissions-Policy `camera=(self)` | `NSCameraUsageDescription`                                    | `CAMERA` (`required=false`)                                    |
| Location (when in use)    | Nearby places, plans, events. Suburb, not home address | Geolocation + `geolocation=(self)`                  | `NSLocationWhenInUseUsageDescription` + `NSLocationAlwaysAndWhenInUseUsageDescription` (Capacitor SDK requires the Always key even though AirPal does not request background location) | `ACCESS_COARSE/FINE_LOCATION` + GPS feature `required=false`   |
| Photos                    | Profile, plan, listing images you pick                 | `<input type=file accept=image/*>`                  | Photo library usage + add                                     | System picker on 13+; `READ_EXTERNAL_STORAGE` maxSdk 32        |
| NFC                       | Wave greeting (optional)                               | Web NFC (Android Chrome)                            | NFC usage string + NDEF entitlement                           | `NFC` + NDEF intent for `/w/`                                  |
| Bluetooth LE              | Wave scan (Android only; iOS Safari cannot advertise)  | `bluetooth=(self)`                                  | Not declared (no Web Bluetooth in WKWebView)                  | `BLUETOOTH_SCAN` (neverForLocation), `CONNECT`, `ADVERTISE`    |
| Haptics                   | Button feedback                                        | `navigator.vibrate`                                 | Capacitor Haptics                                             | `VIBRATE`                                                      |
| Share / Maps / tel / mail | Open Maps, share a plan, call a venue                  | OS share sheet / https                              | `LSApplicationQueriesSchemes`                                 | `<queries>` VIEW/DIAL/SENDTO                                   |
| Deep links                | Open `airpal.me` plans, places, Wave in the app        | Hosting                                             | Associated domains                                            | App Links `autoVerify`                                         |
| Notifications             | Web push (FCM) when signed in                          | Notification permission                             | Native APNs **not** wired yet                                 | `POST_NOTIFICATIONS` **not** declared until native push plugin |

Not declared on purpose: microphone, contacts, calendar database, always/background location, motion, speech, tracking (ATT).

## iOS files

- `ios/App/App/Info.plist` — usage strings, URL schemes `airpal` / `me.airpal.app`, query schemes
- `ios/App/App/App.entitlements` — `applinks:airpal.me`, `www.airpal.me`, `airpalme-app.web.app`; NFC TAG (NDEF is disallowed on iOS 17+ / SDK 27)
- `ios/App/App/PrivacyInfo.xcprivacy` — no tracking; location, photos, email, phone, name, user ID, device ID, product interaction, purchase history (app functionality)

Enable **Near Field Communication Tag Reading** on the App ID in Apple Developer if Wave NFC should work on iPhone. Signing fails without that capability.

Do **not** add Push Notifications capability until `@capacitor/push-notifications` is installed.

## Android files

- `android/app/src/main/AndroidManifest.xml` — permissions, optional hardware, App Links, custom schemes, Wave NFC filter
- Play Data safety: precise location optional; photos optional; email/phone/name; app activity; purchase history via Stripe (no card numbers in-app)

Paste Play App Signing SHA-256 into `public/.well-known/assetlinks.json` before store review.

HTTPS only (`network_security_config.xml`). Advertising ID permission is removed (`AD_ID`). Play Data safety answers: `docs/store/play-data-safety.md`. Reviewer paste: `docs/store/reviewer-notes.md`.

## Web / PWA

- `public/manifest.json` — standalone, icons, shortcuts
- `firebase.json` Permissions-Policy: camera, geolocation, bluetooth, fullscreen, clipboard-write; microphone/display-capture/usb off
- CSP already allows Maps, Firebase, Nominatim, Open-Meteo
- `public/.well-known/apple-app-site-association` and `assetlinks.json`

## After changing native files

```sh
npm run build && npx cap sync
```

Then archive in Xcode / bundle an AAB. Usage strings must match the App Store / Play questionnaires.
