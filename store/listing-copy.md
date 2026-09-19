# AirPal — store listing copy

App name: **AirPal** · Subtitle (iOS, max 30 chars): `Scan. Discover. Stay.`
Bundle IDs: iOS `me.airpal.app` (confirm in Xcode) · Android `me.airpal.app`
Category: Travel (primary) · Content rating: 4+ / Everyone · Privacy: https://airpal.me/privacy

## iOS keywords (max 100 chars incl. commas)

```
hotel guide,qr concierge,local events,city walks,guest wifi,stay companion
```

Count: hotel guide(11)+qr concierge(12)+local events(12)+city walks(10)+guest wifi(10)+stay companion(14)+commas(5) = 74. Room to add `markets,nightlife` if needed.

## Play short description (max 80 chars)

```
Scan a place. See what's around — no account, no download.
```

(62 chars.)

## Full description (both stores)

```
AirPal is the guest concierge and local guide that starts with a scan.

Staying somewhere? Point your camera at the room or lobby QR and your stay
opens instantly: Wi-Fi details, breakfast hours, checkout, facilities —
answered on the spot.

Exploring? Discover laneway dining, night markets, live sessions and
self-guided harbour walks near you, then save the ones you love.

Planning with friends? Build a night-out plan together, from rooftop drinks
to the last train home.

Hosts, venues and campuses: print one QR and give every guest a concierge.
No hardware, no app install for your guests.

• No account, no download for guests — the browser is enough
• Native iOS and Android apps for hosts and regulars
• Works offline for essentials once opened
• Private by design: anonymous guest sessions

Download AirPal — scan a place, see what's around.
```

## What's new (v2.0)

```
Live local map on Stay, Open now / Closed from real hours, and Tonight that
matches today — not last weekend’s markets. Time and weather follow your
stay (or GPS if you allow it).
```

## Promo text (iOS, 170 chars, editable without review)

```
New: live Stay map, tonight that matches today, and weather on your local clock. Scan a QR to start — no account.
```

## Review notes (both stores)

```
Guest demo (no login needed): open the app, tap Scan, or visit /concierge
for the stay demo and /guide for walks. Host demo: /start. All guest
features work anonymously; no account is required to evaluate the app.
```

## Asset map (this repo, `store/`)

| Asset                                           | File                                     | Size      |
| ----------------------------------------------- | ---------------------------------------- | --------- |
| iOS 6.9" screenshots (4)                        | `screenshots/ios-6.9/01..04-*.jpg`       | 1320x2868 |
| iOS 6.7" screenshots (4)                        | `screenshots/ios-6.7/01..04-*.jpg`       | 1290x2796 |
| iOS 5.5" screenshots (4)                        | `screenshots/ios-5.5/01..04-*.jpg`       | 1242x2208 |
| Android phone screenshots (4)                   | `screenshots/android-phone/01..04-*.jpg` | 1080x1920 |
| Play feature graphic                            | `feature-graphic-1024x500.png`           | 1024x500  |
| Play hi-res icon (flattened, no alpha risk)     | `icons/icon-512-flat.png`                | 512x512   |
| iOS app icon (in Xcode asset catalog, no alpha) | `ios/.../AppIcon-512@2x.png`             | 1024x1024 |

To replace these designed previews with real captures later, run
`node scripts/capture-store-shots.mjs` on a machine that can serve the app
(it needs localhost sockets + a Playwright browser).
