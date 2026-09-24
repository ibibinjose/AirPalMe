# AirPal.me — Canon (do not revert)

**Every coding agent (Grok, Claude, Gemini, Muse, Cursor, Copilot) must read this file and `AGENTS.md` before editing.**  
If a later prompt conflicts with this file on shipped chrome, auth, or identity, **this file wins** unless the human explicitly says to change the canon. For *what to build next*, follow `docs/BRAIN.md` (Brain does not override this freeze).

Last sealed: 21 September 2026. Product: AirPal.me — Life Made Easy. One marketplace engine, six eventual verticals.

---

## 0. How to start a session

1. Read `AGENTS.md` (product rules).
2. Read this file (shipped freeze).
3. Read `docs/BRAIN.md` before proposing expansion, a new vertical, Studio, or a second app (binding on what to build next).
4. For marketplace work, read `.grok/skills/airpal-build/references/build-checklist.md` and `references/surfaces.md`.
5. For store/native, read `docs/store/README.md` and `docs/store/app-information.md`.
6. Smallest change that solves the request. Do not rewrite the stack, restyle the app, or delete a shipped surface.

Mobile keyboard: Capacitor `Keyboard.resize` is `none`. `src/lib/keyboard.ts` locks `#root` to the visual viewport and scrolls the focused field above the keyboard. Do not switch back to `resize: body` without re-testing iOS/Android forms.

iOS Xcode: 0 errors is shippable. Two yellow deprecations in `@capacitor-firebase/authentication` (`fetchSignInMethods`, native `updateEmail`) are upstream; AirPal does not call them. Do not patch the plugin to silence them. Notes: `docs/store/ios-compiler-warnings.md`.

---

## 1. Stack freeze

Keep: **Vite SPA + React + TypeScript + Tailwind v4 + Lucide + Firebase (Auth, Firestore, Storage, Functions us-central1) + Capacitor 8** (`me.airpal.app`).

Do **not**: migrate to Next.js, App Router, shadcn, a second user system, a second booking engine, or a new CSS framework.

Canonical Firebase project: **`airpalme-app`**. Production web: **https://airpal.me** (classic Hosting, `webDir` dist). Ignore App Hosting backend `airpalme` and sibling Studio projects.

Shared types: `shared/`. Callables: `functions/src/` + `src/lib/functions.ts`. Privileged writes stay on Functions. Never weaken `firestore.rules`.

Gate before ship: `npm run verify`. Native after web build: `npm run cap:sync`.

Sydney calendar dates: `toZonedDateStr` / `useLocalNow`. Never `new Date().toISOString().slice(0,10)` for “today”.

---

## 2. Style freeze

Tokens live in `src/index.css` `@theme`. Do not invent a new palette.

| Token | Value | Use |
| --- | --- | --- |
| `--color-brand` | `#1805db` | AirPal Blue — primary CTA, links, active |
| `--color-brand-ink` | `#0e0394` | Pressed / dark brand |
| `--color-gold` | `#1805db` | Eyebrow labels (same hue as brand) |
| `--color-paper` | `#eef1f6` | Page mist — cards float on it |
| `--color-card` | `#ffffff` | Cards |
| `--color-ink` | `#121614` | Text |
| `--color-mute` | `#6a726c` | Secondary text |
| `--color-line` | `#e5e7eb` | Rings / hairlines |

Fonts: **DM Sans** (UI), **Outfit** (display). Self-hosted in `public/fonts/`. No Google Fonts CDN.

Cards: white on mist, `bg-card ring-1 ring-line` plus `--shadow-clay`, radius about 28px. Not clay blobs, not childish. Touch targets ≥ 44px. Mobile dock: light floating pill, brand capsule on the active tab, `pb-safe`. Desktop: `lg:grid-cols-12` where those screens already use it.

Reuse `Button`, `ValidField`, `Photo`, `ImageField`. Do not drop in a new component library.

Words: `shared/names.ts` — Place, Your place, Add your place, Stay, Stay host, Plans, Circle, Account, Scan, Explore. Do not relabel chrome to venue / hub / portal.

Partner account (`NAMES.partnerAccount`, `partnerAccountPath`) is the same AirPal login plus a live place. Guests find that place on What's on and in search. It is not a second app or a second user. Personal `@handle` stays a person.

Brand: **AirPal.me** (the `.me` stays). Tagline **Life Made Easy.** Script logo is accent only.

---

## 3. Shipped chrome (do not replace)

Bottom tabs, in this order: **Home** (`/`) · **Explore** (`/explore`) · **Trips** (`/plan`) · **Inbox** (`/me/inbox`) · **Me** (`/me`). Circle + EventCreate live under Trips (`/circle`, `/event/new`). Mate is `/mate`, **not** a tab. Scan is not a tab — it lives behind the global **+ Create** action (`CreateFab`) and Home quick actions. Stay (`/concierge`) lives inside Explore/Home, not as a tab.

Mapping: `src/lib/tabs.ts`, `src/components/layout/TabBar.tsx`. Global create: `src/components/design-system/CreateFab.tsx` (rendered by `AppShell`).

Changed 22 September 2026 at the human's explicit request (companion redesign: Home/Explore/Trips/Inbox/Me + one + Create action, all existing routes preserved). `AGENTS.md` §3 IA now matches the shipped dock. Add Mate/Fashion as routes, not extra tabs, unless the human asks.

---

## 4. Auth and identity (do not revert)

| Surface | Rule |
| --- | --- |
| Website | Guests browse Stay / Explore / Scan / plans without an account. |
| Native iOS/Android | Account required. `NativeAuthGate` + `NativeOpenScreen`. Public paths only: `/start`, `/privacy`, `/terms`, `/cookies`, `/contact`, `/about`, `/legal`, `/auth/action`, `/getAirPalApp`. |
| Sign-in | Email+password, phone SMS, phone+password, Google, Apple. Native social: `@capacitor-firebase/authentication` with `skipNativeAuth: true` then JS credential. |
| Profiles | Personal `@handle` is a person. Business is a separate profile on the same account. Google listing import is **business only**. |
| Persistence | Account bios (name, photos, Instagram/Facebook/X/website links, catalog) live in Firestore `profiles` + `handles` via `persistOwnedProfile`. |
| Stay scan exception | Guest Stay session is **this device only** (`airpal.stay` in sessionStorage). Do not put Stay scan keys in the personal bio. |
| Age | Accounts are **18+**. |
| WebView origin | `https://airpal.me` (`capacitor.config.ts` hostname + https schemes). |

After native sign-in, land on `/` unless `next` / role overrides. Website default after sign-in remains `/circle` unless overridden.

---

## 5. All cases of the app (shipped)

Reuse these. Do not add a parallel page for the same job.

### Anyone (web guest)

| Case | Path |
| --- | --- |
| What's on / home | `/` `DiscoverPage` |
| Plan hub | `/plan` |
| Create / view / edit plan | `/plan/new`, `/plan/:id`, `/plan/:id/edit`, `/invite/:code` |
| Scan QR | `/scan` |
| Stay concierge | `/concierge`, `/stay`, `/g/:id` |
| Demo Hotel stay QR showcase | `/DemoHotel` |
| Marker / campus | `/q/:id`, `/c/:id` |
| Calendar / events | `/calendar`, `/e/:id`, `/event/new` |
| Places / experiences | `/p/:id`, `/experiences` |
| Public bio | `/@handle` |
| Join | `/join` |
| Get the app | `/getAirPalApp` |
| Legal | `/privacy` `/terms` `/cookies` `/contact` `/about` |
| Wave | `/w/:id`, `/wave` |

### Signed-in person

| Case | Path |
| --- | --- |
| Account / Me | `/me` |
| Claim / edit bio | `/bio/setup`, `/bio/edit` |
| Circle | `/circle` |
| Inbox / settings | `/me/inbox`, `/settings` |
| Zoo / memories / people | `/me/zoo`, `/me/memories`, `/me/people` |
| Start / auth | `/start` |

### Business

| Case | Path |
| --- | --- |
| Register / onboard | `/business/onboard` |
| Add 3 things | `/business/setup` |
| Dashboard | `/business` |
| Campaigns / promotions | `/business/campaigns`, `/business/promotions` |
| Google import | `GooglePlaceImportCard` on onboard + `/business` only |

### Stay host

| Case | Path |
| --- | --- |
| Host workspace | `/host` |
| Stay guest (QR) | `/g/:propertyId` — session on device |

### Mate (off chrome)

| Case | Path |
| --- | --- |
| Demand | `/mate`, `/mate/request` |
| Supply apply | `/companion` |
| Admin approve | `/admin` Companion admin |

### Platform

| Case | Path |
| --- | --- |
| Admin | `/admin` |
| Giveaways / promotions | `/giveaways`, `/promotions` |
| Fashion (copy, not P2P store) | `/fashion` |
| Studio lead | `/studio` |

Route table source of truth: `src/app/routes.tsx`.

---

## 6. Marketplace rules (do not invent a second engine)

- One account. One `bookings` engine (`shared/booking.ts`). One fee config (`platform_settings/marketplace`). Never hard-code commission percents.
- No raw cards. Stripe Checkout + Connect. No IAP.
- No opaque compatibility scores.
- Messaging is tied to match / booking / plan — no phone/email in the thread by default.
- Safety: report, block, admin cases. Never claim AirPal guarantees personal safety.
- Seeds are migration sources, never fake live supply.

---

## 7. Native / store freeze

- App ID `me.airpal.app`. Marketing version **2.0.0**.
- iOS `CURRENT_PROJECT_VERSION` **13**. Android `versionCode` **7**. TestFlight must use **2.0.0**, never 1.0.
- Apple Team `26WGXSNG58` (ZEN KAPITAL PTY LTD). Legal copy: SarvamDaily Pty Ltd t/a AirPal.Me, ABN 83 702 462 977.
- Location: when-in-use only. Info.plist **must** keep both `NSLocationWhenInUseUsageDescription` and `NSLocationAlwaysAndWhenInUseUsageDescription` (Capacitor SDK). Do **not** add `UIBackgroundModes` location.
- NFC entitlements: **TAG only**, never NDEF (App Store rejects NDEF on this SDK).
- Store paste: `docs/store/app-information.md`, `listing.md`, `reviewer-notes.md`, `play-data-safety.md`.

---

## 8. Do not revert (explicit)

Do not undo these without the human naming them:

- Native login gate + opening screen
- Website guest browse
- Personal vs business identity; Google import on business only
- Firestore profile persist (`persistOwnedProfile`, `hydrateOwnedBios`)
- Five-tab companion dock (Home / Explore / Trips / Inbox / Me) + global + Create action (Scan lives there, not as a tab)
- Capacitor origin `airpal.me`
- Sign in with Apple + Google on native
- Stay scan session as device-only
- AirPal Blue `#1805db` and DM Sans / Outfit
- Vite + Firebase + Capacitor stack
- 18+ accounts

---

## 9. How the canon may change

Only when the human says to change the canon, the stack, the tabs, the brand, or to drop a shipped surface. Then update **this file in the same PR/change** as the code.

Agents must not “simplify” by deleting verticals, restyling from tokens, or gating the website.
