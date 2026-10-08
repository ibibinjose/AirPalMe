# AirPal.me — The Single Doc

**Status:** binding source of truth from 5 October 2026.
**Replaces:** `AGENTS.md` product rules, `docs/CANON.md`, `docs/BRAIN.md`, `docs/AIRPAL_BRAIN.md`, `docs/strategy.md`, `docs/APP-STORY.md`, `docs/launch-plan.md`. Those files are now short pointers here. Their pre-rebuild content is preserved in git history.

**How to use this file:**

- Agents (all tools): read this file before any edit, then follow Part I plus the part relevant to your task.
- Humans: change product direction by editing this file. Small, logical commits.

---

## Part A — Product

### A1. Brand and Ecosystem Architecture

**AIRPAL** is the master brand ("Life Made Easy"). To eliminate bloat and keep positioning crystal-clear, products are separated at the UX level into two focused surfaces powered by one universal engine and account:

- **1. AirPal.Me — Personal Life & Identity**
  - *Core job:* "Plan your day. Organise your life. Share who you are."
  - *Positioning:* "My life, organised by AirPal."
  - *Features:* Personal profile & digital bio (`/@handle`), daily planner & "What now?" suggestions (`/now`), local weather & daily outfit recommendations, calendar schedule (`/calendar`), friends' plans (`/plan`), and private memories.

- **2. AirPal Pass — Events, Deals & Experiences**
  - *Core job:* "Discover what's happening. Get access. Save money."
  - *Positioning:* "Your pass to experiences."
  - *Features:* Live concerts, Indian cultural festivals & community gigs, dining perks & member deals (`/deals`), scannable digital QR tickets & passbook (`/me/tickets`), organiser door scanner (`/scan`), and event hosting tools (`/event`).

- **Shared Universal Identity:** Both surfaces share the exact same AirPal account, Firebase Auth, and database. Passes and tickets booked in AirPal Pass automatically populate the user's AirPal.Me daily schedule.


### A2. Promise and loop

AirPal turns "I want to do something" into a completed real-world experience. The company loop:

Want → Discover → Connect → Plan → Go → Experience → Remember → Repeat

### A3. North Star

Completed AirPal Experiences per active user (per month). A completed experience means someone wanted something, made a plan, showed up, and can remember it. Downloads, followers, profiles, and bookings that no-show are vanity.

### A4. Customer

People with free time and low decision energy who want to turn it into something good — starting in Sydney: newcomers, students, migrants, solo travellers, hotel guests, and locals widening their circle. This is an acquisition beachhead, not the brand. Open the next city only after Sydney produces repeat completed experiences.

### A5. What AirPal is

The operating layer for going out: a person opens AirPal and can say "I'm here, I have three hours, I want to do something" — and AirPal turns that into a plan they can actually do, with people, a place, and a time. One account across everything.

### A6. What AirPal is not

Not a social network, dating app, hotel clone, fashion store, news site, ride-share, events directory, AI chatbot with a marketplace attached, or six apps. Discovery and content exist to create completed experiences, not attention. Advantage is the connection layer on Identity → Trust → Discovery → Matching → Booking → Payment → Experience → Reputation.

---

## Part B — V1: the rebuild (first release)

First-principles V1 job: convert an urge plus a time window into a completed experience with people you already know, or solo. No strangers in V1 — Mate, matching, and booking-a-person are deferred (see G6), not deleted forever.

### B1. Shape: three states, one flow

Now (intent):

- One composer asks three things and nothing else: what are you in the mood for, when are you free, solo or with others.
- Location and time come from the device and a zoned clock, not from forms. Budget appears only if money is involved.
- AirPal assembles one plan suggestion, not search results: a concrete thing, a real nearby place with honest open-now state, and a time. One alternative on request, never a list.

Live (the experience thread):

- Accepting the suggestion opens the only object that matters: one live thread per plan with details, group chat, meeting point, time changes, RSVP state, and "we're here / we're done" confirmation.
- Inviting works by shareable link: friends tap yes or no. No account needed to view; an account is needed only to create or join.
- Supply appears only as participants and capabilities inside the thread, never as apps to visit.

Done (memory and repeat):

- Completion is the only success event. It writes a memory record and offers one-tap repeat ("same again next Saturday").
- Memories stay private in V1. No public reviews or reputation until paid/completed-transaction loops return.

### B2. V1 includes

- Now composer, one assembled suggestion, invite-by-link with RSVP, one live thread per plan, private memories with repeat.
- Public user profiles (minimum): photo, name, handle, short bio, social links (display only), completed-experiences count, upcoming public plans (display only — joining stays invite-link only), and a visibility switch (public / friends-only / private; default friends-only). A card you tap from an invite, not a destination you browse. Detail reference: `AirPalBio.md`.
- Business profiles (minimum): one public page per business — what it is, where it is, honest open-now hours, its listings, its current deals. Claimed and edited through a simple form. No dashboard in V1.
- Deals and offers (minimum): attachments on business profiles, surfaced inside relevant suggestions at the right time. Claimed in the live thread (show-a-code or tap-to-redeem) with one-line expiry and terms. No deals feed, wallet, flash sales, or sponsored placement.
- Listings (minimum): one bookable or askable thing under a business (dish, service, set menu, class slot) — title, price, short description, availability. Attachable to a plan. Request-and-confirm in V1; no live inventory or checkout.

### B3. V1 excludes (explicit)

Mate discovery, matching, requests, paid supply, and booking-a-person in any form. Identity verification funnels and admin supply approvals. Public reviews and reputation. Deals posted by users (user-as-seller). Browsing directories of any kind (no events/places/deals/listing feeds as destinations). Business dashboards, campaigns tooling, Fashion/Travel/Daily as products. Paid paths of any kind — free plans only. (Stay host operations returned early at human request — see G6.) Social graph mechanics (followers, posts, feeds, DMs from profiles).

### B4. Invariants that keep V1 calm

- Depth, not destinations: profiles, deals, and listings are answers the app gives inside suggestions and plans, never places the user must go. The moment any of them becomes a browsable destination, V1 is overweight.
- Account and permissions appear only at the moment they add value (creating, joining, reminding), never as upfront setup.
- One entry point, one success moment: from urge to confirmed plan in under two minutes.

### B5. V1 acceptance test

A real user can, in one session: open the app, answer what and when, accept or adjust one suggestion, invite two friends by link, change the time once, confirm, mark done, and repeat it next week — without a signup wall before value, a tab bar of verticals, or anything about strangers.

### B6. V1 metrics

North Star plus, in service of it: plans created, suggestion-accept rate, RSVP rate, completion rate, repeat rate, completed plans per active user per month, crash-free sessions, report volume and response time. If completions per active user are flat, more screens will not fix the company.

---

## Part C — Trust, safety, privacy, money (non-negotiable)

Carried over from the pre-rebuild rules. These survive every redesign because they are the physics of real-world meeting and money movement, not UI preferences.

- Safety: report and block everywhere people interact; moderation with human decisions — a machine may assist but never gives the final safety, verification, incident, or dispute decision. Never market AirPal as guaranteeing personal safety. Accounts are 18+.
- Privacy: minimal collection. Never expose home addresses, verification documents, phone numbers, emails, or moderation notes. Sensible location precision, visibility controls on every profile and plan. Australian privacy/consumer compliance plus specialist legal advice before launch.
- Money (when paid paths return): Stripe with Connect for eligible providers; never store raw card numbers; platform payments only, never direct transfers; commission and fee percents configurable by admin, never hard-coded; every payment, payout, refund, and dispute action audited. Server-side validation for prices, fees, ownership, and payout amounts — never trust the client.
- AI: assists with suggestions, search, descriptions, moderation help, and support. Never autonomously removes, closes incidents, decides disputes, or approves verification. Human review always available.
- Public trust surface: `/trust` publishes verified company facts only — never invented ratings, counts, or customers.

---

## Part D — Data and technical

### D1. Stack

Vite SPA + React + TypeScript + Tailwind v4 + Lucide + Firebase (Auth, Firestore, Storage, Functions in us-central1) + Capacitor 8 (`me.airpal.app`). Canonical Firebase project `airpalme-app`; production web `https://airpal.me`. Do not migrate to Next.js/App Router, a second user system, a second booking engine, a new component library, or a new CSS framework.

### D2. Architecture rules

Shared pure types and logic live in `shared/`. Callables live in `functions/src/` with client wrappers in `src/lib/functions.ts`. Privileged mutations go through Cloud Functions. Never weaken `firestore.rules` to make development work. One account, one identity, one booking engine, one chat engine — no parallels per vertical.

### D3. V1 data model (essentials)

Users, profiles, handles, plans (with guestlists and invites), plan messages, businesses, listings, deals (with claims), completions/memories, reports, audit logs, notifications. Providers touch only their own listings and bookings; users can never change approval state or payment records; financial records and internal notes are restricted. The full pre-rebuild collection list is archived in git history.

### D4. Repo operations

- Calendar dates use zoned helpers (`toZonedDateStr` / LocalNow clock). Never UTC-slice "today".
- Maps: build-time `VITE_GOOGLE_MAPS_API_KEY`, referrer-restricted; missing key shows an embed, never dev cards on guest surfaces. `VITE_*` bakes at build — rebuild to change.
- Marketing routes prerender to static HTML at build (`scripts/prerender-routes.mjs` + `prerender-routes.json`): per-route title/description/self-referencing canonical plus a static body. Client copy in `src/lib/share-meta.ts` must match (parity test `src/lib/prerender.test.ts`; `scripts/check-seo.mjs` enforces invariants).
- Provider order in `src/app/providers.tsx` matters. Live Firestore reads with honest empty states. Freshness SLAs on hours/schedules; null means don't guess.
- Env: Firebase `VITE_FIREBASE_*`, Maps key, `PLATFORM_ADMIN_EMAILS`. Never commit `.env` or any secret.

### D5. Commands

- `npm install`, `npm run dev` (localhost:3000), `npm test`
- `npm run verify` — gate before ship or commit: typecheck, lint, tests, web + functions build, rules
- `npm run ci` — clean install, verify, audit
- `npm run deploy:hosting`, `npm run deploy:functions`, `npm run deploy:rules`, `npm run deploy` (verify + all)
- `npm run cap:sync` after production web builds to sync native containers

---

## Part E — Design and UX

### E1. Design system

AirPal Blue `#1805db` (pressed `#0e0394`); page mist `#eef1f6`; cards `#ffffff`; text `#121614`; secondary `#6a726c`; hairlines `#e5e7eb`. Tokens live in `src/index.css` `@theme` — do not invent a new palette. Dark mode is automatic: semantic tokens re-point under `prefers-color-scheme` (iOS dark palette) while brand accents stay fixed; `@theme` must stay non-`inline` so utilities follow the variables at runtime. Fonts: DM Sans (UI), Outfit (display), self-hosted in `public/fonts/`, no Google Fonts CDN.

Cards: white on mist, `bg-card ring-1 ring-line` with clay shadow, radius about 28px — premium, not childish. Touch targets at least 44px. Mobile bottom dock: floating light pill with `pb-safe` for home indicators. Desktop: 12-column grid where screens already use it. Reuse `Button`, `ValidField`, `Photo`, `ImageField`. Shared words in `shared/names.ts`. Brand accent script only, never the whole interface.

### E2. UX rules

Every screen answers what this is, why care, and what next. One primary CTA. Short forms with progressive disclosure. Mobile-first. Clear status, pricing, cancellation, and trust. Honest empty/loading/error states. No feature overload, long onboarding, empty dashboards, generic AI chat, excessive animation, dark patterns, hidden fees, or ambiguous buttons. Responsive and accessible throughout.

---

## Part F — Launch and growth

### F1. Sequence

Soft launch one city at a time (Sydney first): TestFlight + Play internal → closed track, prove the loop, then expand city by city. Store pack lives in `docs/store/` (listing copy, reviewer notes, permissions, data-safety answers, icon + graphics; screenshots regenerate via `npm run screenshots`). Public launch (Product Hunt + local/community channels per city) only after the exit gate holds.

### F2. Soft-launch exit gate

All must hold for 2–4 weeks: crash-free sessions at least 99%; zero new emergency safety reports older than 4h unreviewed and zero non-emergency older than 1 business day; the V1 acceptance test (B5) proven on real users; no failed-payment backlog and no sandbox flags in prod once paid paths exist.

### F3. Money later

Monetize transactions first when paid paths return. Membership, business campaigns/subscriptions, and sponsored discovery only after repeat completions prove out. No ad optimization before liquidity.

---

## Part G — Rebuild plan

### G1. Phase 0 — Single doc (this change, docs only)

Consolidate product truth into this file; merged docs become pointers. Done when this file reads coherently end to end and every merged file points here. Validation: full readback of this file plus a link check on the pointers. No code changes.

### G2. Phase 1 — V1 shell + Now

Composer (what / when / solo-or-with) plus one assembled suggestion over live places and honest hours. Non-goals: browsing, accounts-before-value, business tooling. Validation: a guest reaches one good suggestion in under a minute; empty states honest with empty Firestore.

### G3. Phase 2 — Live thread

Plan object, invite-by-link with RSVP, group chat in thread, meeting point and time changes, here/done confirmation. Non-goals: strangers, verification, payments. Validation: B5 acceptance test passes with two invitees on mobile.

### G4. Phase 3 — Done and repeat

Private memories plus one-tap repeat. Non-goals: public reviews, social mechanics. Validation: completed plans per active user measurable; repeat creates a live plan in one tap.

### G5. Phase 4 — Profiles, listings, deals (depth only)

User profiles and business pages per B2, listings attachable to plans, deals attached and claimed in-thread. Non-goals: dashboards, feeds, search-across, checkout, user-as-seller. Validation: each addition reachable only from a suggestion, plan, invite, or shared link — never a new tab or home.

### G5b. Phase 6 — Subtraction (October 2026)

The V1 core was buried in ~150 pre-teardown routes. Phase 6 cut `routes.tsx` to the V1 list and deleted 29 pages: Mate/MateRequest/Companion/Circle/Club/ClubList/Campus/Create/Studio/Marketing/Solutions/SolutionDetail/Experiences/Fashion/Festival/FestivalCreate/Zoo/Rewards/People/MyGiveaways/Giveaways/BirthdayFreebies/BusinessBirthdayOffers/AdminBirthdayOffers/Demo/DemoHotel/Explore/Search/BusinessCampaigns, plus `data/solutions.ts`. Stranger-meeting physics is fully unshipped; discovery collapses to `/now`; deals collapse to `/deals`. Compat redirects kept: `/explore` `/discover` `/discovery` `/search` → `/now`; `/inbox` `/chat` `/messages` → `/me/inbox`; `/offers` `/promotions` `/giveaways` `/birthday-freebies` → `/deals`; `/business/helpdesk` `/host/helpdesk` → `/helpdesk`; `/search/analytics` → `/admin/search-analytics`. Mobile dock second tab retargeted Explore → Now (`/now`); tab id stays `explore`. SEO contract follows the cut: prerender drops `/mate` `/solutions` `/experiences` and adds `/now`; sitemap/llms/checks point at `/now` and `/plan` instead of `/mate` and `/fashion`. Follow-up cleanup removed the orphaned chains end to end: zoo system (context, layer, sheets, stores, shared lib, seeds, assets, provider), campus store + seeds (campus data stays — live stay place), explore-filters, birthday offer client + callables + seed (age-gate helper stays), DemoBanner, FestivalManagePanel, EventTile, CircleAnnounceSheet, shared create/studio/print-kit; workspace chrome trimmed to live routes. Kept deliberately: club guestlist chain (live event door ops), companion/mate-request admin chain (G6 gated-return machinery), scan session parsing (live QR infra). Validation: typecheck clean, full suite green, `npm run verify` exit 0.

### G6. What returns later, and on what evidence

Nothing here returns on opinion. Each needs its evidence gate plus its trust machinery built first:

- Paid paths and payouts: after free completions repeat weekly; Stripe + Connect + fee config + refund/dispute workflow required.
- Reviews and reputation: only after paid or completed-transaction loops exist; tied to completed experiences, both sides, reportable and moderated.
- Mate / stranger matching / booking-a-person: only after V1 repeat rate holds for weeks AND identity verification, admin approvals, safety check-ins, and human moderation are built. Never on automation alone.
- User-posted deals: only after business deals loop works, with its own seller-trust design.
- Stay host operations: returned early at human request (October 2026); `/host` rebuilt with full parity on the same data, no model change.
- Fashion, Travel, Daily as products, Studio: only after the V1 loop repeats; each must pass the feature test (G7) first.

### G7. Feature test (every new surface must pass)

Does it help someone discover something? Connect? Make a plan? Complete the experience? Increase trust? Create measurable business value? If the answer is no to most, do not build it.

### G8. Decision framework and conflicts

Before building anything, ask: what evidence says this needs to exist? "Wouldn't it be cool" is not evidence. Conflict order: (1) safety, security, privacy, and payment integrity in Part C; (2) this document; (3) older vertical plans wherever they survive in reference docs. To change this document's direction, the human asks in plain language; update this file in the same change as any code that contradicts it.

### G9. Risks

Scope creep past B3 (each addition must pass G7). Migration of existing users, handles, and data to the V1 shape. Store review (18+ only; real-world services with Stripe, no digital-goods payments). Stale venue data destroying trust faster than missing features — freshness SLAs before new supply.

---

## Part H — Reference docs (kept, not merged)

These stay as working references. Where any of them conflicts with Parts A–G, Parts A–G win; update or retire the reference when you touch its area.

- `AirPalBio.md` — detailed bio/profile blueprint; profile detail reference for B2.
- `docs/app-mind-map.md` — pre-rebuild tree and route map; valid until the rebuild lands.
- `docs/analytics-event-dictionary.md`, `docs/analytics-checklist.md`, `analytics-instrumentation-implementation-plan.md` — event contract and instrumentation.
- `docs/maps.md`, `docs/local-now.md`, `docs/freshness.md` — maps, zoned time, re-verify SLAs.
- `docs/phone-login.md`, `docs/email-setup.md` — auth plumbing.
- `docs/host-tickets.md`, `docs/managed-payments.md`, `docs/pulse-product.md`, `docs/WALLET.md` — surface references for later phases.
- `docs/UI-UX-GUIDE.md`, `docs/ui-playbook-checklist.md`, `docs/IOS-DESIGN-GUIDE.md`, `docs/brand.md`, `docs/birthday-freebies.md` — design and content references.
- `docs/client-handoff.md`, `docs/launch-runbook.md` — handoff and runbook.
- `docs/store/` — store submission pack.
- `docs/plan-prd.md` — Plan experience PRD (Apple-Invites-beating create flow, cover artwork, one-card thread); spec reference for B3.
- `docs/strategy.md`, `docs/APP-STORY.md`, `docs/launch-plan.md`, `docs/CANON.md`, `docs/BRAIN.md`, `docs/AIRPAL_BRAIN.md`, root `AGENTS.md` — now pointers to this file; full pre-rebuild content in git history.

---

## Part I — Agent rules

- Read this file before any edit. Smallest change that solves the request. Reuse `shared/`, existing routes in `src/app/routes.tsx`, and existing components/patterns. Check the existing stack before adding a dependency.
- Production quality: strict TypeScript, domain boundaries, server validation for sensitive operations, error/loading/empty states, responsive, accessible, critical-flow tests. No duplicated marketplace logic, hard-coded business rules, fake production data, or security TODOs. No needless rewrites.
- Test affected flows plus mobile layout, auth/permissions, and Firestore/payment implications. `npm test` and `npm run verify` must pass before commits or deployment; `npm run cap:sync` after production web builds for native.
- Security: never commit keys, credentials, service accounts, passwords, or secrets (`.env` stays out). Validate external input. Defend against XSS, CSRF, IDOR, privilege escalation, payment manipulation, abuse, and fraud. Log security events.
- Small logical commits (`feat:`, `fix:`, …). No force-push on shared branches without authorization.
- Tool pointer files (`CLAUDE.md`, `GEMINI.md`, `.cursorrules`, `.github/copilot-instructions.md`) all point here so every tool loads the same rules.
- Conflicts resolve: Safety → Security → Correctness → Transaction integrity → UX → Performance → Growth.


