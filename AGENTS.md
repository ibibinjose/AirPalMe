# AGENTS.md — AirPal.me

## 1. Product

AirPal.me — Life Made Easy.

AirPal is a trusted, people-powered global marketplace and discovery platform connecting friends, family, colleagues, and mates with:

- People — AirPal Mate & Social Circles (Friends, Family, Colleagues)
- Places — AirPal Stay
- Experiences — AirPal Experiences
- Things — AirPal Fashion
- Discovery — AirPal Daily
- Trips — AirPal Travel

Brand mechanism: ME = Made Easy. The .me is intentional and part of the brand identity.

Core positioning: a trusted global marketplace connecting people (friends, family, colleagues, mates) with places, things, and experiences anywhere in the world. Do not position AirPal publicly as six unrelated apps. One platform, verticals on one shared marketplace engine.

## 2. Critical Product Strategy

Build the marketplace engine first. Do not build all verticals as fully operational marketplaces at the same time.

Expansion gate: **`docs/AIRPAL_BRAIN.md`**. Before adding a surface, pass its feature test (§18). Company loop: Want → Discover → Connect → Plan → Go → Experience → Remember → Repeat. North Star: completed experiences per active user.

Initial use: people new to a city (Sydney first) answer "what do you want to do?", then who with, and complete a plan. AirPal Mate means find someone to do it with. Paid companionship is later and is not the front door.

The first objective is not downloads. It is Completed AirPal experiences. Expand into other verticals only after that loop works. If this file and the Brain disagree about what to build next, the Brain wins. Safety, security, privacy, payments, and `docs/CANON.md` still win over both.

## 3. App Information Architecture

Mobile-first navigation. Do not put every vertical into the bottom navigation.

Home answers "What are you looking for?" with primary actions: Find an AirPal, Find an Experience, Find a Stay, Discover what's happening, Explore Fashion, Plan a Trip. Hero CTA for MVP: Find someone to go with you. Secondary: nearby experiences, upcoming events, recommended AirPals, popular places, offers, saved items. Personalize only when appropriate and consented.

## 4. AirPal Mate — MVP Priority

Core proposition: I want to do something. I need someone to do it with.

Customer flow: account → profile → verify identity where required → request → browse/match → send/accept → message → select experience → book/pay if applicable → meet safely → complete → review → repeat.

Request fields: what, category, date, time, location, party size, budget, preferences, short description, payment-required flag, public/private, accessibility needs.

AirPal profile shows: photo, first name, general location (never exact home address), bio, interests, languages, activities, availability, verification badges, completed experiences, reviews, response rate, reliability, cancellation history where appropriate, joined date, safety/report controls. Age only where legally required. No unnecessary personal data.

## 5. AirPal Matching

Consider: activity, date/time, location, availability, interests, language, budget, experience type, preferences, trust/verification status. No opaque "compatibility score" as primary UX — use understandable reasons ("Available Saturday afternoon", "3 km from your area").

## 6. AirPal Mate Supply

Application required. Collect: identity, profile, interests, experience categories, availability, location area, languages, motivation, relevant experience, terms agreement, required verification. Statuses: Draft → Submitted → Under Review → Approved / Rejected, plus Suspended / Removed. Only approved Mates are active paid supply. Admin approval mandatory for MVP: view, review profile + verification, approve, reject, request info, suspend, remove, internal notes, audit history. Never rely solely on automation for final safety decisions.

## 7. Trust & Safety

Core product feature: identity verification where required, email/phone verification, report, block, moderation, incident management, admin review, payment protection, refund/dispute workflow, audit logs, safety guidance, age restrictions, privacy controls. For selected activities: safety check-in, emergency contact, meeting-place guidance, post-experience check-in. Never market AirPal as guaranteeing personal safety. Canonical public trust surface: `/trust` (verified company facts, disambiguation, honest proof status — never invented ratings, counts, or customers).

## 8. Messaging

Tied to a legitimate marketplace interaction: match conversation, booking conversation, system messages, report, block, safety info, timestamps, read state, moderation/report metadata. No personal phone/email exposure by default.

## 9. Bookings

Shared booking engine across verticals: customer, provider/mate/business, product/service, date/time, location, price, fees, payment status, booking status, cancellation policy, refund status, completion, review eligibility. Statuses: Pending → Confirmed → Cancelled / In Progress → Completed / Disputed → Refunded.

## 10. Payments

Marketplace architecture: Stripe, Stripe Connect for eligible providers, platform fee, provider payout, refunds, disputes, payment records. Never store raw card numbers. Keep financial records separate from profile data. Commission percentages configurable by admin, never hard-coded (platform_fee_percent, provider_fee_percent, minimum_platform_fee, payment_fee_handling, refund_policy).

## 11. AirPal Experiences

Next major expansion. Categories: Food, Culture, Fitness, Art, Music, Travel, Adventure, Classes, Wellness, Community, Fashion, Local activities. Provider flow: Apply → Create Experience → Admin Review → Publish → Receive Bookings → Deliver → Get Paid → Reviews. Every Experience: title, description, photos, provider, location, duration, capacity, price, dates, cancellation policy, requirements, accessibility, safety info, reviews. Key CTA: Going alone? Find an AirPal.

## 12. AirPal Stay

No generic Airbnb clone. Initial focus: hotels, motels, serviced apartments, hostels, boutique accommodation. Partner model: AirPal Stay Partner (distribution, booking management, listing, availability, pricing tools, marketing, reviews, support, AirPal Verified). Future tiers: Partner / Powered / Managed. Commercial before residential STRA; residential only with jurisdiction registration, exclusion-list, recordkeeping and platform requirements built first.

## 13. AirPal Fashion

Not an online clothing store. Concepts: Share, Rent, Swap, Style, Discover, brand collaborations. Flow: List → Verify → Match → Rent/Share → Payment → Return → Review. Items carry photos, brand, category, size, condition, availability, rental price, deposit, pickup/delivery, owner, reviews, damage/return rules. Brand model: AirPal Fashion Campaign (products, discounts, commission, budgets, creators, experiences, events). No peer-to-peer fashion as acquisition until trust and transactions prove out.

## 14. AirPal Daily

Local discovery layer, not a news company. Show events, experiences, deals, local activities, fashion drops, places, AirPal activities, community events. Primary question: What's happening near me? Daily content must drive transactions (find an AirPal, book, stay nearby, discover a business). No large editorial operation initially.

## 15. AirPal Travel

Orchestration layer over the existing network, not a separate product. A trip contains destination, dates, stay, experiences, events, Mates, fashion, places, itinerary.

## 16. Search & Discovery

One shared search system across people, experiences, stays, events, businesses, fashion, destinations. Contextual filters only, never a giant default list: location, date, category, price, availability, rating, verification, distance.

## 17. Profiles

Consumer: about, interests, experiences, bookings, reviews, saved, messages, wallet, preferences, verification, privacy, safety. Mate adds: categories, availability, completed experiences, ratings, reliability, approval status. Business adds: details, listings, experiences, stays, offers, bookings, reviews, analytics.

## 18. AirPal Business

Dedicated dashboard eventually: profile, listings, experiences, bookings, availability, offers, customers, reviews, payouts, analytics, campaigns. Onboarding: Apply → Verify → Admin/automated checks → Publish → Sell.

## 19. AirPal Studio

Future B2B operating layer: listings, experiences, campaigns, offers, events, customers, bookings, payments, payouts, analytics, content, advertising. Do not build the complete Studio before consumer demand proves out.

## 20. Admin Dashboard

First-class application: overview, users, active Mates, requests, matches, bookings, GMV, revenue, reports, incidents; user search/profile/verification/status/activity; mate applications lifecycle; marketplace requests/matches/bookings/cancellations/disputes; experiences providers/listings/moderation/bookings; stay partners/properties/rooms/availability/bookings; fashion items/owners/rentals/returns/disputes; daily content/events/promotions/moderation; finance payments/fees/payouts/refunds/disputes; safety reports/incidents/suspensions/evidence/notes/escalations; analytics funnel/retention/repeat/GMV/revenue/supply/demand/geography. Every status/payment/listing/booking/safety action auditable.

## 21. Data Model

Shared marketplace collections: users, profiles, verification, preferences, mates, mate_applications, mate_requests (`mate_requests`), matches, messages (`request_chats`), conversations, experiences (`campaigns`), experience_providers, experience_slots, businesses, business_members, business_listings (`listings`, `partnerVenues`), stays (`properties`), stay_rooms, stay_rates, stay_availability, fashion_*, events, daily_content, offers, bookings, booking_items, payments, payouts, refunds, disputes, reviews (`rating` on requests), ratings, saved_items, reports (`safety_reports`), incidents, moderation_cases, admin_notes, audit_logs (`admin_audits`), notifications, promotions, campaigns. One AirPal account across the platform — never separate user systems per vertical.

## 22. Technical Architecture

Stack: React + TypeScript + Tailwind + Lucide + Firebase Auth/Firestore/Storage/Functions (+ Stripe Connect when payments land; maps/location; email/SMS/push). NOTE — recorded deviation: this repo ships Vite SPA, not Next.js App Router; kept deliberately per §36 (no rewrites of working systems). Server-side validation for sensitive operations. Never trust client prices, fees, permissions, booking ownership, payout amounts, admin status, verification state.

## 23. Firestore Principles

Ownership/access patterns: users touch only permitted data; admin ops protected; financial records restricted; reports restricted; internal notes never public; verification private; providers limited to own listings/bookings; users cannot change approval/suspension state or payment records. Privileged mutations via Cloud Functions. Never weaken rules to make development work.

## 24. Design System

AirPal.me, Life Made Easy. Modern, human, clean, energetic, trustworthy, premium but accessible. AirPal blue, white/light backgrounds, dark neutral text, limited accents, generous spacing, rounded-not-childish. The logo's .me stays distinctive; expressive script as brand accent only, never the whole interface.

## 25. UX Rules

Every screen answers: what is this, why care, what next. One primary CTA, short forms, progressive disclosure, mobile-first, clear status/pricing/cancellation/trust. Avoid: feature overload, long onboarding, empty dashboards, generic AI chat, excessive animation, dark patterns, hidden fees, ambiguous buttons.

## 26. Notifications

Useful, event-driven: match, accepted, message, booking confirmed/reminder, cancellation, payment, payout, review request, safety check-in, application status. No spam; user controls required.

## 27. Reviews & Reputation

Linked to completed legitimate transactions: overall rating, written review, category ratings, both sides, reportable, moderated. Badges: Identity Verified, AirPal Approved, Reliable, Top Rated, Experienced. No unexplained algorithmic score.

## 28. Marketplace Economics

Configurable: platform/provider commission, payment/booking/cancellation fees, refunds, deposits, promotions, coupons. Monetisation: transaction commission, partnership fees, experience/stay/fashion commissions, membership, sponsored discovery, software subscriptions. No ad optimisation before liquidity.

## 29. MVP Scope

Must build: auth, profiles, mate application, admin approval, mate discovery, mate request, matching, messaging, booking, payments, payouts, reviews, reports, block, notifications, admin dashboard, audit logs. Later: full Stay/Fashion/Travel, recommendations, ads, loyalty, complex AI, full Studio.

## 30. MVP Acceptance Test

A real user can: sign up → profile → apply → approved → request → discover → match → message → book → pay → complete → review → report/block if needed; admin inspects and intervenes at every stage.

## 31. Key Metrics

North-star: Completed AirPal Experiences. Track users, Mates, applications, approval rate, requests, matches, match rate, booking conversion, completed/repeat bookings, GMV, revenue, AOV, CAC, retention, cancellations, response rate, ratings, reports, incidents, refunds, disputes. Early king: completed experiences per active user per month.

## 32. Development Priorities

P0 transaction (auth → safety) → P1 usability (search, notifications, reviews, saved, cancellations) → P2 growth → P3 expansion (Stay, Experiences, Fashion, Daily, Travel) → P4 infrastructure (Studio, analytics, ads). Never P3/P4 while P0 broken.

## 33. AI Rules

AI assists: matching suggestions, search, descriptions, moderation help, support, personalisation. Never autonomously: removals, incident closure, payment disputes, verification approval, legal conclusions. Human review always available.

## 34. Security

Never commit keys, credentials, service accounts, passwords, secrets (.env stays out). Validate external input. Defend: XSS, CSRF, IDOR, privilege escalation, payment manipulation, abuse, spam, fakes, duplicates, fraud. Log security events.

## 35. Privacy

Minimal collection. Never expose: home addresses, verification docs, phones, emails, moderation notes, payment credentials. Sensible location precision. Controls for visibility, location, notifications, messages, marketing, data requests. Australian privacy/consumer compliance + specialist legal advice before launch.

## 36. Code Quality

Production quality: strict TS, reusable components, domain boundaries, server validation, error/loading/empty states, responsive, accessible, critical-flow tests. No duplicated marketplace logic, hard-coded business rules, fake production data, or security TODOs. No needless rewrites; check existing stack before new deps.

## 37. Git Rules

Small logical commits (`feat:`, `fix:` …). Never commit secrets. No force-push shared branches without authorisation.

## 38. Agent Behaviour

Read this file first, then `docs/CANON.md`, then `docs/AIRPAL_BRAIN.md` before adding a product surface. Inspect before changing architecture. Reuse components/patterns. Smallest change that solves. Preserve functionality. Test affected flows + mobile + auth/permissions + Firestore/payment implications. Report changes and tests. Conflicts resolve: Safety → Security → Correctness → Transaction integrity → UX → Performance → Growth.

## 39. Product Guardrails

Never become: social network, dating app, hotel clone, fashion marketplace, news site, ride-share clone, AI chatbot with marketplace attached. Advantage is the connection layer: PEOPLE→Mate, PLACES→Stay, EXPERIENCES→Experiences, THINGS→Fashion, DISCOVERY→Daily, TRIPS→Travel — all on Identity → Trust → Discovery → Matching → Booking → Payment → Experience → Reputation.

## 40. Final Product Principle

One trusted marketplace engine, six eventual verticals. Proof: someone wants to do something → AirPal finds the right person/place/experience → safe transaction → good experience → they come back. That is the AirPal loop.

## 41. Repo Operations Annex (pre-existing, still binding)

- Sydney time: never `new Date().toISOString().slice(0,10)` for calendar dates — use `toZonedDateStr`/LocalNow. `useLocalNow` clock: today/time/day/timeZone/city/here/anchor. Weather at `here` via Open-Meteo. Tonight/live parsed against zoned clock, never seed flags. Open-now via hours lib; null means don't guess.
- Maps: `@vis.gl/react-google-maps`, build-time `VITE_GOOGLE_MAPS_API_KEY`, referrer-restricted; missing key shows embed, never dev cards on guest surfaces. `VITE_*` bakes at build — rebuild to change.
- Website guests browse Stay/Explore/Scan without auth. Native iOS/Android require sign-in (`NativeAuthGate`). No secrets/PII in analytics. Seeds are migration sources, never rendered. Demo stay `properties/harbour-hotel`.
- Provider order in `src/app/providers.tsx` (LocalNow after Stay). Shared function types live in `shared/`.
- Live Firestore reads with honest empty states; `hoursVerifiedAt`/`scheduleVerifiedAt` freshness SLAs; city-only presence; legal copy in pages + `src/lib/legal.ts` (bump `LEGAL.updated` on change); tickets via callables not localStorage; `/host` reads live property; `unknownProperty` for missing stays.
- Env: Firebase `VITE_FIREBASE_*`, Maps key, `PLATFORM_ADMIN_EMAILS`; never commit `.env`. Deploy: hosting/functions/rules scripts. Native: Capacitor `me.airpal.app`.
- Marketing routes prerender to static HTML at build (`scripts/prerender-routes.mjs` + `prerender-routes.json`): per-route title/description/self-referencing canonical, static body, `/trust` JSON-LD. Client copy in `src/lib/share-meta.ts` must match (parity test `src/lib/prerender.test.ts`); `scripts/check-seo.mjs` enforces the invariants.

## 42. Modern UI Architecture & Native Builds Annex

- **Design System & Layout Grid**: All core screens (`DiscoverPage`, `MatePage`, `MePage`, `ConciergePage`, `PlanHubPage`) use a liquid glass aesthetic with AirPal Blue (`#1805db`) primary accents, subtle glassmorphism cards (`bg-card ring-1 ring-line shadow-xs`), high-contrast typography, and a responsive 12-column grid (`lg:grid-cols-12`) on desktop screens while preserving touch-friendly mobile layouts (target sizes $\ge 44\text{px}$).
- **Mobile Navigation & Safe Area**: Mobile bottom navigation is styled as a floating Apple-inspired liquid glass dock with `pb-safe` padding for iOS Home Indicators and Android navigation bars.
- **Testing & Verification Standards**: All features must pass `npm test` and `npm run verify` prior to git commits or deployment.
- **Native Capacitor Integration**: Mobile apps use `@capacitor/core` under app ID `me.airpal.app`. Run `npm run cap:sync` after production web builds to synchronize web assets with iOS and Android native containers.

## 43. Canon freeze (binding on every agent)

Shipped chrome, style, auth, persistence, and features are sealed in **`docs/CANON.md`**. Read it after this file. Do not revert items in §8 of that document. Website guests browse; native iOS/Android require sign-in. Personal `@handle` stays a person; Google listing import is business-only. Account bios persist in Firestore; Stay scan sessions stay on-device.

Pointer files so other tools load the same rules: `CLAUDE.md`, `GEMINI.md`, `.cursorrules`, `.github/copilot-instructions.md`.

To change the freeze, the human must ask; update `docs/CANON.md` in the same change as the code.

## 44. AirPal Brain (binding on product expansion)

What to build next is gated by **`docs/BRAIN.md`** (established 22 September 2026). North star: Completed AirPal Experiences per active user. Optimize for completed experiences, not downloads. New surfaces must pass the §18 feature test before they are built.

Conflict order when documents disagree: (1) safety, security, privacy, and payment integrity in this file; (2) shipped freeze in `docs/CANON.md`; (3) Brain on expansion; (4) older vertical plans in this file that pull the product into another layer. Never start P3/P4 (Studio second app, Travel/Fashion as products, etc.) while P0 — Plan → connect → experience → complete in Sydney — is unproven.

To change Brain, the human asks in plain language; update `docs/BRAIN.md` in the same change as any product rule that contradicts it.

