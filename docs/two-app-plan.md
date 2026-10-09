# AirPal + AirPal Pass — two native apps, one web app

## Goal

Ship two separate native apps (iOS + Android) from the single AirPal codebase — **AirPal** (personal: plans, Me, memories) and **AirPal Pass** (tickets/events only) — while web stays one app at `https://airpal.me` serving both. One account, one identity, one booking engine, one chat engine, one Firebase project (`airpalme-app`). Binding direction: `docs/AIRPAL.md` (A1, D1, D2, G6).

## Success Criteria

- Two installable native apps with distinct store listings, names, icons, and app IDs, both signed into the same AirPal account.
- Pass app opens to Pass surfaces and contains only tickets/events/QR-entry flows; AirPal app keeps the V1 Now → Live → Done flow.
- Web at airpal.me is unchanged in scope: everything in one SPA, both surfaces reachable.
- No second user system, booking engine, or chat engine anywhere.
- `npm test` and `npm run verify` pass; each app clears its F2 exit gate before store launch.

## Approach

Single codebase, build-time flavor — not two repos, not runtime-only switching. Native requires distinct app IDs baked at build time anyway, so one Vite SPA + `shared/` + `functions/` gains a flavor flag (e.g. `VITE_APP_FLAVOR=airpal|pass`) driving app name, icon set, start route, and tab set. All product logic, engines, and backend stay shared.

Key decisions:

- **Pass app ID `me.airpal.pass`** (proposed, family-consistent with `me.airpal.app` in `capacitor.config.ts`). Finalize before Firebase app registration and store reservation; changing IDs later is expensive.
- **Pass scope = tickets & events only** (per user answer): `/pass` entry plus the existing `/events`, `/e/:id`, `/e/:id/guests`, `/ticket/:id`, `/me/tickets`, `/scan`, `/event`, and event-attached `/deals` routes (`src/app/routes.tsx`). `/pass/events`, `/pass/deals`, `/pass/tickets` redirects already exist.
- **Web unchanged**: one `dist/` build, one Firebase Hosting site (`firebase.json`). The in-flight `EcosystemSwitcher` stays as the web cross-surface switch.
- **Universal links path-scoped**: both apps share the `airpal.me` domain (WebView hostname must stay `airpal.me` for Auth/phone parity), so `apple-app-site-association` and `assetlinks.json` claim ticket/event paths for Pass and everything else for AirPal. Unscoped claiming by both apps leaves routing undefined.
- **Push per app ID**: separate FCM/APNs registrations per native app; user topics unchanged.
- **Reuse, don't fork**: in-flight ecosystem work (`EcosystemSwitcher`, `PassPage`, A1 rewrite) is the base — rebase onto it, never duplicate it.

Non-goals: second Firebase project, separate web deploys or domains, new auth system, loyalty/memberships, organiser dashboards beyond existing `/event` + `/scan` door ops.

## Steps

### Phase 0 — Rebase onto in-flight ecosystem work

- Owner: web surfaces. Coordinate with the concurrent change (uncommitted: `EcosystemSwitcher.tsx`, `PassPage` routes, `TopNav`, `NowPage`, e2e specs). Confirm `/pass` start screen and tab contract before scaffolding flavors.
- Dependency: none. Blocks: Phase A.

### Phase A — Flavor scaffold (both shells boot)

- Add flavor flag + per-flavor app name, start route (`/` for AirPal, `/pass` for Pass), and tab set scoping.
- Capacitor: parameterize `capacitor.config.ts` by flavor (or per-flavor config) + per-flavor `cap sync` scripts.
- Android: `productFlavors` in `android/app/build.gradle` with distinct `applicationId`, name, icon.
- iOS: second target/scheme in `ios/App` with distinct bundle ID, display name, icons; shared codebase.
- Per-app splash, icons, display names under existing design tokens.
- Dependency: Phase 0. Blocks: Phase B.

### Phase B — Backend registrations, links, push

- Register two Android + two iOS apps in `airpalme-app`; wire per-flavor `google-services.json` / `GoogleService-Info.plist`.
- Extend `apple-app-site-association` + `assetlinks.json` with Pass IDs and path scoping; verify `shareMeta` parity for pass paths.
- Per-app push registration; confirm one account receives notifications in both apps.
- Dependency: Phase A (IDs frozen). Blocks: Phase C.

### Phase C — Store listings and launch gates

- Second listings in `docs/store/` + `store/`: copy, icons, per-flavor screenshots (`scripts/screenshots.mjs`), data-safety answers, reviewer notes.
- Decide versioning: joint vs independent release trains.
- F1/F2 gates apply per app; Pass store launch additionally needs the G6 tickets/QR-entry loop proven on real events.
- Dependency: Phase B. Blocks: store submission.

### Phase D — Web parity check

- Confirm web still serves everything with no flavor gating; `EcosystemSwitcher` intact; prerender/SEO checks unchanged.
- Dependency: Phase A. Blocks: none.

## Validation Plan

- `npm test` and `npm run verify` green on every phase.
- Both flavors boot on simulator/emulator to the correct start screen with correct name/icon.
- One account signs into both apps; a ticket visible on web (`/me/tickets`) appears in Pass.
- Deep-link check: ticket/event URL opens Pass, plan URL opens AirPal.
- No-parallel-engines check: single booking/chat call paths serve both flavors.
- Highest-risk validation: path-scoped universal-link routing with both apps installed.

## Risks / Open Questions

- **Concurrent ecosystem edits**: another change is mid-flight in the same surfaces — coordinate to avoid forked Pass implementations.
- **Dual universal-link claiming**: must be path-scoped or routing is undefined when both apps are installed.
- **Double store cost**: two listings = two reviews, two screenshot sets, two release trains to maintain.
- **ID finality**: confirm `me.airpal.pass` before any Firebase/store registration.
- Open: Pass tab set detail; per-flavor screenshot capture runs.
- Decided: joint versioning — both flavors share `versionCode`/`versionName` from `defaultConfig` (one codebase, one train); split only if store review forces divergence.

## As-built notes (Phase A/B in-repo, October 2026)

- Flavor resolves at runtime from the native app id (`src/lib/app-flavor.ts`), with `VITE_APP_FLAVOR` as override — one `dist/` serves both shells, so `capacitor.config.ts` stays untouched.
- Android: `airpal`/`pass` product flavors + per-flavor manifests/strings; iOS: single target + `ios/App/Pass.xcconfig` (`-xcconfig` at archive time), no pbxproj fork.
- Follow-ups closed in-repo: `/deals/:id` link previews (`promotion` share card, live/approved gate), screenshots script refreshed to live routes with `--flavor=pass` support (`screenshots-pass/`), scaffold Pass icons (Android amber launcher tint, iOS `AppIcon-Pass` placeholder — final art still needed before store submission).
- Built 10 Oct 2026: Gradle `:app:assembleAirpalDebug` + `:app:assemblePassDebug` green; Xcode simulator builds green for base (no xcconfig), AirPal.xcconfig, and Pass.xcconfig. Verified identities: me.airpal.app / "AirPal" and me.airpal.pass / "AirPal Pass"; APK App Links scoped per flavor. google-services.json carries a scaffold Pass client (copied IDs; inert — web SDK + skipNativeAuth) until Firebase console regen replaces the file.
- Native compiles and e2e could not run in the sandboxed agent (no network/sockets/simulator). User-side: `cd android && ./gradlew :app:assembleAirpalDebug :app:assemblePassDebug`, Xcode archive with `Pass.xcconfig`, `npm run test:e2e:pass`.
