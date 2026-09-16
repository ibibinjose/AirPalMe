# AirPal.me — App Mind Map, Review & Improvement Plan

Source of truth for structure: `src/app/routes.tsx`, `src/App.tsx`, `src/app/providers.tsx`, `src/pages/*`, `src/contexts/*`, `shared/*`, `functions/src/index.ts`, `docs/analytics-event-dictionary.md`.
North-star: **WQGA/Context** (weekly qualified guest actions ÷ active QR contexts).

## 1. Mind map (full app)

```
AirPal.me (scan-first guest concierge + precinct guide, no account for guests)
│
├── SHELL (every route shares this)
│   ├── AppShell + AppRoutes (wouter, lazy-split; `/` eager)
│   ├── Providers (order matters): Locale → Auth → Sync → Stay → LocalNow → StayUi
│   │   → Listings → Events → Social → Bio → Club → Zoo → Plan → Companion
│   ├── Cross-cutting: ErrorBoundary, Toaster, ZooLayer, SignInPrompt, ScrollProbe
│   ├── LocalNow clock (src/contexts/LocalNowContext.tsx): today/time/day/timeZone/city,
│   │   `here` (GPS else stay/precinct), `anchor` (stay pin). Weather (Open-Meteo at `here`).
│   ├── Maps: @vis.gl/react-google-maps, key VITE_GOOGLE_MAPS_API_KEY (build-time),
│   │   fallback = map embed, never dev card on guest surfaces
│   └── Analytics: WQGA dictionary, anonymousSessionId, backendState live/offline_queued/local_demo/failed
│
├── PRIMARY CHROME: Scan / Stay / Explore
│   ├── /scan — camera (jsQR) + manual code + 7 demo tiles (room/lobby/street/campus/market/bio/zoo)
│   │   sets Stay session (stay/marker/campus) + noteQrContext, then navs to /g /q /c /e /@
│   ├── /concierge + /g/:id (StayPage → ConciergePage) — room stay home
│   │   Wi-Fi reveal, Ask AirPal (local askLocal + askAirPal callable), staff ticket,
│   │   dining, safety, arrival guide, checkout checklist, nearby (nearbyForMarker), rating
│   └── / (DiscoverPage) — Explore: tonight/live (zoned clock), nearby/featured (discoverPlaces),
│       filter chips + search, list/map toggle (CityMap pins: places + public plans), walks teaser
│
├── QR CONTEXTS (one shell, five context types)
│   ├── Stay /g/:id — property + room + roomToken (?r &room &in &open)
│   ├── Marker /q/:a, /q/:city/:handle — street/lobby markers, nearby + ask
│   ├── Campus /c/:id — classes/places/events tabs, Wi-Fi reveal, help
│   ├── Event /e/:id + stall /e/:eventId/s/:stallId — market/event + stall save
│   └── Bio /@:handle — public business/creator profile (see Identity below)
│
├── PLAN & TIME
│   ├── /plan, /plan/new, /plan/:id, /plan/:id/edit, /invite/:code
│   │   Hangout co-planning: my/public/past tabs, types (PLAN_TYPES), stops, RSVP,
│   │   votes, comments, public geo pins on Explore map, Stripe experience checkout
│   ├── /calendar (/events → /calendar) — month/week/day, filters, tags, drag-reschedule,
│   │   ICS export, save (event_save), tonight correctness via local-events + hours
│   └── /guide + /tour/:id — precinct walks (toursForPrecinct), sights sorted by walk distance
│
├── PEOPLE / IDENTITY / SOCIAL
│   ├── /@:handle (BioPublic) — links stack, catalog/deals, vCard, follow/like, tap tracking, claim offer
│   ├── /bio/setup /bio/edit /bio/recover — handles, claims, photos, socials
│   ├── /club, /club/list — AirPal Club (device-kept invites/offers; invites via mail BCC today)
│   ├── /companion — find/become companion (roles, activities, availability, pricing; admin review)
│   ├── /me, /me/zoo, /me/memories, /me/people — account, zoo hunt progress, memories, people/contacts
│   └── /p/:id (PlacePage) — place detail + map_open, booking intent
│
├── OPERATOR SIDE (auth-gated)
│   ├── /start (auth entry: signin/reset/tabs) → /host (today/place/print tabs)
│   │   property create, Wi-Fi edit, roomTokens, QR print kit, tickets inbox
│   ├── /business — place + offer listings, address/phone/geo validation, guest-list panel
│   ├── /event (OrganiserEventPage) — create/edit events + stalls
│   ├── /partners, /join — supply side funnels
│   └── /admin — stats (places/events/markers/handles), WQGA readout, bio directory,
│       companion review, analytics aggregation, seedDatabase
│
├── TELL THE STORY
│   ├── /solutions, /solutions/:id — buyer narratives (print → scan → go)
│   ├── /about /contact /privacy /terms /cookies /legal → /privacy
│   └── ExpoDirectory, Stall, MemoryWall, Settings, AuthAction, NotFound
│
├── BACKEND (functions/src/index.ts callables)
│   ├── analytics: recordAnalyticsBatch, aggregateAnalyticsHourly
│   ├── registration/admin, property (wifi, tokens), ask (askAirPal)
│   ├── listings, events (upsert, stalls, ratings), bio (handles, taps, offers, transfer)
│   ├── plans (create/RSVP/stops/votes/comments/invite), deals (claim/redeem/partner),
│   └── stripe (experience checkout/confirm). Firestore rules + indexes enforce property/bio/plan ACLs.
│
└── DATA & SHARED (shared/* pure logic, web+functions)
    ├── catalog/precinct (The Rocks default), the-rocks-data, campus, tours, travel-os
    ├── geo-address, nearby, hours (isOpenAt), local-time (toZonedDateStr), local-events (tonight/live)
    ├── analytics + aggregate (isQualifiedAction, northStarFromEvents), abuse, security, urls
    └── domain: bio, business, campus, companion, event, plan, club, zoo

## 2. App review

**Strengths.** Scan-first entry with no guest account; one shell + zoned
`LocalNow` clock (no UTC-date bugs); WQGA/Context is the right north-star with a
real event dictionary; seed data is tagged `local_demo` and excluded from KPIs;
operator side (host/business/event/admin) already exists end-to-end.

**Weaknesses.**
- Too many half-products compete: Plans, Bio, Club, Companion, Zoo, Memories,
  People, Solutions — none has a complete loop except Stay.
- Discovery is split across `/`, `/guide`, `/calendar`, `/plan` with four
  separate local searches and no shared index.
- Guest UI could show invented data (hardcoded Wi-Fi fallback) with no demo
  labeling — a trust killer if a guest tries it in a real venue.
- Host activation has no guided path: list → Wi-Fi → print → test scan was
  implicit; stale Wi-Fi/hours had no freshness signal.
- Companion had no 18+ gate and no funnel events; Stripe bookings and deal
  claims were only partly measured.
- Primary tabs included Calendar, so there was no forced 4-tab IA.

## 3. What to change / add (priority order)

1. One winnable loop (scan → Wi-Fi + tonight + answer <60s), measured per
   context — done, see log below.
2. Four-tab IA (Scan/Stay/Explore/Plan) + one global search — done.
3. Trust: no invented guest data, demo badges, offline-tolerant scan,
   Maps rebuild discipline — done.
4. Host activation checklist + Wi-Fi freshness — done.
5. Companion 18+ gate + funnel, Stripe/deal measurement; Club stays
   device-only until traction — done.
6. Host ticket push (Firestore inbox + in-tab toast + optional FCM) — done,
   see `docs/host-tickets.md`.
7. Hours / events freshness SLA (14-day hours, 7-day schedules; hide Open now
   after 45 days; host confirm buttons) — done.
8. Next: plan-QR scan attribution in Admin WQGA view.

## 4. Risks if nothing further changes

- QR contexts look active but produce no qualified actions → WQGA flatlines.
- One stale Wi-Fi password destroys more trust than ten missing features.
- Companion/Club scale moderation and mailing before the core loop is proven.

## 5. Seed removal, Google data, location (2026-09-15)

Posture: **real database only, empty is OK**. Curated bundle content
(`shared/the-rocks-data`, `SEED_*`, `CURATED_*`) is migration source for
`seed-database.ts` (admin one-time run writes `properties`/`listings`/`places`/`events`/
`events/{id}/stalls`/`bios`), never rendered directly.

- **Places:** `catalog.activePlaces()` = Firestore-backed `listedPlaces()`
  only; removed `PLACES`/`EVENTS`/`liveEvents`/`tonightEvents`/`getEvent`
  bundle exports. Global search, plan stops, bio handles read live listings.
- **Events:** `events-store` no longer injects `SEED_EVENT`/`SEED_STALLS`;
  `EventsContext` dropped `CURATED_LOCAL_EVENTS` and reads the `events`
  collection (`docToCalendarBase`/`docToEventRecord`/`toNearbyEvent` in
  `src/lib/remote-events.ts`) plus per-event `stalls` subcollections.
  Migrated docs are stamped `status:"live"` (publicly listable per
  `firestore.rules`); city-less docs stay unscoped and match every city.
- **Property:** `properties.ts` dropped all seed shortcuts; unknown stays
  return a generic `unknownProperty` (no venue facts, no invented Wi-Fi).
  `fetchProperty` is cache-first with a 3s bounded remote refresh
  (offline-safe). `StayContext` no longer defaults to the Harbour seed;
  Concierge shows ask-the-desk states, `askLocal` answers only from live
  data + tonight list.
- **Google:** removed `GooglePlacesSearcher`/`searchNearby` merge, invented
  `4.7`/`340` rating fallbacks, `googleMapsUri` links, third-party
  attribution id, and dead `mapsWalkEmbedSrc`. Map rendering + direction
  link-outs (platform plumbing) stay; all shown content is ours.
- **Location:** Discover/Marker tonight+live come from live events filtered
  by the GPS-derived city (`cityMatches`; unscoped included) and zoned
  windows; hero shows "near you" on GPS fix; honest empty states everywhere.
- **Stores wired (2026-09-15 handoff):** QR `markers`, `tours`, `campuses`,
  `zooHunts` have client caches + public Firestore reads. `seedDatabase()`
  writes them. Scan has no demo venue tiles. Remaining local-only:
  `SEED_PLANS` invite lookup, companion/club device stores, host-property
  create presets.

## 6. Earlier log — the 5 priority items, implemented

1. **Winnable loop:** `first_value` now carries real `timeFromSessionStartMs`,
   `timeFromQrScanMs`, `loopTargetMet` (60s target, `WINNABLE_LOOP_TARGET_MS` in
   `shared/analytics.ts`); Ask answers emit `first_value("answer", …)`.
2. **Nav collapse:** TabBar/TopNav are Scan / Stay / Explore / Plan; Calendar +
   Guide map to the Explore tab; global search (⌘K) now also indexes open plans,
   walks, and markers.
3. **Trust:** removed the hardcoded `harbour101` Wi-Fi fallback (empty = "ask the
   desk"); `DemoBadge` on the Concierge hero in demo mode; Scan camera-denied
   path explains settings + offline code entry; dev-only warn on missing Maps key
   (guest embed fallback unchanged).
4. **Hosts:** `HostActivationChecklist` on `/host` today tab (listed → Wi-Fi →
   print → test scan, each emitting `host_activation`); Wi-Fi save stamps a
   freshness date with a monthly re-verify nudge.
5. **Gating + monetization:** Companion applications require 18+ confirmation
   (shared validation, stripped from public profiles); companion funnel
   (`started`/`submitted`) and Stripe booking success (`booking_intent`) are
   tracked. Club stays device-kept with no server bulk-send (already gated).