# AIRPAL — App Mind Map & Architecture

**Binding Source of Truth:** [`docs/AIRPAL.md`](./AIRPAL.md).
**North Star:** **Completed AirPal Experiences per active user**.

---

## 1. Ecosystem Mind Map

```
AIRPAL (Master Brand — "Life Made Easy")
│
├── SHARED UNIVERSAL ENGINE
│   ├── Unified Auth (Firebase Auth: Apple, Google, Email, Phone)
│   ├── Unified Database (Firestore collections: users, bios, plans, events, bookings, promotions)
│   ├── Cloud Functions (Privileged mutations, wallet signing, push alerts)
│   ├── LocalNow Clock (Zoned Sydney/local clock, weather, honest open-now hours)
│   ├── Pure Outfit Engine (Deterministic weather & outfit advice in src/lib/outfit.ts)
│   └── Native Layer (Capacitor 8; two shells from one bundle — me.airpal.app + me.airpal.pass — with haptics, geolocation, camera)
│
├── 1. AIRPAL.ME — PERSONAL LIFE & IDENTITY
│   │   Core Job: "Plan your day. Organise your life. Share who you are."
│   │
│   ├── / — Home companion hub with live weather, outfit capsule, and daily plans
│   ├── /now — AI Day Planner ("What now?"): mood/when picker, live outfit vibe, 1 curated nearby spot
│   ├── /@handle — Digital identity & link-in-bio (BioPublicPage)
│   │   ├── /bio/setup, /bio/edit — Handle claiming, bio customization, links & catalog
│   ├── /calendar — Personal life calendar & local event schedule (month, week, day, agenda)
│   ├── /plan — Hangout co-planning with friends (live threads, RSVP, stops, invite links)
│   │   ├── /plan/new, /plan/:id, /plan/:id/edit, /invite/:code
│   └── /me — Personal dashboard (active plans, memories, settings, wallet preview)
│
├── 2. AIRPAL PASS — EVENTS, DEALS & EXPERIENCES
│   │   Core Job: "Discover what's happening. Get access. Save money."
│   │
│   ├── /pass — Experience discovery hub (All Access, Cultural, Concerts, Gigs)
│   ├── /events — Public events catalog and festival listings
│   ├── /deals — Exclusive member dining perks and local discounts
│   ├── /me/tickets — Digital Passbook Wallet (QR tickets, Apple Wallet, Google Wallet)
│   ├── /scan — Fast camera QR door check-in scanner for event staff
│   └── /event — Organiser and host event creation / management
│
└── SHARED OPERATOR & PLATFORM SURFACES
    ├── /host — Accommodation and stay operations
    ├── /business — Business profiles, venue listings, hours
    ├── /helpdesk — Universal support desk
    └── /admin — Admin audit, metrics, and safety moderation
```

---

## 2. Invariants & Guardrails

1. **Zero Account Divergence:** Under no circumstances should AirPal.Me and AirPal Pass use separate user databases or auth providers. A pass or ticket booked on AirPal Pass is immediately accessible in the user's AirPal.Me dashboard and calendar.
2. **Deterministic Context:** The outfit and weather recommendations run purely client-side or through typed cloud functions, avoiding hallucinated recommendations or fake external dependencies.
3. **Single Verification Gate:** Every commit and release must satisfy `npm test`, `npm run verify`, and `npm run cap:sync`.
